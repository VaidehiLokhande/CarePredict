import json, sqlite3, hashlib, secrets
from datetime import datetime
from pathlib import Path
from typing import Optional
import joblib, pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE = Path(__file__).parent
MODEL = joblib.load(BASE / "models" / "lung_cancer_rf.pkl")  # existing model, never retrained
DB = BASE.parent / "carepredict.db"
FEATURES = ["GENDER","AGE","SMOKING","YELLOW_FINGERS","ANXIETY","PEER_PRESSURE","CHRONIC_DISEASE","FATIGUE",
            "ALLERGY","WHEEZING","ALCOHOL_CONSUMING","COUGHING","SHORTNESS_OF_BREATH","SWALLOWING_DIFFICULTY","CHEST_PAIN"]
COLS = list(getattr(MODEL, "feature_names_in_", FEATURES))

app = FastAPI(title="CarePredict API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

with db() as c:
    c.executescript("""CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,profile_photo TEXT);
    CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,created_at TEXT,
    input_data TEXT,prediction TEXT,no_probability REAL,yes_probability REAL,feature_importance TEXT);""")

def hp(pw, salt=None):
    salt = salt or secrets.token_hex(8)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000).hex()
def check(pw, stored): return hp(pw, stored.split("$")[0]) == stored
def user_out(r): return {"id": r["id"], "name": r["name"], "email": r["email"], "profile_photo": r["profile_photo"]}
def get_user(uid):
    with db() as c: r = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not r: raise HTTPException(404, "User not found")
    return r

def importance():
    imp = MODEL.feature_importances_
    return sorted([{"feature": f, "importance": float(v)} for f, v in zip(COLS, imp)], key=lambda x: -x["importance"])

def run(data: dict):
    miss = [f for f in FEATURES if f not in data]
    if miss: raise HTTPException(422, f"Missing fields: {', '.join(miss)}")
    try: X = pd.DataFrame([[float(data[f]) for f in COLS]], columns=COLS)
    except (ValueError, TypeError): raise HTTPException(422, "All answers must be numeric")
    p = MODEL.predict_proba(X)[0]; cl = list(MODEL.classes_)
    yi = next((i for i, k in enumerate(cl) if str(k).upper() in ("YES", "1", "TRUE")), len(cl) - 1)
    yes = float(p[yi]); no = float(1 - yes)
    lv = "Low" if yes < .33 else "Moderate" if yes < .66 else "High"
    return {"prediction": "YES" if yes >= .5 else "NO", "yes_probability": yes, "no_probability": no,
            "risk_level": lv, "feature_importance": importance()}

def row_out(r):
    d = dict(r); d["input_data"] = json.loads(d["input_data"]); d["feature_importance"] = json.loads(d["feature_importance"]); return d

class Reg(BaseModel): name: str; email: str; password: str
class Login(BaseModel): email: str; password: str
class Upd(BaseModel):
    name: Optional[str] = None; email: Optional[str] = None; password: Optional[str] = None
    current_password: Optional[str] = None; profile_photo: Optional[str] = None
class Pred(BaseModel): input_data: dict
class Save(BaseModel): user_id: int; input_data: dict

@app.post("/register")
def register(b: Reg):
    if len(b.password) < 6: raise HTTPException(400, "Password must be at least 6 characters")
    try:
        with db() as c:
            cur = c.execute("INSERT INTO users(name,email,password) VALUES(?,?,?)", (b.name.strip(), b.email.lower().strip(), hp(b.password)))
        return user_out(get_user(cur.lastrowid))
    except sqlite3.IntegrityError: raise HTTPException(409, "Email already registered")

@app.post("/login")
def login(b: Login):
    with db() as c: r = c.execute("SELECT * FROM users WHERE email=?", (b.email.lower().strip(),)).fetchone()
    if not r or not check(b.password, r["password"]): raise HTTPException(401, "Invalid email or password")
    return user_out(r)

@app.get("/user/{uid}")
def read_user(uid: int): return user_out(get_user(uid))

@app.put("/user/{uid}")
def update_user(uid: int, b: Upd):
    u = get_user(uid); name = b.name or u["name"]; email = (b.email or u["email"]).lower().strip()
    pw = u["password"]; photo = b.profile_photo if b.profile_photo is not None else u["profile_photo"]
    if b.password:
        if not b.current_password or not check(b.current_password, u["password"]): raise HTTPException(400, "Current password is incorrect")
        if len(b.password) < 6: raise HTTPException(400, "Password must be at least 6 characters")
        pw = hp(b.password)
    try:
        with db() as c: c.execute("UPDATE users SET name=?,email=?,password=?,profile_photo=? WHERE id=?", (name, email, pw, photo, uid))
    except sqlite3.IntegrityError: raise HTTPException(409, "Email already in use")
    return user_out(get_user(uid))

