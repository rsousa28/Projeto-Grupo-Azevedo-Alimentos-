import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Store as StoreIcon, 
  MapPin, 
  LogOut, 
  UtensilsCrossed,
  ArrowRight
} from 'lucide-react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Unit } from '../types';
import { Logo } from '../components/Logo';
import { getUnitCardInfo } from '../components/UnitSelector';

export default function SelectStore() {
  const navigate = useNavigate();
  const { currentStore, setStore } = useStore();
  const { user, logout } = useAuth();

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
    
    return STORES;
  }, [user]);

  const handleSelect = (unit: Unit) => {
    setStore(unit);
    if (unit.type === 'HOLDING' || unit.code === 'ROOT') {
      navigate('/holding/consolidated');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#0E0E10] text-white relative flex flex-col items-center justify-between p-4 sm:p-6 lg:p-10 font-sans select-none overflow-y-auto"
      style={{
        paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top, 0px) + 1rem))',
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl z-10 my-auto py-4 sm:py-8 flex-1 flex flex-col justify-center"
      >
        <div className="text-center mb-8 sm:mb-12 px-2">
          {/* Brand Logo Header */}
          <div className="inline-flex flex-col items-center justify-center mb-5 sm:mb-6">
            <div className="inline-block transform transition-transform duration-500 hover:scale-105">
              <Logo className="h-12 sm:h-14 md:h-16 w-auto" variant="light" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2 uppercase">
            SELECIONE A UNIDADE OU HOLDING
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            Selecione o ambiente para gerenciar:
          </p>
        </div>

        {/* 4 Cards Grid - Modern, Ergonomic, High Visual Breathing Room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
          {availableUnits.map((store, i) => {
            const isSelected = currentStore?.id === store.id;
            const info = getUnitCardInfo(store);
            const isHolding = info.isHolding;
            const isVero = store.code === 'VERO' || store.brand === 'VERO PASTA' || store.id === '3';

            return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  id={`btn-select-store-${store.code.toLowerCase()}`}
                  onClick={() => handleSelect(store)}
                  className={`group relative p-6 sm:p-7 rounded-3xl border text-left flex flex-col justify-between cursor-pointer min-h-[290px] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${
                    isSelected
                      ? 'border-amber-500/70 bg-[#17171A] shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : isHolding 
                      ? 'border-[#28282D] bg-[#141416] hover:border-amber-400/80 hover:bg-[#181716] hover:shadow-2xl hover:shadow-amber-500/10' 
                      : 'border-[#242426] bg-[#141416] hover:border-amber-400/60 hover:bg-[#18181B] hover:shadow-2xl hover:shadow-black/50'
                  }`}
                >
                  {/* Visual highlight aura for Holding card */}
                  {isHolding && (
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                  )}

                  {/* Top Section */}
                  <div className="w-full z-10">
                    {/* Top Row: Icon on Left, Discreet Status Tag on Right */}
                    <div className="w-full flex items-center justify-between gap-3 mb-5">
                      <div 
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-md shrink-0 ${
                          isHolding
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-amber-500/30'
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

                    {/* Brand Category Eyebrow */}
                    <span className={`text-xs font-bold uppercase tracking-wider block mb-1.5 ${
                      isHolding ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {info.eyebrow}
                    </span>

                    {/* Unit Name in Bold Highlight */}
                    <h3 className={`text-xl sm:text-2xl font-black leading-snug uppercase tracking-tight transition-colors mb-2 ${
                      isHolding 
                        ? 'text-amber-400 group-hover:text-amber-300' 
                        : 'text-white group-hover:text-amber-400'
                    }`}>
                      {info.title}
                    </h3>

                    {/* Location with Pin */}
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isHolding ? 'text-amber-500/70' : 'text-slate-500'}`} />
                      <span className="truncate">{info.location}</span>
                    </div>
                  </div>

                  {/* Card Bottom: Full integrated CTA button that reacts to card hover */}
                  <div className="w-full mt-6 pt-3 border-t border-[#222226] group-hover:border-[#333338] z-10 transition-colors">
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
      </motion.div>

      {/* Footer */}
      <footer className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[#202024] pt-6 z-10 text-xs text-slate-500">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da Conta</span>
        </button>
        <div className="text-[10px] font-medium tracking-wide text-center sm:text-right">
          © {new Date().getFullYear()} Grupo Azevedo • Governança Multilojas & Holding
        </div>
      </footer>
    </div>
  );
}
