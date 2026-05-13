/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sitemap from './components/Sitemap';
import LandingPage from './components/LandingPage';

/**
 * Detects if the current environment is a preview/proxy environment.
 * These environments often break traditional BrowserRouter on refresh.
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
  const href = window.location.href;
  
  return identifiers.some(id => host.includes(id) || href.includes(id));
}

export default function App() {
  const isPreview = checkPreviewEnvironment();
  
  // Select the appropriate router based on environment
  const Router = isPreview ? HashRouter : BrowserRouter;

  return (
    <Router>
      <Routes>
        {/* Dynamic Root Redirect */}
        <Route 
          path="/" 
          element={<Navigate to={isPreview ? "/sitemap" : "/lp-video"} replace />} 
        />

        {/* Core Application Routes */}
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/lp-video" element={<LandingPage />} />
        
        {/* Fallback for other potential paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