@app.post("/predict")  # does NOT store anything
def predict(b: Pred): return run(b.input_data)

@app.post("/assessments/save")  # only place assessments are written; result is recomputed by the model
def save(b: Save):
    get_user(b.user_id); r = run(b.input_data)
    with db() as c:
        cur = c.execute("INSERT INTO assessments(user_id,created_at,input_data,prediction,no_probability,yes_probability,feature_importance) VALUES(?,?,?,?,?,?,?)",
            (b.user_id, datetime.utcnow().isoformat(), json.dumps(b.input_data), r["prediction"], r["no_probability"], r["yes_probability"], json.dumps(r["feature_importance"])))
        row = c.execute("SELECT * FROM assessments WHERE id=?", (cur.lastrowid,)).fetchone()
    return row_out(row)

@app.get("/history/{uid}")
def history(uid: int):
    get_user(uid)
    with db() as c: rows = c.execute("SELECT * FROM assessments WHERE user_id=? ORDER BY id DESC", (uid,)).fetchall()
    return [row_out(r) for r in rows]

@app.get("/assessment/{aid}/{uid}")
def assessment(aid: int, uid: int):
    with db() as c: r = c.execute("SELECT * FROM assessments WHERE id=? AND user_id=?", (aid, uid)).fetchone()
    if not r: raise HTTPException(404, "Assessment not found")
    return row_out(r)

@app.get("/feature-importance")
def fi(): return importance()


# ======================= v2 UPGRADE (additive; existing routes/DB/model untouched) =======================
import numpy as np
from sklearn import metrics as M
DATA_DIR = BASE / "data"
BIN = [f for f in FEATURES if f not in ("GENDER", "AGE")]

def yes_idx(m):
    cl = list(m.classes_)
    return next((i for i, k in enumerate(cl) if str(k).upper() in ("YES", "1", "TRUE")), len(cl) - 1)

def prob(d, m=MODEL):
    cols = list(getattr(m, "feature_names_in_", FEATURES))
    X = pd.DataFrame([[float(d[f]) for f in cols]], columns=cols)
    return float(m.predict_proba(X)[0][yes_idx(m)])

def validate(d):
    errs, warns = [], []
    miss = [f for f in FEATURES if f not in d or d[f] in (None, "")]
    if miss: return [f"Missing answers: {', '.join(miss)}"], warns
    try: v = {f: float(d[f]) for f in FEATURES}
    except (ValueError, TypeError): return ["All answers must be numeric"], warns
    if not 1 <= v["AGE"] <= 120: errs.append("AGE must be between 1 and 120")
    elif v["AGE"] < 18: warns.append("Model was built on adult survey data; results for under-18s are unreliable.")
    elif v["AGE"] > 90: warns.append("Very high age: few similar cases in typical training data.")
    if v["GENDER"] not in (0, 1): errs.append("GENDER must be 0 (female) or 1 (male)")
    for f in BIN:
        if v[f] not in (1, 2): errs.append(f"{f} must be 1 (No) or 2 (Yes)")
    if not errs and all(v[f] == 1 for f in BIN): warns.append("Every symptom/habit is 'No'. Check that no question was skipped.")
    return errs, warns

def contributions(d, p0):
    """Local explanation from the real model: change in predicted probability when ONE answer is switched."""
    out = []
    for f in FEATURES:
        cur = float(d[f]); alt = dict(d)
        if f == "AGE": alt[f] = max(1, cur - 10); alt_txt = f"{int(alt[f])} (10 years younger)"
        elif f == "GENDER": alt[f] = 1 - int(cur); alt_txt = "Female" if alt[f] == 0 else "Male"
        else: alt[f] = 3 - int(cur); alt_txt = "No" if alt[f] == 1 else "Yes"
        out.append({"feature": f, "effect": p0 - prob(alt), "compared_with": alt_txt})
    return sorted(out, key=lambda x: -abs(x["effect"]))

_core = run
def run(data):
    errs, warns = validate(data)
    if errs: raise HTTPException(422, "; ".join(errs))
    r = _core(data); r["warnings"] = warns; r["contributions"] = contributions(data, r["yes_probability"]); return r

