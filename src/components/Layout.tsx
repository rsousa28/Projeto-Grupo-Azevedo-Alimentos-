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
  Store as StoreIcon,
  Zap,
  Banknote,
  ClipboardCheck,
  Receipt,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

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
  { icon: BarChart3, label: 'Financeiro DRE', path: '/finance', allowedRoles: [...EXECUTIVE_MANAGERS, 'FINANCIAL'] },
  { icon: Receipt, label: 'Contas a Pagar', path: '/accounts-payable', allowedRoles: [...ALL_MANAGERS, 'FINANCIAL'] },
  { icon: Calculator, label: 'CMV & Engenharia', path: '/cmv', allowedRoles: [...ALL_MANAGERS, 'FINANCIAL'] },
  { icon: Users, label: 'Equipe', path: '/team', allowedRoles: ['ADMIN'] },
  { icon: Shield, label: 'Logs de Acesso', path: '/audit-logs', allowedRoles: ['ADMIN'] },
];

const LOGO_URL = "/logo_azevedo.svg";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentStore, setStore, isDarkMode, brandColors } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  React.useEffect(() => {
    if (currentStore.code === 'ROOT' && location.pathname !== '/team' && location.pathname !== '/audit-logs') {
      navigate('/team');
    }
  }, [currentStore.code, location.pathname, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (currentStore.code === 'ROOT') {
      return item.path === '/team' || (item.path === '/audit-logs' && user?.username === 'adm');
    }
    if (item.path === '/team' || item.path === '/audit-logs') {
      return false; // Team and Audit Logs are strictly restricted to consolidated ROOT view only
    }
    if (item.path === '/finance') {
      return user?.username === 'adm' || user?.username === 'victordiretor';
    }
    if (item.path === '/accounts-payable') {
      return (
        user?.username === 'adm' || 
        user?.username === 'victordiretor' || 
        user?.username === 'patriciab28' || 
        user?.username?.toLowerCase().includes('paloma') ||
        user?.username?.toLowerCase().includes('jef') ||
        user?.role === 'ADMIN' ||
        user?.role === 'MANAGER' ||
        user?.role?.startsWith('MANAGER_')
      );
    }
    return !item.allowedRoles || (user && item.allowedRoles.includes(user.role));
  });

  const filteredStores = React.useMemo(() => {
    if (!user) return [];
    
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
                className="flex items-center gap-3 overflow-hidden"
              >
                <div className="bg-white p-1 rounded-lg shrink-0">
                  <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
                </div>
                <span className={`font-black text-xs italic tracking-tighter whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>GRUPO AZEVEDO</span>
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
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Unidade Ativa</div>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500"
                style={{ backgroundColor: brandColors.button }}
              >
                {currentStore.code ? (
                  <span className={`text-[10px] font-black tracking-tighter ${currentStore.brand === 'BEBELU' ? 'text-black' : 'text-white'}`}>
                    {currentStore.code}
                  </span>
                ) : (
                  <StoreIcon className={`w-5 h-5 ${currentStore.brand === 'BEBELU' ? 'text-black' : 'text-white'}`} />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{currentStore.name}</div>
                <div className="text-xs text-slate-500">{currentStore.location}</div>
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
                    color: currentStore.id === s.id ? (s.brand === 'BEBELU' ? '#B8860B' : (s.brand === '4ESTYLOS' ? '#E63946' : '#0066FF')) : '#94A3B8',
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
              color: currentStore.brand === 'BEBELU' ? '#000' : '#fff',
              boxShadow: `0 10px 15px -3px ${brandColors.button}30`
            } : {}}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all group
              ${!isActive 
                ? (isDarkMode ? 'text-slate-400 hover:bg-[#1E1E1E] hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600')
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
    <div className={`flex min-h-screen font-sans selection:bg-indigo-100 ${isDarkMode ? 'dark' : ''}`}>
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
      >
        {SidebarContent()}
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F8FAFC]'}`}>
        <header className={`h-20 flex items-center justify-between px-6 lg:px-8 border-b transition-colors duration-500 shrink-0 ${isDarkMode ? 'bg-[#0F0F0F] border-[#1E1E1E]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
            >
              <Menu className={`w-6 h-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Sistema Online</span>
            </div>
            <div className="sm:hidden flex items-center gap-2">
               <div className="bg-white p-1 rounded-lg shrink-0">
                  <img src={LOGO_URL} alt="Logo" className="h-6 w-auto object-contain" />
               </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className={`text-sm font-bold uppercase tracking-tighter italic leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {user?.username || user?.name || 'Visitante'}
              </div>
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] italic leading-none">
                {user?.role === 'ADMIN' ? 'CEO' : (user?.username === 'victordiretor' || user?.role === 'FINANCIAL') ? 'Diretor' : 'Gerente'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
