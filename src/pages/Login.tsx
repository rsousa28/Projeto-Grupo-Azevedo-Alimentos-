import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User as UserIcon, Lock, Loader2, Sparkles, Info, ShieldCheck } from 'lucide-react';
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

  // High-performance corporate quotes representing top-tier quality and standard
  const quotes = [
    "A excelência não é um destino eventual, é o nosso padrão contínuo de dedicação diária.",
    "Grandes resultados corporativos são construídos na consistência impecável de pequenos detalhes.",
    "A sinergia e o padrão de nossas equipes alimentam o crescimento contínuo do Grupo Azevedo.",
    "Foco absoluto na excelência operacional, integridade nos dados e paixão em servir com padrão.",
    "Nutrimos parcerias de longo prazo gerando impacto real em tudo o que decidimos construir.",
    "A disciplina operacional diária é a chave que transforma metas ambiciosas em números históricos.",
    "Atenção irrestrita aos processos: o padrão de hoje dita a nossa consolidação de amanhã."
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
      setError(err.message || 'Credenciais inválidas para o portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 bg-gradient-to-br from-[#FAF9F5] via-[#F3F2EC] to-[#E9E7DE] font-sans relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFCB05]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#7F300C]/5 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[1000px] w-full grid md:grid-cols-12 rounded-[28px] overflow-hidden shadow-[0_32px_100px_rgba(28,24,20,0.12)] bg-white border border-[#EBE8DF]"
        id="login_main_card"
      >
        {/* Left Side: Editorial Banner Panel */}
        <div className="md:col-span-5 relative bg-[#120F0D] text-white overflow-hidden flex flex-col justify-between p-8 md:p-11 min-h-[360px] md:min-h-[580px]">
          {/* Cyber Gradient Background Mesh */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/70 z-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,203,5,0.15),_transparent_60%)] z-0" />
          
          {/* Logo & Slogan Header */}
          <div className="z-10 relative flex flex-col items-center md:items-start text-center md:text-left mt-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
              id="login_logo_container"
            >
              <img 
                src="/logo_azevedo.svg" 
                alt="Grupo Azevedo Alimentos Logo" 
                className="w-36 md:w-40 h-auto invert brightness-0 hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white leading-none">
                Grupo <br className="hidden md:block" />
                <span className="text-[#FFCB05] not-italic font-black">Azevedo</span> <br />
                <span className="text-[17px] md:text-[20px] text-white/90 font-bold block mt-1 tracking-tight">ALIMENTOS</span>
              </h1>
              <div className="w-12 h-[2.5px] bg-[#FFCB05] my-4 rounded-full" />
              <p className="text-[9.5px] font-black uppercase tracking-[0.25em] text-[#FFCB05]/80 italic">
                Portal de Governança & Operações
              </p>
            </motion.div>
          </div>

          {/* Luxury Floating Quote of the Day Widget */}
          <div className="z-10 relative mt-auto pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#FFCB05] animate-pulse" />
                <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-[#FFCB05] tracking-widest">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FFCB05]" /> Ideia & Padrão de Excelência
                </div>
              </div>
              
              <div className="min-h-[56px] flex items-center pr-2">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="text-[11.5px] leading-relaxed font-semibold italic text-slate-200"
                  >
                    "{quotes[quoteIndex]}"
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Console */}
        <div className="md:col-span-7 p-8 md:p-14 flex flex-col justify-between bg-white relative">
          
          <div className="w-full">
            {/* Header section with tiny visual bar */}
            <div className="flex items-center gap-3 mb-10" id="login_form_header">
              <div className="w-2.5 h-8 bg-[#FFCB05] rounded-full shadow-[0_2px_8px_rgba(255,203,5,0.4)]" />
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 leading-none">
                  Aba de Acesso
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">
                  Insira suas credenciais corporativas
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Input Container */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 ml-1 italic block">
                  Identificador de Usuário
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#FFCB05]">
                    <UserIcon className="w-5 h-5 text-slate-400 transition-colors duration-200 group-focus-within:text-[#7F300C]" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E2E0D8] outline-none transition-all duration-300 font-bold text-slate-800 bg-[#FAF9F5] focus:bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05] text-sm placeholder-slate-400/80"
                    placeholder="Digite seu login corporativo..."
                    id="login_username_field"
                  />
                </div>
              </div>

              {/* Password Input Container */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 ml-1 italic block">
                  Chave Conectiva Individual
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock className="w-4.5 h-4.5 text-slate-400 transition-colors duration-200 group-focus-within:text-[#7F300C]" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#E2E0D8] outline-none transition-all duration-300 font-bold text-slate-800 bg-[#FAF9F5] focus:bg-white focus:ring-4 focus:ring-[#FFCB05]/20 focus:border-[#FFCB05] text-sm placeholder-slate-400/80"
                    placeholder="••••••••"
                    id="login_password_field"
                  />
                </div>
              </div>

              {/* Remember Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-500 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[#D3D1C8] accent-[#FFCB05] focus:ring-0 cursor-pointer" 
                    defaultChecked 
                    id="login_remember_checkbox"
                  />
                  <span>Manter conectado neste dispositivo</span>
                </label>
              </div>

              {/* Error Warning Container */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 flex gap-3 items-start shadow-sm"
                    id="login_error_alert"
                  >
                    <Info className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase tracking-wider text-red-700">Autenticação Falhou</span>
                      <span className="text-xs font-semibold mt-0.5 text-red-600">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4.5 rounded-xl font-black uppercase tracking-[0.25em] italic flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-98 shadow-md hover:shadow-lg relative overflow-hidden group ${
                  loading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200-t shadow-none' 
                  : 'bg-[#FFCB05] text-[#7F300C] hover:bg-[#F3BD00] hover:shadow-[#FFCB05]/20'
                }`}
                id="login_submit_btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Sistema</span> 
                    <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Elegant Corporate Footer */}
          <div className="mt-12 pt-6 border-t border-[#F2EFE8] flex items-center justify-between text-left">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-normal">
                Painel do Grupo Azevedo Alimentos
              </p>
              <p className="text-[9px] font-bold text-slate-400 tracking-tight mt-0.5">
                Desenvolvido por <span className="font-extrabold text-[#7F300C]">Rennan Inácio</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 dark:text-slate-700">
              <ShieldCheck className="w-6 h-6 text-[#7F300C]/30" />
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
