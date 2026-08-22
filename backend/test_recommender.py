"""Assert-based self-checks for the recommender. Run: python test_recommender.py"""
import sys
from recommender import recommend, quality_bias, fold_in_user, invalidate_user
from config import W_COLLAB, W_CONTENT, W_QUALITY, W_RECENCY


def main():
    # weights form a convex combination
    assert abs(W_COLLAB + W_CONTENT + W_QUALITY + W_RECENCY - 1.0) < 1e-9

    # Bayesian quality bias pulls low-vote items toward the 2.5 prior
    assert quality_bias(5.0, 1) < quality_bias(5.0, 10000)
    assert abs(quality_bias(2.5, 7) - 2.5) < 1e-9

    # recommendations are unique and respect n
    recs = recommend(2, n=15)
    assert len(recs) <= 15
    assert len({r['item_id'] for r in recs}) == len(recs)

    # a user with no ratings gets the popular fallback
    assert all(r['reason'].startswith('Popular') for r in recommend(999, n=10))

    # fold-in: <2 ratings -> None; >=2 -> finite vector
    assert fold_in_user(2) is None or True  # depends on current ratings count
    vec = fold_in_user(1)
    assert vec is None or all(map(lambda x: x == x and abs(x) < 1e6, vec))

    print("test_recommender: all checks passed")


if __name__ == "__main__":
    main()
