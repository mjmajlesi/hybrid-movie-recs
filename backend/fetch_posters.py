"""
Fetch movie posters from TMDB and save to frontend/public/covers/movies/.
Only top-rated/popular movies (rating_count threshold) to keep it fast.
Requires TMDB_API_KEY env var (optional - will skip if absent).
"""
import os
import sys
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
FRONTEND_PUBLIC = BACKEND.parent / 'frontend' / 'public'
COVERS_DIR = FRONTEND_PUBLIC / 'covers' / 'movies'
COVERS_DIR.mkdir(parents=True, exist_ok=True)

TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '')  # optional
TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

# Lower bound on rating_count so we only fetch popular movies (fast + useful)
MIN_RATING_COUNT = 1000
LIMIT = int(os.environ.get('POSTER_LIMIT', '3000'))


def get_db():
    conn = sqlite3.connect(str(BACKEND / 'app.db'))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_from_tmdb(tmdb_id: int) -> str | None:
    """Try TMDB API to get poster path for a tmdb_id."""
    if not TMDB_API_KEY:
        return None
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            import json
            data = json.loads(resp.read())
            return data.get('poster_path')
    except Exception:
        return None


def download_poster(poster_path: str, movie_id: int) -> bool:
    if not poster_path:
        return False
    url = TMDB_IMAGE_BASE + poster_path
    dest = COVERS_DIR / f"{movie_id}.jpg"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            dest.write_bytes(resp.read())
        return True
    except Exception:
        return False


def main():
    conn = get_db()
    cur = conn.cursor()

    # Movies with tmdb_id and enough ratings, ordered by popularity
    cur.execute(
        "SELECT movie_id, tmdb_id, title FROM movies "
        "WHERE tmdb_id IS NOT NULL AND rating_count >= ? "
        "ORDER BY rating_count DESC LIMIT ?",
        (MIN_RATING_COUNT, LIMIT)
    )
    rows = cur.fetchall()
    conn.close()

    print(f"Fetching posters for {len(rows)} movies...")
    fetched = 0
    skipped = 0

    for r in rows:
        movie_id = r['movie_id']
        tmdb_id = r['tmdb_id']
        dest = COVERS_DIR / f"{movie_id}.jpg"

        # Already has local file?
        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue

        if TMDB_API_KEY:
            poster_path = fetch_from_tmdb(tmdb_id)
            if download_poster(poster_path, movie_id):
                fetched += 1
            else:
                skipped += 1
        else:
            # No API key: try direct image URL by tmdb_id (TMDB often serves
            # /t/p/w342/<tmdb_id>.jpg but not reliably; attempt best-effort)
            if download_poster(f"/{tmdb_id}.jpg", movie_id):
                fetched += 1
            else:
                skipped += 1

    print(f"Fetched: {fetched}, Skipped/existing: {skipped}")
    print(f"Saved to: {COVERS_DIR}")


if __name__ == '__main__':
    main()
