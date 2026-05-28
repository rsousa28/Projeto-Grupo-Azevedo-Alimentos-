import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, ArrowRight, ChefHat, MapPin } from 'lucide-react';
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
      return STORES.filter(s => s.code === '4E09');
    }
    
    return STORES.filter(s => s.code !== 'ROOT');
  }, [user]);

  const handleSelect = (store: Store) => {
    setStore(store);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center p-6 font-sans select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <div className="inline-flex flex-col items-center justify-center p-6 bg-[#121212] rounded-[2.5rem] shadow-2xl mb-8 border border-zinc-800">
            <img 
              src="/logo_azevedo.svg" 
              alt="Logo Grupo Azevedo" 
              className="h-20 w-auto object-contain bg-white px-3 py-1.5 rounded-2xl"
            />
            <div className="mt-4 flex items-center justify-center">
              <span className="text-[10px] font-black tracking-[0.3em] text-[#FFCB05] uppercase italic">Gestão Inteligente</span>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter mb-3 uppercase italic">Qual unidade acessar?</h1>
          <p className="text-slate-400 text-sm font-medium">Seja bem-vindo, <span className="text-[#FFCB05] font-black uppercase italic">{user?.name}</span>. Selecione sua unidade.</p>
        </div>

        <div className={`grid gap-6 ${filteredStores.length === 1 ? 'max-w-md mx-auto grid-cols-1' : 'md:grid-cols-3'}`}>
          {filteredStores.map((store, i) => (
            <motion.button
              key={store.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelect(store)}
              className={`group relative p-8 rounded-[2.5rem] border bg-[#121212] border-zinc-800/80 transition-all text-left hover:shadow-2xl hover:border-zinc-700 hover:-translate-y-1.5 flex flex-col items-start ${
                store.brand === '4ESTYLOS' 
                  ? 'hover:border-[#E63946]/40' 
                  : 'hover:border-[#FFCB05]/40'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                store.brand === '4ESTYLOS' ? 'bg-[#E63946] shadow-lg shadow-red-500/10' : 'bg-[#FFCB05] shadow-lg shadow-yellow-500/10'
              }`}>
                {store.code ? (
                  <span className={`text-sm font-black italic tracking-tighter ${store.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'}`}>
                    {store.code}
                  </span>
                ) : (
                  <StoreIcon className={`w-7 h-7 ${store.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'}`} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <h3 className="text-xl font-extrabold text-white leading-tight uppercase italic group-hover:text-[#FFCB05] transition-colors">{store.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {store.location}
                </div>
              </div>

              <div 
                className={`mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group-hover:gap-4 ${
                  store.brand === 'BEBELU' ? 'text-[#FFCB05]' : 'text-[#E63946]'
                }`}
              >
                Acessar Unidade <ArrowRight className="w-4 h-4" />
              </div>
              
              {/* Decorative Brand Accent */}
              <div className={`absolute top-6 right-6 w-2.5 h-2.5 rounded-full ${
                 store.brand === '4ESTYLOS' ? 'bg-[#E63946]' : 'bg-[#FFCB05]'
              }`} />
            </motion.button>
          ))}
        </div>

        <div className="mt-16 text-center">
           <button 
             onClick={() => logout()}
             className="text-slate-500 hover:text-[#FFCB05] font-black uppercase tracking-widest text-[10px] transition-colors"
           >
             Sair para Login
           </button>
        </div>
      </motion.div>
    </div>
  );
}
