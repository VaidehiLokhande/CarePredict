import { Navigate, NavLink, Route, Routes, Outlet } from "react-router-dom";
import { Activity, LayoutDashboard, ClipboardList, History as H, User, LogOut, Brain } from "lucide-react";
import { useAuth } from "./auth.jsx";
import { Auth, Dashboard, Assess, History, Details, Profile } from "./pages.jsx";
import ModelInfo from "./modelinfo.jsx";
function Layout() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const L = ({ to, icon: I, children }) => <NavLink end to={to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap ${isActive ? "grad text-white" : "text-white/70 hover:bg-white/10"}`}><I size={16} />{children}</NavLink>;
  return <div className="min-h-screen md:flex">
    <aside className="navy md:w-60 p-4 md:min-h-screen flex md:block items-center gap-3 overflow-x-auto md:sticky md:top-0 md:h-screen">
      <div className="hidden md:flex items-center gap-2 text-pink-300 text-xl font-bold mb-6"><Activity />CarePredict</div>
      <nav className="flex md:block md:space-y-1 gap-1"><L to="/" icon={LayoutDashboard}>Dashboard</L><L to="/assess" icon={ClipboardList}>New assessment</L><L to="/history" icon={H}>History</L><L to="/model" icon={Brain}>Model info</L><L to="/profile" icon={User}>Profile</L></nav>
      <button onClick={logout} className="md:mt-8 flex items-center gap-2 px-3 py-2 text-sm text-white/60 whitespace-nowrap"><LogOut size={16} />Log out</button></aside>
    <main className="flex-1 p-4 md:p-8 max-w-6xl min-w-0 space-y-5"><Outlet /></main></div>;
}
export default function App() {
  return <Routes><Route path="/login" element={<Auth mode="login" />} /><Route path="/register" element={<Auth mode="register" />} />
    <Route element={<Layout />}><Route path="/" element={<Dashboard />} /><Route path="/assess" element={<Assess />} /><Route path="/history" element={<History />} /><Route path="/assessment/:id" element={<Details />} /><Route path="/model" element={<ModelInfo />} /><Route path="/profile" element={<Profile />} /></Route>
    <Route path="*" element={<Navigate to="/" />} /></Routes>;
}
