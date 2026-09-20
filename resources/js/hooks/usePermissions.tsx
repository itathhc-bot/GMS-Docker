import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "mechanic" | "supervisor" | "store_clerk" | "qc_inspector";

/**
 * Returns permission and role helpers derived from the current user's
 * authenticated state. No supabase dependency — data comes from useAuth()
 * which fetches /api/v1/auth/me on login.
 */
export function usePermissions() {
  const { user, hasRole, hasPermission } = useAuth();

  const isAdmin        = hasRole("admin");
  const isSupervisor   = hasRole("supervisor");
  const isMechanic     = hasRole("mechanic");
  const isStoreClerk   = hasRole("store_clerk");
  const isQcInspector  = hasRole("qc_inspector");

  const canViewVehicles    = hasPermission("vehicles.view")    || isAdmin;
  const canEditVehicles    = hasPermission("vehicles.edit")    || isAdmin;
  const canDeleteVehicles  = hasPermission("vehicles.delete")  || isAdmin;
  const canCreateVehicles  = hasPermission("vehicles.create")  || isAdmin;

  const canViewJobCards    = hasPermission("job_cards.view")    || isAdmin;
  const canCreateJobCards  = hasPermission("job_cards.create")  || isAdmin;
  const canEditJobCards    = hasPermission("job_cards.edit")    || isAdmin;
  const canAssignJobCards  = hasPermission("job_cards.assign")  || isAdmin || isSupervisor;
  const canSignMechanic    = hasPermission("job_cards.sign_mechanic")   || isAdmin || isMechanic;
  const canSignSupervisor  = hasPermission("job_cards.sign_supervisor") || isAdmin || isSupervisor;

  const canRequestParts    = hasPermission("parts.request")    || isAdmin || isMechanic;
  const canApproveParts    = hasPermission("parts.approve")    || isAdmin || isSupervisor;
  const canIssueParts      = hasPermission("parts.issue")      || isAdmin || isStoreClerk;

  const canViewInventory   = hasPermission("inventory.view")   || isAdmin;
  const canEditInventory   = hasPermission("inventory.edit")   || isAdmin || isStoreClerk;

  const canViewPOs         = hasPermission("po.view")          || isAdmin;
  const canCreatePOs       = hasPermission("po.create")        || isAdmin;
  const canApproveManager  = hasPermission("po.approve_manager")  || isAdmin || isSupervisor;
  const canApproveFinance  = hasPermission("po.approve_finance")  || isAdmin;

  const canViewQc          = hasPermission("qc.view")          || isAdmin;
  const canReviewQc        = hasPermission("qc.review")        || isAdmin || isQcInspector;

  const canViewReports     = hasPermission("reports.view")     || isAdmin || isSupervisor;
  const canExportReports   = hasPermission("reports.export")   || isAdmin;

  const canManageUsers     = hasPermission("users.view")       || isAdmin;
  const canManageSettings  = hasPermission("settings.edit")    || isAdmin;
  const canViewAuditLog    = hasPermission("audit.view")       || isAdmin;

  const can = (permission: string) => isAdmin || hasPermission(permission);

  return {
    can,
    user,
    isAdmin,
    isSupervisor,
    isMechanic,
    isStoreClerk,
    isQcInspector,
    hasRole,
    hasPermission,
    // vehicles
    canViewVehicles,
    canEditVehicles,
    canDeleteVehicles,
    canCreateVehicles,
    // job cards
    canViewJobCards,
    canCreateJobCards,
    canEditJobCards,
    canAssignJobCards,
    canSignMechanic,
    canSignSupervisor,
    // parts
    canRequestParts,
    canApproveParts,
    canIssueParts,
    // inventory
    canViewInventory,
    canEditInventory,
    // purchase orders
    canViewPOs,
    canCreatePOs,
    canApproveManager,
    canApproveFinance,
    // qc
    canViewQc,
    canReviewQc,
    // reports
    canViewReports,
    canExportReports,
    // admin
    canManageUsers,
    canManageSettings,
    canViewAuditLog,
  };
}
