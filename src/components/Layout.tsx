import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Calculator, 
  PieChart, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Store as StoreIcon,
  Zap,
  Banknote,
  ClipboardCheck,
  Receipt,
  Shield,
  Lock,
  Database,
  Activity,
  Sun,
  Moon,
  Megaphone,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import NotificationCenter from './NotificationCenter';
import BackupStatusIndicator from './BackupStatusIndicator';
import OfflineSyncBadge from './OfflineSyncBadge';
import SettingsModal from './SettingsModal';
import { NotificationService } from '../services/NotificationService';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  allowedRoles?: User['role'][];
}

const ALL_MANAGERS: User['role'][] = ['ADMIN', 'MANAGER', 'MANAGER_BEBELU_RIOMAR_PAPICU', 'MANAGER_BEBELU_MOSSORO', 'MANAGER_4ESTYLOS_MOSSORO'];
const EXECUTIVE_MANAGERS: User['role'][] = ['ADMIN', 'MANAGER', 'MANAGER_BEBELU_MOSSORO', 'MANAGER_4ESTYLOS_MOSSORO'];

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardCheck, label: 'Checklists', path: '/checklist' },
  { icon: Banknote, label: 'Caixa', path: '/cash-closing', allowedRoles: [...ALL_MANAGERS, 'FINANCIAL'] },
  { icon: BarChart3, label: 'Financeiro DRE', path: '/finance', allowedRoles: ['ADMIN'] },
  { icon: Megaphone, label: 'Marketing', path: '/marketing', allowedRoles: ['ADMIN'] },
  { icon: DollarSign, label: 'Despesas e Vales', path: '/daily-control', allowedRoles: [...ALL_MANAGERS, 'FINANCIAL'] },
  { icon: Receipt, label: 'Contas a Pagar', path: '/accounts-payable', allowedRoles: [...ALL_MANAGERS, 'FINANCIAL'] },
  { icon: Users, label: 'Equipe', path: '/team', allowedRoles: ['ADMIN'] },
  { icon: Shield, label: 'Logs de Acesso', path: '/audit-logs', allowedRoles: ['ADMIN'] },
  { icon: Lock, label: 'Resumo de Segurança', path: '/security-summary', allowedRoles: ['ADMIN'] },
  { icon: Database, label: 'Backups e Rollbacks', path: '/backups', allowedRoles: ['ADMIN'] },
  { icon: Activity, label: 'Varredura e Integridade', path: '/diagnostics', allowedRoles: ['ADMIN'] },
];

