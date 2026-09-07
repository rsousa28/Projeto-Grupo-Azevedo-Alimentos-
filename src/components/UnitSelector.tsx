import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Store as StoreIcon, 
  MapPin, 
  ChevronRight, 
  CheckCircle2, 
  Layers, 
  UtensilsCrossed, 
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Unit } from '../types';

interface UnitSelectorProps {
  variant?: 'grid' | 'compact' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (unit: Unit) => void;
  className?: string;
  hideHolding?: boolean;
}

export default function UnitSelector({
  variant = 'grid',
  isOpen = false,
  onClose,
  onSelect,
  className = '',
  hideHolding = false,
}: UnitSelectorProps) {
  const { currentStore, setStore, isDarkMode } = useStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter available stores based on user role
  const availableUnits = React.useMemo(() => {
    if (!user) return STORES;

    const isRennan = (user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan');
    if (isRennan || user.role === 'ADMIN') {
      return STORES;
    }

    if (user.role === 'FINANCIAL') {
      return STORES;
    }

    if (user.role === 'MANAGER_BEBELU_MOSSORO' || (user.username || '').toLowerCase().includes('jef')) {
      return STORES.filter(s => s.code === 'B32');
    }

    if (user.role === 'MANAGER_BEBELU_RIOMAR_PAPICU') {
      return STORES.filter(s => s.code === 'B28');
    }

    if (user.role === 'MANAGER_VERO_PASTA') {
      return STORES.filter(s => s.code === 'VERO' || s.id === '3');
    }

    // Default: physical stores
    return STORES.filter(s => s.type === 'STORE');
  }, [user]);

  const unitsToDisplay = hideHolding 
    ? availableUnits.filter(u => u.type !== 'HOLDING') 
    : availableUnits;

  const handleUnitClick = (unit: Unit) => {
    setStore(unit);
    if (onSelect) {
      onSelect(unit);
    }
    if (onClose) {
      onClose();
    }

    // Smart route redirect when switching between Holding and Store
    if (unit.type === 'HOLDING' || unit.code === 'ROOT') {
      navigate('/holding/consolidated');
    } else {
      navigate('/dashboard');
    }
  };

  // 1. Compact Variant (For sidebar or header quick-switching)
  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] uppercase tracking-widest font-black text-amber-500/90 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-amber-500" />
            Alternar Unidade
          </span>
          <span className="text-[9px] font-semibold text-slate-400">4 Opções</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {unitsToDisplay.map((unit) => {
            const isSelected = currentStore.id === unit.id;
            const isHolding = unit.type === 'HOLDING' || unit.code === 'ROOT';

            return (
              <button
                key={unit.id}
                id={`unit-selector-compact-${unit.code.toLowerCase()}`}
                onClick={() => handleUnitClick(unit)}
                title={`${unit.name} - ${unit.location}`}
                className={`relative group px-2.5 py-2 rounded-xl text-left border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? isHolding
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-xs shadow-amber-500/20'
                      : isDarkMode
                        ? 'bg-amber-500/10 border-amber-500/80 text-amber-400'
                        : 'bg-amber-50 border-amber-400 text-[#7F300C] shadow-xs'
                    : isHolding
                      ? isDarkMode
                        ? 'bg-amber-950/20 border-amber-500/30 text-slate-300 hover:border-amber-500/60 hover:text-white'
                        : 'bg-amber-50/60 border-amber-200 text-slate-700 hover:border-amber-400'
                      : isDarkMode
                        ? 'bg-[#181818] border-[#2A2A2A] text-slate-400 hover:border-[#383838] hover:text-slate-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {/* Subtle highlight for Holding */}
                {isHolding && (
                  <div className="absolute top-0 right-0 transform translate-x-1 -translate-y-1">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between w-full">
                  <span className="font-extrabold text-[11px] tracking-tight truncate">
                    {unit.code}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </div>

                <span className="text-[9px] truncate opacity-80 mt-0.5 block font-medium">
                  {isHolding ? 'Holding AZ' : unit.name.replace(/\s*\([^)]*\)/g, '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Helper render for card items in Grid or Modal view
  const renderCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {unitsToDisplay.map((unit, index) => {
        const isSelected = currentStore.id === unit.id;
        const isHolding = unit.type === 'HOLDING' || unit.code === 'ROOT';
        const isVero = unit.code === 'VERO' || unit.brand === 'VERO PASTA';
        const isBebelu = unit.brand === 'BEBELU';

        const modules = isHolding
          ? ['Endividamento', 'Empréstimos', 'Projetos', 'Consolidado']
          : ['Checklists', 'Caixa', 'DRE', 'Contas'];

        const badgeText = isHolding ? 'HOLDING EXECUTIVA' : 'UNIDADE OPERACIONAL';

        return (
          <motion.div
            key={unit.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              id={`unit-card-${unit.code.toLowerCase()}`}
              onClick={() => handleUnitClick(unit)}
              className={`w-full group relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 text-left flex flex-col justify-between cursor-pointer min-h-[250px] overflow-hidden ${
                isSelected
                  ? isHolding
                    ? 'ring-2 ring-amber-500 border-amber-500/80 bg-linear-to-b from-amber-500/15 via-amber-950/20 to-transparent shadow-xl shadow-amber-500/10'
                    : isDarkMode
                      ? 'ring-2 ring-amber-500/60 border-amber-500/60 bg-[#1A1A1A] shadow-lg shadow-black/40'
                      : 'ring-2 ring-amber-400 border-amber-400 bg-linear-to-b from-amber-50 via-white to-white shadow-lg shadow-amber-500/10'
                  : isHolding
                    ? isDarkMode
                      ? 'border-amber-500/30 bg-linear-to-b from-amber-500/5 via-[#161616] to-[#121212] hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10'
                      : 'border-amber-300/80 bg-linear-to-b from-amber-50/50 via-white to-white hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10'
                    : isDarkMode
                      ? 'border-[#262626] bg-[#161616] hover:border-slate-700 hover:bg-[#1A1A1A] hover:shadow-lg'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50'
              }`}
            >
              {/* Subtle top aura glow for Holding */}
              {isHolding && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              )}

              {/* Main Top Area */}
              <div className="w-full z-10">
                {/* Row 1: Brand Icon on Left, Status Pill on Right - Completely Separated */}
                <div className="w-full flex items-center justify-between gap-3 mb-4">
                  <div 
                    className={`w-12 h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-md shrink-0 ${
                      isHolding 
                        ? 'bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-amber-500/25' 
                        : isVero
                          ? 'bg-emerald-600 text-white font-black shadow-emerald-600/25'
                          : 'bg-[#FFCB05] text-[#7F300C] font-black shadow-amber-400/25'
                    }`}
                  >
                    {isHolding ? (
                      <Building2 className="w-6 h-6" />
                    ) : isVero ? (
                      <UtensilsCrossed className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-black italic tracking-tighter">
                        {unit.code}
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black text-amber-500 uppercase tracking-widest shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-amber-500" />
                      <span>Ativa</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                      isHolding
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHolding ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                      <span>{isHolding ? 'ROOT' : 'Conectado'}</span>
                    </div>
                  )}
                </div>

                {/* Row 2: Category Eyebrow & Brand Subtitle (takes full width) */}
                <div className="mb-2">
                  <div className="flex items-center gap-1.5">
                    {isHolding && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span 
                      className={`text-[10px] font-black uppercase tracking-widest block ${
                        isHolding ? 'text-amber-500' : 'text-slate-400'
                      }`}
                    >
                      {badgeText}
                    </span>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-tight block mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {unit.code === 'ROOT' ? 'Governança Corporativa' : unit.brand === 'BEBELU' ? 'Bebelu Sanduíches' : 'Gastronomia Italiana'}
                  </span>
                </div>

                {/* Row 3: Title */}
                <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight leading-tight transition-colors mb-2 ${
                  isHolding 
                    ? 'text-amber-400 group-hover:text-amber-300' 
                    : isDarkMode 
                      ? 'text-white group-hover:text-amber-400' 
                      : 'text-slate-900 group-hover:text-[#7F300C]'
                }`}>
                  {unit.name}
                </h3>

                {/* Row 4: Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">{unit.location}</span>
                </div>

                {/* Row 5: Responsive Modules Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {modules.map((mod) => (
                    <span
                      key={mod}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isHolding 
                          ? isDarkMode 
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-5 pt-3.5 border-t w-full flex items-center justify-between z-10 transition-colors border-slate-200/60 dark:border-[#262626] group-hover:border-amber-500/30">
                <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isHolding 
                    ? 'text-amber-400' 
                    : isDarkMode 
                      ? 'text-slate-300 group-hover:text-amber-400' 
                      : 'text-[#7F300C]'
                }`}>
                  {isHolding ? 'Acessar Holding' : 'Acessar Unidade'}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
                  isHolding
                    ? 'bg-amber-500 text-slate-950 border-amber-400 group-hover:scale-110 shadow-md shadow-amber-500/20'
                    : isDarkMode
                      ? 'bg-[#222] border-[#333] text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-[#FFCB05] group-hover:text-[#7F300C] group-hover:border-[#FFCB05]'
                }`}>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );

  // 2. Modal Variant
  if (variant === 'modal') {
    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border p-4 sm:p-7 shadow-2xl z-10 overflow-hidden ${
              isDarkMode 
                ? 'bg-[#121212] border-[#2A2A2A] text-white' 
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            {/* Ambient Background Lights */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-slate-200 dark:border-[#222] relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight italic">
                    Seletor de Unidades & Holding
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    Selecione uma loja física operacional ou o painel corporativo da holding.
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1E1E1E] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Cards - Fully scrollable on mobile and compact viewports */}
            <div className="relative z-10 overflow-y-auto flex-1 pr-1 overscroll-contain custom-scrollbar py-1">
              {renderCards()}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 dark:border-[#222] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400 font-medium relative z-10 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ambiente Administrativo Grupo Azevedo • Acesso Seguro Multi-Unidade</span>
              </div>
              <div className="truncate">
                Unidade ativa atual: <strong className="text-amber-500">{currentStore.name}</strong>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // 3. Default Grid Variant (Full page view)
  return (
    <div className={`w-full ${className}`}>
      {renderCards()}
    </div>
  );
}
