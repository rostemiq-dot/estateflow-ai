import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch<{ token: string; user: { id: string; email: string; agencyName: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );

      login(response.token, response.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">ESTATEFLOW OS</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Agency Login</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to access your properties and client workspace.</p>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-950/80 border border-rose-800 p-3 text-xs font-semibold text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-slate-300">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="agency@example.com"
            />
          </label>

          <label className="block text-xs font-bold text-slate-300">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 rounded-xl bg-amber-500 font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in to Workspace"}
          </button>
        </div>
      </form>
    </div>
  );
}