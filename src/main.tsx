import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Robust local and session storage polyfill for strict browsers / sandboxed iframes (Google Chrome)
// to prevent "Access is denied for this document" DOMExceptions which cause white screens.
(() => {
  const testStorage = (type: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[type];
      const testKey = '__storage_test_key__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  class InMemoryStorage implements Storage {
    private store: Record<string, string> = {};

    get length(): number {
      return Object.keys(this.store).length;
    }

    clear(): void {
      this.store = {};
    }

    getItem(key: string): string | null {
      return this.store.hasOwnProperty(key) ? this.store[key] : null;
    }

    key(index: number): string | null {
      return Object.keys(this.store)[index] || null;
    }

    removeItem(key: string): void {
      delete this.store[key];
    }

    setItem(key: string, value: string): void {
      this.store[key] = String(value);
    }
  }

  if (!testStorage('localStorage')) {
    console.warn("localStorage is blocked or restricted. Activating safe in-memory fallback to prevent crashes.");
    try {
      Object.defineProperty(window, 'localStorage', {
        value: new InMemoryStorage(),
        configurable: true,
        writable: true
      });
    } catch (err) {
      console.error("Could not polyfill localStorage:", err);
    }
  }

  if (!testStorage('sessionStorage')) {
    console.warn("sessionStorage is blocked or restricted. Activating safe in-memory fallback to prevent crashes.");
    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: new InMemoryStorage(),
        configurable: true,
        writable: true
      });
    } catch (err) {
      console.error("Could not polyfill sessionStorage:", err);
    }
  }
})();

import App from './App.tsx';
import './index.css';

// Shim process for browser environments where it might be expected by libraries
if (typeof window !== 'undefined' && !window.process) {
  (window as any).process = { env: {} };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

