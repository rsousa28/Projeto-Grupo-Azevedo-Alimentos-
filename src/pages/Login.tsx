import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, TrendingUp, Info } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useStore();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/select-store');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRecoverySent(true);
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-slate-50'}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#1E1E1E] border dark:border-[#333]"
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
                    src="https://storage.googleapis.com/aistudio-build-artifacts/7060b66b-6db6-4a04-a679-19b7ec364245/image_generation_1720546313.png" 
                    alt="Logo Bebelu" 
                    className="w-48 h-auto mb-8 mx-auto mix-blend-multiply"
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
                  <div className="text-xs font-bold text-[#7F300C]">"O sucesso é a soma de pequenos esforços repetidos diariamente."</div>
               </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 relative">
          <AnimatePresence mode="wait">
            {!showRecovery ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-8 bg-[#FFCB05] rounded-full" />
                  <h2 className="text-2xl font-black italic dark:text-white uppercase tracking-tighter">Acesse o Painel</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Username ou E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#FFCB05]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold text-sm ${
                          isDarkMode 
                            ? 'bg-[#121212] border-[#333] text-white focus:ring-[#FFCB05]/40' 
                            : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05]'
                        }`}
                        placeholder="admin@grupoazevedo.com"
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
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold text-sm ${
                          isDarkMode 
                            ? 'bg-[#121212] border-[#333] text-white focus:ring-[#FFCB05]/40' 
                            : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05]'
                        }`}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold cursor-pointer hover:text-slate-900 transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#FFCB05]" defaultChecked />
                      Lembrar sessão
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setShowRecovery(true)}
                      className="text-[#7F300C] font-black uppercase tracking-widest italic hover:underline"
                    >
                      Esqueceu?
                    </button>
                  </div>

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

                <div className={`mt-8 p-4 rounded-2xl flex gap-3 items-start border ${isDarkMode ? 'bg-[#121212] border-[#333]' : 'bg-slate-50 border-slate-100'}`}>
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Níveis de acesso configurados: <br />
                    <span className="font-black text-indigo-500">ADMIN</span> (Poder total) | <span className="font-black text-amber-600">GERENTE</span> (Operacional) | <span className="font-black text-emerald-600">FINANCEIRO</span> (Lançamentos)
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recovery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-8 bg-[#EF4444] rounded-full" />
                  <h2 className="text-2xl font-black italic dark:text-white uppercase tracking-tighter">Recuperar Senha</h2>
                </div>

                {!recoverySent ? (
                  <form onSubmit={handleRecovery} className="space-y-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      Insira o e-mail cadastrado para receber as instruções de redefinição.
                    </p>
                    <div className="space-y-2">
                       <input
                        type="email"
                        required
                        className={`w-full px-4 py-4 rounded-2xl border outline-none transition-all font-bold text-sm ${
                          isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'
                        }`}
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest italic shadow-xl">
                        Enviar Token
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowRecovery(false)}
                        className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-600"
                      >
                        Voltar ao login
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold dark:text-white mb-2">E-mail Enviado!</h3>
                    <p className="text-sm text-slate-500 mb-8">Verifique sua caixa de entrada e spam.</p>
                    <button 
                      onClick={() => setShowRecovery(false)}
                      className="text-[#7F300C] font-black uppercase tracking-widest italic border-b-2 border-[#7F300C]/20"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-8 border-t dark:border-[#333] text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Desenvolvido pelo <span className="text-[#7F300C]">Grupo Azevedo</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
