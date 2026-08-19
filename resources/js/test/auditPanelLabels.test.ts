import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";

const NEW_ACTIONS = ["password_set", "preview_retry", "preview_local_fallback"] as const;

describe("AuditLogPanel friendly labels", () => {
  it("renders English labels for new audit action types", () => {
    const labels = (en as any).users.audit.actions;
    expect(labels.password_set).toBe("Set new password");
    expect(labels.preview_retry).toBe("Retried export preview");
    expect(labels.preview_local_fallback).toBe("Fell back to local export");
    NEW_ACTIONS.forEach((a) => expect(typeof labels[a]).toBe("string"));
  });

  it("renders Arabic labels for new audit action types", () => {
    const labels = (ar as any).users.audit.actions;
    expect(labels.password_set).toBe("تعيين كلمة مرور جديدة");
    expect(labels.preview_retry).toBe("إعادة محاولة معاينة التصدير");
    expect(labels.preview_local_fallback).toBe("العودة إلى التصدير المحلي");
    NEW_ACTIONS.forEach((a) => {
      expect(typeof labels[a]).toBe("string");
      expect(labels[a].length).toBeGreaterThan(0);
    });
  });

  it("matches color map keys defined in AuditLogPanel", () => {
    // Mirror of ACTION_COLOR keys in src/components/users/AuditLogPanel.tsx
    const colorKeys = [
      "user_created", "role_assigned", "role_removed",
      "user_deactivated", "user_reactivated",
      "password_reset_sent", "password_set",
      "preview_retry", "preview_local_fallback",
    ];
    const enLabels = (en as any).users.audit.actions;
    colorKeys.forEach((k) => expect(enLabels[k]).toBeTruthy());
  });
});