_ro = row_out
def row_out(r):
    d = _ro(r); d["warnings"] = validate(d["input_data"])[1]
    d["contributions"] = contributions(d["input_data"], d["yes_probability"]); return d

class Sim(BaseModel): input_data: dict; changes: dict = {}

@app.post("/simulate")
def simulate(b: Sim):
    new_in = {**b.input_data, **b.changes}
    for x in (b.input_data, new_in):
        e, _ = validate(x)
        if e: raise HTTPException(422, "; ".join(e))
    c, n = prob(b.input_data), prob(new_in)
    return {"current_probability": c, "simulated_probability": n, "delta": n - c,
            "simulated_risk_level": "Low" if n < .33 else "Moderate" if n < .66 else "High",
            "disclaimer": "Model simulation, not medical advice."}

def load_dataset():
    files = sorted(DATA_DIR.glob("*.csv"))
    held = [f for f in files if "test" in f.name.lower()]
    f = (held or files or [None])[0]
    if f is None: return None
    df = pd.read_csv(f); df.columns = [c.strip().upper().replace(" ", "_") for c in df.columns]
    if df["GENDER"].dtype == object: df["GENDER"] = df["GENDER"].astype(str).str.strip().str.upper().map({"M": 1, "F": 0})
    t = df["LUNG_CANCER"]
    if t.dtype == object: t = t.astype(str).str.strip().str.upper().map({"YES": 1, "NO": 0})
    return f.name, bool(held), df[FEATURES].astype(float), t.astype(int)

def evaluate(m, X, y):
    cols = list(getattr(m, "feature_names_in_", FEATURES)); s = m.predict_proba(X[cols])[:, yes_idx(m)]
    pred = (s >= .5).astype(int); tn, fp, fn, tp = [int(v) for v in M.confusion_matrix(y, pred, labels=[0, 1]).ravel()]
    ok = y.nunique() > 1
    return {"accuracy": M.accuracy_score(y, pred), "precision": M.precision_score(y, pred, zero_division=0),
            "recall": M.recall_score(y, pred, zero_division=0), "f1": M.f1_score(y, pred, zero_division=0),
            "specificity": tn / (tn + fp) if tn + fp else None, "roc_auc": M.roc_auc_score(y, s) if ok else None,
            "confusion": {"tn": tn, "fp": fp, "fn": fn, "tp": tp}}, s

def thin(a, b, n=120):
    i = np.unique(np.linspace(0, len(a) - 1, min(n, len(a))).astype(int)); return [{"x": float(a[j]), "y": float(b[j])} for j in i]

_cache = {}
@app.get("/model-info")
def model_info():
    if "v" in _cache: return _cache["v"]
    est = getattr(MODEL, "estimators_", [])
    info = {"model": {"type": type(MODEL).__name__, "n_estimators": getattr(MODEL, "n_estimators", None), "max_depth": getattr(MODEL, "max_depth", None),
            "criterion": getattr(MODEL, "criterion", None), "n_features": len(COLS), "classes": [str(c) for c in MODEL.classes_], "trees_loaded": len(est)},
            "feature_importance": importance(), "dataset": {"available": False}, "metrics": None, "roc": [], "pr": [], "comparison": []}
    ds = load_dataset()
    if ds:
        name, held, X, y = ds; mt, s = evaluate(MODEL, X, y); fpr, tpr, _ = M.roc_curve(y, s); pr, rc, _ = M.precision_recall_curve(y, s)
        info.update(metrics=mt, roc=thin(fpr, tpr), pr=thin(rc, pr), average_precision=float(M.average_precision_score(y, s)))
        info["dataset"] = {"available": True, "source": name, "rows": int(len(y)), "positives": int(y.sum()), "negatives": int((1 - y).sum()), "holdout": held,
            "note": "Held-out test file." if held else "No test file found: metrics are computed on the full dataset, which may include the model's training rows, so they can be optimistic."}
        for p in sorted((BASE / "models").glob("*.pkl")):
            if p.name == "lung_cancer_rf.pkl": continue
            try:
                m = joblib.load(p); mm, _ = evaluate(m, X, y); info["comparison"].append({"name": p.stem, "type": type(m).__name__, **mm})
            except Exception: pass
        if info["comparison"]: info["comparison"].insert(0, {"name": "lung_cancer_rf", "type": type(MODEL).__name__, **mt})
    _cache["v"] = info; return info
