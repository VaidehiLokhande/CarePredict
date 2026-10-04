import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Database, ShieldCheck, Layers, Cpu, Percent, Gauge as G } from "lucide-react";
import { api } from "./api.js";
import { Card, Spinner, ErrorBox, Empty, Importance } from "./ui.jsx";
const n = (v) => (v == null ? "n/a" : (v * 100).toFixed(1) + "%");
const Curve = ({ data, x, y, color }) => <ResponsiveContainer width="100%" height={260}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" /><XAxis dataKey="x" type="number" domain={[0, 1]} label={{ value: x, position: "insideBottom", offset: -2 }} /><YAxis domain={[0, 1]} label={{ value: y, angle: -90, position: "insideLeft" }} /><Tooltip formatter={(v) => v.toFixed(3)} /><Line dataKey="y" dot={false} stroke={color} strokeWidth={2.5} /></LineChart></ResponsiveContainer>;
export default function ModelInfo() {
  const [m, setM] = useState(null), [err, setErr] = useState("");
  useEffect(() => { api.modelInfo().then(setM).catch((e) => setErr(e.message)); }, []);
  if (err) return <ErrorBox msg={err} />; if (!m) return <Spinner />;
  const d = m.dataset, mt = m.metrics, md = m.model, cf = mt?.confusion;
  const steps = [["Your answers", "15 survey features", Database], ["Validation", "Ranges, completeness, quality warnings", ShieldCheck], ["Encoding", "Gender 0/1, symptoms 1/2, age numeric", Layers],
    [md.type, `${md.n_estimators ?? md.trees_loaded} trees${md.max_depth ? `, max depth ${md.max_depth}` : ""}${md.criterion ? `, ${md.criterion}` : ""}`, Cpu], ["Probability", `predict_proba for ${md.classes.join(" / ")}`, Percent], ["Risk level", "Low <33% · Moderate <66% · High ≥66%", G]];
  return <div className="space-y-5"><h1 className="text-2xl font-bold">Model information</h1>
    <Card><h3 className="font-semibold mb-3">ML pipeline</h3><div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">{steps.map(([t, s, I], i) => <div key={i} className="rounded-2xl p-3 bg-gradient-to-br from-pink-100 to-violet-100 text-sm"><I size={18} className="text-violet-600 mb-1" /><b>{t}</b><p className="text-xs text-[#1b1f4b]/70">{s}</p></div>)}</div></Card>
    {!d.available ? <Card><Empty text="No dataset found, so evaluation metrics cannot be calculated (nothing is estimated or invented)."><p className="text-xs max-w-md mx-auto">Put your CSV (columns incl. LUNG_CANCER) in <code>backend/app/data/</code>. Name a held-out file like <code>test.csv</code> to get honest test metrics, then restart the backend.</p></Empty></Card> : <>
      <Card className={d.holdout ? "" : "border-amber-300"}><p className="text-sm"><b>Evaluated on {d.source}</b> · {d.rows} rows ({d.positives} YES / {d.negatives} NO). {d.note}</p></Card>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{[["Accuracy", mt.accuracy], ["Precision", mt.precision], ["Recall", mt.recall], ["F1", mt.f1], ["Specificity", mt.specificity], ["ROC-AUC", mt.roc_auc]].map(([t, v]) => <Card key={t} className="text-center"><p className="text-xs text-[#1b1f4b]/60">{t}</p><p className="text-2xl font-bold text-violet-700">{n(v)}</p></Card>)}</div>
      <div className="grid lg:grid-cols-2 gap-4"><Card><h3 className="font-semibold">ROC curve (AUC {n(mt.roc_auc)})</h3><Curve data={m.roc} x="False positive rate" y="True positive rate" color="#8b5cf6" /></Card>
        <Card><h3 className="font-semibold">Precision-Recall curve (AP {n(m.average_precision)})</h3><Curve data={m.pr} x="Recall" y="Precision" color="#ec4899" /></Card></div>
      <Card><h3 className="font-semibold mb-3">Confusion matrix</h3><div className="grid grid-cols-2 gap-2 max-w-sm text-center">{[["True negative", cf.tn, "bg-emerald-100"], ["False positive", cf.fp, "bg-pink-100"], ["False negative", cf.fn, "bg-pink-100"], ["True positive", cf.tp, "bg-emerald-100"]].map(([t, v, c]) => <div key={t} className={`${c} rounded-xl p-4`}><p className="text-2xl font-bold">{v}</p><p className="text-xs">{t}</p></div>)}</div></Card>
      <Card><h3 className="font-semibold mb-2">Model comparison</h3>{m.comparison.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[#1b1f4b]/60"><th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>ROC-AUC</th></tr></thead><tbody>{m.comparison.map((c) => <tr key={c.name} className="border-t border-violet-100"><td className="py-2">{c.name} <span className="text-xs text-[#1b1f4b]/50">{c.type}</span></td>{["accuracy", "precision", "recall", "f1", "roc_auc"].map((k) => <td key={k}>{n(c[k])}</td>)}</tr>)}</tbody></table></div>
        : <p className="text-sm text-[#1b1f4b]/60">Only <code>lung_cancer_rf.pkl</code> was found in <code>models/</code>. Other compatible .pkl models placed there are compared automatically.</p>}</Card></>}
    <Card><h3 className="font-semibold mb-2">Feature importance</h3><Importance data={m.feature_importance} /></Card></div>;
}
