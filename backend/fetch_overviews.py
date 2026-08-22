#!/usr/bin/env python3
"""
Backfill the empty movies.overview column from TMDB for the top-N most
rated movies. Idempotent: skips rows that already have an overview.
Run: python fetch_overviews.py  [N]
"""
import json
import sqlite3
import sys
import time
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB = BASE_DIR / 'app.db'
API_KEY = '654daf866fb9477a9c0204c3ca80b2b6'  # same key as sync_posters.py
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 5000

def fetch_overview(tmdb_id: int) -> str | None:
    url = f'https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={API_KEY}&language=en-US'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ReelRecs/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read()).get('overview') or None
    except Exception:
        return None

def main():
    conn = sqlite3.connect(str(DB), timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')  # readers (API) never block on our writes
    conn.commit()
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT movie_id, tmdb_id FROM movies "
        "WHERE tmdb_id IS NOT NULL AND (overview IS NULL OR overview = '') "
        "ORDER BY rating_count DESC LIMIT ?", (LIMIT,)
    ).fetchall()
    print(f"[fetch_overviews] {len(rows)} movies to backfill")

    done = failed = 0
    for i, (movie_id, tmdb_id) in enumerate(rows):
        overview = fetch_overview(tmdb_id)
        if overview:
            cur.execute("UPDATE movies SET overview = ? WHERE movie_id = ?", (overview, movie_id))
            conn.commit()  # commit per row: keep the write lock for milliseconds
            done += 1
        else:
            failed += 1
        if i % 500 == 499:
            print(f"  [{i+1}/{len(rows)}] {done} filled, {failed} failed")
        time.sleep(0.25)  # ~4 req/s, polite

    conn.commit()
    conn.close()
    print(f"[fetch_overviews] Done: {done} filled, {failed} failed/skipped")

if __name__ == '__main__':
    main()
