import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, MapPin, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Store } from '../types';

export default function SelectStore() {
  const navigate = useNavigate();
  const { setStore } = useStore();
  const { user, logout } = useAuth();

  const filteredStores = React.useMemo(() => {
    if (!user) return [];
    
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
    <div className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-between p-6 md:p-12 font-sans select-none overflow-y-auto">
      {/* Decorative enterprise ambient highlights in Bebelu Brand Colors */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#FFCB05]/10 via-slate-50 to-transparent pointer-events-none" />
      <div className="absolute -left-1/4 top-1/4 w-[600px] h-[600px] bg-amber-400/3 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -right-1/4 bottom-1/4 w-[600px] h-[600px] bg-[#7F300C]/3 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar Status */}
      <div className="w-full max-w-6xl flex justify-between items-center z-10">
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black tracking-widest text-[#059669] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          Ambiente Seguro Ativo
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#7F300C]" />
          Grupo Azevedo • Portal de Gestão
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
          {/* Logo Frame */}
          <div className="inline-flex flex-col items-center justify-center mb-6">
            <div className="relative group">
              {/* Outer glow ring utilizing Bebelu color palette */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#FFCB05] to-[#7F300C] rounded-2xl blur opacity-15 group-hover:opacity-30 transition duration-1000" />
              <div className="relative bg-white p-5 rounded-2xl border border-amber-500/10 shadow-lg flex items-center justify-center">
                <img 
                  src="/logo_azevedo.svg" 
                  alt="Logo Grupo Azevedo" 
                  className="h-12 md:h-14 w-auto object-contain transform transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
            
            <div className="mt-5 flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-[0.25em] text-[#7F300C] uppercase italic font-display">
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
        <div className={`grid gap-6 ${filteredStores.length === 1 ? 'max-w-md mx-auto grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredStores.map((store, i) => {
            const isBebeluStore = store.brand === 'BEBELU' || store.code === 'ROOT';
            const accentBg = isBebeluStore ? '#FFCB05' : '#E63946';
            const textContrastValue = isBebeluStore ? '#7F300C' : '#FFFFFF';

            return (
              <motion.button
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleSelect(store)}
                className="group relative p-8 rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all text-left flex flex-col items-start justify-between cursor-pointer min-h-[220px] shadow-sm hover:shadow-xl hover:border-amber-500/25 duration-300"
              >
                {/* Subtle overlay on hover with Bebelu yellow */}
                <div 
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(800px circle at var(--x, 50%) var(--y, 50%), ${accentBg}05, transparent 50%)`,
                    boxShadow: `0 20px 40px -15px ${accentBg}1a`
                  }}
                />

                {/* Top Section of Card */}
                <div className="w-full flex items-start justify-between mb-6 z-10">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                    style={{ 
                      backgroundColor: accentBg, 
                      boxShadow: `0 8px 20px ${accentBg}33` 
                    }}
                  >
                    {store.code ? (
                      <span className="text-sm font-black italic tracking-tighter" style={{ color: textContrastValue }}>
                        {store.code}
                      </span>
                    ) : (
                      <StoreIcon className="w-6 h-6" style={{ color: textContrastValue }} />
                    )}
                  </div>

                  {/* Operational Status Tag */}
                  <span className="px-3 py-1 bg-[#FFCB05]/10 border border-[#FFCB05]/20 rounded-full text-[8.5px] font-black uppercase tracking-wider text-[#7F300C]">
                    CONECTADO
                  </span>
                </div>

                {/* Middle Info Section */}
                <div className="flex-1 w-full z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                    {store.code === 'ROOT' 
                      ? 'Corporativo Grupo Azevedo' 
                      : store.brand === 'BEBELU' 
                        ? 'Franquia Bebelu Sanduíches' 
                        : "Franquia 4 Estylo's Pizzaria - Mossoró"}
                  </span>
                  <h3 className="text-xl font-bold text-slate-950 leading-tight uppercase tracking-tight group-hover:text-[#7F300C] transition-colors mb-2">
                    {store.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#7F300C]/70" />
                    <span className="truncate">{store.location}</span>
                  </div>
                </div>

                {/* Bottom Interactive Trigger */}
                <div className="mt-8 w-full flex items-center justify-between border-t border-slate-100 pt-4 z-10 group-hover:border-amber-500/10 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#7F300C] font-display flex items-center gap-1">
                    Conectar Terminal
                  </span>
                  <div className="p-1.5 px-3 bg-slate-100 border border-slate-200/60 rounded-full group-hover:bg-[#FFCB05] group-hover:border-[#FFCB05] transition-all duration-300">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#7F300C] group-hover:stroke-[3px] transition-colors" />
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
