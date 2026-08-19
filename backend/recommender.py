import sqlite3
import numpy as np
from typing import List, Dict, Optional
from config import DB_PATH, ARTIFACTS_DIR, W_COLLAB, W_CONTENT, W_QUALITY, W_RECENCY, MIN_VOTES

# ── ALS Collaborative Filtering ──
# Lazily load the pretrained ALS factors from artifacts/als_factors.npz
# and build fast lookup dicts. Returns None when artifacts are missing
# (model not trained yet) so we can gracefully fall back to content-based.

_als_cache = None  # None = not loaded yet, dict = loaded successfully, False = load failed

def _load_als():
    """Load ALS user/item factors once; cache at module level."""
    global _als_cache
    if _als_cache is not None:   # already attempted (loaded dict or failure sentinel)
        return _als_cache if isinstance(_als_cache, dict) else None
    return _load_als_from_disk()

def _load_als_from_disk():
    """Read the ALS artifacts and populate the cache. Never raises."""
    global _als_cache
    import os, pickle
    npz_path = os.path.join(ARTIFACTS_DIR, 'als_factors.npz')
    pkl_path = os.path.join(ARTIFACTS_DIR, 'als_model.pkl')

    # Try pickle first (has model + dicts), fall back to raw npz
    try:
        if os.path.exists(pkl_path):
            with open(pkl_path, 'rb') as f:
                data = pickle.load(f)
            _als_cache = {
                'user_factors': data['model'].user_factors,
                'item_factors': data['model'].item_factors,
                'user_ids':   data['user_to_idx'],   # dict user_id -> idx
                'item_ids':   data['item_to_idx'],   # dict movie_id -> idx
            }
            return _als_cache
        elif os.path.exists(npz_path):
            arch = np.load(npz_path)
            user_ids_arr = arch['user_ids']
            item_ids_arr = arch['item_ids']
            _als_cache = {
                'user_factors': arch['user_factors'],
                'item_factors': arch['item_factors'],
                'user_ids':   {int(uid): i for i, uid in enumerate(user_ids_arr)},
                'item_ids':   {int(mid): i for i, mid in enumerate(item_ids_arr)},
            }
            return _als_cache
    except Exception as e:
        print(f"[recommender] Could not load ALS artifacts: {e}")

    _als_cache = False
    return None


def als_score(user_id: int, movie_id: int) -> Optional[float]:
    """Return the ALS predicted rating for (user, movie), or None if unavailable.
    The implicit ALS trains without an explicit offset, so the predicted
    score sits around the training centre of 2.5; we add it back to
    recover an estimated 0-5 rating."""
    als = _load_als()
    if als is None:
        return None

    uidx = als['user_ids'].get(user_id)
    midx = als['item_ids'].get(movie_id)
    if uidx is None or midx is None:
        return None

    # Defensive: a corrupt/partial artifact may have factor rows missing for
    # some ids. Guard the index bounds and fall back gracefully instead of
    # crashing the whole recommendation.
    if uidx >= als['user_factors'].shape[0] or midx >= als['item_factors'].shape[0]:
        return None

    raw = als['user_factors'][uidx] @ als['item_factors'][midx]
    return float(raw + 2.5)          # offset back to [0, 5]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Profile ──

