import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, MapPin, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Store } from '../types';
import { Logo } from '../components/Logo';

export default function SelectStore() {
  const navigate = useNavigate();
  const { setStore } = useStore();
  const { user, logout } = useAuth();

  const filteredStores = React.useMemo(() => {
    if (!user) return [];
    
    const isRennan = (user.username || '').toLowerCase().includes('rennan') || (user.email || '').toLowerCase().includes('rennan');
    if (isRennan) {
      return STORES;
    }

    // Admin sees only Consolidated (ROOT)
    if (user.role === 'ADMIN') {
      return STORES.filter(s => s.code === 'ROOT');
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

  const handleSelect = (store: Store) => {
    setStore(store);
    navigate('/dashboard');
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-between p-4 sm:p-6 md:p-12 font-sans select-none overflow-y-auto"
      style={{
        paddingTop: 'max(3.5rem, calc(env(safe-area-inset-top, 0px) + 1.75rem))',
        paddingBottom: 'max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Decorative enterprise ambient highlights in Bebelu Brand Colors */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#FFCB05]/10 via-slate-50 to-transparent pointer-events-none" />
      <div className="absolute -left-1/4 top-1/4 w-[600px] h-[600px] bg-amber-400/3 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -right-1/4 bottom-1/4 w-[600px] h-[600px] bg-[#7F300C]/3 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar Status */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-3 z-10 pt-2 sm:pt-0 mb-6">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] sm:text-[10px] font-black tracking-widest text-[#059669] uppercase shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          <span>Ambiente Seguro Ativo</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#7F300C] shrink-0" />
          <span>Grupo Azevedo • Portal de Gestão</span>
        </div>
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl z-10 my-auto py-8"
      >
        <div className="text-center mb-12">
          {/* Logo Header */}
          <div className="inline-flex flex-col items-center justify-center mb-6">
            <div className="inline-block">
              <Logo className="h-16 md:h-20 w-auto transform transition-transform duration-500 hover:scale-105" variant="dark" />
            </div>
            
            <div className="mt-4 flex items-center gap-1.5">
              <span className="text-[11px] font-black tracking-[0.3em] text-[#7F300C] uppercase italic font-display">
                SISTEMA INTEGRADO DE GESTÃO
              </span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 uppercase italic">
            CONTROLE DE UNIDADES
          </h1>
          <p className="text-slate-600 text-sm font-medium tracking-wide max-w-2xl mx-auto">
            Bem-vindo ao portal corporativo, <span className="text-[#7F300C] font-black uppercase italic">{user?.name}</span>. Selecione a unidade franqueada correspondente para gerenciar os dados.
          </p>
        </div>

        {/* Dynamic Responsive Grid Layout themed for Bebelu */}
        <div className={`grid gap-6 sm:gap-8 ${filteredStores.length === 1 ? 'max-w-md mx-auto grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredStores.map((store, i) => {
            const isBebeluStore = store.brand === 'BEBELU' || store.code === 'ROOT';
            const isB28 = store.code === 'B28' || store.id === '2';
            const accentBg = isBebeluStore ? '#FFCB05' : '#E63946';
            const textContrastValue = isBebeluStore ? '#7F300C' : '#FFFFFF';

            return (
              <motion.button
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleSelect(store)}
                className={`group relative p-6 sm:p-7 md:p-8 rounded-[2rem] border transition-all text-left flex flex-col justify-between cursor-pointer min-h-[260px] shadow-sm hover:shadow-2xl duration-300 overflow-hidden ${
                  isB28 
                    ? 'border-amber-400/40 bg-linear-to-b from-amber-50/50 via-white to-white hover:border-amber-500' 
                    : 'border-slate-200/80 bg-white hover:border-amber-500/30'
                }`}
              >
                {/* Subtle ambient highlight on hover */}
                <div 
                  className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), ${accentBg}08, transparent 60%)`,
                    boxShadow: `0 20px 40px -15px ${accentBg}1a`
                  }}
                />

                {/* Top Header: Badge, Code & Status */}
                <div className="w-full flex items-start justify-between gap-4 mb-5 z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-md"
                      style={{ 
                        backgroundColor: accentBg, 
                        boxShadow: `0 8px 20px ${accentBg}33` 
                      }}
                    >
                      {store.code ? (
                        <span className="text-base font-black italic tracking-tighter" style={{ color: textContrastValue }}>
                          {store.code}
                        </span>
                      ) : (
                        <StoreIcon className="w-6 h-6" style={{ color: textContrastValue }} />
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#7F300C] block">
                        {store.code === 'ROOT' ? 'GLOBAL' : `UNIDADE ${store.code}`}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {store.brand === 'BEBELU' ? 'Bebelu Sanduíches' : store.brand === '4ESTYLOS' ? "4 Estylo's Pizzaria" : 'Grupo Azevedo'}
                      </span>
                    </div>
                  </div>

                  {/* Operational Status Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-700 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Conectado</span>
                  </div>
                </div>

                {/* Middle Info Section */}
                <div className="w-full my-2 z-10 space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight group-hover:text-[#7F300C] transition-colors">
                    {store.name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <div className="p-1 rounded-md bg-slate-100 text-[#7F300C] shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{store.location}</span>
                  </div>
                </div>

                {/* Bottom Interactive Action Bar */}
                <div className="mt-6 w-full flex items-center justify-between border-t border-slate-100 pt-4 z-10 group-hover:border-amber-500/20 transition-colors">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#7F300C] flex items-center gap-1.5 font-display">
                    Acessar Unidade
                  </span>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 group-hover:bg-[#FFCB05] group-hover:border-[#FFCB05] group-hover:shadow-md transition-all duration-300">
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#7F300C] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Corporate Sign-off Footer */}
      <footer className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-200/80 pt-8 z-10">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-[#7F300C] hover:opacity-80 font-black uppercase tracking-widest text-[9px] transition-opacity group cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-[#7F300C]" />
          Sair para Login
        </button>
        <div className="text-[9px] font-semibold text-slate-500 tracking-wider text-center md:text-right uppercase">
          © {new Date().getFullYear()} Grupo Azevedo • Bebelu Sanduíches S/A • Fortaleza, CE
        </div>
      </footer>
    </div>
  );
}
