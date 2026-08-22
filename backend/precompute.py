#!/usr/bin/env python3
"""
Offline precompute: train ALS on the full MovieLens-32m ratings.csv
(not the live user_ratings table, which only holds a handful of app ratings).
Run: python precompute.py
"""
import os
import sys
import csv
import pickle
import random
import numpy as np
from config import DATA_DIR, ARTIFACTS_DIR, N_FACTORS, N_ITERATIONS, REGULARIZATION, SAMPLE_USERS

RATINGS_CSV = os.path.join(DATA_DIR, 'ml-32m', 'ratings.csv')

try:
    from implicit.als import AlternatingLeastSquares
except ImportError:
    print("ERROR: implicit not installed. Run: pip install implicit")
    sys.exit(1)


def load_ratings(sample_users=None, seed=42):
    """Read ratings.csv into (user_ids, item_ids, ratings) arrays.

    sample_users: keep only the N most active users (None = all ~200k,
    which trains slowly on CPU).
    """
    import scipy.sparse as sp

    print("Reading ratings.csv ...")
    by_user = {}
    with open(RATINGS_CSV, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            uid = int(row['userId'])
            by_user.setdefault(uid, []).append((int(row['movieId']), float(row['rating'])))

    users = sorted(by_user, key=lambda u: -len(by_user[u]))
    if sample_users and len(users) > sample_users:
        users = users[:sample_users]

    user_to_idx = {u: i for i, u in enumerate(users)}
    item_ids = sorted({mid for u in users for mid, _ in by_user[u]})
    item_to_idx = {mid: i for i, mid in enumerate(item_ids)}

    rows, cols, data = [], [], []
    for u in users:
        uidx = user_to_idx[u]
        for mid, r in by_user[u]:
            rows.append(uidx)
            cols.append(item_to_idx[mid])
            data.append(r - 2.5)  # centre ratings at 0 for implicit ALS
    matrix = sp.csr_matrix((data, (rows, cols)), shape=(len(users), len(item_ids)))
    print(f"Matrix: {matrix.shape[0]} users x {matrix.shape[1]} movies, {matrix.nnz} ratings")
    return matrix, user_to_idx, item_to_idx


def train(matrix):
    model = AlternatingLeastSquares(
        factors=N_FACTORS,
        iterations=N_ITERATIONS,
        regularization=REGULARIZATION,
        random_state=42,
        use_gpu=False,
    )
    model.fit(matrix.tocsr())  # modern implicit expects users x items
    return model


def main():
    matrix, user_to_idx, item_to_idx = load_ratings(SAMPLE_USERS)
    print("Training ALS ...")
    model = train(matrix)

    # Sanity check: RMSE on a sample of known training ratings.
    rng = random.Random(42)
    coo = matrix.tocoo()
    pairs = list(zip(coo.row.tolist(), coo.col.tolist(), coo.data.tolist()))
    sample = rng.sample(pairs, min(2000, len(pairs)))
    errs = [
        (centered - float(model.user_factors[r] @ model.item_factors[c])) ** 2
        for r, c, centered in sample
    ]
    print(f"RMSE (centred) on {len(errs)} sampled ratings: {np.sqrt(np.mean(errs)):.4f}")

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    np.savez_compressed(
        os.path.join(ARTIFACTS_DIR, 'als_factors.npz'),
        user_factors=model.user_factors,
        item_factors=model.item_factors,
        user_ids=np.array(list(user_to_idx.keys())),
        item_ids=np.array(list(item_to_idx.keys())),
    )
    with open(os.path.join(ARTIFACTS_DIR, 'als_model.pkl'), 'wb') as f:
        pickle.dump({'model': model, 'user_to_idx': user_to_idx, 'item_to_idx': item_to_idx}, f)
    print(f"Saved ALS artifacts to {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
