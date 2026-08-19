#!/usr/bin/env python3
"""
Offline precompute: train ALS model on MovieLens ratings → save user/item factors.
Run once: python precompute.py
"""
import sqlite3
import numpy as np
import os
import sys
from config import DB_PATH, ARTIFACTS_DIR, N_FACTORS, N_ITERATIONS, REGULARIZATION, SAMPLE_USERS

# Import implicit lazily
try:
    from implicit.als import AlternatingLeastSquares
except ImportError:
    print("ERROR: implicit not installed. Run: pip install implicit")
    sys.exit(1)

def load_ratings_matrix(sample_users=None):
    """Load ratings into CSR matrix for implicit ALS"""
    import scipy.sparse as sp
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get unique users and their counts
    cur.execute("""
        SELECT user_id, COUNT(*) as cnt 
        FROM user_ratings 
        WHERE item_id LIKE 'm:%'
        GROUP BY user_id 
        ORDER BY cnt DESC
    """)
    users = cur.fetchall()
    
    if sample_users and len(users) > sample_users:
        users = users[:sample_users]
    
    user_ids = [u[0] for u in users]
    user_to_idx = {u: i for i, u in enumerate(user_ids)}
    
    # Get all movie IDs present in ratings
    cur.execute("SELECT DISTINCT item_id FROM user_ratings WHERE item_id LIKE 'm:%'")
    item_ids = [int(r[0][2:]) for r in cur.fetchall()]
    item_to_idx = {mid: i for i, mid in enumerate(item_ids)}
    
    # Build COO matrix
    rows, cols, data = [], [], []
    for uid in user_ids:
        uidx = user_to_idx[uid]
        cur.execute("SELECT item_id, rating FROM user_ratings WHERE user_id=? AND item_id LIKE 'm:%'", (uid,))
        for item_id, rating in cur.fetchall():
            mid = int(item_id[2:])
            if mid in item_to_idx:
                rows.append(uidx)
                cols.append(item_to_idx[mid])
                data.append(rating - 2.5)  # center at 0 (implicit expects confidence)
    
    matrix = sp.csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(item_ids)))
    conn.close()
    
    return matrix, user_to_idx, item_to_idx

def train_als(matrix, factors=64, iterations=15, regularization=0.01):
    model = AlternatingLeastSquares(
        factors=factors,
        iterations=iterations,
        regularization=regularization,
        random_state=42,
        use_gpu=False
    )
    model.fit(matrix.T.tocsr())  # implicit expects item x user
    return model

def save_artifacts(model, user_to_idx, item_to_idx):
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    np.savez_compressed(os.path.join(ARTIFACTS_DIR, 'als_factors.npz'),
        user_factors=model.user_factors,
        item_factors=model.item_factors,
        user_ids=np.array(list(user_to_idx.keys())),
        item_ids=np.array(list(item_to_idx.keys())),
        user_to_idx=np.array(list(user_to_idx.items())),
        item_to_idx=np.array(list(item_to_idx.items()))
    )
    
    # Also save as pickle for quick load
    import pickle
    with open(os.path.join(ARTIFACTS_DIR, 'als_model.pkl'), 'wb') as f:
        pickle.dump({'model': model, 'user_to_idx': user_to_idx, 'item_to_idx': item_to_idx}, f)
    
    print(f"Saved ALS artifacts to {ARTIFACTS_DIR}")

def main():
    print("Loading ratings matrix...")
    matrix, user_to_idx, item_to_idx = load_ratings_matrix(SAMPLE_USERS)
    print(f"Matrix: {matrix.shape[0]} users x {matrix.shape[1]} movies, {matrix.nnz} ratings")
    
    print("Training ALS...")
    model = train_als(matrix, N_FACTORS, N_ITERATIONS, REGULARIZATION)
    print("Training complete")
    
    save_artifacts(model, user_to_idx, item_to_idx)
    
    # Quick evaluation on held-out
    print("Evaluating on held-out 20%...")
    import random
    random.seed(42)
    test_ratings = []
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT user_id, item_id, rating FROM user_ratings WHERE item_id LIKE 'm:%'")
    all_r = cur.fetchall()
    conn.close()
    
    # Split
    random.shuffle(all_r)
    split = int(len(all_r) * 0.8)
    train_r = all_r[:split]
    test_r = all_r[split:]
    
    # Map to indices
    pred_errors = []
    for uid, iid, rating in test_r[:1000]:  # sample 1k for speed
        mid = int(iid[2:])
        if uid in user_to_idx and mid in item_to_idx:
            uidx = user_to_idx[uid]
            iidx = item_to_idx[mid]
            pred = model.user_factors[uidx] @ model.item_factors[iidx] + 2.5
            pred_errors.append((rating - pred) ** 2)
    
    if pred_errors:
        rmse = np.sqrt(np.mean(pred_errors))
        print(f"RMSE on {len(pred_errors)} test ratings: {rmse:.4f}")

if __name__ == "__main__":
    main()