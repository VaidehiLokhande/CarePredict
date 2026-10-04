import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Inbox, ArrowUpRight, ArrowDownRight, Minus, ShieldCheck, TriangleAlert, FlaskConical } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { api } from "./api.js";
export const Card = ({ children, className = "" }) => <div className={`glass rounded-3xl p-5 ${className}`}>{children}</div>;
export const Spinner = () => <div className="flex justify-center p-12 text-violet-500"><Loader2 className="animate-spin" size={32} /></div>;
export const ErrorBox = ({ msg }) => msg ? <div className="flex gap-2 items-center bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm"><AlertCircle size={16} />{msg}</div> : null;
export const Empty = ({ text, children }) => <div className="text-center p-10 text-[#1b1f4b]/60"><Inbox className="mx-auto mb-2 text-violet-300" size={40} /><p className="mb-3">{text}</p>{children}</div>;
export const Btn = ({ className = "", ...p }) => <button {...p} className={`grad hover:brightness-110 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 font-medium inline-flex items-center gap-2 justify-center shadow-md shadow-pink-300/40 ${className}`} />;
export const level = (p) => (p < 0.33 ? "Low" : p < 0.66 ? "Moderate" : "High");
export const LV = { Low: "text-emerald-600", Moderate: "text-amber-600", High: "text-pink-600" };
export const pct = (p) => (p * 100).toFixed(1) + "%";
export const fmt = (d) => new Date(d + "Z").toLocaleString();
export const label = (s) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
export const ans = (k, v) => (k === "GENDER" ? (+v === 1 ? "Male" : "Female") : k === "AGE" ? v : +v === 2 ? "Yes" : "No");
export const Heartbeat = ({ className = "" }) => <svg viewBox="0 0 200 60" className={className}><path className="beat" d="M0 30H40L50 8L62 52L72 30H110L120 18L130 40L140 30H200" fill="none" stroke="#f9a8d4" strokeWidth="2.5" strokeLinecap="round" /></svg>;

