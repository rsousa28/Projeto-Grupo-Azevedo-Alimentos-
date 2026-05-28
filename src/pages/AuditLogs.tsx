import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  User as UserIcon, 
  Globe, 
  Terminal, 
  Clock, 
  Database,
  ArrowDownCircle,
  Eye,
  X
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { AuditService, AuditLog } from '../services/AuditService';
import { motion, AnimatePresence } from 'motion/react';

export default function AuditLogs() {
  const { isDarkMode, brandColors } = useStore();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogsData = async () => {
    setLoading(true);
    try {
      const data = await AuditService.fetchLogs(300);
      setLogs(data);
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsData();
  }, []);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'LOGIN_FAILED':
        return 'bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse';
      case 'UNAUTHORIZED_ACCESS':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'LOGOUT':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'STORE_CHANGE':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'CHECKLIST_SUBMIT':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'CASH_CLOSING_SAVE':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'ACCOUNT_PAYABLE_CREATE':
      case 'ACCOUNT_PAYABLE_UPDATE':
      case 'ACCOUNT_PAYABLE_DELETE':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'TEAM_USER_CREATE':
      case 'TEAM_USER_DELETE':
      case 'TEAM_USER_UPDATE':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.storeName && log.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery));

    const matchesAction = selectedAction === 'all' || log.action === selectedAction;

    return matchesSearch && matchesAction;
  });

  const stats = React.useMemo(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.action === 'LOGIN_SUCCESS').length;
    const failed = logs.filter(l => l.action === 'LOGIN_FAILED' || l.action === 'UNAUTHORIZED_ACCESS').length;
    const dbWrites = logs.filter(l => l.action.includes('SUBMIT') || l.action.includes('SAVE') || l.action.includes('CREATE') || l.action.includes('DELETE') || l.action.includes('UPDATE')).length;
    return { total, logins, failed, dbWrites };
  }, [logs]);

  // Restrict access
  if (!user || user.username !== 'adm') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 mb-4 text-red-500">
          <Shield className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-black text-rose-500 mb-2">ACESSO RESTRITO</h3>
        <p className="text-slate-400 max-w-sm text-sm">
          Esta ferramenta de auditoria de segurança é restrita e monitorada. Apenas o administrador Geral ("adm") possui privilégios de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Stats Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-500" /> AUDITORIA DE SEGURANÇA E ACESSO
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            Logs de acesso e atividades de usuários em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button 
            onClick={fetchLogsData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-[#333] hover:border-slate-700 text-sm font-bold text-slate-300 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Audit Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Total de Atividades</div>
            <div className="text-2xl font-black text-white">{stats.total}</div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Logins Bem Sucedidos</div>
            <div className="text-2xl font-black text-white">{stats.logins}</div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Falhas / Alertas</div>
            <div className="text-2xl font-black text-red-400">{stats.failed}</div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] p-5 rounded-2xl flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Escritas no Banco</div>
            <div className="text-2xl font-black text-white">{stats.dbWrites}</div>
          </div>
        </div>
      </div>

      {/* Query Filters */}
      <div className="bg-[#111] border border-[#222] p-4 rounded-2xl grid md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar por usuário, ação, descrição, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black pl-11 pr-4 py-3 rounded-xl border border-[#222] focus:border-[#333] outline-none text-sm text-white font-medium"
          />
        </div>

        <div className="md:col-span-4 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-black pl-11 pr-4 py-3 rounded-xl border border-[#222] focus:border-[#333] outline-none text-sm text-slate-300 font-medium appearance-none"
          >
            <option value="all">Todas as Categorias</option>
            <option value="LOGIN_SUCCESS">Login com Sucesso</option>
            <option value="LOGIN_FAILED">Falhas de Login</option>
            <option value="STORE_CHANGE">Troca de Unidades</option>
            <option value="CHECKLIST_SUBMIT">Checklist Enviado</option>
            <option value="CASH_CLOSING_SAVE">Fechamentos Salvos</option>
            <option value="ACCOUNT_PAYABLE_CREATE">Conta a Pagar Criada</option>
            <option value="ACCOUNT_PAYABLE_UPDATE">Conta a Pagar Editada</option>
            <option value="ACCOUNT_PAYABLE_DELETE">Conta a Pagar Deletada</option>
            <option value="TEAM_USER_CREATE">Novo Usuário de Equipe</option>
            <option value="TEAM_USER_UPDATE">Usuário de Equipe Editado</option>
            <option value="TEAM_USER_DELETE">Usuário de Equipe Excluído</option>
            <option value="UNAUTHORIZED_ACCESS">Acessos Não Autorizados</option>
            <option value="LOGOUT">Desconexões (Logouts)</option>
          </select>
        </div>

        <div className="md:col-span-2 text-xs text-slate-500 text-center font-bold">
          {filteredLogs.length} de {logs.length} logs
        </div>
      </div>

      {/* Main Logs Ledger */}
      <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <div className="text-xs font-bold uppercase tracking-wider">Lendo registros de auditoria...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center p-20 text-slate-500">
            <Terminal className="w-10 h-10 mx-auto text-[#333] mb-3" />
            <div className="text-sm font-bold">Nenhum evento localizado</div>
            <div className="text-xs text-slate-600 mt-1">Refine seus filtros de busca para ver resultados</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-[#222] text-slate-400 uppercase tracking-widest font-black text-[10px]">
                  <th className="p-4">Carimbo de Data/Hora</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Função / Store</th>
                  <th className="p-4">Descrição das Atividades</th>
                  <th className="p-4">IP / Rede</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors leading-relaxed">
                    <td className="p-4 text-slate-400 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[9px] font-black tracking-wider uppercase rounded-md ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{log.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-400">
                      <div className="font-bold">{log.userRole}</div>
                      {log.storeCode !== 'N/A' && (
                        <div className="text-[10px] text-[#FFCB05] font-mono">{log.storeCode} - {log.storeName}</div>
                      )}
                    </td>
                    <td className="p-4 text-slate-300 font-semibold min-w-[200px] max-w-sm">
                      {log.description}
                    </td>
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        {log.ipAddress || 'Não resolvido'}
                      </div>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Details Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0c] border border-[#222] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="p-5 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#FFCB05]" />
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Inspetor de Log de Segurança</h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg hover:bg-[#222] text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 rounded-xl border border-[#1e1e1e]">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">CÓDIGO DE EVENTO</div>
                    <div className="text-white font-mono font-bold text-xs">{selectedLog.id}</div>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-[#1e1e1e]">
                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">HORÁRIO UTC</div>
                    <div className="text-white font-mono font-bold text-xs">{selectedLog.timestamp}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Assinatura do Navegador (User-Agent)</div>
                  <div className="bg-black/40 p-3 rounded-xl border border-[#1e1e1e] text-slate-400 font-mono text-[11px] leading-relaxed break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Metadados Técnicos Adicionais</div>
                    <pre className="bg-black p-4 rounded-xl border border-[#1e1e1e] text-indigo-400 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48 custom-scrollbar">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="pt-2 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest border-t border-[#1e1e1e] flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" /> Registro assinado e protegido por criptografia de banco de dados
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