def get_user_profile(user_id: int) -> Dict:
    """Build a content profile from the user's ratings.

    Single DB connection: we fetch the rated items plus the metadata for
    every rated movie/show in one pass each, instead of opening+closing a
    connection inside the per-rating loop (the old code leaked connections
    and was very slow for users with many ratings).
    """
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute("SELECT item_id, rating FROM user_ratings WHERE user_id = ?", (user_id,)).fetchall()

    genre_weights = {}
    year_weight = 0.0
    rated_ids = []

    # Batch fetch movie metadata for all rated movies at once.
    movie_ids = [int(r['item_id'][2:]) for r in rows if r['item_id'].startswith('m:')]
    show_ids  = [r['item_id'][2:] for r in rows if r['item_id'].startswith('s:')]

    movie_meta = {}
    if movie_ids:
        placeholders = ','.join('?' * len(movie_ids))
        for row in cur.execute(
            f"SELECT movie_id, genres, year FROM movies WHERE movie_id IN ({placeholders})",
            movie_ids,
        ).fetchall():
            movie_meta[row['movie_id']] = row

    show_meta = {}
    if show_ids:
        placeholders = ','.join('?' * len(show_ids))
        for row in cur.execute(
            f"SELECT show_id, genres, first_air_date FROM shows WHERE show_id IN ({placeholders})",
            show_ids,
        ).fetchall():
            show_meta[row['show_id']] = row

    for r in rows:
        item_id, rating = r['item_id'], r['rating']
        rated_ids.append(item_id)
        if item_id.startswith('m:'):
            row = movie_meta.get(int(item_id[2:]))
            if row:
                for g in (row['genres'] or '').split('|'):
                    if g: genre_weights[g] = genre_weights.get(g, 0) + rating
                if row['year']: year_weight += rating * row['year']
        elif item_id.startswith('s:'):
            row = show_meta.get(item_id[2:])
            if row:
                for g in (row['genres'] or '').split(','):
                    if g: genre_weights[g] = genre_weights.get(g, 0) + rating
                fa = row['first_air_date'] or ''
                if len(fa) >= 4:
                    try: year_weight += rating * int(fa[:4])
                    except: pass

    conn.close()

    total = sum(genre_weights.values()) or 1
    genre_weights = {k: v/total for k, v in genre_weights.items()}

    return {
        'genre_weights': genre_weights,
        'year_weight': year_weight / 20.0,
        'total_ratings': len(rows),
        'rated_item_ids': set(rated_ids),
    }

# ── Scoring ──

def quality_bias(avg_rating: float, rating_count: int) -> float:
    if rating_count == 0: return avg_rating
    return (avg_rating * rating_count + 2.5 * MIN_VOTES) / (rating_count + MIN_VOTES)

def content_score(profile: Dict, genres: set, year: int) -> float:
    if not profile['genre_weights']: return 0.0
    score = sum(profile['genre_weights'].get(g, 0) for g in profile['genre_weights'].keys() & genres)
    if profile['year_weight'] and year:
        score += max(0, 1.0 - abs(profile['year_weight'] - year) / 50.0) * 0.3
    return score

def hybrid_score(profile: Dict, genres: set, year: int, avg_rating: float, rating_count: int,
                 collab: Optional[float] = None) -> float:
    c = content_score(profile, genres, year)
    q = quality_bias(avg_rating, rating_count) / 5.0
    if profile['year_weight'] and year:
        rec = max(0, 1.0 - abs(profile['year_weight'] - year) / 50.0)
    else:
        rec = 0.5
    # When no ALS prediction exists (cold user or non-movie item), fall back
    # to the popular quality-bias score so the spread of the sum stays stable.
    if collab is None:
        fallback = q
    else:
        fallback = collab / 5.0
    return W_CONTENT * c + W_COLLAB * fallback + W_QUALITY * q + W_RECENCY * rec

def _reason(profile, genres, avg_rating, year, collab: Optional[float] = None):
    parts = []
    if content_score(profile, genres, year) > 0.2:
        parts.append("Content match")
    if collab is not None:
        parts.append(f"Collaborative ({collab:.1f})")
    if avg_rating > 3.5:
        parts.append(f"Quality ({avg_rating:.1f})")
    if profile['year_weight'] and year and abs(profile['year_weight'] - year) < 10:
        parts.append("Same era")
    return ', '.join(parts) or "General"

# ── Recommend ──