export function Delta({ d }) {
  if (d == null) return <span className="text-sm text-[#1b1f4b]/50">First assessment</span>;
  const up = d > 0.0005, dn = d < -0.0005, I = up ? ArrowUpRight : dn ? ArrowDownRight : Minus;
  return <span className={`inline-flex items-center gap-1 text-sm font-medium ${up ? "text-pink-600" : dn ? "text-emerald-600" : "text-slate-500"}`}><I size={16} />{up ? "+" : ""}{(d * 100).toFixed(1)} pts vs previous</span>;
}
export function Gauge({ p, size = 230 }) {
  const L = 251.3, c = p < 0.33 ? "#34d399" : p < 0.66 ? "#f59e0b" : "#ec4899", a = "M20 100A80 80 0 0 1 180 100";
  return <svg viewBox="0 0 200 120" width={size} style={{ maxWidth: "100%" }}><path d={a} fill="none" stroke="#ede9fe" strokeWidth="16" strokeLinecap="round" />
    <path className="gauge-arc" d={a} fill="none" stroke={c} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${p * L} ${L}`} />
    <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1b1f4b">{pct(p)}</text><text x="100" y="110" textAnchor="middle" fontSize="10" fill="#6b7280">{level(p)} risk</text></svg>;
}
export function Importance({ data }) {
  const d = data.map((x) => ({ name: label(x.feature), value: +(x.importance * 100).toFixed(2) }));
  return <ResponsiveContainer width="100%" height={d.length * 28 + 20}><BarChart data={d} layout="vertical"><XAxis type="number" unit="%" /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>;
}
export function Contributions({ data, input }) {
  const d = data.slice(0, 8).map((x) => ({ name: `${label(x.feature)} (${ans(x.feature, input[x.feature])})`, value: +(x.effect * 100).toFixed(2) }));
  return <ResponsiveContainer width="100%" height={d.length * 32 + 30}><BarChart data={d} layout="vertical"><XAxis type="number" unit=" pts" /><YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11 }} /><Tooltip /><ReferenceLine x={0} stroke="#1b1f4b" />
    <Bar dataKey="value" radius={4}>{d.map((x, i) => <Cell key={i} fill={x.value >= 0 ? "#ec4899" : "#34d399"} />)}</Bar></BarChart></ResponsiveContainer>;
}
const SIM = ["AGE", "SMOKING", "ALCOHOL_CONSUMING", "COUGHING", "SHORTNESS_OF_BREATH", "WHEEZING", "CHEST_PAIN", "FATIGUE", "ANXIETY", "CHRONIC_DISEASE"];
export function Simulator({ input }) {
  const [v, setV] = useState(() => Object.fromEntries(SIM.map((k) => [k, +input[k]]))), [r, setR] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    const ch = Object.fromEntries(SIM.filter((k) => v[k] !== +input[k]).map((k) => [k, v[k]]));
    const t = setTimeout(() => api.simulate(input, ch).then((x) => { setR(x); setErr(""); }).catch((e) => setErr(e.message)), 300);
    return () => clearTimeout(t);
  }, [v, input]);
  const bar = (t, p, c) => <div><div className="flex justify-between text-sm"><span>{t}</span><b>{pct(p)}</b></div><div className="h-3 bg-violet-100 rounded-full"><div className={`h-3 rounded-full transition-all ${c}`} style={{ width: pct(p) }} /></div></div>;
  return <Card><h3 className="font-semibold flex items-center gap-2"><FlaskConical size={18} className="text-violet-500" />What-if risk simulator</h3>
    <p className="text-xs text-[#1b1f4b]/60 mb-3">Model simulation only, not medical advice. Change an answer to see how the Random Forest's estimate moves.</p>
    <div className="grid sm:grid-cols-3 gap-3 mb-4">{SIM.map((k) => <label key={k} className="text-xs">{label(k)}{k === "AGE"
      ? <input type="number" min="1" max="120" className="w-full rounded-lg border border-violet-200 px-2 py-1.5 bg-white" value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })} />
      : <select className="w-full rounded-lg border border-violet-200 px-2 py-1.5 bg-white" value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })}><option value={1}>No</option><option value={2}>Yes</option></select>}</label>)}</div>
    <ErrorBox msg={err} />{r && <div className="space-y-2">{bar("Current probability", r.current_probability, "bg-violet-400")}{bar("Simulated probability", r.simulated_probability, "bg-pink-500")}
      <p className="text-sm">Change: <b className={r.delta > 0 ? "text-pink-600" : "text-emerald-600"}>{r.delta > 0 ? "+" : ""}{(r.delta * 100).toFixed(1)} pts</b> · simulated level <b>{r.simulated_risk_level}</b></p></div>}</Card>;
}

export function ResultView({ r, input, children }) {
  const yes = r.prediction === "YES", p = r.yes_probability, lv = r.risk_level || level(p), c = r.contributions || [];
  const up = c.filter((x) => x.effect > 0.001).slice(0, 3), dn = c.filter((x) => x.effect < -0.001).slice(0, 2);
  const names = (a) => a.map((x) => `${label(x.feature)} (${ans(x.feature, input[x.feature])})`).join(", ");
  const bar = (t, v, col) => <div><div className="flex justify-between text-sm"><span>{t}</span><b>{pct(v)}</b></div><div className="h-2.5 bg-violet-100 rounded-full"><div className={`h-2.5 rounded-full ${col}`} style={{ width: pct(v) }} /></div></div>;
  return <div className="space-y-5">
    <Card className="grid md:grid-cols-[auto_1fr] gap-6 items-center"><div className="text-center"><Gauge p={p} /><span className={`inline-block px-4 py-1 rounded-full text-white font-bold ${yes ? "bg-pink-500" : "bg-emerald-500"}`}>Model result: {r.prediction}</span></div>
      <div className="space-y-3"><h2 className="text-xl font-semibold">Risk level: <span className={LV[lv]}>{lv}</span></h2>
        {bar("Probability of YES", p, "bg-pink-500")}{bar("Probability of NO", r.no_probability, "bg-emerald-400")}
        <p className="text-sm text-[#1b1f4b]/75">{up.length ? <>Answers that pushed the estimate up the most: <b>{names(up)}</b>. </> : "No single answer raised the estimate noticeably. "}{dn.length ? <>Answers that lowered it: <b>{names(dn)}</b>.</> : ""}</p></div></Card>
    {children}
    <Card><h3 className="font-semibold mb-1">Factors behind this prediction</h3><p className="text-xs text-[#1b1f4b]/60 mb-2">Each bar is the change in the model's probability (percentage points) caused by that answer, found by re-running the model with that single answer switched (age: 10 years younger). Pink raises risk, green lowers it.</p><Contributions data={c} input={input} /></Card>
    <Card><h3 className="font-semibold mb-1">Global feature importance</h3><p className="text-xs text-[#1b1f4b]/60 mb-2">Taken directly from the trained Random Forest.</p><Importance data={r.feature_importance} /></Card>
    <Card><h3 className="font-semibold mb-2 flex items-center gap-2">{r.warnings?.length ? <TriangleAlert className="text-amber-500" size={18} /> : <ShieldCheck className="text-emerald-500" size={18} />}Data-quality checks</h3>
      {r.warnings?.length ? r.warnings.map((w) => <p key={w} className="text-sm text-amber-700">• {w}</p>) : <p className="text-sm">All answers are complete and within valid ranges.</p>}</Card>
    <Card><h3 className="font-semibold mb-3">Assessment summary</h3><div className="grid sm:grid-cols-3 gap-2 text-sm">{Object.entries(input).map(([k, v]) => <div key={k} className="flex justify-between bg-violet-50/70 rounded-lg px-3 py-2"><span>{label(k)}</span><b>{ans(k, v)}</b></div>)}</div></Card>
    <Simulator input={input} />
    <p className="text-xs text-[#1b1f4b]/60">Statistical screening aid, not a medical diagnosis. Please consult a clinician.</p></div>;
}
