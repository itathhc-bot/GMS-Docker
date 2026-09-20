import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Car, ClipboardList, Package, BarChart3,
  Users, Settings, Search, Bell, Menu, X,
  Shield, CheckCircle, ScanLine, Monitor, Wrench, LogOut, Activity, ShieldCheck, IdCard, ShoppingCart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, roles, signOut, hasRole, user } = useAuth();
  const { can } = usePermissions();
  const isAdmin = hasRole("admin");

  const allNavItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/", perm: null },
    { icon: BarChart3, label: t("nav.operationsDashboard"), path: "/operations", perm: "operations.view" },
    { icon: Car, label: t("nav.vehicles"), path: "/vehicles", perm: "vehicles.view" },
    { icon: IdCard, label: t("nav.drivers"), path: "/drivers", perm: "drivers.view" },
    { icon: ScanLine, label: t("nav.vehicleScan"), path: "/vehicle-scan", perm: "vehicles.scan" },
    { icon: ClipboardList, label: t("nav.jobCards"), path: "/job-cards", perm: "job_cards.view" },
    { icon: Package, label: t("nav.inventory"), path: "/inventory", perm: "inventory.view" },
    { icon: Wrench, label: t("nav.partsRequest"), path: "/parts-request", perm: "parts.request" },
    { icon: ShoppingCart, label: "Purchase Orders", path: "/purchase-orders", perm: "po.view" },
    { icon: CheckCircle, label: t("nav.qcReview"), path: "/qc-review", perm: "qc.view" },
    { icon: Monitor, label: t("nav.centralMonitor"), path: "/central-monitor", perm: null },
    { icon: Activity, label: t("nav.bayMonitor"), path: "/bay-monitor", perm: null },
    { icon: BarChart3, label: t("nav.reports"), path: "/reports", perm: "reports.view" },
    { icon: Users, label: t("nav.users"), path: "/users", perm: "users.view" },
    { icon: ShieldCheck, label: t("nav.rolesPermissions"), path: "/roles", perm: "roles.manage" },
    { icon: Settings, label: t("nav.settings"), path: "/settings", perm: "settings.view" },
  ];

  const navItems = allNavItems.filter((it) => isAdmin || it.perm === null || can(it.perm));

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const displayName = profile?.full_name || user?.name || user?.email || "";
  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA";

  const roleLabel = roles.length > 0
    ? roles.map((r) => r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")
    : "Admin";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0 -ms-64"} md:w-64 md:ms-0 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 flex-shrink-0 z-30 fixed md:relative h-full`}
      >
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-sidebar-primary-foreground">{t("common.appName")}</h1>
              <p className="text-[10px] text-sidebar-muted uppercase tracking-wider">{t("common.appSubtitle")}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-sidebar-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{displayName || "Administrator"}</p>
              <p className="text-[10px] text-sidebar-muted">{roleLabel}</p>
            </div>
            <button onClick={handleSignOut} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title={t("common.signOut")}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative w-72 hidden sm:block">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search_placeholder")} className="ps-9 h-9 text-sm bg-muted border-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationBell />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {t("common.online")}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        <footer className="h-10 border-t bg-card flex items-center justify-between px-4 text-[11px] text-muted-foreground flex-shrink-0">
          <span>{t("footer.copyright")} | V2.4.0</span>
          <div className="flex gap-4">
            <span>{t("footer.support")}</span>
            <span>{t("footer.documentation")}</span>
            <span>{t("footer.privacy")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
