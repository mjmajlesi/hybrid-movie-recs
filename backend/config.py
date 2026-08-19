import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
DB_PATH = os.path.join(BASE_DIR, 'app.db')
ARTIFACTS_DIR = os.path.join(BASE_DIR, 'artifacts')

# Config for hybrid weights.
# W_COLLAB weights the ALS collaborative-filtering score (rating prediction 0-5).
# W_CONTENT weights the content/genre/year match, W_QUALITY the Bayesian quality
# bias, W_RECENCY the era recency term.
#
# Adjusted weights: more emphasis on collaborative signal since we now have
# a trained ALS model. User preferences dominate over generic content.
W_COLLAB = 0.50
W_CONTENT = 0.28
W_QUALITY = 0.12
W_RECENCY = 0.10

# Training config
N_FACTORS = 64
N_ITERATIONS = 15
REGULARIZATION = 0.01
SAMPLE_USERS = 50000  # subset of 200K for training

# Quality bias
MIN_VOTES = 100  # Bayesian prior m

# Recency
RECENCY_WINDOW = 15  # years