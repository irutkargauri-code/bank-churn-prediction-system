"""Model loading, scoring, explanations and portfolio statistics."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app import features  # noqa: F401  (must be importable for joblib to unpickle the pipeline)

ROOT = Path(__file__).resolve().parent.parent


def _load_model():
    """Load the saved model; if it is missing or was saved by an incompatible scikit-learn, retrain automatically."""
    import sys, warnings
    sys.path.insert(0, str(ROOT))
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error")        # a version-mismatch warning means the pickle is not trustworthy
            return joblib.load(ROOT / "models" / "model.joblib")
    except Exception as e:
        print(f"[churn] Saved model unusable ({type(e).__name__}); retraining once...")
        import train
        train.main()
        return joblib.load(ROOT / "models" / "model.joblib")


MODEL = _load_model()
META = json.loads((ROOT / "models" / "metadata.json").read_text())
RAW = pd.read_csv(ROOT / "data" / "Churn_Modelling.csv")
SCORED = pd.read_csv(ROOT / "models" / "scored_customers.csv")
THRESHOLD = META["threshold"]
REF = META["reference_customer"]
FEATURES = features.RAW_FEATURES


def risk_tier(p: float) -> str:
    return "High" if p >= 0.60 else "Medium" if p >= 0.30 else "Low"


def score_df(df: pd.DataFrame) -> np.ndarray:
    return MODEL.predict_proba(df[FEATURES])[:, 1]


def score_one(c: dict) -> float:
    return float(score_df(pd.DataFrame([c]))[0])


def explain(c: dict) -> list[dict]:
    """Model-agnostic impact: how much does the churn probability change if this
    feature were replaced by the typical customer's value? (+ = adds risk)."""
    base = score_one(c)
    out = []
    for f in FEATURES:
        alt = {**c, f: REF[f] if isinstance(REF[f], str) else type(c[f])(REF[f])}
        out.append({"feature": f, "value": c[f], "impact": round(base - score_one(alt), 4)})
    return sorted(out, key=lambda d: -abs(d["impact"]))


def suggestions(c: dict, drivers: list[dict]) -> list[dict]:
    p0, tips = score_one(c), []

    def try_change(change, text):
        p1 = score_one({**c, **change})
        if p1 < p0 - 0.02:
            tips.append({"action": text, "new_probability": round(p1, 4), "reduction": round(p0 - p1, 4)})

    if not c["IsActiveMember"]:
        try_change({"IsActiveMember": 1}, "Re-engage: move the customer to active (app/card usage campaign)")
    if c["NumOfProducts"] == 1:
        try_change({"NumOfProducts": 2}, "Cross-sell a second product (2 products is the retention sweet spot)")
    if c["NumOfProducts"] >= 3:
        try_change({"NumOfProducts": 2}, "Review the product bundle: 3+ products shows heavy churn (fees, friction)")
    if 45 <= c["Age"] <= 60:
        tips.append({"action": "Assign a relationship manager: customers aged 45-60 churn the most",
                     "new_probability": None, "reduction": None})
    return sorted(tips, key=lambda t: -(t["reduction"] or 0))


def predict(c: dict) -> dict:
    p = score_one(c)
    drivers = explain(c)
    return {"probability": round(p, 4), "risk_tier": risk_tier(p), "threshold": THRESHOLD,
            "predicted_churn": int(p >= THRESHOLD), "model": META["selected_model"],
            "drivers": drivers[:6], "suggestions": suggestions(c, drivers)}


def simulate(c: dict, actions: list[str]) -> dict:
    new = dict(c)
    for a in actions:
        if a == "make_active":
            new["IsActiveMember"] = 1
        elif a == "add_product":
            new["NumOfProducts"] = min(2, new["NumOfProducts"] + 1) if new["NumOfProducts"] < 2 else new["NumOfProducts"]
        elif a == "remove_extra_products":
            new["NumOfProducts"] = min(new["NumOfProducts"], 2)
    b, a_ = score_one(c), score_one(new)
    return {"before": round(b, 4), "after": round(a_, 4), "change": round(a_ - b, 4),
            "risk_before": risk_tier(b), "risk_after": risk_tier(a_), "scenario": new}


