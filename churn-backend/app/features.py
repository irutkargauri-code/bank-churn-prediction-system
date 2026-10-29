"""Feature engineering shared by training and the API (must be importable when the model is loaded)."""
import pandas as pd

RAW_FEATURES = ["CreditScore", "Geography", "Gender", "Age", "Tenure", "Balance",
                "NumOfProducts", "HasCrCard", "IsActiveMember", "EstimatedSalary"]
CATEGORICAL = ["Geography", "Gender", "NumOfProducts", "AgeBand", "GeoActive"]
NUMERIC = ["CreditScore", "Age", "Tenure", "Balance", "EstimatedSalary", "HasCrCard",
           "IsActiveMember", "BalanceZero", "AgeSq", "AgeXActive"]


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds the non-linear signals a plain logistic regression would otherwise miss."""
    out = df[RAW_FEATURES].copy()
    out["NumOfProducts"] = out["NumOfProducts"].astype(str)          # 2 products is safe, 3+ is not
    out["BalanceZero"] = (df["Balance"] == 0).astype(int)
    out["AgeSq"] = df["Age"] ** 2                                     # churn rises with age, then falls after ~60
    out["AgeBand"] = pd.cut(df["Age"], [0, 29, 39, 49, 59, 200], labels=False).astype(str)
    out["GeoActive"] = df["Geography"] + "_" + df["IsActiveMember"].astype(str)  # inactive Germans are the riskiest
    out["AgeXActive"] = df["Age"] * df["IsActiveMember"]
    return out
