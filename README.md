# Bank Customer Churn Prediction System

A full-stack web app that predicts which bank customers are likely to leave, explains why, and suggests retention actions.
Built on the public *Churn Modelling* dataset (10,000 customers, 20.4% churn).

## Features
- **Executive Overview:** churn rate by country, age, products, activity, balance and gender, with auto-generated insights.
- **Churn Predictor:** risk gauge, the factors driving each score, and what-if retention actions (e.g. make the customer active, add a second product).
- **Risk Watchlist:** customers ranked by churn probability and money at risk, with filters, search and CSV export.
- **Model Diagnostics:** ROC curve, confusion matrix, threshold trade-off, feature importance, odds ratios and a model comparison.
- **Batch scoring:** upload a CSV and score many customers at once.

## Model
Logistic Regression with engineered features (age bands, age squared, geography x activity), compared against Random Forest and Gradient Boosting.
Evaluated on a stratified 20% held-out test set.

| Metric | Value |
|---|---|
| ROC-AUC | 0.850 |
| PR-AUC | 0.697 |
| Recall | 66.8% |
| Precision | 56.5% |
| Decision cutoff | 0.28 (chosen to maximise F1) |

## Tech stack
| Layer | Tools |
|---|---|
| ML | pandas, scikit-learn |
| Backend | FastAPI, Pydantic, SQLite |
| Frontend | React, Vite, Tailwind CSS |

## Project structure
```
churn-backend/    FastAPI API, training script (train.py), model + data
churn-frontend/   React dashboard
```

## Run locally
**Backend**
```bash
cd churn-backend
python -m venv venv
venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn app.main:app --reload  # http://localhost:8000/docs
```
**Frontend** (second terminal)
```bash
cd churn-frontend
npm install
npm run dev                    # http://localhost:5173
```

## API
| Endpoint | Purpose |
|---|---|
| `GET /api/overview` | Portfolio statistics |
| `POST /api/predict` | Score one customer, with drivers and suggestions |
| `POST /api/simulate` | Before/after risk for retention actions |
| `GET /api/watchlist` | Ranked, filterable customer list |
| `GET /api/diagnostics` | Model metrics and charts data |
| `POST /api/batch-predict` | Score a CSV file |

## Screenshots
Add screenshots here, for example `docs/overview.png`.

## Future work
Docker and cloud deployment, SHAP explanations, authentication, and a prediction history page.
