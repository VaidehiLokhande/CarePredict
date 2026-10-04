import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Activity, Save, Camera, Eye, FileDown, Plus, History as HI, Brain, User } from "lucide-react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";
import { downloadPdf } from "./pdf.js";
import { Card, Spinner, ErrorBox, Empty, Btn, level, LV, pct, fmt, label, Importance, ResultView, Gauge, Delta, Heartbeat } from "./ui.jsx";
const inp = "w-full border border-violet-200 rounded-xl px-3 py-2.5 bg-white/80";

export function Auth({ mode }) {
  const { login } = useAuth(), nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false), reg = mode === "register";
  const go = async (e) => { e.preventDefault(); setErr(""); setBusy(true); try { login(await (reg ? api.register(f) : api.login(f))); nav("/"); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return <div className="min-h-screen grid md:grid-cols-2">
    <div className="navy hidden md:flex flex-col justify-center p-12 text-white"><div className="flex items-center gap-2 text-pink-300 text-3xl font-bold"><Activity />CarePredict</div><p className="mt-4 text-white/70 max-w-sm">Explainable lung cancer risk screening powered by your trained Random Forest model.</p><Heartbeat className="w-80 mt-8" /></div>
    <div className="grid place-items-center p-4"><form onSubmit={go} className="glass rounded-3xl p-8 w-full max-w-md space-y-4"><h1 className="text-2xl font-bold">{reg ? "Create your account" : "Welcome back"}</h1><ErrorBox msg={err} />
      {reg && <input className={inp} placeholder="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
      <input className={inp} type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className={inp} type="password" placeholder="Password (min 6 characters)" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Btn className="w-full" disabled={busy}>{busy ? "Please wait…" : reg ? "Create account" : "Sign in"}</Btn>
      <p className="text-sm text-center">{reg ? <>Have an account? <Link className="text-violet-600 font-medium" to="/login">Sign in</Link></> : <>New here? <Link className="text-violet-600 font-medium" to="/register">Create an account</Link></>}</p></form></div></div>;
}
function useHistory() {
  const { user } = useAuth(); const [h, setH] = useState(null), [err, setErr] = useState("");
  useEffect(() => { api.history(user.id).then(setH).catch((e) => setErr(e.message)); }, [user.id]);
  return [h, err];
}
const Trend = ({ h }) => { const t = [...h].reverse().map((a) => ({ date: new Date(a.created_at + "Z").toLocaleDateString(), risk: +(a.yes_probability * 100).toFixed(1) }));
  return <ResponsiveContainer width="100%" height={250}><AreaChart data={t}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="95%" stopColor="#ec4899" stopOpacity={0} /></linearGradient></defs>
    <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Area dataKey="risk" stroke="#8b5cf6" fill="url(#g)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer>; };
const dOf = (h, i) => (h[i + 1] ? h[i].yes_probability - h[i + 1].yes_probability : null);

export function Dashboard() {
  const { user } = useAuth(); const [h, err] = useHistory(); const [imp, setImp] = useState([]);
  useEffect(() => { api.importance().then(setImp).catch(() => {}); }, []);
  if (err) return <ErrorBox msg={err} />; if (!h) return <Spinner />;
  const last = h[0], act = [["/assess", Plus, "New assessment"], ["/history", HI, "History"], ["/model", Brain, "Model info"], ["/profile", User, "Profile"]];
  return <>
    <div className="navy rounded-3xl p-6 text-white flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Hello, {user.name.split(" ")[0]}</h1><p className="text-white/70 text-sm">Track and understand your lung cancer risk estimates.</p>
      <div className="flex flex-wrap gap-2 mt-4">{act.map(([to, I, t]) => <Link key={to} to={to} className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 text-sm inline-flex gap-2 items-center"><I size={15} />{t}</Link>)}</div></div><Heartbeat className="w-56" /></div>
    {!last ? <Card><Empty text="No saved assessments yet."><Link to="/assess"><Btn>Take your first assessment</Btn></Link></Empty></Card> : <>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="text-center"><p className="text-sm text-[#1b1f4b]/60">Current risk score</p><Gauge p={last.yes_probability} size={210} /><Delta d={dOf(h, 0)} /></Card>
        <Card><p className="text-sm text-[#1b1f4b]/60">Total assessments</p><p className="text-4xl font-bold text-violet-700">{h.length}</p><p className="text-sm mt-1">{h.filter((a) => a.prediction === "YES").length} with a YES result</p></Card>
        <Card><p className="text-sm text-[#1b1f4b]/60">Latest assessment</p><p className={`text-3xl font-bold ${last.prediction === "YES" ? "text-pink-600" : "text-emerald-600"}`}>{last.prediction}</p><p className="text-sm">{fmt(last.created_at)}</p><Link className="text-violet-600 text-sm inline-flex gap-1 mt-2 items-center" to={`/assessment/${last.id}`}><Eye size={14} />View details</Link></Card></div>
      <Card><h3 className="font-semibold mb-2">Risk history</h3><Trend h={h} /></Card></>}
    <Card><h3 className="font-semibold mb-2">What the model weighs most</h3>{imp.length ? <Importance data={imp} /> : <Spinner />}</Card></>;
}
function Rows({ h }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[#1b1f4b]/60"><th className="py-2">Date</th><th>Result</th><th>Probability (YES)</th><th>Change</th><th></th></tr></thead>
    <tbody>{h.map((a, i) => <tr key={a.id} className="border-t border-violet-100"><td className="py-2.5">{fmt(a.created_at)}</td><td><b className={a.prediction === "YES" ? "text-pink-600" : "text-emerald-600"}>{a.prediction}</b></td><td className={LV[level(a.yes_probability)]}>{pct(a.yes_probability)}</td><td><Delta d={dOf(h, i)} /></td>
      <td><Link className="text-violet-600 inline-flex gap-1 items-center" to={`/assessment/${a.id}`}><Eye size={14} />View details</Link></td></tr>)}</tbody></table></div>;
}
export function History() {
  const [h, err] = useHistory(); if (err) return <ErrorBox msg={err} />; if (!h) return <Spinner />;
  return <><h1 className="text-2xl font-bold">Assessment history</h1>{h.length > 0 && <Card><h3 className="font-semibold mb-2">Risk history graph</h3><Trend h={h} /></Card>}
    <Card>{h.length ? <Rows h={h} /> : <Empty text="Nothing saved yet."><Link to="/assess"><Btn>Start an assessment</Btn></Link></Empty>}</Card></>;
}
const BIN = ["SMOKING","YELLOW_FINGERS","ANXIETY","PEER_PRESSURE","CHRONIC_DISEASE","FATIGUE","ALLERGY","WHEEZING","ALCOHOL_CONSUMING","COUGHING","SHORTNESS_OF_BREATH","SWALLOWING_DIFFICULTY","CHEST_PAIN"];
const init = () => ({ GENDER: 1, AGE: 50, ...Object.fromEntries(BIN.map((k) => [k, 1])) });
export function Assess() {
  const { user } = useAuth(), nav = useNavigate();
  const [f, setF] = useState(init), [res, setRes] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const predict = async (e) => {
    e.preventDefault(); setErr(""); const age = +f.AGE;
    if (!Number.isFinite(age) || age < 1 || age > 120) return setErr("Enter an age between 1 and 120.");
    setBusy(true); try { setRes(await api.predict({ ...f, AGE: age })); window.scrollTo(0, 0); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const save = async () => { setErr(""); setBusy(true); try { const a = await api.save(user.id, { ...f, AGE: +f.AGE }); nav(`/assessment/${a.id}`); } catch (x) { setErr(x.message); setBusy(false); } };
  if (res) { const inp2 = { ...f, AGE: +f.AGE }; return <><h1 className="text-2xl font-bold">Your result</h1><ErrorBox msg={err} />
    <ResultView r={res} input={inp2}><Card><div className="flex gap-3 flex-wrap"><Btn onClick={save} disabled={busy}><Save size={16} />{busy ? "Saving…" : "Save assessment"}</Btn>
      <button className="border border-violet-300 rounded-xl px-5 py-2.5 inline-flex gap-2 items-center" onClick={() => downloadPdf(res, inp2, user)}><FileDown size={16} />Download PDF</button>
      <button className="border border-violet-300 rounded-xl px-5 py-2.5" onClick={() => { setRes(null); setF(init()); }}>New assessment</button>
      <button className="px-3 py-2.5 text-violet-600" onClick={() => setRes(null)}>Edit answers</button></div><p className="text-sm text-[#1b1f4b]/60 mt-2">Not saved yet. Save it to add it to your dashboard, history and profile.</p></Card></ResultView></>; }
  return <form onSubmit={predict} className="space-y-4 max-w-3xl"><h1 className="text-2xl font-bold">Lung cancer risk assessment</h1><ErrorBox msg={err} />
    <Card className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Gender<select className={inp} value={f.GENDER} onChange={(e) => setF({ ...f, GENDER: +e.target.value })}><option value={1}>Male</option><option value={0}>Female</option></select></label>
      <label className="text-sm">Age<input className={inp} type="number" min="1" max="120" required value={f.AGE} onChange={(e) => setF({ ...f, AGE: e.target.value })} /></label>
      {BIN.map((k) => <label key={k} className="text-sm">{label(k)}<select className={inp} value={f[k]} onChange={(e) => setF({ ...f, [k]: +e.target.value })}><option value={1}>No</option><option value={2}>Yes</option></select></label>)}</Card>
    <Btn disabled={busy}>{busy ? "Validating and analysing…" : "Predict risk"}</Btn></form>;
}
export function Details() {
  const { id } = useParams(), { user } = useAuth(); const [a, setA] = useState(null), [err, setErr] = useState("");
  useEffect(() => { api.assessment(id, user.id).then(setA).catch((e) => setErr(e.message)); }, [id, user.id]);
  if (err) return <ErrorBox msg={err} />; if (!a) return <Spinner />;
  return <><div className="flex justify-between flex-wrap gap-2"><h1 className="text-2xl font-bold">Assessment #{a.id}</h1><span className="text-sm text-[#1b1f4b]/60">Saved {fmt(a.created_at)}</span></div>
    <ResultView r={{ ...a, risk_level: level(a.yes_probability) }} input={a.input_data}><Card><div className="flex gap-3 flex-wrap"><Btn onClick={() => downloadPdf({ ...a, risk_level: level(a.yes_probability) }, a.input_data, user, a.id)}><FileDown size={16} />Download PDF</Btn>
      <Link to="/assess" className="border border-violet-300 rounded-xl px-5 py-2.5">New assessment</Link><Link to="/history" className="px-3 py-2.5 text-violet-600">Back to history</Link></div></Card></ResultView></>;
}
export function Profile() {
  const { user, login } = useAuth(); const [h] = useHistory();
  const [f, setF] = useState({ name: user.name, email: user.email, current_password: "", password: "" }), [msg, setMsg] = useState(""), [err, setErr] = useState("");
  const send = async (body) => { setErr(""); setMsg(""); try { login(await api.updateUser(user.id, body)); setMsg("Profile updated."); setF((p) => ({ ...p, current_password: "", password: "" })); } catch (x) { setErr(x.message); } };
  const photo = (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 1.5e6) return setErr("Photo must be under 1.5 MB."); const r = new FileReader(); r.onload = () => send({ profile_photo: r.result }); r.readAsDataURL(file); };
  const ps = (h || []).map((a) => a.yes_probability), st = h && h.length ? [["Assessments", h.length], ["Average risk", pct(ps.reduce((a, b) => a + b, 0) / ps.length)], ["Highest risk", pct(Math.max(...ps))], ["YES results", h.filter((a) => a.prediction === "YES").length]] : [];
  return <div className="grid lg:grid-cols-2 gap-5"><div className="space-y-4"><h1 className="text-2xl font-bold">Profile</h1><ErrorBox msg={err} />{msg && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-sm">{msg}</div>}
    <Card className="space-y-3"><div className="flex items-center gap-4">{user.profile_photo ? <img src={user.profile_photo} className="h-20 w-20 rounded-full object-cover" /> : <div className="h-20 w-20 rounded-full grad text-white grid place-items-center text-2xl font-bold">{user.name[0]}</div>}
      <label className="cursor-pointer text-violet-600 inline-flex gap-1 items-center"><Camera size={16} />Change photo<input type="file" accept="image/*" hidden onChange={photo} /></label></div>
      <input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" /><input className={inp} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" />
      <Btn onClick={() => send({ name: f.name, email: f.email })}>Save profile</Btn></Card>
    <Card className="space-y-3"><h3 className="font-semibold">Change password</h3><input className={inp} type="password" placeholder="Current password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} />
      <input className={inp} type="password" placeholder="New password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><Btn onClick={() => send({ current_password: f.current_password, password: f.password })}>Update password</Btn></Card></div>
    <div className="space-y-4"><h2 className="text-xl font-bold lg:mt-1">Your statistics</h2>{!h ? <Spinner /> : <>
      {st.length > 0 && <div className="grid grid-cols-2 gap-3">{st.map(([t, v]) => <Card key={t}><p className="text-xs text-[#1b1f4b]/60">{t}</p><p className="text-2xl font-bold text-violet-700">{v}</p></Card>)}</div>}
      <Card><h3 className="font-semibold mb-1">Recent activity</h3>{h.length ? h.slice(0, 6).map((a) => <Link key={a.id} to={`/assessment/${a.id}`} className="flex justify-between py-2 border-b border-violet-100 text-sm"><span>{fmt(a.created_at)}</span><b className={a.prediction === "YES" ? "text-pink-600" : "text-emerald-600"}>{a.prediction} · {pct(a.yes_probability)}</b></Link>) : <Empty text="No activity yet." />}</Card></>}</div></div>;
}
