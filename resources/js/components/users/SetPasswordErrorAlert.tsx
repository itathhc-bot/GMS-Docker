import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export const HIBP_PATTERN = /weak|easy to guess|pwned|breach|compromis/i;

export function isWeakPasswordError(message: string | null | undefined): boolean {
  if (!message) return false;
  return HIBP_PATTERN.test(message);
}

export interface SetPasswordErrorAlertProps {
  message: string;
  /** Optional override; otherwise derived from message. */
  weak?: boolean;
  labels?: {
    weakTitle?: string;
    rejectedTitle?: string;
    weakDesc?: string;
    tipLength?: string;
    tipMix?: string;
    tipUnique?: string;
    tipPhrase?: string;
  };
}

const defaults = {
  weakTitle: "This password was found in a data breach",
  rejectedTitle: "Couldn't set password",
  weakDesc:
    "Our leaked-password protection (HIBP) blocked this password because it appears in known breach lists. Pick a different one to keep this account safe.",
  tipLength: "Use 12+ characters",
  tipMix: "Mix upper/lowercase, numbers, and symbols",
  tipUnique: "Avoid names, dictionary words, or reused passwords",
  tipPhrase: "Try a passphrase, e.g. Munic!Fleet-2026#Spring",
};

export function SetPasswordErrorAlert({ message, weak, labels }: SetPasswordErrorAlertProps) {
  const isWeak = weak ?? isWeakPasswordError(message);
  const l = { ...defaults, ...(labels ?? {}) };
  return (
    <Alert variant="destructive" id="set-pw-error" role="alert" data-testid="set-pw-error">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{isWeak ? l.weakTitle : l.rejectedTitle}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{isWeak ? l.weakDesc : message}</p>
        {isWeak && (
          <ul className="list-disc pl-4 text-xs space-y-0.5" data-testid="set-pw-error-tips">
            <li>{l.tipLength}</li>
            <li>{l.tipMix}</li>
            <li>{l.tipUnique}</li>
            <li>{l.tipPhrase}</li>
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
