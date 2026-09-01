import React, { createContext, useContext, useState } from "react";
import { loginUser, registerUser, logoutUser } from "./auth-service";
import type { AuthResponse } from "./auth-service";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: Parameters<typeof loginUser>[0]) => Promise<void>;
  register: (details: Parameters<typeof registerUser>[0]) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("estateflow_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleAuth = (data: AuthResponse) => {
    setUser(data.user);
    localStorage.setItem("estateflow_user", JSON.stringify(data.user));
  };

  const login = async (credentials: Parameters<typeof loginUser>[0]) => {
    const data = await loginUser(credentials);
    handleAuth(data);
  };

  const register = async (details: Parameters<typeof registerUser>[0]) => {
    const data = await registerUser(details);
    handleAuth(data);
  };

  const logout = () => {
    logoutUser();
    localStorage.removeItem("estateflow_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};