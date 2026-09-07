import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Banknote, 
  ClipboardCheck, 
  Receipt, 
  Megaphone, 
  DollarSign, 
  Building2, 
  Scale, 
  Landmark, 
  Briefcase, 
  Wallet, 
  Menu, 
  LogOut, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Sparkles, 
  Store as StoreIcon, 
  UtensilsCrossed, 
  Users, 
  Shield, 
  Database,
  CheckCircle2,
  Lock,
  ExternalLink,
  LayoutGrid
} from 'lucide-react';
import { Logo } from './Logo';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { MenuItem, Unit } from '../types';
import UnitSelector from './UnitSelector';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (val: boolean) => void;
  onOpenSettings?: () => void;
}

// Operational menu for physical stores (B32, B28, Vero Pasta)
export const OPERATIONAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    type: 'STORE',
    description: 'Indicadores e Visão Geral da Loja'
  },
  {
    id: 'checklists',
    label: 'Checklists',
    path: '/checklist',
    icon: ClipboardCheck,
    type: 'STORE',
    description: 'Rotinas Operacionais e Conformidade'
  },
  {
    id: 'cash-closing',
    label: 'Caixa',
    path: '/cash-closing',
    icon: Banknote,
    type: 'STORE',
    description: 'Fechamento de Caixa e Sangrias'
  },
  {
    id: 'finance-dre',
    label: 'Financeiro DRE',
    path: '/finance',
    icon: BarChart3,
    type: 'STORE',
    description: 'Demonstrativo de Resultados do Exercício'
  },
  {
    id: 'marketing',
    label: 'Marketing',
    path: '/marketing',
    icon: Megaphone,
    type: 'STORE',
    description: 'Campanhas, Promoções e Metas'
  },
  {
    id: 'daily-control',
    label: 'Despesas e Vales',
    path: '/daily-control',
    icon: DollarSign,
    type: 'STORE',
    description: 'Controle Diário de Vales e Despesas'
  },
  {
    id: 'accounts-payable',
    label: 'Contas a Pagar',
    path: '/accounts-payable',
    icon: Receipt,
    type: 'STORE',
    description: 'Títulos, Fornecedores e Boletos'
  },
];

// Corporate menu for Holding ("Gestão Grupo AZ")
export const HOLDING_MENU_ITEMS: MenuItem[] = [
  {
    id: 'holding-overview',
    label: 'Visão Geral',
    path: '/holding/consolidated',
    icon: Building2,
    type: 'HOLDING',
    description: 'Dashboard Consolidado de Todas as Lojas'
  },
  {
    id: 'holding-loans',
    label: 'Empréstimos & Dívidas',
    path: '/holding/loans',
    icon: Landmark,
    type: 'HOLDING',
    description: 'Contratos Bancários e Passivo Total'
  },
  {
    id: 'holding-investments',
    label: 'Novos Negócios / Investimentos',
    path: '/holding/investments',
    icon: Briefcase,
    type: 'HOLDING',
    description: 'Pipeline de Expansão e Novas Unidades'
  },
  {
    id: 'holding-cash-flow',
    label: 'Contas a Pagar Matriz',
    path: '/holding/cash-flow',
    icon: Wallet,
    type: 'HOLDING',
    description: 'Tesouraria Central e Mútuos Intercompany'
  },
];

