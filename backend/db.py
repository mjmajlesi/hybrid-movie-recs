import sqlite3
import os
from config import DB_PATH

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS movies (
            movie_id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genres TEXT,  -- pipe-separated
            year INTEGER,
            imdb_id TEXT,
            tmdb_id INTEGER,
            avg_rating REAL DEFAULT 0,
            rating_count INTEGER DEFAULT 0
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS shows (
            show_id TEXT PRIMARY KEY,  -- TMDB ID as string
            tmdb_id INTEGER,
            name TEXT NOT NULL,
            original_name TEXT,
            overview TEXT,
            genres TEXT,  -- comma-separated names
            first_air_date TEXT,
            last_air_date TEXT,
            number_of_episodes INTEGER,
            number_of_seasons INTEGER,
            poster_path TEXT,
            vote_average REAL,
            vote_count INTEGER,
            popularity REAL,
            original_language TEXT,
            status TEXT,
            avg_rating REAL DEFAULT 0,
            rating_count INTEGER DEFAULT 0
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_ratings (
            user_id INTEGER,
            item_id TEXT,  -- 'm:{movie_id}' or 's:{show_id}'
            rating REAL,
            timestamp INTEGER,
            PRIMARY KEY (user_id, item_id)
        )
    """)
    
    # Indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies(genres)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_shows_genres ON shows(genres)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_shows_first_air ON shows(first_air_date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_user_ratings_item ON user_ratings(item_id)")
    
    conn.commit()
    conn.close()
    print("Database initialized")

if __name__ == "__main__":
    init_db()