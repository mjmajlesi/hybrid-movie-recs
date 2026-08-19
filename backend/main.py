from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import get_db, init_db
from recommender import recommend, get_user_profile

app = FastAPI(title="Hybrid Movie/TV Recommender")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

def dict_row(row):
    return dict(row) if row else None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/movies")
def get_movies(limit: int = 20, offset: int = 0):
    conn = get_db()
    rows = conn.execute(
        "SELECT movie_id, title, year, genres, avg_rating, rating_count, imdb_id, tmdb_id "
        "FROM movies ORDER BY rating_count DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    conn.close()
    return [dict_row(r) for r in rows]

@app.get("/shows")
def get_shows(limit: int = 20, offset: int = 0):
    conn = get_db()
    rows = conn.execute(
        "SELECT show_id, name, genres, first_air_date, vote_average, vote_count, "
        "poster_path, overview, number_of_seasons, number_of_episodes "
        "FROM shows ORDER BY vote_count DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    conn.close()
    return [dict_row(r) for r in rows]

@app.get("/search")
def search(q: str = Query(..., min_length=2), limit: int = 20):
    conn = get_db()
    rows = conn.execute(
        "SELECT 'movie' as type, movie_id as id, title as name, year, genres, avg_rating as rating, "
        "tmdb_id as tmdb_id, NULL as poster_path "
        "FROM movies WHERE title LIKE ? "
        "UNION ALL "
        "SELECT 'show' as type, show_id as id, name, "
        "CAST(strftime('%Y', first_air_date) AS INTEGER) as year, genres, vote_average as rating, "
        "tmdb_id as tmdb_id, poster_path as poster_path "
        "FROM shows WHERE name LIKE ? LIMIT ?",
        (f"%{q}%", f"%{q}%", limit)
    ).fetchall()
    conn.close()
    return [dict_row(r) for r in rows]

@app.get("/item/{item_id}")
def get_item(item_id: str):
    conn = get_db()
    if item_id.startswith('m:'):
        row = conn.execute("SELECT * FROM movies WHERE movie_id = ?", (item_id[2:],)).fetchone()
    elif item_id.startswith('s:'):
        row = conn.execute("SELECT * FROM shows WHERE show_id = ?", (item_id[2:],)).fetchone()
    else:
        raise HTTPException(400, "Use m:<id> or s:<id> format")
    conn.close()
    if not row:
        raise HTTPException(404, "Not found")
    return dict_row(row)

def parse_item_id(item_id: str) -> str:
    """Normalize an item id to canonical 'm:<id>' / 's:<id>' form.

    Search results return bare ids (movie_id integer or show_id string), but
    user_ratings stores canonical prefixed ids. Accept both.
    """
    item_id = str(item_id).strip()
    if item_id.startswith(('m:', 's:')):
        return item_id
    # bare id: try movies first, then shows
    conn = get_db()
    try:
        if conn.execute("SELECT 1 FROM movies WHERE movie_id = ?", (item_id,)).fetchone():
            return f"m:{item_id}"
        if conn.execute("SELECT 1 FROM shows WHERE show_id = ?", (item_id,)).fetchone():
            return f"s:{item_id}"
    finally:
        conn.close()
    raise HTTPException(400, f"Item '{item_id}' not found: must be m:<id> or s:<id>")

class RateRequest(BaseModel):
    user_id: int
    item_id: str   # "m:123"/"s:abc", or a bare movie/show id from search
    rating: float  # 0.5 to 5.0

@app.post("/rate")
def rate(req: RateRequest):
    if not (0.5 <= req.rating <= 5.0):
        raise HTTPException(400, "Rating must be 0.5-5.0")

    item_id = parse_item_id(req.item_id)

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO user_ratings (user_id, item_id, rating, timestamp) "
        "VALUES (?, ?, ?, CAST(strftime('%s','now') AS INTEGER))",
        (req.user_id, item_id, req.rating)
    )
    conn.commit()
    conn.close()
    return {"ok": True, "message": f"Rated {item_id} = {req.rating}"}

@app.get("/recommend")
def get_recommendations(user_id: int = 1, n: int = 10, item_type: str = None):
    recs = recommend(user_id, n=n, item_type=item_type)
    profile = get_user_profile(user_id)
    return {
        "user_id": user_id,
        "total_ratings": profile['total_ratings'],
        "recommendations": recs
    }

@app.get("/user/{user_id}/ratings")
def get_user_ratings(user_id: int):
    """Return the user's ratings enriched with item metadata.

    Backend does the JOIN so the frontend doesn't have to guess names via
    fuzzy search (which produced wrong titles). Each row includes
    title/name, type, year, genres, poster, tmdb_id.
    """
    conn = get_db()
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT item_id, rating, timestamp FROM user_ratings WHERE user_id = ? ORDER BY timestamp DESC",
        (user_id,)
    ).fetchall()

    out = []
    for r in rows:
        item_id = r['item_id']
        rating = r['rating']
        ts = r['timestamp']
        if item_id.startswith('m:'):
            row = cur.execute(
                "SELECT movie_id, title, year, genres, avg_rating, tmdb_id FROM movies WHERE movie_id = ?",
                (int(item_id[2:]),)
            ).fetchone()
            if row:
                out.append({
                    'item_id': item_id,
                    'type': 'movie',
                    'title': row['title'],
                    'year': row['year'] or 0,
                    'genres': row['genres'] or '',
                    'rating': rating,
                    'avg_rating': round(row['avg_rating'], 2) if row['avg_rating'] else 0,
                    'tmdb_id': row['tmdb_id'],
                    'poster_path': None,
                    'timestamp': ts,
                })
        elif item_id.startswith('s:'):
            row = cur.execute(
                "SELECT show_id, name, first_air_date, genres, vote_average, poster_path, tmdb_id "
                "FROM shows WHERE show_id = ?",
                (item_id[2:],)
            ).fetchone()
            if row:
                fa = row['first_air_date'] or ''
                out.append({
                    'item_id': item_id,
                    'type': 'show',
                    'title': row['name'] or '',
                    'year': int(fa[:4]) if len(fa) >= 4 else 0,
                    'genres': row['genres'] or '',
                    'rating': rating,
                    'avg_rating': round(row['vote_average'], 2) if row['vote_average'] else 0,
                    'tmdb_id': row['tmdb_id'],
                    'poster_path': row['poster_path'] or None,
                    'timestamp': ts,
                })
    conn.close()
    return out


@app.delete("/user/{user_id}/rating/{item_id}")
def delete_rating(user_id: int, item_id: str):
    """Permanently remove a user's rating for an item."""
    item_id = parse_item_id(item_id)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM user_ratings WHERE user_id = ? AND item_id = ?",
        (user_id, item_id)
    )
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": item_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)