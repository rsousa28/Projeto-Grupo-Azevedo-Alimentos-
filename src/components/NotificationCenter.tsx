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
  Receipt,
  Send, 
  Settings, 
  Sparkles, 
  Smartphone,
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
  const [testingPayable, setTestingPayable] = useState(false);
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
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
      const res = await NotificationService.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        success('Notificações Push ativadas com sucesso no seu dispositivo!', 'Permissão Concedida');
        setPreferences(NotificationService.getPreferences());
        // Trigger test notification immediately to confirm
        await NotificationService.sendTestNotification();
      } else {
        warning('A permissão de notificações foi negada no navegador. Habilite nas configurações do seu celular.', 'Permissão Negada');
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

  const handleTriggerPayableReport = async () => {
    setTestingPayable(true);
    try {
      await NotificationService.triggerAccountsPayableReport();
      success('Relatório de Contas a Pagar disparado para todas as lojas com sucesso!', 'Relatório Enviado');
      setLogs(NotificationService.getLogs());
    } catch (err: any) {
      toastError(err.message || 'Erro ao disparar relatório de contas a pagar.');
    } finally {
      setTestingPayable(false);
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
      case 'PAYABLE_HOURLY':
        return <Receipt className="w-4 h-4 text-rose-500" />;
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
                      ? 'As notificações estão bloqueadas nas configurações do seu navegador ou celular. Toque nas configurações do site para permitir.'
                      : 'Receba alertas automáticos no seu celular sobre fechamentos de caixa, movimentações e pendências do Grupo Azevedo.'}
                  </p>
                  <div className="text-[9.5px] text-slate-400 font-medium bg-black/20 p-2 rounded-xl border border-white/5 space-y-0.5">
                    <p className="font-bold text-amber-300">💡 Dica para Celulares (PWA):</p>
                    <p>• <strong>iPhone (iOS):</strong> É necessário adicionar o app à <strong>"Tela de Início"</strong> (Compartilhar &gt; Adicionar à Tela de Início).</p>
                    <p>• <strong>Android:</strong> Toque no botão abaixo para autorizar alertas e vibrações do sistema.</p>
                  </div>
                  {permission === 'default' && (
                    <button
                      onClick={handleRequestPermission}
                      className="mt-1 w-full py-2.5 bg-[#FFCB05] text-[#7F300C] font-black uppercase tracking-wider text-[10px] rounded-xl shadow-xs hover:bg-[#F3BD00] transition italic flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Ativar Notificações no Celular</span>
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

                  {/* Toggle Accounts Payable Hourly Report (Admin Only) */}
                  {(user?.role === 'ADMIN' || user?.role === 'FINANCIAL' || user?.username?.toLowerCase() === 'rennan' || user?.username?.toLowerCase().includes('admin') || user?.username?.toLowerCase() === 'victordiretor') && (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <Receipt className="w-4 h-4 text-rose-500 shrink-0" />
                        <div>
                          <div className="text-xs font-black uppercase italic tracking-tight">
                            Relatório Horário de Contas a Pagar
                          </div>
                          <div className="text-[9.5px] text-slate-500 font-medium">
                            Resumo a cada 1h: A Pagar Hoje, Vencido, Pagas Mês e Futuro de cada unidade (Exclusivo ADM)
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('accountsPayableHourlyReminder')}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                          preferences.accountsPayableHourlyReminder !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          preferences.accountsPayableHourlyReminder !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  )}

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
                          Notificação em tempo real quando qualquer operador finalizar o caixa
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

                  {/* Firebase Cloud Messaging (FCM) Status Card */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-[#181818] border-amber-500/20' : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="text-xs font-black uppercase italic tracking-tight text-amber-500">
                            Firebase Cloud Messaging (FCM)
                          </div>
                          <div className="text-[9.5px] text-slate-400 font-medium">
                            Notificações Push nativas e em segundo plano ativas no PWA
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Ativo
                      </span>
                    </div>

                    {NotificationService.getFCMToken() ? (
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center justify-between gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                          <div className="truncate text-[9px] font-mono text-slate-400">
                            Token FCM: <span className="text-amber-300 font-bold">{NotificationService.getFCMToken()?.slice(0, 18)}...</span>
                          </div>
                          <button
                            onClick={() => {
                              const token = NotificationService.getFCMToken();
                              if (token) {
                                navigator.clipboard.writeText(token);
                                success('Token FCM copiado para a área de transferência!');
                              }
                            }}
                            className="text-[9px] font-bold text-amber-400 hover:underline shrink-0"
                          >
                            Copiar Token
                          </button>
                        </div>

                        <button
                          onClick={async () => {
                            const sent = NotificationService.notifyFinancialAlert({
                              title: '🚨 Alerta Financeiro FCM: Contas Vencendo',
                              body: '⚠️ Existem contas a pagar pendentes com vencimento hoje totalizando R$ 4.850,00. Clique para conferir no PWA.',
                              type: 'FINANCIAL_ALERT',
                              url: '/accounts-payable',
                            });
                            if (sent) {
                              success('Alerta Financeiro enviado via Push FCM!');
                              setLogs(NotificationService.getLogs());
                            } else {
                              warning('Não foi possível enviar o alerta financeiro.');
                            }
                          }}
                          className="w-full py-1.5 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-[10px] rounded-xl border border-red-500/30 transition flex items-center justify-center gap-1.5 italic"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Testar Alerta Financeiro Push
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const tok = await NotificationService.initFCMToken();
                          if (tok) {
                            success('Token FCM registrado com sucesso!');
                          } else {
                            warning('Não foi possível obter o Token FCM. Verifique as permissões de notificação.');
                          }
                        }}
                        className="w-full py-1.5 bg-amber-500/20 text-amber-400 font-bold text-[10px] rounded-xl border border-amber-500/30 hover:bg-amber-500/30 transition italic"
                      >
                        ⚡ Conectar / Atualizar Token FCM
                      </button>
                    )}
                  </div>

                  {/* Toggle Checklist Completed Notification */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase italic tracking-tight">
                          Checklist Realizado
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-medium">
                          Notificação em tempo real quando qualquer checklist for concluído
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

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    {(user?.role === 'ADMIN' || user?.role === 'FINANCIAL' || user?.username?.toLowerCase() === 'rennan' || user?.username?.toLowerCase().includes('admin') || user?.username?.toLowerCase() === 'victordiretor') && (
                      <button
                        onClick={handleTriggerPayableReport}
                        disabled={testingPayable}
                        className="w-full py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-wider text-[10px] italic flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {testingPayable ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Disparar Relatório Contas a Pagar Agora</span>
                          </>
                        )}
                      </button>
                    )}

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
                          <span>Testar Notificação Push Geral</span>
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
