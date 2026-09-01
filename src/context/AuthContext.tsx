import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../lib/api";

type User = {
  id: string;
  email: string;
  agencyName: string;
};

type AuthContextType = {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("estateflow_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (token: string, userData: User) => {
    localStorage.setItem("estateflow_token", token);
    localStorage.setItem("estateflow_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("estateflow_token");
    localStorage.removeItem("estateflow_user");
    localStorage.removeItem("estateflow-properties");
    localStorage.removeItem("estateflow-settings");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}