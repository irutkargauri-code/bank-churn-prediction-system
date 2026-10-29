import { api } from "../api.js";
import { Card, Icon, Kpi, Status, useFetch, num, pct } from "../ui.jsx";

function Roc({ fpr, tpr, auc, cm, cutoff }) {
  const W = 560, H = 440, L = 58, R = 22, T = 20, B = 58, pw = W - L - R, ph = H - T - B;
  const X = (v) => L + v * pw, Y = (v) => T + (1 - v) * ph;
  const line = fpr.map((x, i) => `${X(x)},${Y(tpr[i])}`).join(" ");
  const ox = cm.fp / (cm.fp + cm.tn), oy = cm.tp / (cm.tp + cm.fn);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="ROC curve">
      <defs><linearGradient id="rocfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f46e5" stopOpacity=".28" /><stop offset="1" stopColor="#4f46e5" stopOpacity=".02" /></linearGradient></defs>
      {ticks.map((t) => (<g key={t}>
        <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#e8eaf2" /><line y1={T} y2={T + ph} x1={X(t)} x2={X(t)} stroke="#e8eaf2" />
        <text x={L - 10} y={Y(t) + 4} fontSize="12" textAnchor="end" fill="#667085">{t}</text>
        <text x={X(t)} y={T + ph + 20} fontSize="12" textAnchor="middle" fill="#667085">{t}</text></g>))}
      <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="#98a2b3" strokeDasharray="5 5" />
      <polygon points={`${X(0)},${Y(0)} ${line} ${X(1)},${Y(0)}`} fill="url(#rocfill)" />
      <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
      <circle cx={X(ox)} cy={Y(oy)} r="7" fill="#fff" stroke="#dc2626" strokeWidth="3" />
      <rect x={X(ox) + 14} y={Y(oy) + 6} width="128" height="26" rx="6" fill="#101828" />
      <text x={X(ox) + 78} y={Y(oy) + 23} fontSize="12" fill="#fff" textAnchor="middle">Cutoff {cutoff}</text>
      <rect x={X(0.52)} y={Y(0.2)} width="124" height="30" rx="15" fill="#eef0ff" />
      <text x={X(0.52) + 62} y={Y(0.2) + 20} fontSize="14" fontWeight="700" fill="#4f46e5" textAnchor="middle">AUC {auc}</text>
      <text x={L + pw / 2} y={H - 10} fontSize="13" textAnchor="middle" fill="#667085">False positive rate (loyal customers flagged by mistake)</text>
      <text x="16" y={T + ph / 2} fontSize="13" textAnchor="middle" fill="#667085" transform={`rotate(-90 16 ${T + ph / 2})`}>True positive rate (churners caught)</text>
    </svg>
  );
}

const pretty = (f) => f.replace("_", " = ").replace(/_/g, " ");

