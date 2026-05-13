/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './contexts/StoreContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import SelectStore from './pages/SelectStore';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import CMV from './pages/CMV';
import AIInsights from './pages/AIInsights';

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
    'codesandbox'
  ];
  const host = window.location.hostname;
  return identifiers.some(id => host.includes(id));
}

export default function App() {
  const isPreview = checkPreviewEnvironment();
  const Router = isPreview ? HashRouter : BrowserRouter;

  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/select-store" element={<SelectStore />} />
          
          <Route element={<Layout children={<Navigate to="/dashboard" />} />}>
             <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
             <Route path="/finance" element={<Layout><Finance /></Layout>} />
             <Route path="/cmv" element={<Layout><CMV /></Layout>} />
             <Route path="/insights" element={<Layout><AIInsights /></Layout>} />
             {/* Add placeholders for other routes */}
             <Route path="/inventory" element={<Layout><CMV /></Layout>} />
             <Route path="/analysis" element={<Layout><Dashboard /></Layout>} />
             <Route path="/reports" element={<Layout><Dashboard /></Layout>} />
             <Route path="/team" element={<Layout><Dashboard /></Layout>} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </StoreProvider>
  );
}

