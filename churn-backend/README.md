# Bank Churn Backend (FastAPI + scikit-learn)

## Run (VS Code terminal, inside this folder)
    python -m venv venv
    venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
    pip install -r requirements.txt
    python train.py                # optional: models/ is already included; re-run to retrain
    python test_api.py             # optional smoke test
    uvicorn app.main:app --reload  # API on http://localhost:8000  (docs: /docs)

## Endpoints
| Dashboard page            | Endpoint |
|---------------------------|----------|
| Executive Overview        | GET  /api/overview?geography=All|France|Germany|Spain |
| Churn Predictor           | POST /api/predict   ·   POST /api/simulate |
| Risk Watchlist            | GET  /api/watchlist?tier=&geography=&status=&search=&sort=&limit=&offset=  ·  GET /api/watchlist/export |
| Model Diagnostics         | GET  /api/diagnostics |
| Data & Model Info / Batch | GET  /api/model-info  ·  POST /api/batch-predict (CSV)  ·  GET /api/batch-template |
| History                   | GET  /api/history |

## Notes
- The deployed model is **Logistic Regression** with engineered features (age bands, age squared, geography x activity).
  Random Forest and Gradient Boosting are trained only as benchmarks for the Diagnostics page.
- If `models/model.joblib` was saved by a different scikit-learn version, the API retrains once automatically on start-up.
  You can also run `python train.py` yourself at any time.
