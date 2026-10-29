import { useState } from "react";
import { api } from "../api.js";
import { Badge, Card, Icon, Status, btn2, inputCls, num, pct, useFetch, usd } from "../ui.jsx";

const LIMIT = 15;
export default function Watchlist() {
  const [f, setF] = useState({ geography: "All", tier: "All", status: "All", search: "", sort: "probability" });
  const [page, setPage] = useState(0);
  const params = { ...f, order: "desc", limit: LIMIT, offset: page * LIMIT };
  const s = useFetch(() => api.watchlist(params), [JSON.stringify(params)]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(0); };
  const Sel = ({ k, opts }) => <select className={inputCls} value={f[k]} onChange={set(k)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  const d = s.data;

  return (
    <div className="space-y-4">
      <p className="text-sm text-mute">Probabilities are out-of-fold: each customer is scored by a model that never saw them.</p>
      <Card className="flex flex-wrap gap-3 items-center">
        <input className={inputCls} placeholder="Search surname or ID" value={f.search} onChange={set("search")} />
        <Sel k="geography" opts={["All", "France", "Germany", "Spain"]} />
        <Sel k="tier" opts={["All", "High", "Medium", "Low"]} />
        <Sel k="status" opts={["All", "Exited", "Retained"]} />
        <Sel k="sort" opts={["probability", "money_at_risk", "Balance", "Age"]} />
        <a className={btn2 + " ml-auto"} href={api.exportUrl({ geography: f.geography, tier: f.tier, status: f.status })}><Icon n="file_download" />Download CSV</a>
      </Card>
      <Status s={s}>{d && <Card flush className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-low text-mute text-xs uppercase"><tr>
            {["ID", "Surname", "Geo", "Age", "Credit", "Balance", "Prod", "Active", "Actual", "Probability", "Tier", "Money at risk"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>{d.rows.map((r) => (
            <tr key={r.CustomerId} className="border-t border-line hover:bg-low/60">
              <td className="px-3 py-2">{r.CustomerId}</td><td className="px-3">{r.Surname}</td><td className="px-3">{r.Geography}</td>
              <td className="px-3">{r.Age}</td><td className="px-3">{r.CreditScore}</td><td className="px-3 tabular-nums">{usd(r.Balance)}</td>
              <td className="px-3">{r.NumOfProducts}</td><td className="px-3">{r.IsActiveMember ? "Yes" : "No"}</td>
              <td className="px-3"><span className={r.Exited ? "text-error font-semibold" : "text-tertiary"}>{r.Exited ? "EXITED" : "RETAINED"}</span></td>
              <td className="px-3 tabular-nums font-semibold">{pct(r.probability)}</td><td className="px-3"><Badge tier={r.risk_tier} /></td>
              <td className="px-3 tabular-nums">{usd(r.money_at_risk)}</td>
            </tr>))}</tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-line text-sm text-mute">
          <span>{num(d.total)} customers · page {page + 1} of {Math.max(1, Math.ceil(d.total / LIMIT))}</span>
          <span className="flex gap-2">
            <button className={btn2} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button className={btn2} disabled={(page + 1) * LIMIT >= d.total} onClick={() => setPage(page + 1)}>Next</button>
          </span>
        </div>
      </Card>}</Status>
    </div>
  );
}
