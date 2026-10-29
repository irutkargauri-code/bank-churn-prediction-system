"""Train, compare and save the churn model.   Run:  python train.py

The DEPLOYED model is Logistic Regression (interpretable, with engineered features).
Random Forest and Gradient Boosting are trained only as benchmarks for the Diagnostics page.
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

from app.features import CATEGORICAL, NUMERIC, RAW_FEATURES, add_features

ROOT = Path(__file__).parent
SEED = 42
DEPLOY_MODEL = "Logistic Regression"


def make_pipeline(estimator):
    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
        ("num", StandardScaler(), NUMERIC),
    ])
    return Pipeline([("features", FunctionTransformer(add_features)), ("prep", pre), ("model", estimator)])


def fbeta(p, r, beta=1.0):
    return 0 if p + r == 0 else (1 + beta**2) * p * r / (beta**2 * p + r)


def best_threshold(y_true, proba):
    """Cutoff that maximises F1. Raise `beta` in fbeta() to favour catching churners over avoiding false alarms."""
    grid = np.arange(0.10, 0.80, 0.01)
    scores = [fbeta(precision_score(y_true, proba >= t, zero_division=0), recall_score(y_true, proba >= t)) for t in grid]
    return float(grid[int(np.argmax(scores))])


def main():
    df = pd.read_csv(ROOT / "data" / "Churn_Modelling.csv")
    y = df["Exited"]
    candidates = {
        "Logistic Regression": LogisticRegression(max_iter=3000),
        "Random Forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=SEED),
        "Gradient Boosting": HistGradientBoostingClassifier(learning_rate=0.06, max_iter=300, max_leaf_nodes=15,
                                                            l2_regularization=1.0, random_state=SEED),
    }
    Xtr, Xte, ytr, yte = train_test_split(df, y, test_size=0.2, stratify=y, random_state=SEED)
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)

    results, fitted = {}, {}
    for name, est in candidates.items():
        pipe = make_pipeline(est)
        oof = cross_val_predict(pipe, Xtr, ytr, cv=cv, method="predict_proba")[:, 1]
        thr = best_threshold(ytr, oof)
        pipe.fit(Xtr, ytr)
        p = pipe.predict_proba(Xte)[:, 1]
        pred = p >= thr
        results[name] = {
            "roc_auc": round(roc_auc_score(yte, p), 4), "pr_auc": round(average_precision_score(yte, p), 4),
            "accuracy": round(accuracy_score(yte, pred), 4), "precision": round(precision_score(yte, pred), 4),
            "recall": round(recall_score(yte, pred), 4), "f1": round(f1_score(yte, pred), 4),
            "threshold": round(thr, 2), "cv_roc_auc": round(roc_auc_score(ytr, oof), 4),
        }
        fitted[name] = (pipe, p, thr)
        print(f"{name:20s}", results[name])

    best = DEPLOY_MODEL
    pipe, p_test, thr = fitted[best]
    print("\nDeployed model:", best)

    # Final model: refit on ALL data for deployment; metrics above stay honest (held-out test set).
    joblib.dump(make_pipeline(candidates[best]).fit(df, y), ROOT / "models" / "model.joblib")

    # Honest (out-of-fold) probability for every customer -> used by the watchlist.
    oof_all = cross_val_predict(make_pipeline(candidates[best]), df, y, cv=cv, method="predict_proba")[:, 1]
    scored = df[["CustomerId", "Surname", "Geography", "Gender", "Age", "CreditScore", "Balance",
                 "NumOfProducts", "IsActiveMember", "Exited"]].copy()
    scored["probability"] = oof_all.round(4)
    scored.to_csv(ROOT / "models" / "scored_customers.csv", index=False)

    tn, fp, fn, tp = confusion_matrix(yte, p_test >= thr).ravel()
    fpr, tpr, _ = roc_curve(yte, p_test)
    idx = np.unique(np.linspace(0, len(fpr) - 1, 80).astype(int))
    table = []
    for t in np.arange(0.10, 0.81, 0.05):
        f = p_test >= t
        table.append({"threshold": round(float(t), 2), "flagged": int(f.sum()),
                      "precision": round(float(precision_score(yte, f, zero_division=0)), 3),
                      "recall": round(float(recall_score(yte, f)), 3)})

    pi = permutation_importance(pipe, Xte[RAW_FEATURES], yte, scoring="roc_auc", n_repeats=8, random_state=SEED)
    importance = sorted(({"feature": f, "importance": round(float(v), 4)} for f, v in zip(RAW_FEATURES, pi.importances_mean)),
                        key=lambda d: -d["importance"])

    names = pipe.named_steps["prep"].get_feature_names_out()
    coefs = pipe.named_steps["model"].coef_[0]
    odds = [{"feature": n.split("__")[1], "coefficient": round(float(c), 3), "odds_ratio": round(float(np.exp(c)), 3)}
            for n, c in zip(names, coefs)]

    raw = df[RAW_FEATURES]
    reference = {c: (str(raw[c].mode()[0]) if c in ("Geography", "Gender", "NumOfProducts") else float(raw[c].median()))
                 for c in RAW_FEATURES}

    meta = {
        "selected_model": best, "threshold": round(thr, 2), "models": results,
        "test_size": int(len(yte)), "train_size": int(len(ytr)), "churn_rate": round(float(y.mean()), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc_curve": {"fpr": [round(float(fpr[i]), 4) for i in idx], "tpr": [round(float(tpr[i]), 4) for i in idx]},
        "threshold_table": table, "feature_importance": importance, "logistic_odds_ratios": odds,
        "reference_customer": reference,
    }
    (ROOT / "models" / "metadata.json").write_text(json.dumps(meta, indent=2))
    print("Saved models/model.joblib, scored_customers.csv, metadata.json")


if __name__ == "__main__":
    main()
