import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, ChefHat } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth
    setTimeout(() => {
      setLoading(false);
      navigate('/select-store');
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-slate-50'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-[#1E1E1E] border dark:border-[#333]"
      >
        {/* Visual Side */}
        <div className="relative hidden md:block">
          <img 
            src="https://storage.googleapis.com/aistudio-build-artifacts/7060b66b-6db6-4a04-a679-19b7ec364245/image_generation_1720546313.png" 
            alt="Grupo Azevedo Alimentos" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Grupo Azevedo</h1>
            <p className="text-white/70 italic">Excelência em Gestão Food Service</p>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-white p-2 rounded-2xl shadow-sm mb-4 border border-slate-100">
              <img 
                src="https://storage.googleapis.com/aistudio-build-artifacts/7060b66b-6db6-4a04-a679-19b7ec364245/image_generation_1720546313.png" 
                alt="Logo Grupo Azevedo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-[#E63946]' : 'bg-[#0066FF]'}`} />
              <span className="text-xs font-black tracking-[0.2em] dark:text-white uppercase italic">Grupo Azevedo Alimentos</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2 dark:text-white">Acesse sua Conta</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Gerencie suas operações e finanças com inteligência.</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-[#333] dark:bg-[#121212] dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-[#333] dark:bg-[#121212] dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <input type="checkbox" className="rounded border-slate-300" />
                Lembrar sessão
              </label>
              <button type="button" className="text-indigo-600 font-medium hover:underline">Esqueceu a senha?</button>
            </div>

            <button
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all scale-100 active:scale-95 ${
                loading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : isDarkMode 
                  ? 'bg-[#E63946] hover:bg-[#d62d3a] text-white shadow-lg shadow-red-500/20' 
                  : 'bg-[#0066FF] hover:bg-[#0052cc] text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Acessar Sistema <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t dark:border-[#333] text-center text-sm text-slate-500">
            © 2024 Grupo Azevedo Alimentos. Todos os direitos reservados.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
