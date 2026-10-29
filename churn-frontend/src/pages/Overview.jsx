import { useState } from "react";
import { api } from "../api.js";
import { Card, Donut, Icon, Kpi, RateBars, Status, useFetch, usd, usdM, num, inputCls } from "../ui.jsx";

const top = (rows) => rows.reduce((a, b) => (b.churn_rate > a.churn_rate ? b : a));

export default function Overview() {
  const [geo, setGeo] = useState("All");
  const s = useFetch(() => api.overview(geo), [geo]);
  const d = s.data;
  const insights = d && [
    ["public", "Highest-risk country", top(d.by_geography)],
    ["cake", "Highest-risk age group", top(d.by_age)],
    ["inventory_2", "Riskiest product count", { ...top(d.by_products), name: top(d.by_products).name + " product(s)" }],
  ].map(([icon, t, r]) => ({ icon, t, text: `${r.name}: ${r.churn_rate.toFixed(1)}% churn, ${(r.churn_rate / d.churn_rate).toFixed(1)}× the average` }));

  return (
    <div className="space-y-6">
      <Status s={s}>{d && <>
        <section className="card p-7 flex flex-wrap items-center gap-8 bg-linear-to-br from-white via-white to-primary-soft/60">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Portfolio snapshot</span>
              <select className={inputCls + " py-1 text-xs"} value={geo} onChange={(e) => setGeo(e.target.value)}>
                {["All", "France", "Germany", "Spain"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{num(d.churned)} of {num(d.total_accounts)} customers have left</h2>
            <p className="text-mute mt-2 max-w-lg">The model flags <b className="text-ink">{num(d.predicted_high_risk)}</b> customers as likely to churn, with about <b className="text-ink">{usdM(d.expected_balance_at_risk)}</b> in balances at risk.</p>
          </div>
          <Donut value={d.churn_rate} label={d.churn_rate + "%"} sub="churn rate" />
        </section>

        <div className="grid sm:grid-cols-3 gap-4">
          {insights.map((i) => (
            <div key={i.t} className="card p-4 flex gap-3 items-start">
              <span className="w-9 h-9 rounded-xl bg-warn-soft text-warn grid place-items-center shrink-0"><Icon n={i.icon} /></span>
              <div><div className="text-xs font-medium text-mute">{i.t}</div><div className="text-sm font-medium mt-0.5">{i.text}</div></div>
            </div>))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon="group" label="Accounts" value={num(d.total_accounts)} note={"Avg balance " + usd(d.avg_balance)} />
          <Kpi icon="person_remove" label="Churned" value={num(d.churned)} tone="error" />
          <Kpi icon="verified" label="Retained" value={num(d.retained)} tone="good" />
          <Kpi icon="payments" label="Total deposits" value={usdM(d.total_balance)} />
        </div>

        <p className="text-xs text-mute">Red bars churn at 1.5× the average rate ({d.churn_rate}%) or more. Brackets show the number of customers in each group.</p>
        <div className="grid lg:grid-cols-2 gap-5">
          <Card title="By country"><RateBars rows={d.by_geography} avg={d.churn_rate} /></Card>
          <Card title="By products held" sub="Two products is the sweet spot; three or more is a red flag"><RateBars rows={d.by_products} avg={d.churn_rate} /></Card>
          <Card title="By age group"><RateBars rows={d.by_age} avg={d.churn_rate} /></Card>
          <Card title="By member activity"><RateBars rows={d.by_activity} avg={d.churn_rate} /></Card>
          <Card title="By account balance"><RateBars rows={d.by_balance} avg={d.churn_rate} /></Card>
          <Card title="By gender"><RateBars rows={d.by_gender} avg={d.churn_rate} /></Card>
        </div>
      </>}</Status>
    </div>
  );
}
