import { useState } from "react";
import { api } from "../api.js";
import { Badge, Card, Field, Gauge, Icon, btn, btn2, inputCls, pct, usd } from "../ui.jsx";

const BASE = { CreditScore: 619, Geography: "France", Gender: "Female", Age: 42, Tenure: 2, Balance: 0,
  NumOfProducts: 1, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 100000 };
const PRESETS = {
  "High-risk German senior": { ...BASE, Geography: "Germany", Age: 54, NumOfProducts: 3, IsActiveMember: 0, Balance: 138400, CreditScore: 584 },
  "Safe core saver": { ...BASE, Gender: "Male", Age: 34, NumOfProducts: 2, Balance: 60000, CreditScore: 710 },
  "Young inactive professional": { ...BASE, Geography: "Spain", Age: 29, IsActiveMember: 0, Balance: 30000 },
  "High-wealth retained": { ...BASE, Gender: "Male", Balance: 180000, CreditScore: 780 },
};
const LABEL = { CreditScore: "Credit score", Geography: "Country", Gender: "Gender", Age: "Age", Tenure: "Tenure",
  Balance: "Balance", NumOfProducts: "Products", HasCrCard: "Credit card", IsActiveMember: "Active member", EstimatedSalary: "Salary" };
const ACTIONS = [["make_active", "Make active"], ["add_product", "Add a 2nd product"], ["remove_extra_products", "Reduce to 2 products"]];

export default function Predictor() {
  const [c, setC] = useState(BASE);
  const [res, setRes] = useState(null);
  const [sim, setSim] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const bind = (k, numeric = true) => ({
    value: c[k], className: inputCls,
    onChange: (e) => setC({ ...c, [k]: numeric ? Number(e.target.value) : e.target.value }),
  });
  async function run(cust = c) {
    setBusy(true); setErr(""); setSim(null);
    try { setRes(await api.predict(cust)); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function whatIf(action) {
    try { setSim({ action, ...(await api.simulate(c, [action])) }); } catch (e) { setErr(e.message); }
  }
  const max = res ? Math.max(...res.drivers.map((d) => Math.abs(d.impact)), 0.01) : 1;

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
      <Card title="Customer profile" sub="Pick an archetype or enter the details">
        <select className={inputCls + " w-full mb-4"} defaultValue="" onChange={(e) => { if (e.target.value) { setC(PRESETS[e.target.value]); setRes(null); } }}>
          <option value="">— Select archetype —</option>
          {Object.keys(PRESETS).map((p) => <option key={p}>{p}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Credit score"><input type="number" min="300" max="900" {...bind("CreditScore")} /></Field>
          <Field label="Age"><input type="number" min="18" max="100" {...bind("Age")} /></Field>
          <Field label="Country"><select {...bind("Geography", false)}>{["France", "Germany", "Spain"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Gender"><select {...bind("Gender", false)}><option>Female</option><option>Male</option></select></Field>
          <Field label="Balance ($)"><input type="number" min="0" step="1000" {...bind("Balance")} /></Field>
          <Field label="Estimated salary ($)"><input type="number" min="0" step="1000" {...bind("EstimatedSalary")} /></Field>
          <Field label="Tenure (years)"><input type="number" min="0" max="10" {...bind("Tenure")} /></Field>
          <Field label="Products"><select {...bind("NumOfProducts")}>{[1, 2, 3, 4].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Has credit card"><select {...bind("HasCrCard")}><option value={1}>Yes</option><option value={0}>No</option></select></Field>
          <Field label="Active member"><select {...bind("IsActiveMember")}><option value={1}>Yes</option><option value={0}>No</option></select></Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button className={btn} disabled={busy} onClick={() => run()}><Icon n="bolt" />{busy ? "Scoring…" : "Evaluate churn probability"}</button>
          <button className={btn2} onClick={() => { setC(BASE); setRes(null); setSim(null); }}><Icon n="restart_alt" />Reset</button>
        </div>
        {err && <p className="mt-3 text-sm text-error">{err}</p>}
      </Card>

      <Card title="Risk assessment">
        {!res ? <p className="text-sm text-mute py-10 text-center">Run an evaluation to see the churn probability, what is driving it and what could reduce it.</p> : <>
          <Gauge value={res.probability} tier={res.risk_tier} cutoff={res.threshold} />
          <p className="text-xs text-mute mt-2 text-center">Classified as <b>{res.predicted_churn ? "WILL CHURN (1)" : "RETAIN (0)"}</b> at cutoff {res.threshold} · model: {res.model}</p>
          <h4 className="font-semibold text-sm mt-5 mb-2">What is driving this score</h4>
          {res.drivers.map((d) => (
            <div key={d.feature} className="grid grid-cols-[130px_1fr_68px] gap-2 items-center text-xs my-1.5">
              <span>{LABEL[d.feature]}: <b>{d.feature === "Balance" || d.feature === "EstimatedSalary" ? usd(d.value) : String(d.value)}</b></span>
              <div className="relative h-2.5"><i className="absolute left-1/2 -top-0.5 -bottom-0.5 w-px bg-line" />
                <i className={"absolute h-full rounded-sm " + (d.impact >= 0 ? "bg-error" : "bg-tertiary")}
                   style={{ width: (Math.abs(d.impact) / max) * 50 + "%", [d.impact >= 0 ? "left" : "right"]: "50%" }} /></div>
              <span className="text-right tabular-nums whitespace-nowrap">{d.impact > 0 ? "+" : ""}{(d.impact * 100).toFixed(1)} pts</span>
            </div>
          ))}
          <h4 className="font-semibold text-sm mt-5 mb-2">What-if retention actions</h4>
          <div className="flex gap-2 flex-wrap">{ACTIONS.map(([a, l]) => <button key={a} className={btn2} onClick={() => whatIf(a)}>{l}</button>)}</div>
          {sim && <p className="text-sm mt-3">{pct(sim.before, 0)} → <b>{pct(sim.after, 0)}</b> <Badge tier={sim.risk_after} /> <span className="text-mute text-xs">({sim.change > 0 ? "+" : ""}{(sim.change * 100).toFixed(1)} pts)</span></p>}
          {res.suggestions.length > 0 && <>
            <h4 className="font-semibold text-sm mt-5 mb-2">Recommended actions</h4>
            <ul className="text-sm space-y-1.5 list-disc pl-5">
              {res.suggestions.map((s) => <li key={s.action}>{s.action}{s.new_probability != null && <span className="text-tertiary"> → {pct(s.new_probability, 0)}</span>}</li>)}
            </ul></>}
        </>}
      </Card>
    </div>
  );
}