export default function Diagnostics() {
  const s = useFetch(api.diagnostics, []);
  const d = s.data;
  return (
    <Status s={s}>{d && (() => {
      const m = d.models[d.selected_model], cm = d.confusion_matrix;
      const near = d.threshold_table.reduce((a, b) => (Math.abs(b.threshold - d.threshold) < Math.abs(a.threshold - d.threshold) ? b : a)).threshold;
      const best = Object.entries(d.models).reduce((a, b) => (b[1].roc_auc > a[1].roc_auc ? b : a));
      const maxI = Math.max(...d.feature_importance.map((f) => f.importance));
      return (
        <div className="space-y-5">
          <div className="card p-5 flex gap-4 items-start bg-linear-to-br from-white to-primary-soft/50">
            <span className="w-10 h-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><Icon n="functions" /></span>
            <p className="text-sm text-mute"><b className="text-ink">{d.selected_model}</b> is the deployed model: every score can be explained by simple weights. Tested on {num(d.test_size)} unseen customers with cutoff {d.threshold}. The best benchmark ({best[0]}, AUC {best[1].roc_auc}) differs by only {Math.abs(best[1].roc_auc - m.roc_auc).toFixed(3)}.</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi icon="speed" label="ROC-AUC" value={m.roc_auc} />
            <Kpi icon="area_chart" label="PR-AUC" value={m.pr_auc} />
            <Kpi icon="target" label="Precision" value={pct(m.precision)} />
            <Kpi icon="radar" label="Recall" value={pct(m.recall)} note="share of churners caught" />
            <Kpi icon="balance" label="F1" value={m.f1} />
          </div>
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            <Card title="Model comparison" sub="Chosen by PR-AUC (better than accuracy for imbalanced data)">
              <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4"><thead className="text-xs text-mute"><tr>{["Model", "ROC-AUC", "PR-AUC", "Recall", "Precision"].map((h) => <th key={h} className="text-left py-1">{h}</th>)}</tr></thead>
                <tbody>{Object.entries(d.models).map(([n, v]) => (
                  <tr key={n} className={"border-t border-line " + (n === d.selected_model ? "font-semibold text-primary" : "")}>
                    <td className="py-2.5">{n} <span className={"ml-1 text-[10px] px-1.5 py-0.5 rounded-full " + (n === d.selected_model ? "bg-primary-soft text-primary" : "bg-low text-mute")}>{n === d.selected_model ? "Deployed" : "Benchmark"}</span></td><td>{v.roc_auc}</td><td>{v.pr_auc}</td><td>{pct(v.recall, 0)}</td><td>{pct(v.precision, 0)}</td></tr>))}</tbody></table>
            </Card>
            <Card title="Confusion matrix" sub={`At cutoff ${d.threshold}`}>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                {[["True negatives", cm.tn, "Correctly retained", "bg-tertiary-soft"], ["False positives", cm.fp, "False alarms (wasted offers)", "bg-warn-soft"],
                  ["False negatives", cm.fn, "Missed churners", "bg-error-soft"], ["True positives", cm.tp, "Churners caught", "bg-primary-soft"]].map(([t, v, n, c]) => (
                  <div key={t} className={"rounded p-3 " + c}><div className="text-xs">{t}</div><div className="text-2xl font-bold">{num(v)}</div><div className="text-xs text-mute">{n}</div></div>))}
              </div>
            </Card>
            <Card title="ROC curve" sub="How well the model separates churners from loyal customers"><Roc {...d.roc_curve} auc={m.roc_auc} cm={cm} cutoff={d.threshold} /></Card>
            <Card title="What matters most to the model" sub="Permutation importance (drop in ROC-AUC when shuffled)">
              {d.feature_importance.map((f) => (
                <div key={f.feature} className="grid grid-cols-[110px_1fr_48px] gap-2 items-center text-sm my-1.5">
                  <span>{f.feature}</span><div className="h-2.5 bg-low rounded-sm"><div className="h-full bg-primary rounded-sm" style={{ width: Math.max(f.importance / maxI, 0) * 100 + "%" }} /></div>
                  <span className="text-right tabular-nums text-xs">{f.importance.toFixed(3)}</span></div>))}
            </Card>
            <Card title="Threshold trade-off" sub="Lower cutoff → more churners caught, more false alarms">
              <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4"><thead className="text-xs text-mute"><tr>{["Cutoff", "Flagged", "Precision", "Recall"].map((h) => <th key={h} className="text-left py-1">{h}</th>)}</tr></thead>
                <tbody>{d.threshold_table.map((t) => (
                  <tr key={t.threshold} className={"border-t border-line " + (t.threshold === near ? "bg-primary-soft font-semibold text-primary" : "")}><td className="py-1.5">{t.threshold}</td><td>{num(t.flagged)}</td><td>{pct(t.precision, 0)}</td><td>{pct(t.recall, 0)}</td></tr>))}</tbody></table>
            </Card>
            <Card title="Logistic regression: what moves the odds" sub="Above 1 raises churn odds, below 1 lowers them">
              <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4"><thead className="text-xs text-mute"><tr>{["Feature", "Coefficient", "Odds ratio"].map((h) => <th key={h} className="text-left py-1">{h}</th>)}</tr></thead>
                <tbody>{[...d.logistic_odds_ratios].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 12).map((o) => (
                  <tr key={o.feature} className="border-t border-line"><td className="py-1.5">{pretty(o.feature)}</td><td>{o.coefficient}</td><td className={o.odds_ratio > 1 ? "text-error" : "text-tertiary"}>{o.odds_ratio}</td></tr>))}</tbody></table>
            </Card>
          </div>
        </div>);
    })()}</Status>
  );
}
