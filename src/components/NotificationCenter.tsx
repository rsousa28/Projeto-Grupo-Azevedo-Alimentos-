import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCircle2, 
  ClipboardList, 
  DollarSign, 
  Info, 
  Loader2, 
  Send, 
  Settings, 
  Sparkles, 
  Volume2, 
  ScanFace,
  X 
} from 'lucide-react';
import { NotificationService, NotificationPreferences, NotificationLogItem } from '../services/NotificationService';
import { BiometricService } from '../services/BiometricService';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(NotificationService.getPreferences());
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [testing, setTesting] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  const { user } = useAuth();
  const { isDarkMode, currentStore } = useStore();
  const { success, warning, error: toastError } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(NotificationService.getPermission());
    setLogs(NotificationService.getLogs());
    
    if (user) {
      setBiometricSupported(BiometricService.isSupported());
      setBiometricEnabled(BiometricService.isBiometricEnabled(user.username));
    }
  }, [isOpen, user]);

  const handleToggleBiometric = async () => {
    if (!user) return;
    if (!BiometricService.isSupported()) {
      toastError('Biometria não é suportada neste navegador.');
      return;
    }

    try {
      const nextState = !biometricEnabled;
      await BiometricService.toggleBiometricForUser(user, nextState);
      setBiometricEnabled(nextState);
      if (nextState) {
        success('Login por Face ID / Touch ID ativado com sucesso!', 'Biometria Ativada');
      } else {
        warning('Login biométrico desativado.', 'Biometria Desativada');
      }
    } catch (e: any) {
      toastError(e.message || 'Erro ao alterar biometria');
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = logs.filter((l) => !l.read).length;

  const handleRequestPermission = async () => {
    try {
      const res = await NotificationService.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        success('Notificações Push ativadas com sucesso neste dispositivo!', 'Permissão Concedida');
        setPreferences(NotificationService.getPreferences());
      } else {
        warning('A permissão de notificações foi negada no navegador.', 'Permissão Negada');
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao solicitar permissão de notificações.');
    }
  };

  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated as NotificationPreferences);
    NotificationService.savePreferences(updated as NotificationPreferences);
    success('Preferências de notificação atualizadas!');
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await NotificationService.sendTestNotification();
      success('Notificação de teste disparada! Verifique a barra do sistema.', 'Push Enviado');
      setLogs(NotificationService.getLogs());
    } catch (err: any) {
      toastError(err.message || 'Não foi possível disparar a notificação de teste.');
    } finally {
      setTesting(false);
    }
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead();
    setLogs(NotificationService.getLogs());
    success('Todas as notificações foram marcadas como lidas.');
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'CHECKLIST':
        return <ClipboardList className="w-4 h-4 text-emerald-500" />;
      case 'CASH_CLOSING':
        return <DollarSign className="w-4 h-4 text-amber-500" />;
      case 'TEST':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Lembretes & Notificações Push"
        className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center relative ${
          isDarkMode
            ? 'bg-[#1E1E1E] border-[#2A2A2A] text-slate-300 hover:bg-[#252525] hover:text-white'
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
        }`}
      >
        {permission === 'denied' ? (
          <BellOff className="w-4 h-4 text-red-400" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-3 w-auto sm:w-96 rounded-3xl border shadow-2xl z-50 overflow-hidden ${
              isDarkMode ? 'bg-[#181818] border-[#333] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-[#282828] bg-[#1F1F1F]' : 'border-slate-100 bg-slate-50/80'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFCB05] text-[#7F300C] flex items-center justify-center font-black shadow-xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase italic tracking-tight leading-none">
                    Lembretes e Notificações
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Unidade: {currentStore.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab(activeTab === 'notifications' ? 'settings' : 'notifications')}
                  className={`p-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1 ${
                    activeTab === 'settings'
                      ? 'bg-[#FFCB05] text-[#7F300C]'
                      : isDarkMode
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Configurações de Notificação"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-3 custom-scrollbar">
              {/* Permission Request Banner if default/denied */}
              {permission !== 'granted' && (
                <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                  permission === 'denied'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-black uppercase italic tracking-tight">
                      {permission === 'denied' ? 'Notificações Bloqueadas' : 'Ativar Notificações Push'}
                    </span>
                  </div>
                  <p className="text-[10.5px] font-medium leading-relaxed opacity-90">
                    {permission === 'denied'
                      ? 'As notificações estão desativadas no navegador. Permita o envio nas configurações do site.'
                      : 'Receba alertas no seu celular ou computador sobre fechamentos de caixa e pendências de checklist.'}
                  </p>
                  {permission === 'default' && (
                    <button
                      onClick={handleRequestPermission}
                      className="mt-1 w-full py-2 bg-[#FFCB05] text-[#7F300C] font-black uppercase tracking-wider text-[10px] rounded-xl shadow-xs hover:bg-[#F3BD00] transition italic"
                    >
                      Permitir Notificações
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Notifications List */}
              {activeTab === 'notifications' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Alertas Recentes
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-[#7F300C] dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Marcar Lidas</span>
                      </button>
                    )}
                  </div>

                  {logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                            !item.read
                              ? isDarkMode
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-amber-50/80 border-amber-200'
                              : isDarkMode
                              ? 'bg-[#202020] border-[#303030] text-slate-300'
                              : 'bg-slate-50 border-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-white dark:bg-[#181818] border border-slate-200/50 dark:border-white/10 shrink-0">
                            {getLogIcon(item.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-black uppercase italic tracking-tight truncate">
                                {item.title}
                              </h4>
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10.5px] font-medium leading-normal mt-0.5 opacity-90 line-clamp-2">
                              {item.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-bold italic">
                      Nenhuma notificação registrada recentemente.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Settings */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Biometric Toggle Section */}
                  {user && (
                    <>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                        Segurança & Acesso
                      </span>

                      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <ScanFace className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <div className="text-xs font-black uppercase italic tracking-tight">
                              Login Biométrico (Face ID)
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-medium">
                              {biometricSupported ? 'Entrar com sensores de hardware' : 'Não suportado no navegador'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleBiometric}
                          disabled={!biometricSupported}
                          className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer disabled:opacity-40 ${
                            biometricEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                            biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </>
                  )}

                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block pt-1">
                    Configuração de Lembretes Automáticos
                  </span>

                  {/* Toggle Cash Closing Reminder */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase italic tracking-tight">
                          Fechamento de Caixa
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-medium">
                          Alertas nos fins de turno (14h30 / 21h30)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('cashClosingReminder')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        preferences.cashClosingReminder ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        preferences.cashClosingReminder ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle Checklist Pending Reminder */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase italic tracking-tight">
                          Checklist Pendente
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-medium">
                          Aviso se o checklist do dia não estiver concluído
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('checklistReminder')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        preferences.checklistReminder ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        preferences.checklistReminder ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Test Notification Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestNotification}
                      disabled={testing}
                      className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black uppercase tracking-wider text-[10px] italic flex items-center justify-center gap-2 hover:opacity-90 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {testing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#FFCB05]" />
                          <span>Testar Notificação Push</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
