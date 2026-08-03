/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { StoreProvider } from "./contexts/StoreContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuth } from "./contexts/AuthContext";
import { AuditService } from "./services/AuditService";

// Eagerly loaded core routes for instant initial paint & standard workflow
import Login from "./pages/Login";
import SelectStore from "./pages/SelectStore";
import Dashboard from "./pages/Dashboard";

// Lazy-loaded secondary modules with prefetching strategy
const Finance = lazy(() => import("./pages/Finance"));
const DataEntry = lazy(() => import("./pages/DataEntry"));
const Team = lazy(() => import("./pages/Team"));
const CashClosing = lazy(() => import("./pages/CashClosing"));
const Checklist = lazy(() => import("./pages/Checklist"));
const AccountsPayable = lazy(() => import("./pages/AccountsPayable"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Marketing = lazy(() => import("./pages/Marketing"));
const DailyControl = lazy(() => import("./pages/DailyControl"));

/**
 * Background prefetching helper: warms up lazy module chunks in browser cache
 * during idle moments so route navigation feels instant without blocking UI.
 */
function prefetchSecondaryModules() {
  if (typeof window === "undefined") return;
  const load = () => {
    import("./pages/AccountsPayable");
    import("./pages/DailyControl");
    import("./pages/Finance");
    import("./pages/CashClosing");
    import("./pages/DataEntry");
    import("./pages/Checklist");
    import("./pages/AuditLogs");
    import("./pages/Team");
    import("./pages/Marketing");
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(load);
  } else {
    setTimeout(load, 1200);
  }
}

/**
 * Lightweight, non-intrusive loading state rendered INSIDE the layout content frame
 * to prevent full-screen flashing or UI jumps.
 */
function ContentLoadingFallback() {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
      <div className="w-7 h-7 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Carregando visualização...
      </span>
    </div>
  );
}

/**
 * Detects if the current environment is a preview/proxy environment.
 */
function checkPreviewEnvironment(): boolean {
  const identifiers = [
    "googleusercontent",
    "webcontainer",
    "shim",
    ".goog",
    "scf.usercontent",
    "stackblitz",
    "codesandbox",
    "run.app",
    "localhost",
    "127.0.0.1",
    "vercel.app",
    "netlify.app",
  ];
  const host = window.location.hostname;
  return identifiers.some((id) => host.includes(id));
}

const isPreview = checkPreviewEnvironment();
const Router = isPreview ? HashRouter : BrowserRouter;

function UnauthorizedRedirect({ routeName }: { routeName: string }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      AuditService.logAction({
        userId: user.id || "anonymous",
        userName: user.name || "unknown",
        userRole: user.role || "NONE",
        action: "UNAUTHORIZED_ACCESS",
        description: `Negado: Tentativa de acesso não autorizada à rota restrita '${routeName}'.`,
      }).catch((err) => console.error("Error logging security event:", err));
    }
  }, [user, routeName]);

  return <Navigate to="/dashboard" replace />;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess =
    user && (
      user.role === "ADMIN" || 
      user.username === "adm" || 
      user.role === "FINANCIAL" || 
      ["MANAGER", "MANAGER_BEBELU_RIOMAR_PAPICU", "MANAGER_BEBELU_MOSSORO", "MANAGER_4ESTYLOS_MOSSORO"].includes(user.role)
    );
  if (!hasAccess) {
    return (
      <UnauthorizedRedirect routeName="Contas a Pagar (Accounts Payable)" />
    );
  }
  return <>{children}</>;
}

function RootAdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess = user && user.username === "adm";
  if (!hasAccess) {
    return (
      <UnauthorizedRedirect routeName="Painel de Controle / Auditoria / Colaboradores" />
    );
  }
  return <>{children}</>;
}

function FinanceAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess =
    user && (user.role === "ADMIN" || user.username === "adm");
  if (!hasAccess) {
    return (
      <UnauthorizedRedirect routeName="Demonstrativo DRE / Fluxo Financeiro" />
    );
  }
  return <>{children}</>;
}

function MarketingAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess = user && user.username === "adm";
  if (!hasAccess) {
    return (
      <UnauthorizedRedirect routeName="Módulo de Marketing" />
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      prefetchSecondaryModules();
    }
  }, [user]);

  return (
    <Router>
      <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/select-store"
            element={
              <ProtectedRoute>
                <SelectStore />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analysis" element={<Dashboard />} />
            <Route path="/reports" element={<Dashboard />} />

            {/* Secondary routes wrapped in Suspense with lightweight fallback */}
            <Route
              path="*"
              element={
                <Suspense fallback={<ContentLoadingFallback />}>
                  <Routes>
                    <Route path="/cash-closing" element={<CashClosing />} />
                    <Route path="/data-entry" element={<DataEntry />} />
                    <Route path="/daily-control" element={<DailyControl />} />
                    <Route
                      path="/finance"
                      element={
                        <FinanceAccessRoute>
                          <Finance />
                        </FinanceAccessRoute>
                      }
                    />
                    <Route
                      path="/marketing"
                      element={
                        <MarketingAccessRoute>
                          <Marketing />
                        </MarketingAccessRoute>
                      }
                    />
                    <Route
                      path="/accounts-payable"
                      element={
                        <AdminOnlyRoute>
                          <AccountsPayable />
                        </AdminOnlyRoute>
                      }
                    />
                    <Route
                      path="/audit-logs"
                      element={
                        <RootAdminOnlyRoute>
                          <AuditLogs forcedTab="logs" />
                        </RootAdminOnlyRoute>
                      }
                    />
                    <Route
                      path="/security-summary"
                      element={
                        <RootAdminOnlyRoute>
                          <AuditLogs forcedTab="security" />
                        </RootAdminOnlyRoute>
                      }
                    />
                    <Route
                      path="/backups"
                      element={
                        <RootAdminOnlyRoute>
                          <AuditLogs forcedTab="backups" />
                        </RootAdminOnlyRoute>
                      }
                    />
                    <Route
                      path="/diagnostics"
                      element={
                        <RootAdminOnlyRoute>
                          <AuditLogs forcedTab="diagnostics" />
                        </RootAdminOnlyRoute>
                      }
                    />
                    <Route path="/checklist" element={<Checklist />} />
                    <Route
                      path="/team"
                      element={
                        <RootAdminOnlyRoute>
                          <Team />
                        </RootAdminOnlyRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              }
            />
          </Route>

          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/select-store" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <AppRoutes />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
