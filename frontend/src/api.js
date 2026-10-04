const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
async function req(path, method = "GET", body) {
  let r;
  try { r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("Cannot reach the server. Is the backend running on " + BASE + "?"); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Request failed (" + r.status + ")");
  return d;
}
export const api = {
  register: (b) => req("/register", "POST", b),
  login: (b) => req("/login", "POST", b),
  user: (id) => req(`/user/${id}`),
  updateUser: (id, b) => req(`/user/${id}`, "PUT", b),
  predict: (input_data) => req("/predict", "POST", { input_data }),
  save: (user_id, input_data) => req("/assessments/save", "POST", { user_id, input_data }),
  history: (uid) => req(`/history/${uid}`),
  assessment: (id, uid) => req(`/assessment/${id}/${uid}`),
  importance: () => req("/feature-importance"),
  simulate: (input_data, changes) => req("/simulate", "POST", { input_data, changes }),
  modelInfo: () => req("/model-info"),
};
