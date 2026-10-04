import { createContext, useContext, useState } from "react";
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setU] = useState(() => { try { return JSON.parse(localStorage.getItem("cp_user")); } catch { return null; } });
  const setUser = (u) => { setU(u); u ? localStorage.setItem("cp_user", JSON.stringify(u)) : localStorage.removeItem("cp_user"); };
  return <Ctx.Provider value={{ user, login: setUser, logout: () => setUser(null) }}>{children}</Ctx.Provider>;
}
