import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister
      ? { agencyName, email, password }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Authentication failed");
      }

      const data = await response.json();
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
          ESTATEFLOW OS
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {isRegister ? "Create Agency Account" : "Agency Login"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {isRegister
            ? "Set up your independent agency workspace."
            : "Sign in to access your properties and client workspace."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/80 p-3 text-xs font-semibold text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {isRegister && (
            <label className="block text-xs font-bold text-slate-300">
              Agency Name
              <input
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Erbil Gates Real Estate"
              />
            </label>
          )}

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
            className="min-h-12 w-full rounded-xl bg-amber-500 font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Register Agency Account"
                : "Sign in to Workspace"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-xs font-medium text-amber-500 hover:underline"
            >
              {isRegister
                ? "Already have an agency account? Sign in"
                : "Need a new agency account? Create one"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}