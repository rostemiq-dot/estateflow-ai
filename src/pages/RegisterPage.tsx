import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "./LoginPage";
import { useAuth } from "../features/auth/AuthContext";
import { TurnstileWidget } from "../components/auth/TurnstileWidget";
import { turnstileSiteKey } from "../config/turnstile";

export function RegisterPage(){
  const {signUp}=useAuth();
  const nav=useNavigate();
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [captchaToken,setCaptchaToken]=useState<string | null>(null);
  const [captchaResetKey,setCaptchaResetKey]=useState(0);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const handleCaptchaToken=useCallback((token:string | null)=>setCaptchaToken(token),[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setError("");
    setMessage("");
    if(password.length<8)return setError("Password must be at least 8 characters.");
    if(password!==confirm)return setError("Passwords do not match.");
    if(!captchaToken)return setError("Please complete the security verification.");
    setBusy(true);
    try{
      const confirmation=await signUp(email.trim(),password,name.trim(),captchaToken);
      setMessage(confirmation?"Account created. Check your email to confirm your account, then sign in.":"Account created successfully.");
      if(!confirmation)setTimeout(()=>nav("/",{replace:true}),500);
    }catch(err){
      setCaptchaToken(null);
      setCaptchaResetKey(key=>key+1);
      setError(getRegistrationError(err));
    }finally{setBusy(false)}
  }

  return <AuthLayout title="Create your account" subtitle="Start managing your real estate business"><form onSubmit={submit} className="space-y-4"><Field label="Full name" value={name} onChange={setName}/><Field label="Email" type="email" value={email} onChange={setEmail}/><Field label="Password" type="password" value={password} onChange={setPassword}/><Field label="Confirm password" type="password" value={confirm} onChange={setConfirm}/><TurnstileWidget siteKey={turnstileSiteKey} resetKey={captchaResetKey} onToken={handleCaptchaToken}/>{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-600">{message}</p>}<button disabled={busy||!captchaToken} className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white disabled:opacity-50">{busy?"Creating account…":"Create account"}</button><p className="text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-amber-700" to="/login">Sign in</Link></p></form></AuthLayout>
}

function getRegistrationError(error: unknown) { const message=error instanceof Error?error.message.toLowerCase():""; const code=typeof error === "object" && error !== null && "code" in error ? String(error.code).toLowerCase() : ""; if(message.includes("security verification")||message.includes("captcha")) return "Please complete the security verification and try again."; if(code.includes("already")||message.includes("already registered")||message.includes("already exists")) return "An account with this email already exists."; if(message.includes("password")) return "The password does not meet Supabase's password requirements."; if(message.includes("fetch")||message.includes("network")) return "Supabase is unavailable right now. Check your connection and try again."; if(message.includes("not configured")) return "Authentication is not configured for this deployment."; return "We couldn't create your account. Please try again or contact support if the problem continues."; }
function Field({label,type="text",value,onChange}:{label:string;type?:string;value:string;onChange:(v:string)=>void}){return <label className="block text-sm font-semibold text-slate-700">{label}<input required type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400"/></label>}
