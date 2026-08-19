import csv
import sqlite3
import os
from pathlib import Path
from config import DATA_DIR, DB_PATH

MOVIES_CSV = os.path.join(DATA_DIR, 'ml-32m', 'movies.csv')
RATINGS_CSV = os.path.join(DATA_DIR, 'ml-32m', 'ratings.csv')
LINKS_CSV = os.path.join(DATA_DIR, 'ml-32m', 'links.csv')
TVS_CSV = os.path.join(DATA_DIR, 'tvs.csv', 'tvs.csv')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def extract_year(title: str) -> int | None:
    # Title format: "Toy Story (1995)" or "Title (year)"
    if '(' in title and ')' in title:
        try:
            year_str = title[title.rindex('(')+1:title.rindex(')')]
            return int(year_str)
        except:
            return None
    return None

def load_movies():
    print("Loading movies...")
    conn = get_db()
    cur = conn.cursor()
    
    # Build rating stats first
    print("  Computing rating stats...")
    rating_stats = {}
    with open(RATINGS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = int(row['movieId'])
            rating = float(row['rating'])
            if mid not in rating_stats:
                rating_stats[mid] = [0.0, 0]  # sum, count
            rating_stats[mid][0] += rating
            rating_stats[mid][1] += 1
    
    # Build link map
    print("  Loading links...")
    links = {}
    with open(LINKS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = int(row['movieId'])
            links[mid] = {
                'imdb_id': row['imdbId'],
                'tmdb_id': int(row['tmdbId']) if row['tmdbId'] else None
            }
    
    print("  Inserting movies...")
    batch = []
    with open(MOVIES_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = int(row['movieId'])
            title = row['title']
            genres = row['genres']
            year = extract_year(title)
            
            avg_rating = 0.0
            rating_count = 0
            if mid in rating_stats:
                avg_rating = rating_stats[mid][0] / rating_stats[mid][1]
                rating_count = rating_stats[mid][1]
            
            link = links.get(mid, {})
            
            batch.append((mid, title, genres, year, 
                         link.get('imdb_id'), link.get('tmdb_id'),
                         avg_rating, rating_count))
            
            if len(batch) >= 1000:
                cur.executemany("""
                    INSERT OR REPLACE INTO movies 
                    (movie_id, title, genres, year, imdb_id, tmdb_id, avg_rating, rating_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
                batch = []
    
    if batch:
        cur.executemany("""
            INSERT OR REPLACE INTO movies 
            (movie_id, title, genres, year, imdb_id, tmdb_id, avg_rating, rating_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, batch)
        conn.commit()
    
    conn.close()
    print(f"  Movies loaded: {len(rating_stats)} with ratings")

def load_tvs():
    print("Loading TV shows...")
    conn = get_db()
    cur = conn.cursor()
    
    # Filter criteria
    MIN_VOTE_COUNT = 50
    
    batch = []
    loaded = 0
    skipped = 0
    
    with open(TVS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Filter low quality
            overview = row.get('overview', '').strip()
            if not overview:
                skipped += 1
                continue
            
            # Collect genres
            genres = []
            for i in range(8):
                g = row.get(f'genres[{i}].name', '').strip()
                if g:
                    genres.append(g)
            if not genres:
                skipped += 1
                continue
            
            try:
                vote_count = int(row.get('vote_count', '0') or 0)
            except:
                vote_count = 0
            
            if vote_count < MIN_VOTE_COUNT:
                skipped += 1
                continue
            
            show_id = row.get('_id', '').strip()
            if not show_id:
                skipped += 1
                continue
            
            # Extract fields
            tmdb_id = row.get('id')
            try:
                tmdb_id = int(tmdb_id) if tmdb_id else None
            except:
                tmdb_id = None
            
            name = row.get('name', '').strip()
            original_name = row.get('original_name', '').strip()
            first_air = row.get('first_air_date', '').strip()
            last_air = row.get('last_air_date', '').strip()
            
            try:
                episodes = int(row.get('number_of_episodes', '0') or 0)
            except:
                episodes = 0
            
            try:
                seasons = int(row.get('number_of_seasons', '0') or 0)
            except:
                seasons = 0
            
            poster = row.get('poster_path', '').strip()
            
            try:
                vote_avg = float(row.get('vote_average', '0') or 0)
            except:
                vote_avg = 0.0
            
            try:
                popularity = float(row.get('popularity', '0') or 0)
            except:
                popularity = 0.0
            
            lang = row.get('original_language', '').strip()
            status = row.get('status', '').strip()
            
            batch.append((show_id, tmdb_id, name, original_name, overview,
                         ','.join(genres), first_air, last_air,
                         episodes, seasons, poster,
                         vote_avg, vote_count, popularity, lang, status))
            
            loaded += 1
            if len(batch) >= 500:
                cur.executemany("""
                    INSERT OR REPLACE INTO shows 
                    (show_id, tmdb_id, name, original_name, overview, genres,
                     first_air_date, last_air_date, number_of_episodes, number_of_seasons,
                     poster_path, vote_average, vote_count, popularity,
                     original_language, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                conn.commit()
                batch = []
    
    if batch:
        cur.executemany("""
            INSERT OR REPLACE INTO shows 
            (show_id, tmdb_id, name, original_name, overview, genres,
             first_air_date, last_air_date, number_of_episodes, number_of_seasons,
             poster_path, vote_average, vote_count, popularity,
             original_language, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, batch)
        conn.commit()
    
    conn.close()
    print(f"  Shows loaded: {loaded}, skipped: {skipped}")

def load_all():
    from db import init_db
    init_db()
    load_movies()
    load_tvs()
    print("Data loading complete!")

if __name__ == "__main__":
    load_all()