// Simplified Governance Item for Admin (Configurações / Acessos)
const GOVERNANCE_ITEMS: MenuItem[] = [
  {
    id: 'admin-team',
    label: 'Configurações / Acessos',
    path: '/team',
    icon: Users,
    type: 'HOLDING',
  }
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const { currentStore, setStore, isDarkMode, brandColors } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUnitModal, setShowUnitModal] = useState(false);

  const isHoldingActive = currentStore.type === 'HOLDING' || currentStore.code === 'ROOT';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleUnitSelect = (unit: Unit) => {
    setStore(unit);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    if (unit.type === 'HOLDING' || unit.code === 'ROOT') {
      navigate('/holding/consolidated');
    } else {
      navigate('/dashboard');
    }
  };

  // Determine current menu items dynamically based on unit type
  const activeMenuItems = isHoldingActive ? HOLDING_MENU_ITEMS : OPERATIONAL_MENU_ITEMS;

  return (
    <>
      <aside
        id="app-sidebar"
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 flex flex-col border-r select-none ${
          collapsed ? 'w-20' : 'w-72'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isHoldingActive
            ? 'bg-[#101012] border-amber-500/20 text-white'
            : isDarkMode
              ? 'bg-[#141414] border-[#242424] text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-inherit shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="shrink-0 transition-transform duration-300 hover:scale-105">
              <Logo className="h-8 w-auto" variant={isDarkMode || isHoldingActive ? 'light' : 'dark'} />
            </div>

            {(!collapsed || mobileMenuOpen) && (
              <div className="overflow-hidden">
                <span className={`font-black text-xs italic tracking-tight uppercase block truncate ${
                  isHoldingActive || isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  GRUPO AZEVEDO
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  {isHoldingActive ? 'Holding Financeira' : 'Sistema Integrado'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            title={collapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Simplified Unit Selector Section */}
        {(!collapsed || mobileMenuOpen) && (
          <div className="px-4 py-3 shrink-0">
            <div className={`p-3 rounded-2xl border transition-all ${
              isHoldingActive
                ? 'bg-amber-500/5 border-amber-500/20'
                : isDarkMode
                  ? 'bg-[#18181A] border-[#262628]'
                  : 'bg-slate-50 border-slate-200/80'
            }`}>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Unidade Selecionada
                </span>
                <span className={`text-[11px] font-black uppercase tracking-tight ${
                  isHoldingActive ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {currentStore.code === 'ROOT' ? 'Holding AZ' : currentStore.code}
                </span>
              </div>

              {/* 4 Direct Selector Buttons: B32, B28, VERO, HOLDING */}
              <div className="grid grid-cols-2 gap-1.5">
                {STORES.map((s) => {
                  const isSelected = currentStore.id === s.id;
                  const isStoreHolding = s.type === 'HOLDING' || s.code === 'ROOT';
                  const label = isStoreHolding ? 'HOLDING' : s.code;

                  return (
                    <button
                      key={s.id}
                      id={`sidebar-quick-${s.code.toLowerCase()}`}
                      onClick={() => handleUnitSelect(s)}
                      title={`${s.name} - ${s.location}`}
                      className={`text-xs font-black py-2 px-2.5 rounded-xl border transition-all truncate flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? isStoreHolding
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                            : 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                          : isStoreHolding
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10'
                            : isDarkMode
                              ? 'bg-[#141416] border-[#2A2A2E] text-slate-400 hover:border-slate-600 hover:text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed Store Icon Switcher */}
        {collapsed && !mobileMenuOpen && (
          <div className="p-3 shrink-0 flex flex-col items-center">
            <button
              onClick={() => setShowUnitModal(true)}
              title={`Unidade Atual: ${currentStore.name}. Clique para alternar.`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-transform hover:scale-105 cursor-pointer shadow-md ${
                isHoldingActive
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                  : currentStore.brand === 'VERO PASTA'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#FFCB05] text-[#7F300C]'
              }`}
            >
              {isHoldingActive ? (
                <Building2 className="w-5 h-5" />
              ) : currentStore.brand === 'VERO PASTA' ? (
                <UtensilsCrossed className="w-5 h-5" />
              ) : (
                currentStore.code
              )}
            </button>
          </div>
        )}

        {/* Section Title */}
        {(!collapsed || mobileMenuOpen) && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <span className={`text-[10px] uppercase tracking-widest font-black ${
              isHoldingActive ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {isHoldingActive ? 'Módulos da Holding' : 'Módulos Operacionais'}
            </span>
          </div>
        )}

        {/* Scrollable Nav Item List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {activeMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                id={`sidebar-nav-${item.id}`}
                to={item.path}
                onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? isHoldingActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                    : isHoldingActive
                      ? 'text-slate-300 hover:bg-amber-500/10 hover:text-amber-300'
                      : isDarkMode
                        ? 'text-slate-400 hover:bg-[#1E1E1E] hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive 
                    ? isHoldingActive ? 'text-slate-950' : 'text-slate-950'
                    : isHoldingActive ? 'text-amber-400/80 group-hover:text-amber-300' : 'text-slate-400'
                }`} />

                {(!collapsed || mobileMenuOpen) && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                        isActive 
                          ? 'bg-black/20 text-slate-950' 
                          : isHoldingActive 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* Admin Settings / Access */}
          {user?.role === 'ADMIN' && (!collapsed || mobileMenuOpen) && (
            <div className="pt-3 mt-3 border-t border-inherit">
              {GOVERNANCE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white font-black'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Profile & Footer */}
        <div className="p-3 border-t border-inherit shrink-0 bg-inherit/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                {(user?.username || 'U')[0].toUpperCase()}
              </div>

              {(!collapsed || mobileMenuOpen) && (
                <div className="overflow-hidden">
                  <div className="text-xs font-bold truncate text-slate-200">
                    {user?.name || user?.username || 'Usuário'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate uppercase font-semibold">
                    {user?.role || 'Operador'}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Sair do Sistema"
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Seletor de Unidades (if opened from sidebar) */}
      <UnitSelector
        variant="modal"
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
      />
    </>
  );
}
