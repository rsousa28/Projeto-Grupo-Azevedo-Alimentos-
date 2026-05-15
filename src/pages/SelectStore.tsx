import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, ArrowRight, ChefHat, MapPin } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Store } from '../types';

export default function SelectStore() {
  const navigate = useNavigate();
  const { setStore } = useStore();

  const stores: Store[] = [
    { id: '1', name: 'Bebelu Mossoró', brand: 'BEBELU', location: 'Espaço Fan', code: 'B32' },
    { id: '2', name: 'Bebelu Riomar Papicu', brand: 'BEBELU', location: 'Rio Mar Shopping', code: 'B28' },
    { id: '3', name: '4 Estylos Mossoró', brand: '4ESTYLOS', location: 'Avenida Principal', code: '4E09' },
  ];

  const { user } = useAuth();

  const filteredStores = React.useMemo(() => {
    if (!user) return [];
    
    // Admin sees everything + potentially a special "Global" option
    if (user.role === 'ADMIN') {
      const rootStore: Store = { id: 'admin-global', name: 'Administrador Raiz', brand: 'GRUPO AZEVEDO', location: 'Todas as Lojas', code: 'ROOT' };
      return [
        rootStore,
        ...stores
      ];
    }
    
    if (user.role === 'FINANCIAL') return stores;

    // Filter by specific Manager roles
    if (user.role === 'MANAGER_BEBELU_MOSSORO') {
      return stores.filter(s => s.code === 'B32');
    }
    if (user.role === 'MANAGER_BEBELU_RIOMAR_PAPICU') {
      return stores.filter(s => s.code === 'B28');
    }
    if (user.role === 'MANAGER_4ESTYLOS_MOSSORO') {
      return stores.filter(s => s.code === '4E09');
    }
    
    return [];
  }, [user]);

  const handleSelect = (store: Store) => {
    setStore(store);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <div className="inline-flex flex-col items-center justify-center p-6 bg-white rounded-[2.5rem] shadow-xl mb-8 border border-slate-100">
            <img 
              src="https://storage.googleapis.com/aistudio-build-artifacts/7060b66b-6db6-4a04-a679-19b7ec364245/image_generation_1720546313.png" 
              alt="Logo Grupo Azevedo" 
              className="h-24 w-auto object-contain"
            />
            <div className="mt-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E63946]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
              <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase italic">Gestão Inteligente</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 uppercase italic">Qual unidade acessar?</h1>
          <p className="text-slate-500 font-medium">Seja bem-vindo, <span className="text-indigo-600 font-bold">{user?.name}</span>. Escolha a sua unidade.</p>
        </div>

        <div className={`grid gap-6 ${filteredStores.length === 1 ? 'max-w-md mx-auto grid-cols-1' : 'md:grid-cols-3'}`}>
          {filteredStores.map((store, i) => (
            <motion.button
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleSelect(store)}
              className={`group relative p-8 rounded-[2.5rem] border bg-white transition-all text-left hover:shadow-2xl hover:-translate-y-2 flex flex-col items-start ${
                store.brand === '4ESTYLOS' 
                  ? 'hover:border-[#E63946]' 
                  : 'hover:border-[#FFCB05]'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                store.brand === '4ESTYLOS' ? 'bg-[#E63946] shadow-lg shadow-red-500/20' : 'bg-[#FFCB05] shadow-lg shadow-yellow-500/20'
              }`}>
                {store.code ? (
                  <span className={`text-sm font-black italic tracking-tighter ${store.brand === 'BEBELU' ? 'text-black' : 'text-white'}`}>
                    {store.code}
                  </span>
                ) : (
                  <StoreIcon className={`w-7 h-7 ${store.brand === 'BEBELU' ? 'text-black' : 'text-white'}`} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <h3 className="text-xl font-bold text-slate-900 leading-tight uppercase italic">{store.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  {store.location}
                </div>
              </div>

              <div 
                className={`mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest group-hover:gap-4 transition-all ${
                  store.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-[#0066FF]'
                }`}
              >
                Acessar Painel <ArrowRight className="w-4 h-4" />
              </div>
              
              {/* Decorative Brand Accent */}
              <div className={`absolute top-6 right-6 w-2 h-2 rounded-full ${
                 store.brand === '4ESTYLOS' ? 'bg-[#E63946]' : 'bg-[#FFCB05]'
              }`} />
            </motion.button>
          ))}
        </div>

        <div className="mt-16 text-center">
           <button 
             onClick={() => navigate('/login')}
             className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs transition-colors"
           >
             Voltar para o Login
           </button>
        </div>
      </motion.div>
    </div>
  );
}
