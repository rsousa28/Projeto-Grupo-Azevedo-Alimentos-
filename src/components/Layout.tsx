import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { 
  Settings, 
  Menu,
  ChevronDown,
  Building2,
  Store as StoreIcon,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import BackupStatusIndicator from './BackupStatusIndicator';
import SettingsModal from './SettingsModal';
import Sidebar from './Sidebar';
import UnitSelector from './UnitSelector';
import { NotificationService } from '../services/NotificationService';
import { BackupService } from '../services/BackupService';
import { useToast } from '../contexts/ToastContext';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const { currentStore, isDarkMode, brandColors } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic route redirection to enforce isolation between holding and store operations
  React.useEffect(() => {
    const isHolding = currentStore.type === 'HOLDING' || currentStore.code === 'ROOT';
    const isHoldingRoute = location.pathname.startsWith('/holding');
    const isGovernanceRoute = ['/team', '/audit-logs', '/security-summary', '/backups', '/diagnostics'].includes(location.pathname);

    if (isHolding) {
      // If holding is active and user tries to browse operational routes, smoothly redirect to holding consolidated
      if (!isHoldingRoute && !isGovernanceRoute) {
        navigate('/holding/consolidated', { replace: true });
      }
    } else {
      // If a physical store is active and user tries to access holding routes, redirect to operational dashboard
      if (isHoldingRoute) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [currentStore.type, currentStore.code, location.pathname, navigate]);

  // Initialize cross-device real-time notification listener
  React.useEffect(() => {
    const unsub = NotificationService.initRealtimeListener();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Routine manager check for pending checklist and cash closing notifications
  React.useEffect(() => {
    if (!currentStore.id || currentStore.code === 'ROOT') return;

    const runRoutineCheck = async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      // Check if checklist complete today
      let isChecklistCompleteToday = false;
      try {
        const storedSubmissions = localStorage.getItem(`checklist_submissions_${currentStore.id}`);
        if (storedSubmissions) {
          const parsed = JSON.parse(storedSubmissions);
          const subs: any[] = Array.isArray(parsed)
            ? parsed
            : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
          if (Array.isArray(subs)) {
            isChecklistCompleteToday = subs.some((s: any) => {
              const dateStr = s?.submittedAt ? String(s.submittedAt).split('T')[0] : (s?.date ? String(s.date) : '');
              return dateStr === todayStr;
            });
          }
        }
      } catch (e) {
        console.warn('Checklist routine check error:', e);
      }

      // Check if cash closed today
      let isCashClosedToday = false;
      try {
        const savedClosings = localStorage.getItem(`closings_data_${currentStore.id}`);
        if (savedClosings) {
          const parsed = JSON.parse(savedClosings);
          if (Array.isArray(parsed)) {
            isCashClosedToday = parsed.some((c: any) => c?.date === todayStr);
          } else if (parsed && typeof parsed === 'object' && parsed !== null) {
            isCashClosedToday = Boolean(parsed[todayStr]) || Object.values(parsed).some((c: any) => c?.date === todayStr);
          }
        }
      } catch (e) {
        console.warn('Cash closing routine check error:', e);
      }

      NotificationService.checkRoutineReminders({
        storeCode: currentStore.code,
        storeName: currentStore.name,
        isChecklistCompleteToday,
        isCashClosedToday,
      });

      // Check hourly Accounts Payable report reminder
      NotificationService.checkAccountsPayableHourlyReminder();

      // Automated daily cloud backup check (Data Loss Prevention)
      try {
        const backupHealth = await BackupService.getHealthStatus();
        if (!backupHealth.hasRecentBackup) {
          console.log('[Auto-Backup] No recent backup found (< 24h). Creating automated cloud backup...');
          await BackupService.createBackup(user?.username || 'sistema', 'auto');
        }
      } catch (backupErr) {
        console.warn('[Auto-Backup] Background check error:', backupErr);
      }
    };

    runRoutineCheck();
    const interval = setInterval(runRoutineCheck, 60 * 1000); // Check every 1 min for hourly accuracy
    return () => clearInterval(interval);
  }, [currentStore.id, currentStore.code, currentStore.name]);

  // Listen for push notifications to trigger in-app floating Toast alerts
  useEffect(() => {
    const handlePushEvent = (e: any) => {
      const { title, body } = e.detail || {};
      if (title && body) {
        showToast(body, 'info', title, 9000);
      }
    };

    window.addEventListener('app_push_notification', handlePushEvent);
    return () => window.removeEventListener('app_push_notification', handlePushEvent);
  }, [showToast]);

  return (
    <div className={`flex min-h-[100dvh] w-full max-w-[100dvw] overflow-x-hidden font-sans ${currentStore.brand === 'BEBELU' || currentStore.code === 'ROOT' ? 'selection:bg-amber-200 selection:text-[#7F300C]' : 'selection:bg-red-200 selection:text-red-950'} ${isDarkMode ? 'dark' : ''}`}>
      {/* Dynamic Conditional Sidebar (Operational for Stores, Holding for Gestão Grupo AZ) */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-[100dvh] w-full max-w-full overflow-x-hidden min-w-0 transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'} ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F8FAFC]'}`}>
        <header 
          className={`flex flex-col border-b transition-colors duration-500 shrink-0 ${isDarkMode ? 'bg-[#0F0F0F] border-[#1E1E1E]' : 'bg-white border-slate-200'}`}
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.25rem)',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <div className="h-16 lg:h-20 flex items-center justify-between px-1.5 sm:px-4 lg:px-8 max-w-full">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
              >
                <Menu className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
              </button>
              <div className="hidden xs:flex sm:hidden items-center gap-2">
                 <div className="shrink-0">
                    <Logo className="h-6 w-auto" variant={isDarkMode ? 'light' : 'dark'} />
                 </div>
              </div>

              {/* Active Unit Fast Selector Badge */}
              <button
                id="header-unit-selector-btn"
                onClick={() => setShowUnitModal(true)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-xs ${
                  currentStore.type === 'HOLDING' || currentStore.code === 'ROOT'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-xs'
                    : isDarkMode
                      ? 'bg-[#1C1C1E] border-[#2E2E32] text-slate-200 hover:bg-[#252528]'
                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                }`}
                title="Clique para alternar entre as 4 unidades (B32, B28, Vero Pasta, Gestão Grupo AZ)"
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                  currentStore.type === 'HOLDING' || currentStore.code === 'ROOT'
                    ? 'bg-amber-500 text-slate-950'
                    : currentStore.brand === 'VERO PASTA'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#FFCB05] text-[#7F300C]'
                }`}>
                  {currentStore.code === 'ROOT' ? 'AZ' : currentStore.code || 'LJ'}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold leading-none hidden sm:block">
                    {currentStore.type === 'HOLDING' ? 'Holding' : 'Unidade'}
                  </span>
                  <span className="truncate max-w-[75px] xs:max-w-[110px] sm:max-w-[180px] leading-tight">
                    {currentStore.name}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0 min-w-0">
              {/* Admin Backup Status & Alert Indicator (Desktop/Tablet) */}
              <div className="hidden sm:flex shrink-0">
                <BackupStatusIndicator />
              </div>

              {/* Local Push Notification Center & Manager Alerts */}
              <div className="shrink-0">
                <NotificationCenter />
              </div>

              {/* Settings Menu Button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Configurações do Usuário e Biometria"
                className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${
                  isDarkMode 
                    ? 'bg-[#1E1E1E] border-[#2A2A2A] text-slate-300 hover:bg-[#252525] hover:text-white' 
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>


              <div 
                onClick={() => setIsSettingsOpen(true)}
                className="text-right max-w-[65px] xs:max-w-[100px] sm:max-w-none cursor-pointer hover:opacity-80 transition-opacity shrink min-w-0"
                title="Clique para abrir as Configurações"
              >
                <div className={`text-xs sm:text-sm font-black uppercase tracking-tighter italic leading-none mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {user?.username || user?.name || 'Visitante'}
                </div>
                <div className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] italic leading-none truncate">
                  {user?.role === 'ADMIN' ? 'CEO' : (user?.username === 'victordiretor' || user?.role === 'FINANCIAL') ? 'Diretor' : 'Gerente'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 overscroll-contain custom-scrollbar relative" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <div className="relative z-10 transition-all duration-300">
            {children || <Outlet />}
          </div>
        </div>
      </main>

      {/* Unit Selector Modal (Quick Switch between B32, B28, Vero Pasta, Gestão Grupo AZ) */}
      <UnitSelector 
        variant="modal"
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
      />

      {/* User Settings & Biometrics Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
