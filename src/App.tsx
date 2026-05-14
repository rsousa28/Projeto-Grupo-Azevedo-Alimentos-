/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './contexts/StoreContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import SelectStore from './pages/SelectStore';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import DataEntry from './pages/DataEntry';
import CMV from './pages/CMV';
import AIInsights from './pages/AIInsights';

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
    'run.app'
  ];
  const host = window.location.hostname;
  return identifiers.some(id => host.includes(id));
}

const isPreview = checkPreviewEnvironment();
const Router = isPreview ? HashRouter : BrowserRouter;

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
           <Route path="/data-entry" element={<DataEntry />} />
           <Route path="/finance" element={<Finance />} />
           <Route path="/cmv" element={<CMV />} />
           <Route path="/insights" element={<AIInsights />} />
           <Route path="/analysis" element={<Dashboard />} />
           <Route path="/reports" element={<Dashboard />} />
           <Route path="/team" element={<Dashboard />} />
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
    <AuthProvider>
      <StoreProvider>
        <AppRoutes />
      </StoreProvider>
    </AuthProvider>
  );
}

