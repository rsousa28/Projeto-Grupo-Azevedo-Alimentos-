import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  X, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { BackupService, BackupHealthStatus } from '../services/BackupService';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';

export default function BackupStatusIndicator() {
  const { user } = useAuth();
  const { isDarkMode } = useStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [health, setHealth] = useState<BackupHealthStatus | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only render for ADMIN users
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const loadBackupHealth = async () => {
    setLoading(true);
    try {
      const status = await BackupService.getHealthStatus();
      setHealth(status);
    } catch (e) {
      console.error('Error loading backup health:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackupHealth();
    // Poll backup status every 3 minutes
    const interval = setInterval(loadBackupHealth, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleCreateInstantBackup = async () => {
    setCreatingBackup(true);
    try {
      const newBkp = await BackupService.createBackup(user.username || 'adm', 'manual');
      success(`Backup '${newBkp.backupId}' concluído com sucesso!`, 'Banco de Dados Salvo');
      await loadBackupHealth();
      setIsOpen(false);
    } catch (err: any) {
      toastError(err.message || 'Falha ao executar backup instantâneo.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const isAlert = health && !health.hasRecentBackup;

  const formatHoursAgo = (hours: number | null) => {
    if (hours === null) return 'Nenhum backup registrado';
    if (hours === 0) return 'Há menos de 1 hora';
    if (hours === 1) return 'Há 1 hora';
    if (hours < 24) return `Há ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `Há ${days} dia(s) (${hours}h)`;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Header Badge Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isAlert ? "ALERTA: Backup de dados pendente (>24h)" : "Status do Backup Diário: Em dia"}
        className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-tight shadow-2xs active:scale-95 shrink-0 ${
          isAlert
            ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/25 animate-pulse'
            : isDarkMode
            ? 'bg-[#1E1E1E] border-[#2A2A2A] text-emerald-400 hover:bg-[#252525]'
            : 'bg-emerald-50 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/80'
        }`}
      >
        {isAlert ? (
          <>
            <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce shrink-0" />
            <span className="hidden md:inline italic">Backup Pendente</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping md:hidden" />
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="hidden xl:inline text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
              Backup OK
            </span>
          </>
        )}
      </button>

      {/* Popover Card */}
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
            <div className={`p-4 border-b flex items-center justify-between ${
              isAlert
                ? isDarkMode ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200'
                : isDarkMode ? 'bg-[#1F1F1F] border-[#282828]' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shadow-xs shrink-0 ${
                  isAlert ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {isAlert ? <AlertTriangle className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`text-xs font-black uppercase italic tracking-tight leading-tight ${
                    isAlert ? 'text-red-600 dark:text-red-400' : ''
                  }`}>
                    {isAlert ? 'Alerta: Backup Desatualizado' : 'Backup Diário do Sistema'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Central de Resiliência
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4">
              {/* Alert or Success Message Box */}
              {isAlert ? (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs leading-relaxed space-y-2">
                  <div className="font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Nenhum Backup em 24h</span>
                  </div>
                  <p className="text-[11px] font-medium">
                    A base de dados do Firestore não recebeu nenhum ponto de restauração completo nas últimas 24 horas. É recomendado gerar uma cópia de segurança agora.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
                      Cópia de Segurança Atualizada
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                      O Firestore possui backups válidos gerados recentemente. Seus dados estão seguros e resilientes.
                    </p>
                  </div>
                </div>
              )}

              {/* Status Info Row */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-500 text-[11px]">Última Execução:</span>
                </div>
                <span className={`font-black text-xs ${
                  isAlert ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {health ? formatHoursAgo(health.hoursAgo) : 'Verificando...'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleCreateInstantBackup}
                  disabled={creatingBackup}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-[10.5px] italic flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer ${
                    isAlert
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#FFCB05] text-[#7F300C] hover:bg-[#F3BD00]'
                  }`}
                >
                  {creatingBackup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando Backup Geral...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isAlert ? '⚡ Gerar Backup Imediato' : 'Gerar Novo Backup'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/backups');
                  }}
                  className={`w-full py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition border ${
                    isDarkMode
                      ? 'border-[#333] text-slate-300 hover:bg-white/5'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Gerenciar Histórico & Rollbacks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
