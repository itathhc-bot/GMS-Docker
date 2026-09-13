import api from "@/api/client";

/**
 * Logs an approval action to the Laravel audit log endpoint.
 * Replaces the previous supabase.from("approval_audit").insert() pattern.
 */
export async function logApprovalAction(params: {
  action: string;
  entityType: string;
  entityId: string;
  entityRef?: string;
  stage?: string;
  reason?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await api.post("/audit-logs", {
      log_type: "approval",
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_ref: params.entityRef,
      stage: params.stage,
      reason: params.reason,
      details: params.details,
    });
  } catch {
    // Audit log failures should not block the user workflow — log to console only
    console.warn("[approvals] Failed to write audit log:", params);
  }
}

export type ApprovalEntity = "PartsRequest" | "PurchaseOrder";

export interface AuditRow {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string;
  details?: Record<string, any>;
  profiles?: { full_name: string };
}

export const fetchApprovalAudit = async (entityType: string, entityId: string): Promise<AuditRow[]> => {
  const { data } = await api.get(`/audit-logs`, { params: { entity_type: entityType, entity_id: entityId } });
  return data;
};

export const recordApproval = logApprovalAction;

/**
 * Checks whether the current user has a given permission.
 * Used in approval workflow guards. Auth state is read from the API.
 */
export function buildApprovalGuard(userPermissions: string[]) {
  return {
    canApprove: (permission: string) => userPermissions.includes(permission),
    canReject:  (permission: string) => userPermissions.includes(permission),
  };
}
