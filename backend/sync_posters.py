#!/usr/bin/env python3
"""
Download movie posters from TMDB into frontend/public/covers/movies/.
Files are named as {tmdb_id}.jpg for direct URL construction.
"""
import os
import sys
import json
import sqlite3
import urllib.request
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB = BASE_DIR / 'backend' / 'app.db'
COVERS_DIR = BASE_DIR / 'frontend' / 'public' / 'covers' / 'movies'
TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'
API_KEY = os.environ.get('TMDB_API_KEY', '654daf866fb9477a9c0204c3ca80b2b6')

# Top 5000 movies by rating_count (popular)
SQL = """
    SELECT movie_id, tmdb_id FROM movies
    WHERE tmdb_id IS NOT NULL
    ORDER BY rating_count DESC
    LIMIT 5000
"""


def fetch_poster_url(tmdb_id: int) -> str | None:
    """Call TMDB API to get the poster_path for a given tmdb_id."""
    url = f'https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={API_KEY}&language=en-US'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ReelRecs/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
        return data.get('poster_path')
    except Exception:
        return None


def download(url: str, dest: Path) -> bool:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ReelRecs/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                dest.write_bytes(resp.read())
                return True
    except Exception:
        return False


def main():
    if not API_KEY:
        print("ERROR: Set TMDB_API_KEY env var.")
        sys.exit(1)

    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()
    cur.execute(SQL)
    rows = cur.fetchall()
    conn.close()

    print(f"[sync_posters] {len(rows)} movies to check/refresh")
    fetched = existing = missing = failed = 0

    for i, (movie_id, tmdb_id) in enumerate(rows):
        dest = COVERS_DIR / f'{tmdb_id}.jpg'
        if dest.exists() and dest.stat().st_size > 1000:
            existing += 1
            continue

        # Get poster_path from TMDB API
        poster_path = fetch_poster_url(tmdb_id)
        if poster_path:
            full_url = TMDB_IMAGE_BASE + poster_path
            if download(full_url, dest):
                fetched += 1
                tag = f"tmdb:{tmdb_id} -> movie:{movie_id}"
                if i % 100 == 0:
                    print(f"  [{i}/{len(rows)}] OK {tag}")
            else:
                failed += 1
        else:
            missing += 1

        # Polite rate limit (~4 req/s)
        time.sleep(0.25)

    print(f"\n[sync_posters] Summary: {fetched} new, {existing} existing, {missing} no poster, {failed} download failed")
    print(f"[sync_posters] Covers dir: {COVERS_DIR}")


if __name__ == '__main__':
    main()