def _rate(g):  # churn rate in %
    return round(g["Exited"].mean() * 100, 2)


def overview(geography: str = "All") -> dict:
    d = RAW if geography == "All" else RAW[RAW["Geography"] == geography]
    s = SCORED.set_index("CustomerId").loc[d["CustomerId"]]
    flagged = s["probability"] >= THRESHOLD

    def group(col, bins=None, labels=None):
        key = pd.cut(d[col], bins, labels=labels, right=False) if bins is not None else d[col]
        rows = d.groupby(key, observed=True)["Exited"].agg(["size", "sum", "mean"]).reset_index()
        return [{"name": str(int(r[col])) if col in ("NumOfProducts", "IsActiveMember") else str(r[col]),
                 "customers": int(r["size"]), "churned": int(r["sum"]), "churn_rate": round(r["mean"] * 100, 2)}
                for _, r in rows.iterrows()]

    return {
        "geography": geography, "total_accounts": len(d), "churned": int(d["Exited"].sum()),
        "retained": int((1 - d["Exited"]).sum()), "churn_rate": _rate(d),
        "total_balance": round(float(d["Balance"].sum()), 2), "avg_balance": round(float(d["Balance"].mean()), 2),
        "avg_credit_score": round(float(d["CreditScore"].mean()), 1),
        "predicted_high_risk": int(flagged.sum()), "threshold": THRESHOLD,
        "expected_balance_at_risk": round(float((s["probability"] * s["Balance"]).sum()), 2),
        "by_geography": group("Geography"),
        "by_products": group("NumOfProducts"),
        "by_age": group("Age", [0, 30, 40, 50, 60, 200], ["<30", "30-39", "40-49", "50-59", "60+"]),
        "by_activity": [{**r, "name": "Active" if r["name"] == "1" else "Inactive"} for r in group("IsActiveMember")],
        "by_balance": group("Balance", [-1, 1, 100000, 1e12], ["$0", "$1-$99,999", "$100k+"]),
        "by_gender": group("Gender"),
    }


def watchlist(geography="All", tier="All", status="All", search="", sort="probability", order="desc",
              limit=30, offset=0) -> dict:
    d = SCORED.copy()
    d["risk_tier"] = d["probability"].map(risk_tier)
    d["money_at_risk"] = (d["probability"] * d["Balance"]).round(2)
    if geography != "All": d = d[d["Geography"] == geography]
    if tier != "All": d = d[d["risk_tier"] == tier]
    if status == "Exited": d = d[d["Exited"] == 1]
    if status == "Retained": d = d[d["Exited"] == 0]
    if search:
        d = d[d["Surname"].str.contains(search, case=False, na=False) | d["CustomerId"].astype(str).str.contains(search)]
    d = d.sort_values(sort, ascending=(order == "asc"))
    return {"total": len(d), "rows": json.loads(d.iloc[offset:offset + limit].to_json(orient="records"))}


def diagnostics() -> dict:
    return {k: META[k] for k in ("selected_model", "threshold", "models", "test_size", "train_size",
                                 "confusion_matrix", "roc_curve", "threshold_table", "feature_importance",
                                 "logistic_odds_ratios")}


def model_info() -> dict:
    return {"records": len(RAW), "columns": RAW.shape[1], "missing_values": int(RAW.isna().sum().sum()),
            "target": "Exited", "churn_rate": META["churn_rate"], "selected_model": META["selected_model"],
            "dropped_columns": ["RowNumber", "CustomerId", "Surname"],
            "preprocessing": ["One-hot encode Geography, Gender, NumOfProducts", "Scale numeric columns",
                              "BalanceZero flag"],
            "evaluation": f"{META['train_size']} train / {META['test_size']} stratified held-out test"}
