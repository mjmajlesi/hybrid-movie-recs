# Hybrid Movie & TV Recommender

A hybrid recommender system combining **ALS collaborative filtering** (trained on
MovieLens-32M) with **content-based filtering**, exposed via a FastAPI backend and a
React + Vite frontend.

## Architecture

```
backend/                 FastAPI (port 8000)
  main.py                API endpoints (/movies, /shows, /search, /item, /rate, /recommend)
  recommender.py         hybrid scoring: ALS + content + quality + recency
  precompute.py          trains ALS on data/ml-32m/ratings.csv → artifacts/
  fetch_overviews.py     backfills movie overviews from TMDB
  sync_posters.py        downloads poster covers → frontend/public/covers/movies/
  app.db                 SQLite (movies, shows, user_ratings) — WAL mode
frontend/                React 19 + Vite + Tailwind v4 (port 5178, proxies /api → :8000)
data/ml-32m/             MovieLens dataset (ratings.csv, movies.csv)
```

## Hybrid scoring

`score = 0.50·collab + 0.28·content + 0.12·quality + 0.10·recency` (weights in `config.py`)

- **Collab** — ALS prediction for the user×movie. App users are cold-started by
  *fold-in*: a ridge least-squares solve for their latent vector from ≥2 of their
  app ratings. Shows have no ALS signal (MovieLens is movie-only).
- **Content** — genre-profile match + era proximity.
- **Quality** — Bayesian average against MIN_VOTES=100 prior.
- **Recency** — preference-weighted release-year term.
- MMR-style diversity pass avoids same-genre runs at the top.
- MovieLens ratings are 0–5, TMDB show votes 0–10; shows are halved before scoring.

## Setup

```bash
# backend
cd backend
pip install -r requirements.txt
python precompute.py        # ~40s: train ALS (needs data/ml-32m/ratings.csv)
python -m uvicorn main:app --port 8000

# optional enrichment (needs TMDB_API_KEY or the baked-in key)
python sync_posters.py      # top-5000 posters → frontend/public/covers/movies/{tmdb_id}.jpg
python fetch_overviews.py   # top-5000 movie overviews → movies.overview

# frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5178
```

## Notes

- Item ids are `"m:<movieId>"` / `"s:<showId>"` everywhere (DB, API, routes).
- Users are demo-only: picked via `?u=<id>` URL param, no auth.
- Movie posters come from local covers (`frontend/public/covers/movies/{tmdb_id}.jpg`);
  TMDB's CDN doesn't serve images by numeric id. Shows use CDN URLs via `poster_path`.
