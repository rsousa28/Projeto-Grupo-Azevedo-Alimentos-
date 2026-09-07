import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Store as StoreIcon, 
  MapPin, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles, 
  UtensilsCrossed,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Store, Unit } from '../types';
import { Logo } from '../components/Logo';

export default function SelectStore() {
  const navigate = useNavigate();
  const { setStore, currentStore } = useStore();
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
      className="min-h-screen bg-[#0E0E10] text-white relative flex flex-col items-center justify-between p-3 sm:p-6 lg:p-10 font-sans select-none overflow-y-auto"
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

      {/* Top Bar Status */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-3 z-10 pt-1 sm:pt-0 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black tracking-widest text-emerald-400 uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Ambiente Seguro • Conectado</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Grupo Azevedo • Painel Administrativo Geral</span>
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl z-10 my-auto py-2 sm:py-6 flex-1 flex flex-col justify-center"
      >
        <div className="text-center mb-6 sm:mb-10 px-2">
          {/* Brand Logo Header */}
          <div className="inline-flex flex-col items-center justify-center mb-4 sm:mb-5">
            <div className="inline-block transform transition-transform duration-500 hover:scale-105">
              <Logo className="h-12 sm:h-14 md:h-16 w-auto" variant="light" />
            </div>
            
            <div className="mt-2 sm:mt-3 flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-amber-400 uppercase italic">
                SISTEMA INTEGRADO DE GESTÃO & GOVERNANÇA
              </span>
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight mb-2 uppercase italic">
            SELECIONE A UNIDADE OU HOLDING
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-2xl mx-auto">
            Bem-vindo(a), <span className="text-amber-400 font-bold uppercase">{user?.name || user?.username}</span>. Escolha entre o gerenciamento operacional das lojas físicas ou a visão financeira da Holding.
          </p>
        </div>

        {/* 4 Cards Grid - Bulletproof Responsive: 1 col on mobile, 2 cols on tablet/laptop, 4 cols on wide screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {availableUnits.map((store, i) => {
            const isHolding = store.type === 'HOLDING' || store.code === 'ROOT';
            const isVero = store.code === 'VERO' || store.brand === 'VERO PASTA';
            const isCurrent = currentStore?.id === store.id;

            const modules = isHolding
              ? ['Endividamento', 'Empréstimos', 'Projetos', 'Consolidado']
              : ['Checklists', 'Caixa', 'DRE', 'Contas'];

            return (
              <motion.button
                key={store.id}
                id={`btn-select-store-${store.code.toLowerCase()}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleSelect(store)}
                className={`group relative p-5 sm:p-6 rounded-3xl border transition-all duration-300 text-left flex flex-col justify-between cursor-pointer min-h-[260px] overflow-hidden ${
                  isHolding 
                    ? 'border-amber-500/40 bg-linear-to-b from-amber-500/10 via-[#151518] to-[#101012] hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/15 ring-1 ring-amber-500/20' 
                    : 'border-[#242426] bg-[#141416] hover:border-slate-600 hover:bg-[#18181B] hover:shadow-xl'
                }`}
              >
                {/* Visual highlight aura for Gestão Grupo AZ */}
                {isHolding && (
                  <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                )}

                {/* Top Section */}
                <div className="w-full z-10">
                  {/* Row 1: Brand Icon on Left, Status Pill on Right - Full width separation */}
                  <div className="w-full flex items-center justify-between gap-3 mb-4">
                    <div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-md shrink-0 ${
                        isHolding
                          ? 'bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-amber-500/25'
                          : isVero
                            ? 'bg-emerald-600 text-white font-black shadow-emerald-600/25'
                            : 'bg-[#FFCB05] text-[#7F300C] font-black shadow-amber-400/20'
                      }`}
                    >
                      {isHolding ? (
                        <Building2 className="w-6 h-6" />
                      ) : isVero ? (
                        <UtensilsCrossed className="w-6 h-6" />
                      ) : (
                        <span className="text-sm font-black italic tracking-tighter">
                          {store.code}
                        </span>
                      )}
                    </div>

                    {/* Badge ROOT / Conectado */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                      isHolding 
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHolding ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                      <span>{isHolding ? 'ROOT' : 'CONECTADO'}</span>
                    </div>
                  </div>

                  {/* Row 2: Category Eyebrow & Brand Subtitle (takes 100% card width, no squishing) */}
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5">
                      {isHolding && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isHolding ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {isHolding ? 'HOLDING EXECUTIVA' : 'LOJA OPERACIONAL'}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 tracking-tight block mt-0.5">
                      {isHolding ? 'Governança Corporativa' : store.brand === 'BEBELU' ? 'Bebelu Sanduíches' : 'Gastronomia Italiana'}
                    </span>
                  </div>

                  {/* Row 3: Unit Name */}
                  <h3 className={`text-xl sm:text-2xl font-black leading-tight uppercase tracking-tight transition-colors mb-2 ${
                    isHolding 
                      ? 'text-amber-400 group-hover:text-amber-300' 
                      : 'text-white group-hover:text-amber-400'
                  }`}>
                    {store.name}
                  </h3>

                  {/* Row 4: Location */}
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{store.location}</span>
                  </div>

                  {/* Row 5: Responsive Modules Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {modules.map((mod) => (
                      <span
                        key={mod}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                          isHolding 
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                            : 'bg-[#202024] text-slate-300 border border-[#2D2D32]'
                        }`}
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom: Action CTA */}
                <div className="mt-5 w-full flex items-center justify-between border-t border-[#222] pt-3.5 z-10 group-hover:border-amber-500/30 transition-colors">
                  <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isHolding ? 'text-amber-400' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {isHolding ? 'Acessar Gestão Holding' : 'Acessar Unidade'}
                  </span>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 shrink-0 ${
                    isHolding
                      ? 'bg-amber-500 text-slate-950 border-amber-400 group-hover:scale-110 shadow-md shadow-amber-500/20'
                      : 'bg-[#202024] border-[#303034] text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-400'
                  }`}>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.button>
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
