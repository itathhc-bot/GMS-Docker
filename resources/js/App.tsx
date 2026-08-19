import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";

import Dashboard from "@/pages/Dashboard";
import OperationsDashboard from "@/pages/OperationsDashboard";
import Login from "@/pages/Login";
import Vehicles from "@/pages/Vehicles";
import Drivers from "@/pages/Drivers";
import JobCards from "@/pages/JobCards";
import Inventory from "@/pages/Inventory";
import QCReview from "@/pages/QCReview";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import RolesPermissions from "@/pages/RolesPermissions";
import SettingsPage from "@/pages/SettingsPage";
import VehicleScan from "@/pages/VehicleScan";
import CentralMonitor from "@/pages/CentralMonitor";
import BayMonitor from "@/pages/BayMonitor";
import BayMonitorTV from "@/pages/BayMonitorTV";
import PartsRequest from "@/pages/PartsRequest";
import PurchaseOrders from "@/pages/PurchaseOrders";
import ResetPassword from "@/pages/ResetPassword";
import CompanionScan from "@/pages/CompanionScan";
import I18nAuditPage from "@/pages/I18nAudit";
import NotFound from "@/pages/NotFound";
import PartsApprovalPage from "@/pages/approvals/PartsApprovalPage";
import POApprovalPage from "@/pages/approvals/POApprovalPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const ProtectedLayout = () => (
  <ProtectedRoute>
    <AppLayout>
      <Outlet />
    </AppLayout>
  </ProtectedRoute>
);

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/scan/:sessionId", element: <CompanionScan /> },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "operations", element: <OperationsDashboard /> },
      { path: "vehicles", element: <Vehicles /> },
      { path: "drivers", element: <Drivers /> },
      { path: "job-cards", element: <JobCards /> },
      { path: "inventory", element: <Inventory /> },
      { path: "qc-review", element: <QCReview /> },
      { path: "reports", element: <Reports /> },
      { path: "users", element: <UserManagement /> },
      { path: "roles", element: <RolesPermissions /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "vehicle-scan", element: <VehicleScan /> },
      { path: "parts-request", element: <PartsRequest /> },
      { path: "purchase-orders", element: <PurchaseOrders /> },
      { path: "i18n-audit", element: <I18nAuditPage /> },
      { path: "central-monitor", element: <CentralMonitor /> },
      { path: "bay-monitor", element: <BayMonitor /> },
      { path: "bay-tv/:bayNumber", element: <BayMonitorTV /> },
      { path: "approvals/parts/:id", element: <PartsApprovalPage variant="parts" /> },
      { path: "approvals/reorder/:id", element: <PartsApprovalPage variant="reorder" /> },
      { path: "approvals/po/:id/manager", element: <POApprovalPage stage="manager" /> },
      { path: "approvals/po/:id/finance", element: <POApprovalPage stage="finance" /> },
    ]
  },
  { path: "*", element: <NotFound /> }
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
