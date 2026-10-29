"""Smoke test of every endpoint.   Run:  python test_api.py"""
import io, json
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
def show(name, r, keys=None):
    assert r.status_code == 200, (name, r.status_code, r.text[:300])
    j = r.json() if "json" in r.headers["content-type"] else r.text[:80]
    print(f"OK  {name}", json.dumps({k: j[k] for k in keys}) if keys and isinstance(j, dict) else "")
    return j

show("health", c.get("/api/health"))
o = show("overview", c.get("/api/overview"), ["total_accounts", "churn_rate", "predicted_high_risk", "expected_balance_at_risk"])
print("   balance bands:", [(b["name"], b["customers"], b["churn_rate"]) for b in o["by_balance"]])
print("   age:", [(b["name"], b["customers"], b["churn_rate"]) for b in o["by_age"]])
show("overview Germany", c.get("/api/overview?geography=Germany"), ["total_accounts", "churn_rate"])
risky = {"CreditScore": 584, "Geography": "Germany", "Gender": "Female", "Age": 54, "Tenure": 3, "Balance": 138400,
         "NumOfProducts": 3, "HasCrCard": 1, "IsActiveMember": 0, "EstimatedSalary": 90000}
r = show("predict risky", c.post("/api/predict", json=risky), ["probability", "risk_tier", "predicted_churn"])
print("   drivers:", [(d["feature"], d["impact"]) for d in r["drivers"][:4]]); print("   tips:", [t["action"][:40] for t in r["suggestions"]])
safe = {**risky, "Geography": "France", "Age": 34, "NumOfProducts": 2, "IsActiveMember": 1, "Gender": "Male", "Balance": 0}
show("predict safe", c.post("/api/predict", json=safe), ["probability", "risk_tier"])
show("simulate", c.post("/api/simulate", json={"customer": risky, "actions": ["make_active", "remove_extra_products"]}), ["before", "after", "risk_after"])
w = show("watchlist", c.get("/api/watchlist?tier=High&geography=Germany&limit=3"), ["total"]); print("   ", w["rows"][0])
show("export", c.get("/api/watchlist/export?tier=High"))
d = show("diagnostics", c.get("/api/diagnostics"), ["selected_model", "threshold", "confusion_matrix"])
show("model-info", c.get("/api/model-info"), ["records", "missing_values"])
show("history", c.get("/api/history?limit=2"))
show("template", c.get("/api/batch-template"))
csv = "CreditScore,Geography,Gender,Age,Tenure,Balance,NumOfProducts,HasCrCard,IsActiveMember,EstimatedSalary\n600,France,Male,40,3,60000,1,1,1,50000\n500,Germany,Female,55,2,120000,3,0,0,70000\n"
show("batch", c.post("/api/batch-predict", files={"file": ("t.csv", io.BytesIO(csv.encode()), "text/csv")}), ["rows", "flagged", "tiers"])
bad = c.post("/api/predict", json={**risky, "Age": 5}); print("validation rejects bad age:", bad.status_code)
bad = c.post("/api/batch-predict", files={"file": ("t.csv", io.BytesIO(b"a,b\n1,2"), "text/csv")}); print("batch rejects bad columns:", bad.status_code)
