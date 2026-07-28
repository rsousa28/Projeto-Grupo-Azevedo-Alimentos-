import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Fingerprint, 
  ScanFace, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Bell, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';
import { BiometricService } from '../services/BiometricService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useStore();
  const { success, warning, error: toastError } = useToast();

  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [loadingBio, setLoadingBio] = useState<boolean>(false);

  // Load initial settings
  useEffect(() => {
    if (!isOpen) return;

    const checkBiometrics = async () => {
      const supported = BiometricService.isSupported();
      setBiometricSupported(supported);

      if (supported) {
        const platformAvail = await BiometricService.isPlatformAuthenticatorAvailable();
        setPlatformAuthAvailable(platformAvail);
        
        if (user) {
          const isEnabled = user.biometricEnabled ?? BiometricService.isBiometricEnabled(user.username);
          setBiometricEnabled(isEnabled);
        }
      }
    };

    checkBiometrics();
  }, [isOpen, user]);

  const handleToggleBiometric = async () => {
    if (!user) {
      warning('Usuário não autenticado.', 'Acesso Negado');
      return;
    }

    if (!biometricSupported) {
      toastError('Seu navegador ou dispositivo não possui suporte a WebAuthn / Biometria.');
      return;
    }

    setLoadingBio(true);
    try {
      const newState = !biometricEnabled;
      await BiometricService.toggleBiometricForUser(user, newState);
      setBiometricEnabled(newState);

      if (newState) {
        success('Login biométrico ativado e salvo no seu perfil de usuário no banco de dados!', 'Perfil Atualizado');
      } else {
        warning('Login biométrico desativado no seu perfil de usuário no banco de dados.', 'Perfil Atualizado');
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao alterar configuração de biometria.');
      setBiometricEnabled(BiometricService.isBiometricEnabled(user?.username));
    } finally {
      setLoadingBio(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDarkMode ? 'bg-[#181818] border-[#333] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'bg-[#1F1F1F] border-[#282828]' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFCB05] text-[#7F300C] flex items-center justify-center font-black shadow-xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tight leading-none">
                  Configurações do Usuário
                </h3>
                <p className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  {user?.name} ({user?.username})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Options */}
          <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* Section 1: Biometric Login (WebAuthn / Passkeys) */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block flex items-center gap-1.5">
                <ScanFace className="w-3.5 h-3.5 text-amber-500" />
                <span>Autenticação Biométrica (WebAuthn / Passkeys)</span>
              </span>

              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                    biometricEnabled 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-400'
                  }`}>
                    {biometricEnabled ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase italic tracking-tight flex items-center gap-2">
                      <span>Login por Face ID / Touch ID</span>
                      {biometricSupported ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          Dispositivo Suportado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Não Suportado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                      Permite entrar no sistema rapidamente sem digitar sua senha, utilizando os sensores de segurança do aparelho.
                    </p>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  disabled={loadingBio || !biometricSupported}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                    biometricEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={biometricEnabled ? "Desativar login biométrico" : "Ativar login biométrico"}
                >
                  {loadingBio ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      biometricEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  )}
                </button>
              </div>
            </div>

            {/* Section 2: Appearance / Dark Mode */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Aparência e Foco Visual</span>
              </span>

              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase italic tracking-tight">
                      Modo Escuro / Noturno
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {isDarkMode ? 'Tema escuro ativo para ambientes noturnos.' : 'Tema claro padrão do sistema.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 cursor-pointer ${
                    isDarkMode ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Section 3: App Info */}
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              isDarkMode ? 'bg-[#202020] border-[#303030] text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <div className="font-black uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Informações do Dispositivo</span>
              </div>
              <div className="text-[11px] font-medium leading-relaxed">
                As credenciais WebAuthn criadas ficam criptografadas no chip de segurança (Secure Enclave / TPM) do seu dispositivo local e nunca são transmitidas como texto puro.
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-end shrink-0 ${
            isDarkMode ? 'border-[#282828] bg-[#1F1F1F]' : 'border-slate-100 bg-slate-50/80'
          }`}>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#FFCB05] text-[#7F300C] font-black uppercase tracking-wider text-xs italic hover:bg-[#F3BD00] transition cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
