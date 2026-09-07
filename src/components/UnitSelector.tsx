import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Store as StoreIcon, 
  MapPin, 
  ArrowRight, 
  Layers, 
  UtensilsCrossed, 
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

export const getUnitCardInfo = (unit: Unit) => {
  if (unit.code === 'B32') {
    return {
      eyebrow: 'Bebelu Sanduíches',
      title: 'B32 (MOSSORÓ)',
      location: 'Mossoró - Espaço Fan',
      tag: 'LOJA FÍSICA',
      cta: 'ACESSAR UNIDADE',
      isHolding: false
    };
  }
  if (unit.code === 'B28') {
    return {
      eyebrow: 'Bebelu Sanduíches',
      title: 'B28 (BEBELU RIO MAR)',
      location: 'Rio Mar Shopping - Fortaleza',
      tag: 'LOJA FÍSICA',
      cta: 'ACESSAR UNIDADE',
      isHolding: false
    };
  }
  if (unit.code === 'VERO' || unit.brand === 'VERO PASTA' || unit.id === '3') {
    return {
      eyebrow: 'GASTRONOMIA ITALIANA',
      title: 'VERO PASTA',
      location: 'Fortaleza - CE',
      tag: 'LOJA FÍSICA',
      cta: 'ACESSAR UNIDADE',
      isHolding: false
    };
  }
  // Holding (ROOT)
  return {
    eyebrow: 'HOLDING EXECUTIVA',
    title: 'GESTÃO GRUPO AZ',
    location: 'Governança Corporativa',
    tag: 'CORPORATIVO',
    cta: 'ACESSAR GESTÃO HOLDING',
    isHolding: true
  };
};

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
    if (isRennan || user.role === 'ADMIN' || user.role === 'FINANCIAL') {
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

    if (unit.type === 'HOLDING' || unit.code === 'ROOT') {
      navigate('/holding/consolidated');
    } else {
      navigate('/dashboard');
    }
  };

  // 1. Compact Variant (For sidebar or quick picker)
  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] uppercase tracking-widest font-black text-amber-500/90 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-amber-500" />
            Alternar Unidade
          </span>
          <span className="text-[9px] font-semibold text-slate-400">{unitsToDisplay.length} Opções</span>
        </div>

        <div className="space-y-1">
          {unitsToDisplay.map((unit) => {
            const isSelected = currentStore.id === unit.id;
            const info = getUnitCardInfo(unit);

            return (
              <button
                key={unit.id}
                onClick={() => handleUnitClick(unit)}
                className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black shadow-xs'
                    : 'bg-[#161619] border border-[#242426] text-slate-300 hover:text-white hover:border-slate-600 hover:bg-[#1c1c20]'
                }`}
              >
                <div className="truncate">
                  <div className="text-[11px] font-bold leading-tight truncate">{info.title}</div>
                  <div className="text-[9px] text-slate-400 font-medium truncate">{info.eyebrow}</div>
                </div>

                {isSelected ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black shrink-0">
                    ATIVA
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 font-medium shrink-0">
                    {info.tag}
                  </span>
                )}
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
        const info = getUnitCardInfo(unit);
        const isHolding = info.isHolding;
        const isVero = unit.code === 'VERO' || unit.brand === 'VERO PASTA' || unit.id === '3';

        return (
          <motion.div
            key={unit.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              id={`unit-card-${unit.code.toLowerCase()}`}
              onClick={() => handleUnitClick(unit)}
              className={`w-full group relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 text-left flex flex-col justify-between cursor-pointer min-h-[250px] overflow-hidden ${
                isSelected
                  ? 'border-amber-500/70 bg-[#17171A] shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : isHolding
                  ? 'border-[#28282D] bg-[#141416] hover:border-amber-400/80 hover:bg-[#181716] hover:shadow-xl hover:shadow-amber-500/10'
                  : 'border-[#242426] bg-[#141416] hover:border-amber-400/60 hover:bg-[#18181B] hover:shadow-xl hover:shadow-black/40'
              }`}
            >
              {/* Subtle top aura glow for Holding */}
              {isHolding && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              )}

              {/* Main Top Area */}
              <div className="w-full z-10">
                {/* Row 1: Brand Icon on Left, Discreet Status Tag on Right */}
                <div className="w-full flex items-center justify-between gap-3 mb-4">
                  <div 
                    className={`w-12 h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-md shrink-0 ${
                      isHolding 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-amber-500/25' 
                        : isVero
                        ? 'bg-emerald-600 text-white font-black shadow-emerald-600/25'
                        : 'bg-[#FFCB05] text-[#7F300C] font-black shadow-amber-400/25'
                    }`}
                  >
                    {isHolding ? (
                      <Building2 className="w-6 h-6 text-slate-950" />
                    ) : isVero ? (
                      <UtensilsCrossed className="w-6 h-6 text-white" />
                    ) : (
                      <StoreIcon className="w-6 h-6 text-[#7F300C]" />
                    )}
                  </div>

                  {/* Right Tag: "ATIVA" with amber border if currently active, otherwise discreet "LOJA FÍSICA" or "CORPORATIVO" */}
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/50 text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>ATIVA</span>
                    </div>
                  ) : (
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                      isHolding
                        ? 'text-amber-400/90 border-amber-500/30 bg-amber-500/10'
                        : 'text-slate-400 border-[#2A2A2E] bg-[#1A1A1E]'
                    }`}>
                      <span>{info.tag}</span>
                    </div>
                  )}
                </div>

                {/* Row 2: Category Eyebrow */}
                <div className="mb-1.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isHolding ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {info.eyebrow}
                  </span>
                </div>

                {/* Row 3: Prominent Title */}
                <h3 className={`text-lg sm:text-xl font-black uppercase tracking-tight leading-tight transition-colors mb-2 ${
                  isHolding 
                    ? 'text-amber-400 group-hover:text-amber-300' 
                    : 'text-white group-hover:text-amber-400'
                }`}>
                  {info.title}
                </h3>

                {/* Row 4: Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${isHolding ? 'text-amber-500/70' : 'text-slate-500'}`} />
                  <span className="truncate">{info.location}</span>
                </div>
              </div>

              {/* Bottom Standardized Action Bar */}
              <div className="mt-6 pt-3.5 border-t border-[#222226] group-hover:border-[#333338] w-full z-10 transition-colors">
                <div className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all duration-300 border ${
                  isHolding
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950 group-hover:border-amber-300 group-hover:shadow-lg group-hover:shadow-amber-500/20'
                    : 'bg-[#1C1C20] border-[#2A2A30] text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-400 group-hover:shadow-md group-hover:shadow-amber-500/15'
                }`}>
                  <span>{info.cta}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
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
            className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-[#2B2B30] bg-[#121214] text-white p-5 sm:p-7 shadow-2xl z-10 overflow-hidden"
          >
            {/* Ambient Background Lights */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#222226] relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white">
                    Seletor de Unidades & Holding
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    Selecione o ambiente para gerenciar:
                  </p>
                </div>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-[#1C1C20] hover:bg-[#28282F] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Cards */}
            <div className="relative z-10 overflow-y-auto flex-1 pr-1 overscroll-contain py-1">
              {renderCards()}
            </div>

            {/* Modal Footer (Direct, Useful Only) */}
            <div className="mt-4 sm:mt-5 pt-3.5 border-t border-[#222226] flex items-center justify-center text-xs text-slate-400 font-medium relative z-10 shrink-0">
              <span>
                Unidade ativa no momento:{' '}
                <strong className="text-amber-400 font-black uppercase tracking-wider ml-1">
                  {getUnitCardInfo(currentStore).title}
                </strong>
              </span>
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
