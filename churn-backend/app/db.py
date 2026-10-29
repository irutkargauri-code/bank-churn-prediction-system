"""Tiny SQLite store for prediction history (stdlib only)."""
import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "predictions.db"


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS predictions(
            id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            probability REAL, risk_tier TEXT, predicted_churn INTEGER, input TEXT)""")


def save(inp: dict, prob: float, tier: str, churn: int):
    with _conn() as c:
        c.execute("INSERT INTO predictions(probability,risk_tier,predicted_churn,input) VALUES(?,?,?,?)",
                  (prob, tier, churn, json.dumps(inp)))


def recent(limit: int = 50):
    with _conn() as c:
        rows = c.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [{**dict(r), "input": json.loads(r["input"])} for r in rows]
