import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
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
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  allowedRoles?: User['role'][];
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BarChart3, label: 'Financeiro DRE', path: '/finance', allowedRoles: ['ADMIN', 'MANAGER', 'FINANCIAL'] },
  { icon: Calculator, label: 'CMV & Fichas', path: '/cmv', allowedRoles: ['ADMIN', 'MANAGER'] },
  { icon: PieChart, label: 'Análise de Vendas', path: '/analysis' },
  { icon: Zap, label: 'Insights IA', path: '/insights', allowedRoles: ['ADMIN'] },
  { icon: FileText, label: 'Relatórios', path: '/reports', allowedRoles: ['ADMIN', 'MANAGER'] },
  { icon: Users, label: 'Equipe', path: '/team', allowedRoles: ['ADMIN'] },
];

const LOGO_URL = "https://storage.googleapis.com/aistudio-build-artifacts/7060b66b-6db6-4a04-a679-19b7ec364245/image_generation_1720546313.png";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentStore, setStore, isDarkMode, brandColors } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const filteredNavItems = NAV_ITEMS.filter(item => 
    !item.allowedRoles || (user && item.allowedRoles.includes(user.role))
  );

  const STORES = [
    { id: '1', name: 'Bebelu Mossoró', brand: 'BEBELU' as const, location: 'Espaço Fan', code: 'B32' },
    { id: '2', name: 'Bebelu Rio Mar', brand: 'BEBELU' as const, location: 'Rio Mar Shopping', code: 'B28' },
    { id: '3', name: '4 Estylos Mossoró', brand: '4ESTYLOS' as const, location: 'Avenida Principal', code: '4E09' },
  ];

  return (
    <div className="flex min-h-screen font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className={`relative flex flex-col border-r transition-colors duration-500 ${
          isDarkMode 
            ? 'bg-[#0F0F0F] border-[#1E1E1E]' 
            : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
        }`}
      >
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <div className="bg-white p-1 rounded-lg shrink-0">
                    <img src={LOGO_URL} alt="Logo" className="h-8 w-auto object-contain" />
                  </div>
                  <span className="font-black text-xs italic tracking-tighter dark:text-white whitespace-nowrap">GRUPO AZEVEDO</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-[#1E1E1E] rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Store Selector */}
        {!collapsed && (
          <div className="px-4 mb-6">
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
                  <div className="font-bold text-sm truncate text-black">{currentStore.name}</div>
                  <div className="text-xs text-slate-500">{currentStore.location}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                {STORES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStore(s)}
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
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t dark:border-[#1E1E1E]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            {!collapsed && <span className="font-medium">Sair do Sistema</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#F8FAFC]'}`}>
        <header className={`h-20 flex items-center justify-between px-8 border-b transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F] border-[#1E1E1E]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold dark:text-white">Gerência Regional</h1>
            <div className="h-4 w-px bg-slate-200 dark:bg-[#333]" />
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sistema Online
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0F0F0F] bg-slate-200 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0F0F0F] bg-slate-200 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Anya" alt="avatar" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0F0F0F] bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                +4
              </div>
            </div>
            
            <div className="h-4 w-px bg-slate-200 dark:bg-[#333]" />
            
            <div className="text-right">
              <div className="text-sm font-bold dark:text-white uppercase tracking-tighter italic">
                {user?.name || 'Visitante'}
              </div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic">
                {user?.role === 'ADMIN' ? 'Diretor de Operações' : user?.role === 'MANAGER' ? 'Gerente Geral' : 'Analista Financeiro'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
