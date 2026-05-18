import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User as UserIcon, Lock, Loader2, TrendingUp, Info } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isDarkMode } = useStore();
  const { login, user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quotes = [
    "O sucesso é a soma de pequenos esforços repetidos diariamente.",
    "A persistência é o caminho do êxito.",
    "Quanto mais eu treino, mais sorte eu tenho.",
    "Foco, força e fé para mais um dia de trabalho.",
    "Excelência não é um ato, mas um hábito.",
    "Onde há foco, a energia flui.",
    "Pequenos começos levam a grandes destinos."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  useEffect(() => {
    if (user) {
      navigate('/select-store');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Credenciais incorretas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-100"
      >
        {/* Visual Side */}
        <div className="relative hidden md:block bg-[#FFCB05]">
          <div className="absolute inset-0 flex items-center justify-center p-12">
             <div className="text-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <img 
                    src="/logo_azevedo.svg" 
                    alt="Grupo Azevedo" 
                    className="w-48 h-auto mb-8 mx-auto"
                  />
                  <h1 className="text-4xl font-black text-[#7F300C] uppercase tracking-tighter italic leading-none mb-4">
                    Grupo Azevedo <br /> Alimentos
                  </h1>
                  <p className="text-[#7F300C]/70 text-sm font-bold uppercase tracking-widest italic">
                    Controle Operacional & Financeiro
                  </p>
                </motion.div>
             </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-[#7F300C]/10 backdrop-blur-md rounded-2xl p-4 flex gap-4 items-center">
               <div className="w-10 h-10 rounded-full bg-[#FFCB05] flex items-center justify-center border-2 border-[#7F300C]/20 shadow-inner">
                  <TrendingUp className="w-5 h-5 text-[#7F300C]" />
               </div>
               <div>
                  <div className="text-[10px] font-black uppercase text-[#7F300C]/60 tracking-widest">Frase do Dia</div>
                  <div className="h-8 flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="text-xs font-bold text-[#7F300C]"
                      >
                        "{quotes[quoteIndex]}"
                      </motion.div>
                    </AnimatePresence>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 relative bg-white">
          <div className="flex items-center gap-2 mb-8 text-black">
            <div className="w-2 h-8 bg-[#FFCB05] rounded-full" />
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Acesse o Painel</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#FFCB05]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none transition-all font-bold text-sm bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05] text-slate-900"
                  placeholder="adm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none transition-all font-bold text-sm bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05] text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold cursor-pointer hover:text-slate-900 transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#FFCB05]" defaultChecked />
                Lembrar sessão
              </label>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 flex gap-3 items-center"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                >
                  <Info className="w-5 h-5 shrink-0" />
                </motion.div>
                <span className="text-xs font-bold">{error}</span>
              </motion.div>
            )}

            <button
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all scale-100 active:scale-95 shadow-xl ${
                loading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-[#FFCB05] text-[#7F300C] hover:shadow-[#FFCB05]/30'
              }`}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Entrar <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Acesso Restrito ao Administrador <br />
              Desenvolvido por <span className="text-[#7F300C]">Rennan Inacio</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
