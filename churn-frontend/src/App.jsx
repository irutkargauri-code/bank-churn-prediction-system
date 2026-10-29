import { useState } from "react";
import { Icon, useFetch } from "./ui.jsx";
import { api } from "./api.js";
import Overview from "./pages/Overview.jsx";
import Predictor from "./pages/Predictor.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Diagnostics from "./pages/Diagnostics.jsx";
import ModelInfo from "./pages/ModelInfo.jsx";

const PAGES = [
  ["overview", "dashboard", "Executive Overview", "Portfolio health and where churn comes from", Overview],
  ["predict", "psychology", "Churn Predictor", "Score a customer and test retention actions", Predictor],
  ["watchlist", "shield_with_heart", "Risk Watchlist", "Customers ranked by risk and money at stake", Watchlist],
  ["diagnostics", "insights", "Model Diagnostics", "How accurate the model is and why", Diagnostics],
  ["info", "model_training", "Data & Batch", "Dataset details and bulk scoring", ModelInfo],
];

export default function App() {
  const [page, setPage] = useState(() => location.hash.slice(1) || "overview");
  const go = (id) => { setPage(id); location.hash = id; window.scrollTo(0, 0); };
  const health = useFetch(api.health, []);
  const [, , title, subtitle, Page] = PAGES.find((p) => p[0] === page) || PAGES[0];
  const up = !!health.data;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white/90 backdrop-blur border-r border-line flex flex-col p-5 max-md:hidden">
        <div className="flex items-center gap-3 mb-9">
          <span className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-violet-600 text-white grid place-items-center shadow-md shadow-primary/30"><Icon n="shield_person" /></span>
          <div className="font-bold text-[15px] leading-snug tracking-tight">Bank Customer Churn Prediction System</div>
        </div>
        <nav className="flex flex-col gap-1">
          {PAGES.map(([id, icon, label]) => (
            <button key={id} onClick={() => go(id)}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left cursor-pointer transition-colors " +
                (page === id ? "bg-primary-soft text-primary font-semibold" : "text-mute hover:bg-low hover:text-ink")}>
              <Icon n={icon} />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-low p-3.5 text-xs">
          <div className="flex items-center gap-2 font-semibold"><span className={"w-2 h-2 rounded-full " + (up ? "bg-tertiary" : "bg-error")} />{up ? "Model online" : "Backend offline"}</div>
          {up && <p className="text-mute mt-1">{health.data.model} · cutoff {health.data.threshold}</p>}
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 bg-white/75 backdrop-blur-md border-b border-line h-16 flex items-center justify-between px-6">
          <div><h1 className="font-semibold tracking-tight leading-tight">{title}</h1><p className="text-xs text-mute max-sm:hidden">{subtitle}</p></div>
          <select className="md:hidden border border-line rounded-lg px-2 py-1 text-sm" value={page} onChange={(e) => go(e.target.value)}>
            {PAGES.map(([id, , label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <span className={"text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full " + (up ? "bg-tertiary-soft text-tertiary" : "bg-error-soft text-error")}>
            <span className={"w-1.5 h-1.5 rounded-full " + (up ? "bg-tertiary" : "bg-error")} />{up ? "API connected" : "API offline"}
          </span>
        </header>
        <main className="p-6 lg:p-8 max-w-[1240px] mx-auto"><Page /></main>
      </div>
    </div>
  );
}