def recommend(user_id: int, n: int = 10, item_type: Optional[str] = None) -> List[Dict]:
    profile = get_user_profile(user_id)

    if profile['total_ratings'] == 0:
        return _popular_fallback(n, item_type)

    conn = get_db()
    candidates = []

    if item_type != 'show':
        for r in conn.execute("SELECT movie_id, title, genres, year, avg_rating, rating_count FROM movies").fetchall():
            item_id = f"m:{r['movie_id']}"
            if item_id in profile['rated_item_ids']: continue
            genres = set(r['genres'].split('|')) if r['genres'] else set()
            year = r['year'] or 0
            avg = r['avg_rating'] or 0.0
            cnt = r['rating_count'] or 0
            # Collaborative-filtering prediction for this user+movie (None if missing / cold start)
            collab = als_score(user_id, int(r['movie_id']))
            sc = hybrid_score(profile, genres, year, avg, cnt, collab=collab)
            candidates.append({'item_id': item_id, 'title': r['title'], 'type': 'movie', 'score': sc,
                'genres': ', '.join(sorted(genres))[:80], 'year': year, 'rating': round(avg, 2),
                'reason': _reason(profile, genres, avg, year, collab=collab)})

    if item_type != 'movie':
        for r in conn.execute("SELECT show_id, name, genres, first_air_date, vote_average, vote_count FROM shows WHERE vote_count>=50").fetchall():
            item_id = f"s:{r['show_id']}"
            if item_id in profile['rated_item_ids']: continue
            genres = set(r['genres'].split(',')) if r['genres'] else set()
            fa = r['first_air_date'] or ''
            year = int(fa[:4]) if len(fa) >= 4 else 0
            avg = r['vote_average'] or 0.0
            cnt = r['vote_count'] or 0
            sc = hybrid_score(profile, genres, year, avg, cnt)
            candidates.append({'item_id': item_id, 'title': r['name'] or '', 'type': 'show', 'score': sc,
                'genres': ', '.join(sorted(genres))[:80], 'year': year, 'rating': round(avg, 2),
                'reason': _reason(profile, genres, avg, year)})

    conn.close()
    candidates.sort(key=lambda x: x['score'], reverse=True)

    # MMR diversity: skip if genre overlap with already-selected is too high
    selected = []
    sel_genres: set = set()
    for item in candidates:
        if len(selected) >= n: break
        ig = set(item['genres'].split(', '))
        if len(ig & sel_genres) > 1 and len(selected) < n // 2:
            continue
        selected.append(item)
        sel_genres |= ig

    return selected

def _popular_fallback(n: int, item_type: Optional[str] = None) -> List[Dict]:
    conn = get_db()
    results = []
    if item_type != 'show':
        for r in conn.execute("SELECT movie_id, title, genres, year, avg_rating, rating_count FROM movies WHERE rating_count>0 ORDER BY avg_rating DESC, rating_count DESC LIMIT ?", (n,)).fetchall():
            results.append({'item_id': f"m:{r['movie_id']}", 'title': r['title'], 'type': 'movie', 'score': 0.0,
                'genres': r['genres'] or '', 'year': r['year'] or 0, 'rating': r['avg_rating'] or 0.0,
                'reason': "Popular (no ratings yet)"})
    if item_type != 'movie' and len(results) < n:
        for r in conn.execute("SELECT show_id, name, genres, vote_average, vote_count FROM shows WHERE vote_count>=50 ORDER BY vote_average DESC LIMIT ?", (n - len(results),)).fetchall():
            results.append({'item_id': f"s:{r['show_id']}", 'title': r['name'] or '', 'type': 'show', 'score': 0.0,
                'genres': r['genres'] or '', 'year': 0, 'rating': round(r['vote_average'], 2) if r['vote_average'] else 0.0,
                'reason': "Popular (no ratings yet)"})
    conn.close()
    return results[:n]

if __name__ == "__main__":
    import time
    t0 = time.time()
    profile = get_user_profile(1)
    print(f"Profile: {profile['total_ratings']} ratings, year={profile['year_weight']:.1f}")
    print(f"Top genres: {list(profile['genre_weights'].items())[:3]}")

    t0 = time.time()
    recs = recommend(1, n=5)
    print(f"Recommendations ({time.time()-t0:.2f}s):")
    for r in recs:
        print(f"  {r['title']} ({r['type']}) score={r['score']:.4f} | {r['reason']}")
