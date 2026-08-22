<div align="center">

# 🎬 ReelRecs

### Hybrid Movie & TV Recommender

**Collaborative filtering meets content-based intelligence** — powered by ALS trained on
22M+ real ratings, served through a modern FastAPI + React stack.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.127-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## ✨ What is this?

ReelRecs is a full-stack recommendation engine that answers one question:

> *"Given a handful of movies/shows you've rated, what should you watch next?"*

It doesn't guess from genres alone. It blends **four independent signals** into a single
hybrid score, anchored by a matrix-factorization model trained on the full
[MovieLens-32M](https://grouplens.org/datasets/movielens/) dataset — so even a brand-new
user with just **two ratings** gets genuinely personalized predictions.

## 🧠 How recommendations work

Every candidate title gets scored by a weighted blend of four signals:

```
score = 0.50 · collaborative   ← ALS rating prediction (personalized)
      + 0.28 · content         ← genre-profile match + era proximity
      + 0.12 · quality         ← Bayesian average vs. MIN_VOTES prior
      + 0.10 · recency         ← preference-weighted release-year term
```

| Signal | How it works |
|---|---|
| 🤝 **Collaborative** | An ALS model (`implicit` lib, 64 factors) trained offline on 22.4M MovieLens ratings across 83k movies. App users are **cold-started via fold-in**: a ridge least-squares solve recovers their latent vector from as few as 2 app ratings. |
| 🎭 **Content** | A genre-weight profile built from everything you've rated, plus an era-affinity term that rewards titles near your preferred release years. |
| ⭐ **Quality** | Bayesian shrinkage toward a 2.5★ prior — a 4.9★ film with 12 votes can't outrank a 4.2★ classic with 90,000 votes. |
| 🕰️ **Recency** | Titles closer to your preferred era score higher; keeps the list feeling current without ignoring classics. |

On top of the raw scores, an **MMR-style diversity pass** prevents five thrillers in a row,
and **rating scales are normalized** (MovieLens 0–5, TMDB 0–10 → ÷2) so shows and movies
compete fairly on the same leaderboard.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        data/ml-32m/ratings.csv                  │
│                     22.4M ratings · 200K users                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │  python precompute.py (~40s)
                               ▼
                    ┌──────────────────────┐
                    │  artifacts/          │
                    │  als_model.pkl       │   user_factors × item_factors
                    └──────────┬───────────┘
                               │ loaded lazily at first request
┌──────────────┐    ┌──────────▼───────────┐     ┌──────────────────┐
│   React 19   │    │      FastAPI         │     │  SQLite (WAL)    │
│   Vite 8     │◄──►│  /recommend /rate    │◄───►│  87k movies      │
│   Tailwind 4 │API │  /search /item …     │ SQL │  4.2k shows      │
│              │    │                      │     │  user_ratings    │
└──────────────┘    └──────────────────────┘     └──────────────────┘
```

**Cold-start flow** (new user rates 2+ titles):

```
ratings ──► ridge solve: argmin ‖Y·u − r‖² + λ‖u‖²  ──► personal latent vector u
                                                              │
        every candidate movie ◄── u · item_factorᵢ + 2.5 ─────┘
```

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+
- [MovieLens-32M](https://grouplens.org/datasets/movielens/) extracted to `data/ml-32m/`

### 1. Train the model & start the backend

```bash
cd backend
pip install -r requirements.txt

python precompute.py            # trains ALS on ratings.csv → artifacts/ (~40s)
python -m uvicorn main:app --port 8000
```

> Interactive docs open at <http://localhost:8000/docs>

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5178 (proxies /api → :8000)
```

### 3. Enrich the catalog *(optional but recommended)*

```bash
cd backend
python sync_posters.py          # top-5000 posters → frontend/public/covers/movies/
python fetch_overviews.py       # top-5000 plot summaries → movies.overview
```

Both are idempotent, resumable, and rate-limited (~4 req/s). Posters land as
`covers/movies/{tmdb_id}.jpg`; the frontend serves them locally because TMDB's image CDN
doesn't resolve numeric ids directly.

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` | `/movies?limit=&offset=` | Movies ordered by popularity |
| `GET` | `/shows?limit=&offset=` | Shows ordered by vote count |
| `GET` | `/search?q=matrix` | Prefix search across movies + shows |
| `GET` | `/item/{item_id}` | Full metadata for `m:<id>` or `s:<id>` |
| `POST` | `/rate` | Upsert a rating `{user_id, item_id, rating}` |
| `DELETE` | `/user/{uid}/rating/{item_id}` | Remove a rating |
| `GET` | `/user/{uid}/ratings` | User's ratings joined with metadata |
| `GET` | `/recommend?user_id=&n=` | Top-n hybrid recommendations |

Item ids are canonical everywhere — `"m:<movieId>"` for films, `"s:<showId>"` for series.
Bare ids are accepted on write endpoints and normalized automatically.

## 📁 Project Structure

```
hybrid-movie-recs/
├── backend/
│   ├── main.py               # FastAPI routes
│   ├── recommender.py        # hybrid scoring + cold-start fold-in
│   ├── precompute.py         # ALS training pipeline
│   ├── fetch_overviews.py    # TMDB overview backfill
│   ├── sync_posters.py       # poster cover downloader
│   ├── test_recommender.py   # assert-based self-checks
│   ├── config.py             # weights, factors, priors
│   ├── db.py                 # schema + indexes
│   └── app.db                # SQLite database (WAL mode)
├── frontend/
│   ├── src/pages/            # Landing · Onboarding · Home · Detail · Ratings
│   ├── src/components/       # MovieCard · StarRating · Button
│   ├── src/utils/            # useUserId · media helpers
│   └── public/covers/        # local poster cache (~10k images)
└── data/ml-32m/              # MovieLens dataset (not committed)
```

## 🎯 Feature Highlights

- **⚡ Fast cold-start** — meaningful personalization from just 2 ratings, no retraining needed
- **🧮 True hybrid** — collaborative signal dominates but content/quality/recency keep it robust
- **🎨 Fair cross-type ranking** — movies and shows normalized onto one scale
- **🌈 Diversity-aware** — MMR pass stops genre monotony at the top of the list
- **🖼️ Self-hosted covers** — 97%+ of top movies have local posters; zero broken images
- **🔄 Live updates** — rating a title instantly invalidates the cached fold-in vector
- **📱 Responsive dark UI** — Tailwind v4, mobile-first bottom nav, skeleton loading states

## 📊 Model Card

| Parameter | Value |
|---|---|
| Training data | MovieLens-32M `ratings.csv` |
| Users sampled | 50,000 most active |
| Ratings used | 22,416,065 |
| Items | 83,363 movies |
| Factors / iterations / reg | 64 / 15 / 0.01 |
| Validation RMSE (centred) | **≈ 1.08** (≈ 0.44★ on the 0–5 scale) |
| Fold-in ridge reg | `λ = 0.01 × n_observed` (matches implicit's per-user lambda) |

## ⚠️ Known Limitations

- **No auth** — users are demo personas selected via `?u=<id>`; fine for demos, swap in real auth for production.
- **Shows have no collaborative signal** — MovieLens is movie-only, so series rely on content/quality/recency.
- **Single-node SQLite** — perfect for this scale; move to Postgres if you outgrow it.

## 📄 License

See [LICENSE](LICENSE).

---

<div align="center">
Built with ❤️ using FastAPI · implicit · React · Tailwind
</div>
