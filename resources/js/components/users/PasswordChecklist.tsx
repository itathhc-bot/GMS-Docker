import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordChecklistProps {
  password: string;
  /** Optional values (e.g. email, name) the password should not contain. */
  forbiddenTerms?: string[];
}

interface Rule {
  id: string;
  label: string;
  test: (pw: string, forbidden: string[]) => boolean;
}

const RULES: Rule[] = [
  { id: "length", label: "At least 12 characters", test: (p) => p.length >= 12 },
  { id: "upper", label: "Contains an uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Contains a lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Contains a number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "Contains a symbol (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
  {
    id: "noCommon",
    label: "Not a common or sequential password",
    test: (p) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      const common = ["password", "qwerty", "letmein", "welcome", "admin", "iloveyou", "monkey", "dragon"];
      if (common.some((c) => lower.includes(c))) return false;
      if (/(.)\1{2,}/.test(lower)) return false; // aaaa
      if (/0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef/.test(lower)) return false;
      return true;
    },
  },
  {
    id: "noPersonal",
    label: "Does not contain your name or email",
    test: (p, forbidden) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      return forbidden
        .filter((t) => t && t.length >= 3)
        .every((t) => !lower.includes(t.toLowerCase()));
    },
  },
];

export function scorePassword(password: string, forbiddenTerms: string[] = []): {
  score: number;
  label: "empty" | "weak" | "fair" | "good" | "strong";
  passed: number;
  total: number;
} {
  const total = RULES.length;
  if (!password) return { score: 0, label: "empty", passed: 0, total };
  const passed = RULES.filter((r) => r.test(password, forbiddenTerms)).length;
  const score = passed / total;
  let label: "weak" | "fair" | "good" | "strong" = "weak";
  if (score >= 1) label = "strong";
  else if (score >= 0.75) label = "good";
  else if (score >= 0.5) label = "fair";
  return { score, label, passed, total };
}

export function PasswordChecklist({ password, forbiddenTerms = [] }: PasswordChecklistProps) {
  const { label, passed, total } = scorePassword(password, forbiddenTerms);
  const strengthColor =
    label === "strong"
      ? "bg-green-500"
      : label === "good"
        ? "bg-emerald-500"
        : label === "fair"
          ? "bg-amber-500"
          : "bg-destructive";
  const strengthLabel =
    label === "empty"
      ? "Start typing to check strength"
      : `Strength: ${label.charAt(0).toUpperCase() + label.slice(1)}`;

  return (
    <div className="space-y-2" data-testid="password-checklist">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground" aria-live="polite">{strengthLabel}</span>
          <span className="text-muted-foreground tabular-nums">{passed}/{total}</span>
        </div>
        <div
          className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={passed}
          aria-label="Password strength"
        >
          <div
            className={cn("h-full transition-all", strengthColor)}
            style={{ width: `${(passed / total) * 100}%` }}
          />
        </div>
      </div>
      <ul className="space-y-1 text-xs">
        {RULES.map((r) => {
          const ok = r.test(password, forbiddenTerms);
          return (
            <li
              key={r.id}
              data-rule={r.id}
              data-passed={ok ? "true" : "false"}
              className={cn("flex items-center gap-2", ok ? "text-foreground" : "text-muted-foreground")}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" aria-hidden />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              )}
              <span>{r.label}</span>
              <span className="sr-only">{ok ? "passed" : "not yet met"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
