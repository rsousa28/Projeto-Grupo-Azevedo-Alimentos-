/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { StoreProvider } from "./contexts/StoreContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuth } from "./contexts/AuthContext";
import { AuditService } from "./services/AuditService";

// Lazy-loaded page modules for bundle size optimization & fast initial paint
const Login = lazy(() => import("./pages/Login"));
const SelectStore = lazy(() => import("./pages/SelectStore"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Finance = lazy(() => import("./pages/Finance"));
const DataEntry = lazy(() => import("./pages/DataEntry"));
const Team = lazy(() => import("./pages/Team"));
const CashClosing = lazy(() => import("./pages/CashClosing"));
const Checklist = lazy(() => import("./pages/Checklist"));
const AccountsPayable = lazy(() => import("./pages/AccountsPayable"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Marketing = lazy(() => import("./pages/Marketing"));
const DailyControl = lazy(() => import("./pages/DailyControl"));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0d0d] text-white">
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Carregando Módulo...</span>
      </div>
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

function AuditNavigationTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    // Evita duplicidade de logs rápidos da mesma rota
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    let routeDescription = "";
    switch (location.pathname) {
      case "/dashboard":
        routeDescription = "Acessou o Painel Geral (Dashboard).";
        break;
      case "/cash-closing":
        routeDescription = "Acessou o módulo de Fechamento de Caixa.";
        break;
      case "/data-entry":
        routeDescription =
          "Acessou o módulo de Lançamento de Gastos / Despesas.";
        break;
      case "/finance":
        routeDescription = "Visualizou o Demonstrativo DRE / Fluxo Financeiro.";
        break;
      case "/marketing":
        routeDescription = "Acessou o Módulo de Marketing.";
        break;
      case "/accounts-payable":
        routeDescription = "Abriu a Gestão de Contas a Pagar.";
        break;
      case "/daily-control":
        routeDescription = "Acessou o controle de Despesas Diárias e Vales de Funcionários.";
        break;
      case "/checklist":
        routeDescription =
          "Acessou as rotinas de Checklist e Auditoria Corretiva.";
        break;
      case "/audit-logs":
        routeDescription = "Investigou os logs na Auditoria de Segurança.";
        break;
      case "/security-summary":
        routeDescription =
          "Visualizou o Resumo e a Central de Segurança Heurística.";
        break;
      case "/backups":
        routeDescription =
          "Acessou o gerenciador de Backups e Rollbacks do sistema.";
        break;
      case "/diagnostics":
        routeDescription =
          "Iniciou a varredura e diagnóstico de dados (Deep Scan).";
        break;
      case "/team":
        routeDescription = "Consultou o controle de Colaboradores e Equipes.";
        break;
      case "/select-store":
        routeDescription = "Carregou a tela de seleção das lojas operacionais.";
        break;
      default:
        return;
    }

    AuditService.logAction({
      userId: user.id || "anonymous",
      userName: user.name || "unknown",
      userRole: user.role || "NONE",
      action: "PAGE_VIEW",
      description: routeDescription,
    }).catch((err) =>
      console.error("Erro ao registrar log de navegação:", err),
    );
  }, [location.pathname, user]);

  return null;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <AuditNavigationTracker />
      <Suspense fallback={<PageLoadingFallback />}>
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
            <Route path="/analysis" element={<Dashboard />} />
            <Route path="/reports" element={<Dashboard />} />
            <Route
              path="/team"
              element={
                <RootAdminOnlyRoute>
                  <Team />
                </RootAdminOnlyRoute>
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
      </Suspense>
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
