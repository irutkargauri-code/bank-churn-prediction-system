import io

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app import db, service
from app.schemas import Customer, SimulateRequest

app = FastAPI(title="Bank Customer Churn API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])
db.init()
Geo = Query("All", pattern="^(All|France|Germany|Spain)$")


@app.get("/api/health")
def health():
    return {"status": "ok", "model": service.META["selected_model"], "threshold": service.THRESHOLD}


@app.get("/api/overview")
def overview(geography: str = Geo):
    return service.overview(geography)


@app.post("/api/predict")
def predict(customer: Customer):
    c = customer.model_dump()
    r = service.predict(c)
    db.save(c, r["probability"], r["risk_tier"], r["predicted_churn"])
    return r


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    return service.simulate(req.customer.model_dump(), req.actions)


@app.get("/api/watchlist")
def watchlist(geography: str = Geo, tier: str = Query("All", pattern="^(All|Low|Medium|High)$"),
              status: str = Query("All", pattern="^(All|Exited|Retained)$"), search: str = "",
              sort: str = Query("probability", pattern="^(probability|Balance|Age|money_at_risk|CreditScore)$"),
              order: str = Query("desc", pattern="^(asc|desc)$"),
              limit: int = Query(30, ge=1, le=500), offset: int = Query(0, ge=0)):
    return service.watchlist(geography, tier, status, search, sort, order, limit, offset)


@app.get("/api/watchlist/export")
def export(geography: str = Geo, tier: str = Query("All", pattern="^(All|Low|Medium|High)$"),
           status: str = Query("All", pattern="^(All|Exited|Retained)$")):
    d = service.watchlist(geography, tier, status, limit=10000)
    csv = pd.DataFrame(d["rows"]).to_csv(index=False)
    return Response(csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=watchlist.csv"})


@app.get("/api/diagnostics")
def diagnostics():
    return service.diagnostics()


@app.get("/api/model-info")
def model_info():
    return service.model_info()


@app.get("/api/history")
def history(limit: int = Query(50, ge=1, le=500)):
    return db.recent(limit)


@app.post("/api/batch-predict")
async def batch_predict(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file.")
    df = pd.read_csv(io.BytesIO(await file.read()))
    missing = [c for c in service.FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(422, f"Missing columns: {missing}")
    if len(df) > 20000:
        raise HTTPException(413, "Maximum 20,000 rows per upload.")
    try:
        validated = pd.DataFrame([Customer(**r).model_dump() for r in df[service.FEATURES].to_dict("records")])
    except Exception as e:
        raise HTTPException(422, f"Invalid values in file: {str(e)[:300]}")
    p = service.score_df(validated)
    out = df.copy()
    out["probability"] = p.round(4)
    out["risk_tier"] = [service.risk_tier(x) for x in p]
    out["predicted_churn"] = (p >= service.THRESHOLD).astype(int)
    return {"rows": len(out), "flagged": int(out["predicted_churn"].sum()),
            "tiers": out["risk_tier"].value_counts().to_dict(),
            "results": out.sort_values("probability", ascending=False).head(500).to_dict("records")}


@app.get("/api/batch-template")
def template():
    csv = pd.DataFrame([Customer().model_dump()]).to_csv(index=False)
    return Response(csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=template.csv"})
