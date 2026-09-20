import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import api from "@/api/client";

import { toast } from "sonner";
import { getFriendlyAuthErrorMessage } from "@/lib/errors";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { signIn } = useAuth();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Please enter your email"); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: resetEmail });
      toast.success("Password reset link sent! Check your email.");
      setShowForgot(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not send reset link";
      toast.error(getFriendlyAuthErrorMessage(new Error(msg), "reset"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setIsLoading(true);
    const { error } = await signIn(email, password, rememberMe);
    setIsLoading(false);
    if (error) { toast.error(getFriendlyAuthErrorMessage(error, "login")); return; }
    toast.success("Welcome back!");
    const redirect = search.get("redirect");
    // Only allow same-origin relative redirects to avoid open-redirect abuse.
    const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    navigate(safe);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sidebar-primary mx-auto flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-primary-foreground">Garage Management System</h1>
          <p className="text-sm text-sidebar-muted mt-1">
            Centralized portal for municipal vehicle maintenance, inventory, and job cards.
          </p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-lg">
          <h2 className="text-lg font-semibold mb-1">Log In</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Accounts are issued by an administrator. Contact your admin if you need access.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email Address</label>
              <Input placeholder="you@municipality.gov" className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
              <div className="relative mt-1.5">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  Keep me signed in
                </label>
              </div>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Log In to System →"}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center mt-4 italic">
            Access is monitored. Unauthorized login attempts are logged and reported.
          </p>
        </div>

        {showForgot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForgot(false)}>
            <div className="bg-card rounded-xl p-6 w-full max-w-sm shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-1">Reset Password</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input placeholder="you@municipality.gov" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? "Sending..." : "Send Reset Link"}</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="text-xs text-sidebar-muted text-center mt-6">
          Need an account? Contact your system administrator.
        </p>
        <div className="text-center mt-4 text-[10px] text-sidebar-muted">
          © 2026 Municipality Garage Management System | V2.4.0
        </div>
      </div>
    </div>
  );
}
