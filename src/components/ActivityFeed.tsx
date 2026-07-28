import React, { useState, useEffect } from 'react';
import { 
  Bell, Activity, RefreshCw, CheckCircle2, DollarSign, 
  Receipt, ClipboardCheck, ShieldAlert, User, Database, 
  Calendar, Filter, ArrowUpRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuditService, AuditLog } from '../services/AuditService';
import { useStore } from '../contexts/StoreContext';

interface ActivityFeedProps {
  limitCount?: number;
  className?: string;
}

export default function ActivityFeed({ limitCount = 10, className = '' }: ActivityFeedProps) {
  const { isDarkMode, currentStore, brandColors } = useStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchRecentLogs = async () => {
    setLoading(true);
    try {
      const res = await AuditService.fetchLogsPaginated(40, null);
      setLogs(res.logs || []);
    } catch (err) {
      console.error("Erro ao carregar feed de atividades no Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRecentLogs();
    }, 45000); // Auto update every 45s
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter logs by selected category
  const filteredLogs = logs.filter(log => {
    // Ignore routine navigation and store switching noise
    if (
      log.action === 'PAGE_VIEW' || 
      log.action === 'STORE_CHANGE' ||
      log.description?.startsWith('Acessou') ||
      log.description?.startsWith('Selecionou a unidade')
    ) {
      return false;
    }

    if (filterType === 'ALL') return true;
    if (filterType === 'CASH') return log.action === 'CASH_CLOSING_SAVE';
    if (filterType === 'PAYABLE') return log.action.includes('ACCOUNT_PAYABLE');
    if (filterType === 'CHECKLIST') return log.action.includes('CHECKLIST');
    if (filterType === 'SECURITY') return ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SECURITY_BREACH_ATTEMPT', 'SYSTEM_RESTORE', 'SYSTEM_AUTO_BACKUP', 'SYSTEM_MANUAL_BACKUP'].includes(log.action);
    return true;
  }).slice(0, limitCount);

  // Helper formatting for timestamps
  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) {
        return `Hoje às ${timeStr}`;
      }
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Ontem às ${timeStr}`;
      }
      
      return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
    } catch {
      return ts;
    }
  };

  // Icon and theme mapping based on action type
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CASH_CLOSING_SAVE':
        return {
          icon: DollarSign,
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: 'Fechamento de Caixa'
        };
      case 'ACCOUNT_PAYABLE_CREATE':
      case 'ACCOUNT_PAYABLE_UPDATE':
      case 'ACCOUNT_PAYABLE_SAVE':
      case 'ACCOUNT_PAYABLE_DELETE':
        return {
          icon: Receipt,
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: 'Contas a Pagar'
        };
      case 'CHECKLIST_SUBMIT':
      case 'CHECKLIST_DELETE':
        return {
          icon: ClipboardCheck,
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          label: 'Checklist Operacional'
        };
      case 'SYSTEM_AUTO_BACKUP':
      case 'SYSTEM_MANUAL_BACKUP':
      case 'SYSTEM_RESTORE':
        return {
          icon: Database,
          bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
          label: 'Resiliência & Backup'
        };
      case 'LOGIN_FAILED':
      case 'UNAUTHORIZED_ACCESS':
      case 'SECURITY_BREACH_ATTEMPT':
        return {
          icon: ShieldAlert,
          bg: 'bg-red-500/15 text-red-400 border-red-500/30',
          label: 'Alerta de Segurança'
        };
      default:
        return {
          icon: Activity,
          bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
          label: 'Atividade de Sistema'
        };
    }
  };

  return (
    <div className={`rounded-3xl border p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all ${
      isDarkMode 
        ? 'bg-[#121212]/90 border-[#262626] text-white' 
        : 'bg-white/90 border-slate-200 text-slate-900'
    } ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight italic">
                Centro de Avisos & Feed de Atividades
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                AO VIVO
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Histórico em tempo real de fechamentos, lançamentos e auditorias da rede
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={fetchRecentLogs}
            disabled={loading}
            title="Atualizar feed de atividades"
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#333] hover:bg-[#252525] text-slate-300' 
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden xs:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs">
        {[
          { id: 'ALL', label: 'Todos' },
          { id: 'CASH', label: '💰 Caixas' },
          { id: 'PAYABLE', label: '📄 Contas a Pagar' },
          { id: 'CHECKLIST', label: '📋 Checklists' },
          { id: 'SECURITY', label: '🛡️ Segurança' },
        ].map((tab) => {
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : isDarkMode
                    ? 'bg-[#1A1A1A] text-slate-400 hover:bg-[#222] hover:text-white border border-[#2B2B2B]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Feed List */}
      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
            <p className="text-xs font-medium text-slate-400">Carregando feed de notificações recentes...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`py-10 text-center rounded-2xl border ${
            isDarkMode ? 'bg-[#181818] border-[#2A2A2A] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Activity className="w-8 h-8 opacity-30 mx-auto mb-2" />
            <p className="text-xs font-bold">Nenhuma atividade registrada nesta categoria recentemente.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((log, index) => {
              const badge = getActionBadge(log.action);
              const BadgeIcon = badge.icon;
              const storeDisplay = log.storeName || (log.storeCode ? `Loja ${log.storeCode}` : 'Rede Grupo Azevedo');

              return (
                <motion.div
                  key={log.id || `log-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={`p-3.5 rounded-2xl border transition-all hover:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDarkMode 
                      ? 'bg-[#181818]/80 border-[#262626] hover:bg-[#1f1f1f]' 
                      : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.bg}`}>
                      <BadgeIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-400 truncate">
                          {log.userName || 'Operador'}
                        </span>
                        
                        {log.userRole && (
                          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                            isDarkMode ? 'bg-[#222] border-[#333] text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'
                          }`}>
                            {log.userRole}
                          </span>
                        )}

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isDarkMode ? 'bg-[#252525] border-[#383838] text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-700'
                        }`}>
                          📍 {storeDisplay}
                        </span>
                      </div>

                      <p className={`text-xs font-medium leading-snug break-words ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {log.description || badge.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/10">
                    <span className={`text-[11px] font-semibold whitespace-nowrap ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
