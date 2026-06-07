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
    { text: "Sem vendas não há negócio. Foque em gerar valor para o cliente todos os dias.", author: "João Adibe (Cimed)" },
    { text: "O sucesso não é o fim, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Guilherme Benchimol (XP Inc.)" },
    { text: "Sonhar grande e sonhar pequeno dá exatamente o mesmo trabalho.", author: "Jorge Paulo Lemann (Ambev)" },
    { text: "Não se preocupe com o erro. O erro é apenas um aprendizado para a próxima etapa.", author: "João Adibe (Cimed)" },
    { text: "A persistência é a única ferramenta capaz de transformar uma boa ideia em um império.", author: "Guilherme Benchimol (XP Inc.)" },
    { text: "Uma marca forte é aquela que cria uma conexão emocional verdadeira com as pessoas.", author: "João Adibe (Cimed)" },
    { text: "Para vencer no mercado, você precisa ser ágil, obstinado por eficiência e obcecado pelo cliente.", author: "Alexandre Birman (Arezzo&Co)" },
    { text: "O maior ativo que você pode ter na vida é a sua reputação e a sua credibilidade.", author: "Guilherme Benchimol (XP Inc.)" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
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
               <div className="w-10 h-10 rounded-full bg-[#FFCB05] flex items-center justify-center border-2 border-[#7F300C]/20 shadow-inner shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#7F300C]" />
               </div>
               <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase text-[#7F300C]/60 tracking-widest mb-1">Frase do Dia</div>
                  <div className="min-h-[4rem] flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={quoteIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col gap-0.5 text-[#7F300C]"
                      >
                        <p className="text-xs font-bold leading-normal">
                          "{quotes[quoteIndex].text}"
                        </p>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7F300C]/75 italic mt-1">
                          — {quotes[quoteIndex].author}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 relative bg-white">
          {/* Mobile-only Branding Header */}
          <div className="md:hidden flex flex-col items-center text-center mb-8 pb-6 border-b border-slate-100">
            <img 
              src="/logo_azevedo.svg" 
              alt="Grupo Azevedo" 
              className="w-32 h-auto mb-3"
            />
            <h1 className="text-2xl font-black text-[#7F300C] uppercase tracking-tighter italic leading-none mb-1">
              Grupo Azevedo Alimentos
            </h1>
            <p className="text-[#7F300C]/80 text-[10px] font-bold uppercase tracking-widest italic">
              Controle Operacional & Financeiro
            </p>
          </div>

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
                  placeholder="Usuário"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              Painel de Gestão Operacional <br />
              Desenvolvido por <span className="text-[#7F300C]">Rennan Inacio</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
