import { useState } from "react";
import { api } from "../api.js";
import { Badge, Card, Icon, Status, btn, btn2, num, pct, useFetch } from "../ui.jsx";

export default function ModelInfo() {
  const s = useFetch(api.modelInfo, []);
  const [file, setFile] = useState(null);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const d = s.data;

  async function upload() {
    setBusy(true); setErr(""); setOut(null);
    try { setOut(await api.batch(file)); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="space-y-5">
      <Status s={s}>{d && <Card title="Dataset & pipeline">
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[["Records", num(d.records)], ["Columns", d.columns], ["Missing values", d.missing_values], ["Target", d.target + " (churn rate " + pct(d.churn_rate, 2) + ")"],
            ["Dropped columns", d.dropped_columns.join(", ")], ["Model", d.selected_model], ["Evaluation", d.evaluation], ["Preprocessing", d.preprocessing.join(" · ")]].map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-line py-1.5"><dt className="text-mute w-36 shrink-0">{k}</dt><dd className="font-medium">{v}</dd></div>))}
        </dl>
      </Card>}</Status>

      <Card title="Batch customer scoring" sub="Upload a CSV with the 10 customer columns and get a risk score for each row">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
          <button className={btn} disabled={!file || busy} onClick={upload}><Icon n="upload_file" />{busy ? "Scoring…" : "Score file"}</button>
          <a className={btn2} href={api.templateUrl}><Icon n="file_copy" />Download CSV template</a>
        </div>
        {err && <p className="mt-3 text-sm text-error">{err}</p>}
        {out && <>
          <p className="mt-4 text-sm"><b>{num(out.rows)}</b> rows scored · <b>{num(out.flagged)}</b> flagged as likely to churn · High {out.tiers.High || 0} · Medium {out.tiers.Medium || 0} · Low {out.tiers.Low || 0}</p>
          <div className="overflow-x-auto mt-3"><table className="w-full text-sm">
            <thead className="bg-low text-xs text-mute"><tr>{["Geography", "Age", "Balance", "Products", "Active", "Probability", "Tier"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{out.results.slice(0, 15).map((r, i) => (
              <tr key={i} className="border-t border-line"><td className="px-3 py-2">{r.Geography}</td><td className="px-3">{r.Age}</td><td className="px-3">{num(r.Balance)}</td>
                <td className="px-3">{r.NumOfProducts}</td><td className="px-3">{r.IsActiveMember ? "Yes" : "No"}</td><td className="px-3 font-semibold">{pct(r.probability)}</td><td className="px-3"><Badge tier={r.risk_tier} /></td></tr>))}</tbody>
          </table></div>
          <p className="text-xs text-mute mt-2">Showing the 15 highest-risk rows.</p></>}
      </Card>
    </div>
  );
}
