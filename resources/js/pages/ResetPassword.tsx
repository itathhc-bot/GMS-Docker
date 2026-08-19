import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { getFriendlyAuthErrorMessage } from "@/lib/errors";
import { PasswordChecklist, scorePassword } from "@/components/users/PasswordChecklist";
import { SetPasswordErrorAlert } from "@/components/users/SetPasswordErrorAlert";
import { resetPassword } from "@/api/auth";

const MIN_LEN = 12;
const MAX_LEN = 128;

function validatePasswordStrength(pw: string): string | null {
  if (pw.length < MIN_LEN) return `Password must be at least ${MIN_LEN} characters.`;
  if (pw.length > MAX_LEN) return `Password must be at most ${MAX_LEN} characters.`;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) return "Password must include at least 3 of: lowercase, uppercase, digit, symbol.";
  if (/^(.)\1+$/.test(pw)) return "Password cannot be a repeated character.";
  return null;
}

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) setIsRecovery(true);
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [token, searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!token) return;
    const strengthError = validatePasswordStrength(password);
    if (strengthError) { toast.error(strengthError); setPwError(strengthError); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (!email) { toast.error("Email is required"); return; }
    
    setIsLoading(true);
    try {
      await resetPassword(token, email, password, confirm);
      toast.success("Password updated successfully!");
      navigate("/");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to reset password.";
      setPwError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const { label } = scorePassword(password);
  const strongEnough = !validatePasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sidebar-primary mx-auto flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-primary-foreground">Reset Password</h1>
          <p className="text-sm text-sidebar-muted mt-1">Enter your new password below.</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-lg">
          {!isRecovery ? (
            <div className="text-center text-muted-foreground text-sm">
              <p>Invalid or expired reset link.</p>
              <Button variant="link" className="mt-2" onClick={() => navigate("/login")}>
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {pwError && <SetPasswordErrorAlert message={pwError} />}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!searchParams.get("email")}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">New Password</label>
                <Input
                  type="password"
                  placeholder="Enter a strong password"
                  className="mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={password.length > 0 && !strongEnough}
                />
              </div>
              <PasswordChecklist password={password} />
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  className="mt-1.5"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !strongEnough || password !== confirm}>
                {isLoading ? "Updating..." : "Update Password →"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Strength: {label}. Server also checks against known-breached passwords.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