const LOGO_URL = "/logo_azevedo.svg";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { currentStore, setStore, isDarkMode, toggleDarkMode, brandColors } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  const bgTextureClass = currentStore.brand === 'BEBELU' 
    ? (isDarkMode 
        ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" 
        : "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/5 via-transparent to-transparent")
    : "";

  React.useEffect(() => {
    const allowedPathnames = ['/team', '/audit-logs', '/security-summary', '/backups', '/diagnostics'];
    if (currentStore.code === 'ROOT' && !allowedPathnames.includes(location.pathname)) {
      navigate('/team');
    }
  }, [currentStore.code, location.pathname, navigate]);

  // Routine manager check for pending checklist and cash closing notifications
  React.useEffect(() => {
    if (!currentStore.id || currentStore.code === 'ROOT') return;

    const runRoutineCheck = () => {
      const todayStr = new Date().toISOString().split('T')[0];

      // Check if checklist complete today
      let isChecklistCompleteToday = false;
      try {
        const storedSubmissions = localStorage.getItem(`checklist_submissions_${currentStore.id}`);
        if (storedSubmissions) {
          const subs = JSON.parse(storedSubmissions);
          isChecklistCompleteToday = subs.some((s: any) => {
            const dateStr = s.submittedAt ? s.submittedAt.split('T')[0] : '';
            return dateStr === todayStr;
          });
        }
      } catch (e) {
        console.error(e);
      }

      // Check if cash closed today
      let isCashClosedToday = false;
      try {
        const savedClosings = localStorage.getItem(`closings_data_${currentStore.id}`);
        if (savedClosings) {
          const closings = JSON.parse(savedClosings);
          isCashClosedToday = closings.some((c: any) => c.date === todayStr);
        }
      } catch (e) {
        console.error(e);
      }

      NotificationService.checkRoutineReminders({
        storeCode: currentStore.code,
        storeName: currentStore.name,
        isChecklistCompleteToday,
        isCashClosedToday,
      });
    };

    runRoutineCheck();
    const interval = setInterval(runRoutineCheck, 3 * 60 * 1000); // Check every 3 mins
    return () => clearInterval(interval);
  }, [currentStore.id, currentStore.code, currentStore.name]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    const isSpecialAdminPath = ['/team', '/audit-logs', '/security-summary', '/backups', '/diagnostics'].includes(item.path);
    if (currentStore.code === 'ROOT') {
      return item.path === '/team' || (isSpecialAdminPath && user?.username === 'adm');
    }
    if (isSpecialAdminPath) {
      return false; // strictly restricted to consolidated ROOT view only
    }
    if (item.path === '/finance') {
      return user?.role === 'ADMIN' || user?.username === 'adm';
    }
    if (item.path === '/marketing') {
      return user?.username === 'adm' || user?.role === 'ADMIN';
    }
    if (item.path === '/accounts-payable') {
      return user?.role === 'ADMIN' || user?.username === 'adm' || (!!user?.role && ALL_MANAGERS.includes(user.role)) || user?.role === 'FINANCIAL';
    }
    if (item.path === '/cmv') {
      const isAndressaOrMichele = 
        user?.username?.toLowerCase().includes('andressa') || 
        user?.username?.toLowerCase().includes('michele');
      if (isAndressaOrMichele) {
        return false;
      }
    }
    return !item.allowedRoles || (user && item.allowedRoles.includes(user.role));
  });

  const filteredStores = React.useMemo(() => {
    if (!user) return [];
    
    const isRennan = (user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan');
    if (isRennan) {
      return STORES;
    }

    // Admin sees everything
    if (user.role === 'ADMIN') {
      return STORES;
    }
    
    if (user.role === 'FINANCIAL') return STORES.filter(s => s.code !== 'ROOT');

    // Filter by specific Manager roles
    if (user.role === 'MANAGER_BEBELU_MOSSORO') {
      return STORES.filter(s => s.code === 'B32');
    }
    if (user.role === 'MANAGER_BEBELU_RIOMAR_PAPICU') {
      return STORES.filter(s => s.code === 'B28');
    }
    if (user.role === 'MANAGER_4ESTYLOS_MOSSORO') {
      if (user.username?.toLowerCase().includes('jef')) {
        return STORES.filter(s => s.code === '4E09' || s.code === 'B32');
      }
      return STORES.filter(s => s.code === '4E09');
    }
    
    return STORES.filter(s => s.code !== 'ROOT');
  }, [user]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {(!collapsed || mobileMenuOpen) && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 overflow-visible font-display animate-fade-in"
              >
                <div className="bg-white p-1 rounded-xl shadow-md shadow-amber-500/15 border border-amber-500/15 shrink-0 transition-transform hover:scale-105 duration-300">
                  <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
                </div>
                <span className={`font-black text-xs italic tracking-tight whitespace-nowrap py-1.5 px-0.5 leading-normal select-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  GRUPO AZEVEDO
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => collapsed ? setCollapsed(false) : setCollapsed(true)}
            className="hidden lg:block p-2 hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
          >
            <Menu className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* Store Selector */}
      {(!collapsed || mobileMenuOpen) && (
        <div className="px-4 mb-6 shrink-0">
          <div className={`p-4 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#1E1E1E] border-[#333]' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="text-[9px] uppercase tracking-widest font-black text-amber-500/90 mb-2">Unidade Ativa</div>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-md transform hover:scale-110"
                style={{ 
                  backgroundColor: brandColors.button,
                  boxShadow: `0 4px 12px ${brandColors.button}33`
                }}
              >
                {currentStore.code ? (
                  <span className={`text-[11px] font-extrabold tracking-tighter ${currentStore.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'}`}>
                    {currentStore.code}
                  </span>
                ) : (
                  <StoreIcon className={`w-5 h-5 ${currentStore.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'}`} />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className={`font-black text-sm truncate tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{currentStore.name}</div>
                <div className="text-[11px] text-slate-400 font-medium truncate">{currentStore.location}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              {filteredStores.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStore(s);
                    if (mobileMenuOpen) setMobileMenuOpen(false);
                  }}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all`}
                  style={{ 
                    borderColor: currentStore.id === s.id ? (s.brand === 'BEBELU' ? '#FFCB05' : '#E63946') : (isDarkMode ? '#333' : '#E2E8F0'),
                    color: currentStore.id === s.id ? (s.brand === 'BEBELU' ? '#7F300C' : (s.brand === '4ESTYLOS' ? '#E63946' : '#0066FF')) : '#94A3B8',
                    backgroundColor: currentStore.id === s.id ? (s.brand === 'BEBELU' ? '#FFCB0520' : (s.brand === '4ESTYLOS' ? '#E6394610' : '#0066FF10')) : 'transparent'
                  }}
                >
                  {s.code || s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
            style={({ isActive }) => isActive ? { 
              backgroundColor: brandColors.button,
              color: currentStore.brand === 'BEBELU' ? '#7F300C' : '#fff',
              boxShadow: `0 10px 15px -3px ${brandColors.button}30`
            } : {}}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all group
              ${!isActive 
                ? (isDarkMode 
                    ? 'text-slate-400 hover:bg-[#1E1E1E] hover:text-white' 
                    : `text-slate-600 hover:bg-slate-50 ${currentStore.brand === 'BEBELU' ? 'hover:text-[#7F300C]' : 'hover:text-[#E63946]'}`)
                : ''}
            `}
          >
            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 shrink-0" />
            {(!collapsed || mobileMenuOpen) && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t dark:border-[#1E1E1E] shrink-0">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0" />
          {(!collapsed || mobileMenuOpen) && <span className="font-medium">Sair do Sistema</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex min-h-screen font-sans ${currentStore.brand === 'BEBELU' || currentStore.code === 'ROOT' ? 'selection:bg-amber-200 selection:text-[#7F300C]' : 'selection:bg-red-200 selection:text-red-950'} ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar for Desktop */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className={`hidden lg:flex relative flex-col border-r transition-colors duration-500 ${
          isDarkMode 
            ? 'bg-[#0F0F0F] border-[#1E1E1E]' 
            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
        }`}
      >
        {SidebarContent()}
      </motion.aside>

      {/* Sidebar for Mobile */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: mobileMenuOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed top-0 left-0 h-[100dvh] w-[280px] z-50 flex flex-col border-r transition-colors duration-500 lg:hidden ${
          isDarkMode 
            ? 'bg-[#0F0F0F] border-[#1E1E1E]' 
            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
        }`}
        style={{
          paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
          paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
          paddingLeft: 'env(safe-area-inset-left, 0px)'
        }}
      >
        {SidebarContent()}
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-[100dvh] overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F8FAFC]'}`}>
        <header 
          className={`flex flex-col border-b transition-colors duration-500 shrink-0 ${isDarkMode ? 'bg-[#0F0F0F] border-[#1E1E1E]' : 'bg-white border-slate-200'}`}
          style={{
            paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <div className="h-16 lg:h-20 flex items-center justify-between px-2 sm:px-4 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
              >
                <Menu className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <OfflineSyncBadge />
              </div>
              <div className="sm:hidden flex items-center gap-2">
                 <div className="bg-white p-1 rounded-lg shrink-0 border border-slate-200/50 shadow-xs">
                    <img src={LOGO_URL} alt="Logo" className="h-6 w-auto object-contain" />
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Local-First IndexedDB Network & Sync Indicator for Mobile/All */}
              <div className="sm:hidden">
                <OfflineSyncBadge />
              </div>

              {/* Admin Backup Status & Alert Indicator */}
              <BackupStatusIndicator />

              {/* Local Push Notification Center & Manager Alerts */}
              <NotificationCenter />

              {/* Settings Menu Button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Configurações do Usuário e Biometria"
                className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
                  isDarkMode 
                    ? 'bg-[#1E1E1E] border-[#2A2A2A] text-slate-300 hover:bg-[#252525] hover:text-white' 
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>


              <div 
                onClick={() => setIsSettingsOpen(true)}
                className="text-right max-w-[90px] xs:max-w-[120px] sm:max-w-none cursor-pointer hover:opacity-80 transition-opacity"
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
          className={`flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 overscroll-contain custom-scrollbar relative ${bgTextureClass}`} 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(10rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
          }}
        >
          <div className="relative z-10 transition-all duration-300">
            {children || <Outlet />}
          </div>
        </div>
      </main>

      {/* User Settings & Biometrics Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
