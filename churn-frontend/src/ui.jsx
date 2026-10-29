import { useEffect, useState } from "react";

export const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
export const usdM = (n) => n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : usd(n);
export const num = (n) => Number(n).toLocaleString("en-US");
export const pct = (p, d = 1) => (p * 100).toFixed(d) + "%";

export const Icon = ({ n, className = "" }) => <span className={"material-symbols-outlined " + className}>{n}</span>;

export function useFetch(fn, deps = []) {
  const [s, set] = useState({ data: null, error: "", loading: true });
  useEffect(() => {
    let live = true;
    set((x) => ({ ...x, loading: true, error: "" }));
    fn().then((data) => live && set({ data, error: "", loading: false }))
        .catch((e) => live && set({ data: null, error: e.message, loading: false }));
    return () => { live = false; };
  }, deps); // eslint-disable-line
  return s;
}

export const Card = ({ title, sub, children, className = "", flush = false }) => (
  <section className={"card " + (flush ? "" : "p-6 ") + className}>
    {title && <h3 className="font-semibold text-[15px] tracking-tight">{title}</h3>}
    {sub && <p className="text-xs text-mute mt-0.5 mb-4">{sub}</p>}
    {!sub && title && <div className="mb-4" />}
    {children}
  </section>
);

const TONES = { primary: "bg-primary-soft text-primary", error: "bg-error-soft text-error", good: "bg-tertiary-soft text-tertiary", warn: "bg-warn-soft text-warn" };
export const Kpi = ({ icon, label, value, note, tone = "primary" }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-mute uppercase tracking-wide">{label}</span>
      <span className={"w-9 h-9 rounded-xl grid place-items-center " + TONES[tone]}><Icon n={icon} /></span>
    </div>
    <div className="text-[28px] font-bold tracking-tight mt-2 tabular-nums">{value}</div>
    {note && <div className="text-xs text-mute mt-0.5">{note}</div>}
  </div>
);

const TIER = { High: "bg-error-soft text-error", Medium: "bg-warn-soft text-warn", Low: "bg-tertiary-soft text-tertiary" };
export const Badge = ({ tier }) => <span className={"px-2.5 py-0.5 rounded-full text-xs font-semibold " + TIER[tier]}>{tier}</span>;

// Churn-rate bars. Bars at 1.5x the portfolio average turn red.
export function RateBars({ rows, avg }) {
  return rows.map((r) => (
    <div key={r.name} className="grid grid-cols-[96px_1fr_118px] items-center gap-3 text-sm my-2.5">
      <span className="truncate text-ink/80">{r.name}</span>
      <div className="h-3 bg-low rounded-full overflow-hidden">
        <div className={"bar-grow h-full rounded-full " + (r.churn_rate >= avg * 1.5 ? "bg-linear-to-r from-orange-400 to-error" : "bg-linear-to-r from-indigo-400 to-primary")}
             style={{ width: Math.max(Math.min(r.churn_rate, 100), 1.5) + "%" }} />
      </div>
      <span className="text-right tabular-nums font-medium">{r.churn_rate.toFixed(1)}% <span className="text-mute text-xs font-normal">({num(r.customers)})</span></span>
    </div>
  ));
}

export function Donut({ value, label, sub }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eceefa" strokeWidth="14" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#dc2626" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-2xl font-bold">{label}</div><div className="text-[11px] text-mute">{sub}</div>
      </div>
    </div>
  );
}

const TIER_COLORS = [["#10b981", 0, 0.3], ["#f59e0b", 0.3, 0.6], ["#ef4444", 0.6, 1]];
export function Gauge({ value, tier, cutoff }) {
  const R = 82, cx = 110, cy = 104;
  const pt = (a, r = R) => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
  const arc = (a, b) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return `M${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}`; };
  const [mx, my] = pt(Math.min(Math.max(value, 0.004), 0.996));
  const [t1x, t1y] = pt(cutoff, R - 12), [t2x, t2y] = pt(cutoff, R + 12);
  return (
    <div className="text-center">
      <svg viewBox="0 0 220 128" className="w-full max-w-[300px] mx-auto">
        {TIER_COLORS.map(([col, a, b]) => <path key={col} d={arc(a, b)} stroke={col} strokeOpacity=".28" strokeWidth="14" fill="none" />)}
        {TIER_COLORS.map(([col, a, b]) => value > a && <path key={col} d={arc(a, Math.min(b, value))} stroke={col} strokeWidth="14" fill="none" />)}
        <line x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke="#101828" strokeWidth="2" strokeDasharray="2 2" />
        <circle cx={mx} cy={my} r="9" fill="#fff" stroke="#101828" strokeWidth="3" />
        <text x={cx} y="92" textAnchor="middle" fontSize="34" fontWeight="700" fill="#101828">{(value * 100).toFixed(0)}%</text>
        <text x={cx} y="114" textAnchor="middle" fontSize="11" fill="#667085">churn probability</text>
      </svg>
      <Badge tier={tier} />
    </div>
  );
}

const Skel = ({ className = "" }) => <div className={"card animate-pulse bg-low/70 " + className} />;
export const Status = ({ s, children }) =>
  s.loading ? <div className="grid sm:grid-cols-3 gap-4"><Skel className="h-28" /><Skel className="h-28" /><Skel className="h-28" /><Skel className="h-64 sm:col-span-3" /></div>
  : s.error ? <div className="p-4 rounded-xl bg-error-soft text-error text-sm">{s.error}</div>
  : children;

export const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1.5 text-xs font-medium text-mute">{label}{children}</label>
);
export const inputCls = "border border-line rounded-lg px-3 py-2 text-sm text-ink bg-white focus:outline-2 focus:outline-primary/60 focus:border-primary";
export const btn = "inline-flex items-center gap-1.5 bg-linear-to-br from-primary to-violet-600 text-white text-sm font-semibold rounded-lg px-4 py-2.5 shadow-sm shadow-primary/30 hover:brightness-110 disabled:opacity-50 cursor-pointer";
export const btn2 = "inline-flex items-center gap-1.5 border border-line bg-white text-sm font-medium rounded-lg px-3 py-2 hover:border-primary hover:text-primary disabled:opacity-40 cursor-pointer";
