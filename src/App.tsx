/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './contexts/StoreContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import SelectStore from './pages/SelectStore';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import DataEntry from './pages/DataEntry';
import CMV from './pages/CMV';
import Team from './pages/Team';
import CashClosing from './pages/CashClosing';
import Checklist from './pages/Checklist';
import AccountsPayable from './pages/AccountsPayable';

import { useAuth } from './contexts/AuthContext';

/**
 * Detects if the current environment is a preview/proxy environment.
 */
function checkPreviewEnvironment(): boolean {
  const identifiers = [
    'googleusercontent',
    'webcontainer',
    'shim',
    '.goog',
    'scf.usercontent',
    'stackblitz',
    'codesandbox',
    'run.app',
    'localhost',
    '127.0.0.1',
    'vercel.app',
    'netlify.app'
  ];
  const host = window.location.hostname;
  return identifiers.some(id => host.includes(id));
}

const isPreview = checkPreviewEnvironment();
const Router = isPreview ? HashRouter : BrowserRouter;

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess = user && (
    user.username === 'adm' || 
    user.username === 'victordiretor' || 
    user.username === 'patriciab28' || 
    user.username?.toLowerCase().includes('paloma') ||
    user.username?.toLowerCase().includes('jef') ||
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    user.role?.startsWith('MANAGER_')
  );
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function FinanceAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasAccess = user && (
    user.username === 'adm' || 
    user.username === 'victordiretor'
  );
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/select-store" element={
          <ProtectedRoute>
            <SelectStore />
          </ProtectedRoute>
        } />
        
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
           <Route index element={<Navigate to="/dashboard" replace />} />
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/cash-closing" element={<CashClosing />} />
           <Route path="/data-entry" element={<DataEntry />} />
           <Route path="/finance" element={
             <FinanceAccessRoute>
               <Finance />
             </FinanceAccessRoute>
           } />
           <Route path="/accounts-payable" element={
             <AdminOnlyRoute>
               <AccountsPayable />
             </AdminOnlyRoute>
           } />
           <Route path="/cmv" element={<CMV />} />
           <Route path="/checklist" element={<Checklist />} />
           <Route path="/analysis" element={<Dashboard />} />
           <Route path="/reports" element={<Dashboard />} />
           <Route path="/team" element={<Team />} />
        </Route>

        <Route path="/" element={
          user ? <Navigate to="/select-store" replace /> : <Navigate to="/login" replace />
        } />
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

