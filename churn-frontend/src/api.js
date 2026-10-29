const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, opts) {
  let res;
  try { res = await fetch(BASE + path, opts); }
  catch { throw new Error("Cannot reach the backend. Is `uvicorn app.main:app --reload` running on " + BASE + "?"); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed (" + res.status + ")");
  }
  return res.json();
}
const post = (path, body) => req(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== "" && v != null)).toString();

export const api = {
  health: () => req("/api/health"),
  overview: (geography) => req("/api/overview?geography=" + geography),
  predict: (c) => post("/api/predict", c),
  simulate: (customer, actions) => post("/api/simulate", { customer, actions }),
  watchlist: (p) => req("/api/watchlist?" + qs(p)),
  exportUrl: (p) => BASE + "/api/watchlist/export?" + qs(p),
  templateUrl: BASE + "/api/batch-template",
  diagnostics: () => req("/api/diagnostics"),
  modelInfo: () => req("/api/model-info"),
  batch: (file) => { const f = new FormData(); f.append("file", file); return req("/api/batch-predict", { method: "POST", body: f }); },
};
