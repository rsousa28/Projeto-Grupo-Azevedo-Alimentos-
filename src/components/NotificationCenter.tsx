import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellOff, 
  BellRing,
  AlertTriangle,
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
  X,
  BookOpen,
  Key,
  Copy,
  ExternalLink,
  ShieldCheck,
  Timer,
  BatteryCharging,
  Apple,
  Radio,
  Wifi
} from 'lucide-react';
import { NotificationService, NotificationPreferences, NotificationLogItem } from '../services/NotificationService';
import { BiometricService } from '../services/BiometricService';
import { 
  triggerServerPushTest, 
  getPushDiagnosticStatus, 
  subscribeUserToPush, 
  getExistingPushSubscription,
  DEFAULT_VAPID_PUBLIC_KEY 
} from '../utils/pushConfig';
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
  
  // Push & Device registration states
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean>(false);
  const [serverDevicesCount, setServerDevicesCount] = useState<number>(0);
  const [subscribing, setSubscribing] = useState<boolean>(false);

  // VAPID & Background Guide States
  const [showVapidGuide, setShowVapidGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'overview' | 'ios' | 'android' | 'vapid'>('overview');
  const [serverVapidKey, setServerVapidKey] = useState<string>(DEFAULT_VAPID_PUBLIC_KEY);
  const [copiedKey, setCopiedKey] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { user } = useAuth();
  const { isDarkMode, currentStore } = useStore();
  const { success, warning, error: toastError, info } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(NotificationService.getPermission());
    setLogs(NotificationService.getLogs());
    
    if (user) {
      setBiometricSupported(BiometricService.isSupported());
      setBiometricEnabled(BiometricService.isBiometricEnabled(user.username));
    }

    // Real-time permission listener in modern browsers
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      try {
        navigator.permissions.query({ name: 'notifications' as any }).then((status) => {
          status.onchange = () => {
            setPermission(NotificationService.getPermission());
          };
        }).catch(() => {});
      } catch {
        // Ignored on browsers that don't support notification permission query
      }
    }

    // Fetch server VAPID public key and device diagnostic status
    getPushDiagnosticStatus().then(diag => {
      setDeviceSubscribed(diag.isSubscribed);
      if (diag.serverDevicesCount !== undefined) {
        setServerDevicesCount(diag.serverDevicesCount);
      }
      if (diag.isSubscribed && permission === 'granted' && user) {
        // Silent sync with server & Firestore
        subscribeUserToPush(user).catch(() => {});
      }
    });

    fetch('/api/push/vapid-public-key', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.publicKey) setServerVapidKey(data.publicKey);
      })
      .catch(() => {});
  }, [isOpen, user, permission]);

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

  const handleRegisterThisDevice = async () => {
    setSubscribing(true);
    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        warning('Permissão de notificação não concedida no navegador.', 'Permissão Negada');
        return;
      }

      const sub = await subscribeUserToPush(user);
      if (sub) {
        setDeviceSubscribed(true);
        success('Aparelho registrado no Web Push com sucesso! Você receberá os alertas em segundo plano.', 'Dispositivo Conectado');
        const diag = await getPushDiagnosticStatus();
        setServerDevicesCount(diag.serverDevicesCount || 1);
        
        // Immediate server push confirmation
        await triggerServerPushTest(0, '📲 Aparelho Registrado no Push!', 'Seu smartphone agora receberá todos os alertas de contas a pagar e auditorias em tempo real.');
      } else {
        toastError('Não foi possível registrar o aparelho no Push.');
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao registrar aparelho no Push.');
    } finally {
      setSubscribing(false);
    }
  };

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
        
        // Register device subscription with VAPID
        const sub = await subscribeUserToPush(user);
        if (sub) {
          setDeviceSubscribed(true);
          const diag = await getPushDiagnosticStatus();
          setServerDevicesCount(diag.serverDevicesCount || 1);
        }

        // Trigger real server push notification test
        await triggerServerPushTest(0, '🔔 Push PWA Ativado!', 'Dispositivo registrado com sucesso para receber alertas do Grupo Azevedo em segundo plano.');
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
      // Ensure subscription is active
      await subscribeUserToPush(user);
      setDeviceSubscribed(true);

      // Trigger cloud push to all registered devices
      await triggerServerPushTest(
        0,
        '🔔 Teste de Notificação Web Push',
        'Notificação enviada através do servidor em nuvem (VAPID) para todos os dispositivos cadastrados!'
      );
      await NotificationService.sendTestNotification();
      success('Notificação de teste disparada pelo servidor! Verifique a barra do sistema.', 'Push Enviado');
      setLogs(NotificationService.getLogs());

      const diag = await getPushDiagnosticStatus();
      setServerDevicesCount(diag.serverDevicesCount || 1);
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

  const handleTestDelayedPush = async () => {
    if (permission !== 'granted') {
      warning('Ative as permissões de notificação antes de testar em segundo plano.');
      return;
    }

    try {
      // Ensure subscription is active
      await subscribeUserToPush(user);
      setDeviceSubscribed(true);

      setCountdown(5);
      info('Bloqueie a tela do celular AGORA! O servidor disparará o push em 5 segundos.', 'Teste em Segundo Plano');
      
      // Server-side delayed Web Push dispatch (Node.js cloud background timer)
      await triggerServerPushTest(
        5,
        '📲 Alerta em Segundo Plano Recebido!',
        'Seu smartphone recebeu o push com sucesso mesmo com a tela bloqueada!'
      );

      let counter = 5;
      const interval = setInterval(() => {
        counter -= 1;
        if (counter > 0) {
          setCountdown(counter);
        } else {
          clearInterval(interval);
          setCountdown(null);
          success('Push disparado pelo servidor em nuvem!');
          setLogs(NotificationService.getLogs());
        }
      }, 1000);
    } catch (err: any) {
      setCountdown(null);
      toastError(err.message || 'Erro ao agendar push no servidor.');
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
    <div className="relative inline-flex items-center gap-1.5 sm:gap-2" ref={dropdownRef}>
      {/* Quick Action Pill for Desktop/Tablet when permission is NOT granted */}
      {permission === 'default' && (
        <button
          onClick={handleRequestPermission}
          title="Clique para autorizar as notificações push do PWA no seu navegador/celular"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="whitespace-nowrap">Ativar Notificações</span>
        </button>
      )}

      {permission === 'denied' && (
        <button
          onClick={() => setIsOpen(true)}
          title="Notificações bloqueadas no navegador. Clique para ver instruções de desbloqueio."
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="whitespace-nowrap">Alertas Bloqueados</span>
        </button>
      )}

      {/* Bell Trigger Button with Status Badges */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={
          permission === 'granted'
            ? 'Notificações Push PWA: Ativas e Conectadas'
            : permission === 'denied'
            ? 'Notificações Bloqueadas no Navegador - Clique para ver instruções'
            : 'Notificações Pendentes - Clique para habilitar alertas no PWA'
        }
        className={`p-2 rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center relative shrink-0 ${
          isDarkMode
            ? 'bg-[#1E1E1E] border-[#2A2A2A] text-slate-300 hover:bg-[#252525] hover:text-white'
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
        } ${
          permission === 'default'
            ? 'ring-2 ring-amber-500/30 border-amber-500/50'
            : permission === 'denied'
            ? 'border-rose-500/40 ring-1 ring-rose-500/20'
            : ''
        }`}
      >
        {permission === 'denied' ? (
          <BellOff className="w-4 h-4 text-rose-400" />
        ) : permission === 'default' ? (
          <BellRing className="w-4 h-4 text-amber-500 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Unread badge (Top Right) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-xs z-10 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* PWA Permission Status Indicator (Bottom Right) */}
        {permission === 'granted' ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1E1E1E] shadow-xs"
            title="Permissão Concedida: Push PWA Ativo"
          />
        ) : permission === 'default' ? (
          <span
            className="absolute -bottom-1 -right-1 flex h-3 w-3 z-10"
            title="Permissão Pendente: Clique para ativar no PWA"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white dark:border-[#1E1E1E] text-[7px] font-black text-slate-950 items-center justify-center leading-none">
              !
            </span>
          </span>
        ) : (
          <span
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border border-white dark:border-[#1E1E1E] flex items-center justify-center text-[7px] font-black text-white leading-none shadow-xs z-10"
            title="Permissão Bloqueada no Navegador"
          >
            ✕
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

              {/* Permission Granted Status Card */}
              {permission === 'granted' && (
                <div className="space-y-2">
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 ${
                    isDarkMode 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <div>
                        <span className="text-[11px] font-black uppercase italic tracking-tight block leading-tight">
                          {deviceSubscribed ? 'Notificações Push PWA Ativas' : 'Permissão Concedida no Aparelho'}
                        </span>
                        <span className="text-[9.5px] opacity-80 block leading-tight mt-0.5">
                          {deviceSubscribed 
                            ? `Dispositivo conectado • ${serverDevicesCount || 1} aparelho(s) registrado(s)` 
                            : 'Clique abaixo para registrar este celular no servidor'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-black text-[8.5px] tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{deviceSubscribed ? 'Conectado' : 'Pendente'}</span>
                    </div>
                  </div>

                  {!deviceSubscribed && (
                    <button
                      onClick={handleRegisterThisDevice}
                      disabled={subscribing}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] italic flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {subscribing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5" />
                      )}
                      <span>Registrar este Celular para Push em Nuvem</span>
                    </button>
                  )}

                  {deviceSubscribed && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestNotification}
                        disabled={testing}
                        className="py-1.5 px-2 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-200 text-[9px] font-black uppercase tracking-wider italic flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-[#FFCB05]" />}
                        <span>Testar Push</span>
                      </button>
                      <button
                        onClick={handleTestDelayedPush}
                        disabled={countdown !== null}
                        className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase tracking-wider italic flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Timer className="w-3 h-3" />
                        <span>{countdown !== null ? `Bloqueie (${countdown}s)` : 'Testar Tela Bloqueada'}</span>
                      </button>
                    </div>
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
                    {/* Botão Guia VAPID Passo a Passo */}
                    <button
                      onClick={() => setShowVapidGuide(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-black uppercase tracking-wider text-[10px] italic flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Guia Passo a Passo: Notificações em 2º Plano</span>
                    </button>

                    {/* Botão Teste com Bloqueio de Tela (5 segundos de delay) */}
                    <button
                      onClick={handleTestDelayedPush}
                      disabled={countdown !== null}
                      className={`w-full py-2.5 px-3 rounded-xl border font-black uppercase tracking-wider text-[10px] italic flex items-center justify-center gap-2 transition cursor-pointer ${
                        countdown !== null
                          ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <Timer className="w-3.5 h-3.5" />
                      {countdown !== null ? (
                        <span>Bloqueie a Tela Agora! ({countdown}s)</span>
                      ) : (
                        <span>Testar Push na Tela Bloqueada (5s Delay)</span>
                      )}
                    </button>

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
                          <span>Testar Notificação Push Imediata</span>
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

      {/* Modal Guia VAPID e Notificações em Segundo Plano */}
      <AnimatePresence>
        {showVapidGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-auto ${
                isDarkMode ? 'bg-[#181818] border-[#333] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                isDarkMode ? 'bg-[#1F1F1F] border-[#2A2A2A]' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase italic tracking-tight flex items-center gap-2">
                      Guia VAPID & Notificações em Segundo Plano
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Como receber alertas sem precisar manter o app aberto
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVapidGuide(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-400 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className={`flex border-b text-xs font-bold ${
                isDarkMode ? 'border-[#2A2A2A] bg-[#141414]' : 'border-slate-100 bg-slate-100/50'
              }`}>
                <button
                  onClick={() => setGuideTab('overview')}
                  className={`flex-1 py-3 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
                    guideTab === 'overview'
                      ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Como Funciona</span>
                </button>
                <button
                  onClick={() => setGuideTab('ios')}
                  className={`flex-1 py-3 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
                    guideTab === 'ios'
                      ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Apple className="w-4 h-4" />
                  <span>iPhone (iOS)</span>
                </button>
                <button
                  onClick={() => setGuideTab('android')}
                  className={`flex-1 py-3 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
                    guideTab === 'android'
                      ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setGuideTab('vapid')}
                  className={`flex-1 py-3 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
                    guideTab === 'vapid'
                      ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Chaves VAPID</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar text-xs leading-relaxed">
                {guideTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <p className="font-bold text-xs">💡 O que é o VAPID?</p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        VAPID (Voluntary Application Server Identification) é o protocolo oficial da Web que permite ao servidor do Grupo Azevedo enviar notificações push criptografadas diretamente para os servidores da Apple (APNs) e Google (FCM). O celular acorda em segundo plano e exibe o alerta sem que você precise estar com o app aberto.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-400">
                        Fluxo de Entrega em 4 Etapas:
                      </h4>
                      <ol className="list-decimal pl-4 space-y-2 text-slate-300 text-[11.5px]">
                        <li>
                          <strong className="text-white">Autorização no PWA:</strong> Ao permitir notificações, seu navegador gera uma assinatura exclusiva ligada à chave pública VAPID do sistema.
                        </li>
                        <li>
                          <strong className="text-white">Registro no Banco de Dados:</strong> A assinatura é salva automaticamente no Firestore em <code className="text-amber-400 font-mono">push_subscriptions</code>.
                        </li>
                        <li>
                          <strong className="text-white">Robô em Background:</strong> O robô no servidor verifica as contas a pagar de hora em hora (08h às 22h) ou rotinas atrasadas e dispara a notificação via Web Push.
                        </li>
                        <li>
                          <strong className="text-white">Exibição Nativa:</strong> O sistema operacional do seu celular (iOS ou Android) recebe o sinal, acorda o Service Worker e emite o som e banner na tela bloqueada.
                        </li>
                      </ol>
                    </div>
                  </div>
                )}

                {guideTab === 'ios' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                      <p className="font-bold text-xs">⚠️ Requisito Obrigatório da Apple (iOS 16.4+):</p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        O Safari no iPhone <strong>NÃO</strong> permite notificações push em abas comuns do navegador. É <strong>obrigatório</strong> instalar o PWA na Tela de Início!
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-400">
                        Passo a Passo no iPhone:
                      </h4>
                      <div className="space-y-2.5 text-slate-300 text-[11.5px]">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                          <div>
                            <strong className="text-white">Instalar na Tela de Início:</strong> Abra o sistema no <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) e escolha <strong>"Adicionar à Tela de Início"</strong>.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                          <div>
                            <strong className="text-white">Abrir pelo Ícone Novo:</strong> Feche o Safari e abra o app através do ícone recém-criado na tela inicial do seu iPhone.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                          <div>
                            <strong className="text-white">Conceder Permissão:</strong> Abra o sino de notificações, clique em <strong>"Ativar Notificações Push"</strong> e confirme no diálogo nativo do iOS tocando em <strong>"Permitir"</strong>.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">4</span>
                          <div>
                            <strong className="text-white">Conferir Ajustes do iOS:</strong> Em <strong>Ajustes &gt; Notificações &gt; Grupo AZ</strong>, verifique se "Permitir Notificações", "Sons" e "Tela Bloqueada" estão ativos.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {guideTab === 'android' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      <p className="font-bold text-xs">🔋 Dica Crítica de Bateria no Android:</p>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Sistemas Android (Samsung, Motorola, Xiaomi) possuem economia agressiva de bateria que pode atrasar notificações em segundo plano se o app estiver configurado como "Otimizado".
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-400">
                        Configuração Recomendada no Android:
                      </h4>
                      <div className="space-y-2.5 text-slate-300 text-[11.5px]">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                          <div>
                            <strong className="text-white">Instalar o App:</strong> No Google Chrome, toque no botão <strong>"Instalar Aplicativo"</strong> ou nos 3 pontinhos &gt; <strong>"Instalar aplicativo"</strong>.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                          <div>
                            <strong className="text-white">Permitir Notificações:</strong> Toque no sino do sistema e clique em <strong>"Permitir"</strong> quando o Chrome solicitar.
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                          <div>
                            <strong className="text-white">Desativar Restrição de Bateria:</strong> Vá em <strong>Configurações do Celular &gt; Aplicativos &gt; Grupo AZ (ou Chrome) &gt; Bateria</strong> e mude para <strong>"Sem restrições"</strong>. Isso garante que a notificação chegue no mesmo segundo mesmo com o celular em modo de espera!
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {guideTab === 'vapid' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-400">Chave VAPID Pública do Servidor</span>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativa
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 font-mono text-[10px] text-slate-300 break-all select-all border border-white/5 flex items-center justify-between gap-2">
                        <span>{serverVapidKey || 'BICKQSsomQNxolxMgOH8zuTiBR0qEuFX6zSUbt462NkBtbqZ3gO2DHc6IJizJgZupwKk6o-64Jdr04aL5QMHvYk'}</span>
                        <button
                          onClick={() => {
                            const key = serverVapidKey || 'BICKQSsomQNxolxMgOH8zuTiBR0qEuFX6zSUbt462NkBtbqZ3gO2DHc6IJizJgZupwKk6o-64Jdr04aL5QMHvYk';
                            navigator.clipboard.writeText(key);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                            success('Chave VAPID copiada com sucesso!');
                          }}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 transition cursor-pointer"
                          title="Copiar Chave Pública"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Armazenada de forma persistente em <code className="text-amber-300">vapid-keys.json</code> e em variáveis de ambiente.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-black uppercase tracking-wider text-[11px] text-slate-400">
                        Como Configurar no .env do Projeto:
                      </h4>
                      <pre className="p-3 rounded-xl bg-black/40 border border-white/10 text-[10px] font-mono text-amber-300 overflow-x-auto">
{`# Variáveis de Ambiente no Servidor
VAPID_PUBLIC_KEY="BICKQSsomQNxolxMgOH8zuTiBR0qEuFX6zSUbt462NkBtbqZ3gO2DHc6IJizJgZupwKk6o-64Jdr04aL5QMHvYk"
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:rennaninacio0003@gmail.com"`}
                      </pre>
                      <p className="text-[10.5px] text-slate-400">
                        O guia técnico completo e diagramas de arquitetura estão disponíveis no arquivo <strong className="text-white">GUIA_NOTIFICACOES_VAPID.md</strong> na raiz do projeto.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#1F1F1F] border-[#2A2A2A]' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Push Criptografado de Ponta a Ponta</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowVapidGuide(false);
                      handleTestDelayedPush();
                    }}
                    className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs italic flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Testar na Tela Bloqueada (5s)</span>
                  </button>
                  <button
                    onClick={() => setShowVapidGuide(false)}
                    className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
