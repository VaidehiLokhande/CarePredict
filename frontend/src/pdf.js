import { jsPDF } from "jspdf";
import { label, ans, pct, level } from "./ui.jsx";
export function downloadPdf(r, input, user, id) {
  const d = new jsPDF(), p = r.yes_probability; let y = 46;
  d.setFillColor(15, 21, 53); d.rect(0, 0, 210, 34, "F"); d.setFillColor(236, 72, 153); d.rect(0, 34, 210, 2, "F");
  d.setTextColor(255); d.setFontSize(20); d.text("CarePredict", 14, 16); d.setFontSize(10); d.text("Lung cancer risk assessment report", 14, 25);
  d.setTextColor(27, 31, 75);
  const t = (s, size = 10, bold = false) => { if (y > 275) { d.addPage(); y = 20; } d.setFont("helvetica", bold ? "bold" : "normal"); d.setFontSize(size); d.text(s, 14, y); y += size * 0.5 + 3; };
  t(`Patient: ${user.name} (${user.email})`); t(`Report date: ${new Date().toLocaleString()}${id ? `   Assessment #${id}` : "   (not saved)"}`); y += 4;
  t(`Model result: ${r.prediction}   |   Risk level: ${r.risk_level || level(p)}`, 14, true); y += 2;
  [["YES probability", p, [236, 72, 153]], ["NO probability", r.no_probability, [52, 211, 153]]].forEach(([n, v, c]) => {
    t(`${n}: ${pct(v)}`); d.setFillColor(237, 233, 254); d.rect(14, y - 2, 120, 4, "F"); d.setFillColor(...c); d.rect(14, y - 2, 120 * v, 4, "F"); y += 8; });
  y += 2; t("Top factors (change in model probability if this answer were different)", 11, true);
  r.contributions.slice(0, 6).forEach((c) => t(`- ${label(c.feature)} = ${ans(c.feature, input[c.feature])}: ${c.effect >= 0 ? "+" : ""}${(c.effect * 100).toFixed(1)} pts (vs ${c.compared_with})`));
  y += 3; t("Answers", 11, true); Object.entries(input).forEach(([k, v]) => t(`${label(k)}: ${ans(k, v)}`));
  if (r.warnings?.length) { y += 3; t("Data-quality notes", 11, true); r.warnings.forEach((w) => t(`- ${w}`, 9)); }
  y += 6; d.setTextColor(110); t("Statistical screening output from a Random Forest model. It is not a diagnosis or medical advice.", 8);
  d.save(`CarePredict-report${id ? "-" + id : ""}.pdf`);
}
