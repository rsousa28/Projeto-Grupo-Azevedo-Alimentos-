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
  X,
  Download,
  Upload,
  Play,
  Trash2,
  Archive,
  FileDown,
  Lock,
  Activity,
  FileUp,
  Folder,
  Calendar,
  Cloud
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AuditService, AuditLog } from '../services/AuditService';
import { BackupService, BackupRecord } from '../services/BackupService';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface AuditLogsProps {
  forcedTab?: 'logs' | 'security' | 'backups' | 'diagnostics';
}

export default function AuditLogs({ forcedTab }: AuditLogsProps = {}) {
  const navigate = useNavigate();
  const { isDarkMode, brandColors, currentStore } = useStore();
  const isBebelu = currentStore?.brand === 'BEBELU';
  const themeButtonBg = brandColors?.button;
  const themeTextContrast = isBebelu ? '#121212' : '#FFFFFF';
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Backup & Restore states
  const [activeTab, setActiveTab] = useState<'logs' | 'backups' | 'diagnostics' | 'security'>(forcedTab || 'logs');

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  const [backupsList, setBackupsList] = useState<Omit<BackupRecord, 'payload'>[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [autoBackupMessage, setAutoBackupMessage] = useState<string | null>(null);

  // Diagnostics & Integrity scan states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any[]>([]);
  const [foundDREInBackups, setFoundDREInBackups] = useState<any[]>([]);
  const [restoringSingleItem, setRestoringSingleItem] = useState<string | null>(null);

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

  const fetchBackupsList = async () => {
    setBackupsLoading(true);
    try {
      const list = await BackupService.fetchBackupsList();
      setBackupsList(list);
    } catch (err) {
      console.error("Error loading backups:", err);
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleCreateManualBackup = async () => {
    if (!user) return;
    setIsCreatingBackup(true);
    try {
      const bkp = await BackupService.createBackup(user.username, 'manual');
      toastSuccess(`Backup de segurança '${bkp.backupId}' criado com sucesso!`);
      await fetchBackupsList();
      await fetchLogsData();
    } catch (err) {
      console.error(err);
      toastError("Falha crítica ao gerar o backup no Firestore.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!user) return;
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o backup '${backupId}'?`)) return;
    try {
      await BackupService.deleteBackup(backupId, user.username);
      toastSuccess(`Backup '${backupId}' excluído.`);
      await fetchBackupsList();
      await fetchLogsData();
    } catch (err) {
      console.error(err);
      toastError("Não foi possível excluir o backup.");
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      toastWarning("Baixando payload do backup selecionado...");
      const bkp = await BackupService.getBackupById(backupId);
      if (!bkp) {
        toastError("Arquivo de backup não localizado no Firestore.");
        return;
      }
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(bkp, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `GRUPO_AZEVEDO_BACKUP_${backupId}_${new Date(bkp.timestamp).toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toastSuccess("Download do arquivo de backup concluído com sucesso!");
    } catch (err) {
      console.error("Erro no download de backup:", err);
      toastError("Erro ao processar download do backup.");
    }
  };

  const handleRestoreFromSnapshot = async (backup: any) => {
    if (!user) return;
    setIsRestoring(true);
    try {
      let fullBackup = backup;
      if (!backup.payload) {
        const fetched = await BackupService.getBackupById(backup.backupId);
        if (!fetched) {
          toastError("O backup selecionado não existe mais no banco de dados.");
          setIsRestoring(false);
          setShowRestoreConfirm(null);
          return;
        }
        fullBackup = fetched;
      }

      await BackupService.restoreBackup(fullBackup, user.username);
      toastSuccess("Restauração de sistema bem sucedida! Toda a base de dados foi revertida ao checkpoint.");
      setShowRestoreConfirm(null);
      await fetchLogsData();
    } catch (err) {
      console.error("Erro na restauração:", err);
      toastError("Falha grave na restauração dos documentos. Verifique os consoles.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  const processBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.backupId || !parsed.timestamp || !parsed.payload) {
          setUploadError('Formato de backup inválido. Chaves essenciais ausentes.');
          return;
        }
        setShowRestoreConfirm(parsed);
      } catch (err) {
        setUploadError('Erro ao processar o arquivo de backup. Certifique-se de carregar um arquivo .json válido.');
      }
    };
    reader.readAsText(file);
  };

  const runDeepScan = async () => {
    setScanning(true);
    try {
      const storeIds = ['1', '2', '3'];
      const results: any[] = [];
      const missingPeriods: { storeId: string; periodId: string }[] = [];

      for (const sId of storeIds) {
        const storeSnap = await getDocs(collection(db, 'stores', sId, 'dre_periods'));
        const docs = storeSnap.docs.map(docSnap => ({
          id: docSnap.id,
          data: docSnap.data()
        }));

        const yearsToCheck = ['2026', '2025'];
        const monthsToCheck = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

        const periodsStatus: any = {};
        for (const y of yearsToCheck) {
          periodsStatus[y] = {};
          for (const m of monthsToCheck) {
            const pid = `${y}-${m}`;
            const matchedDoc = docs.find(d => d.id === pid);
            if (matchedDoc) {
              const fat = matchedDoc.data.faturamento ?? 0;
              const updatedAt = matchedDoc.data.updatedAt;
              let updatedAtString = 'N/A';
              if (updatedAt) {
                try {
                  updatedAtString = updatedAt.toDate().toLocaleString('pt-BR');
                } catch {
                  try {
                    updatedAtString = new Date(updatedAt).toLocaleString('pt-BR');
                  } catch {}
                }
              }
              if (fat > 0) {
                periodsStatus[y][m] = { status: 'ONLINE', faturamento: fat, updatedAt: updatedAtString };
              } else {
                periodsStatus[y][m] = { status: 'EMPTY_STRUCTURE', faturamento: fat, updatedAt: updatedAtString };
                missingPeriods.push({ storeId: sId, periodId: pid });
              }
            } else {
              periodsStatus[y][m] = { status: 'MISSING' };
              missingPeriods.push({ storeId: sId, periodId: pid });
            }
          }
        }

        results.push({
          storeId: sId,
          storeName: sId === '1' ? 'Bebelu Mossoró' : sId === '2' ? 'Bebelu Riomar Papicu' : '4 Estylos Mossoró',
          periodsStatus
        });
      }

      setScanResult(results);

      toastWarning("Iniciando varredura analítica de checkpoints salvos...");
      const bkpList = await BackupService.fetchBackupsList();
      const recoverablePeriods: any[] = [];

      for (const bkpBrief of bkpList) {
        const fullBkp = await BackupService.getBackupById(bkpBrief.backupId);
        if (!fullBkp?.payload?.subcollections) continue;

        for (const { storeId, periodId } of missingPeriods) {
          const dreList = fullBkp.payload.subcollections[storeId]?.dre_periods || [];
          const matchedBackupDRE = dreList.find((d: any) => d.id === periodId);
          if (matchedBackupDRE && (matchedBackupDRE.faturamento > 0)) {
            recoverablePeriods.push({
              backupId: bkpBrief.backupId,
              backupType: bkpBrief.type,
              backupDate: bkpBrief.timestamp,
              createdBy: bkpBrief.createdBy,
              storeId,
              storeName: storeId === '1' ? 'Bebelu Mossoró' : storeId === '2' ? 'Bebelu Riomar Papicu' : '4 Estylos Mossoró',
              periodId,
              faturamento: matchedBackupDRE.faturamento,
              payload: matchedBackupDRE
            });
          }
        }
      }

      setFoundDREInBackups(recoverablePeriods);
      if (recoverablePeriods.length > 0) {
        toastSuccess(`Deep Scan concluído! Foram localizados ${recoverablePeriods.length} registros DRE históricos recuperáveis.`);
      } else {
        toastSuccess("Varredura concluída. Nenhum registro ausente ou inconsistente localizado.");
      }
    } catch (err) {
      console.error(err);
      toastError("Erro ao processar varredura de integridade do bkp.");
    } finally {
      setScanning(false);
    }
  };

  const handleRestoreSingleDRE = async (backupId: string, storeId: string, periodId: string) => {
    if (!user) return;
    const key = `${backupId}-${storeId}-${periodId}`;
    setRestoringSingleItem(key);
    try {
      const fullBkp = await BackupService.getBackupById(backupId);
      if (!fullBkp) {
        toastError("Backup não localizado no banco de dados.");
        return;
      }
      const dreList = fullBkp.payload?.subcollections?.[storeId]?.dre_periods || [];
      const targetDre = dreList.find((d: any) => d.id === periodId);
      if (!targetDre) {
        toastError("O registro especificado não existe neste snapshot.");
        return;
      }

      const { id, ...data } = targetDre;
      const docRef = doc(db, 'stores', storeId, 'dre_periods', periodId);
      await setDoc(docRef, {
        ...BackupService.sanitizeData(data),
        updatedAt: new Date()
      });

      await AuditService.logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'SYSTEM_RESTORE',
        description: `RECUPERAÇÃO ISOLADA: Restaurou isoladamente o período '${periodId}' da loja '${storeId}' a partir do backup '${backupId}'. Faturamento recuperado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.faturamento)}.`,
        storeCode: 'ROOT',
        storeName: 'Central de Segurança'
      });

      toastSuccess(`DRE ${periodId} restaurado com absoluto sucesso para a loja seleccionada!`);
      runDeepScan();
    } catch (err) {
      console.error(err);
      toastError("Falha crítica ao restaurar document de forma isolada.");
    } finally {
      setRestoringSingleItem(null);
    }
  };

  useEffect(() => {
    fetchLogsData();
  }, []);

  // Automatic backup check hook
  useEffect(() => {
    if (user?.username === 'adm' && activeTab === 'backups') {
      const runAutoBackupCheck = async () => {
        setBackupsLoading(true);
        try {
          const list = await BackupService.fetchBackupsList();
          setBackupsList(list);
          
          let needsAuto = false;
          const lastBkp = list[0]; // sorted by newest first
          if (!lastBkp) {
            needsAuto = true;
          } else {
            const lastTime = new Date(lastBkp.timestamp).getTime();
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (Date.now() - lastTime > oneDayMs) {
              needsAuto = true;
            }
          }

          if (needsAuto) {
            console.log("Automatic daily backup triggered in background...");
            setAutoBackupMessage("Automatização: Gerando backup de segurança automático nas nuvens...");
            const newAuto = await BackupService.createBackup(user.username, 'auto');
            const updatedList = await BackupService.fetchBackupsList();
            setBackupsList(updatedList);
            setAutoBackupMessage(`Backup automático '${newAuto.backupId}' gerado com sucesso às ${new Date().toLocaleTimeString('pt-BR')}!`);
            fetchLogsData();
          }
        } catch (err) {
          console.error("Erro no backup automático:", err);
        } finally {
          setBackupsLoading(false);
        }
      };
      runAutoBackupCheck();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user && user.username !== 'adm') {
      AuditService.logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'SECURITY_BREACH_ATTEMPT',
        description: `TENTATIVA RESTRITA DE ACESSO: O usuário '${user.name}' tentou acessar o painel restrito de auditoria de segurança da informação sem permissão.`,
        storeCode: 'SEC-WARN',
        storeName: 'Painel de Auditoria'
      }).catch(err => console.error(err));
    }
  }, [user]);

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
      case 'PAGE_VIEW':
        return 'bg-amber-500/15 text-[#FFCB05] border border-[#FFCB05]/25';
      case 'DRE_SAVE':
        return 'bg-amber-500/15 text-[#FFCB05] border border-[#FFCB05]/30 font-bold';
      case 'DRE_DELETE':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black';
      case 'CMV_SAVE':
        return 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold';
      case 'CHECKLIST_DELETE':
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 'SECURITY_BREACH_ATTEMPT':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse font-black';
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

  const recentSecurityEvents = React.useMemo(() => {
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    return logs.filter(log => {
      const isSecurityEvent = log.action === 'SECURITY_BREACH_ATTEMPT' || log.action === 'UNAUTHORIZED_ACCESS';
      if (!isSecurityEvent) return false;
      const logDate = new Date(log.timestamp);
      return logDate >= fortyEightHoursAgo;
    });
  }, [logs]);

  const simulateSecurityEvent = async (type: 'BREACH' | 'UNAUTHORIZED') => {
    if (!user) return;
    try {
      if (type === 'BREACH') {
        await AuditService.logAction({
          userId: 'IP-SIM-ATTACK',
          userName: 'Simulated Attacker Bot',
          userRole: 'NONE',
          action: 'SECURITY_BREACH_ATTEMPT',
          description: 'SIMULAÇÃO CENTRAL: Padrão repetido de varredura/exploração (Port Scan) detectado em logs de integração.',
          storeCode: 'ROOT',
          storeName: 'Central de Segurança'
        });
        toastSuccess('Tentativa de invasão simulada gravada com sucesso!');
      } else {
        await AuditService.logAction({
          userId: 'IP-SIM-UNAUTH',
          userName: 'Simulated Guest (Sem Permissão)',
          userRole: 'NONE',
          action: 'UNAUTHORIZED_ACCESS',
          description: 'SIMULAÇÃO CENTRAL: Tentativa de leitura forçada de logs de pagamento e DRE sem credenciais válidas.',
          storeCode: 'ROOT',
          storeName: 'Central de Segurança'
        });
        toastSuccess('Acesso não autorizado simulado gravado com sucesso!');
      }
      await fetchLogsData();
    } catch (err) {
      console.error(err);
      toastError('Falha ao gravar evento simulado.');
    }
  };

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

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'logs':
        return {
          title: 'LOGS DE ACESSO E ATIVIDADES',
          description: 'Histórico de ações administrativas e acessos em tempo real',
          icon: <Shield className="w-7 h-7 text-indigo-500" />
        };
      case 'security':
        return {
          title: 'RESUMO E CENTRAL DE SEGURANÇA',
          description: 'Incidentes de segurança e tentativas de acessos não autorizados recentes',
          icon: <Lock className="w-7 h-7 text-rose-500" />
        };
      case 'backups':
        return {
          title: 'CENTRAL DE BACKUPS E RESILIÊNCIA',
          description: 'Gestão de pontos de restauração e cópias de dados corporativas',
          icon: <Database className="w-7 h-7 text-emerald-500" />
        };
      case 'diagnostics':
        return {
          title: 'INTEGRIDADE E VARREDURA (DEEP DIAGNOSIS)',
          description: 'Auditoria de integridade estrutural e conformidade heurística dos dados',
          icon: <Activity className="w-7 h-7 text-amber-500" />
        };
      default:
        return {
          title: 'CENTRAL DE AUDITORIA',
          description: 'Auditoria corporativa e segurança heurística',
          icon: <Shield className="w-7 h-7 text-indigo-505 text-indigo-500" />
        };
    }
  };
  const headerInfo = getHeaderInfo();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            {headerInfo.icon} {headerInfo.title}
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
            {headerInfo.description}
          </p>
        </div>
        
        {activeTab === 'logs' ? (
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button 
              onClick={fetchLogsData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-[#333] hover:border-slate-700 text-sm font-bold text-slate-300 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar Logs
            </button>
          </div>
        ) : activeTab === 'backups' ? (
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button 
              onClick={fetchBackupsList}
              disabled={backupsLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-[#333] hover:border-slate-700 text-sm font-bold text-slate-300 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${backupsLoading ? 'animate-spin' : ''}`} />
              Atualizar Inventário
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button 
              onClick={runDeepScan}
              disabled={scanning}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 hover:scale-[1.02] text-sm font-bold text-white flex items-center gap-2 transition duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              Varrer Banco Agora (Deep Scan)
            </button>
          </div>
        )}
      </div>

      {recentSecurityEvents.length > 0 && activeTab !== 'security' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-955/20 border border-red-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 duration-1000"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">ALERTA CRÍTICO DA CENTRAL DE SEGURANÇA</h4>
              <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                Detectamos <strong className="text-red-400 text-xs font-black">{recentSecurityEvents.length}</strong> tentativa(s) de invasão ou acesso não autorizado nas últimas 48 horas!
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/security-summary')}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black text-white transition self-start sm:self-auto uppercase tracking-wider animate-pulse"
          >
            Investigar Brecha
          </button>
        </motion.div>
      )}

      {/* Tab Selector Navigation Switcher */}
      {!forcedTab && (
        <div className="flex flex-row flex-nowrap border-b border-[#222] gap-1.5 sm:gap-4 pb-1 overflow-x-auto scrollbar-none snap-x w-full">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 font-black uppercase italic text-[11px] sm:text-xs tracking-wider border-b-2 transition-all shrink-0 snap-center whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Logs de Atividades
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 font-black uppercase italic text-[11px] sm:text-xs tracking-wider border-b-2 transition-all relative shrink-0 snap-center whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-rose-500 text-rose-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {recentSecurityEvents.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            Resumo de Segurança
            {recentSecurityEvents.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-black leading-none rounded-full bg-red-600 text-white animate-pulse">
                {recentSecurityEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 font-black uppercase italic text-[11px] sm:text-xs tracking-wider border-b-2 transition-all shrink-0 snap-center whitespace-nowrap ${
              activeTab === 'backups'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            Backups e Rollbacks
          </button>
          <button
            onClick={() => {
              setActiveTab('diagnostics');
              if (scanResult.length === 0) runDeepScan();
            }}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 font-black uppercase italic text-[11px] sm:text-xs tracking-wider border-b-2 transition-all shrink-0 snap-center whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            Varredura e Integridade (Deep Diagnosis)
          </button>
        </div>
      )}

      {activeTab === 'logs' && (
        <>
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
                <option value="SECURITY_BREACH_ATTEMPT">Atividade/Brecha Suspeita de Segurança</option>
                <option value="PAGE_VIEW">Navegação de Módulos (Visualização)</option>
                <option value="DRE_SAVE">Salvar DRE</option>
                <option value="DRE_DELETE">Exclusão de DRE/CMV</option>
                <option value="CMV_SAVE">Salvar CMV/Estoque</option>
                <option value="CHECKLIST_DELETE">Exclusão de Checklist</option>
                <option value="SYSTEM_AUTO_BACKUP">Backup Automático do Sistema</option>
                <option value="SYSTEM_MANUAL_BACKUP">Backup Manual do Sistema</option>
                <option value="SYSTEM_RESTORE">Restauração Geral (Rollback)</option>
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
        </>
      )}

      {activeTab === 'backups' && (
        /* BACKUP & RESTORE TAB INTERFACE */
        <div className="space-y-6">
          
          {/* Automatic Routine Notification Banner */}
          {autoBackupMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
                <span>{autoBackupMessage}</span>
              </div>
              <button 
                onClick={() => setAutoBackupMessage(null)}
                className="text-emerald-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Intro Information Header */}
          <div className="bg-gradient-to-r from-blue-950/20 via-black to-slate-900/10 border border-[#222] rounded-2xl p-6">
            <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-400" /> SEGURANÇA RESILIENTE NAS NUVENS COGNITIVAS
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 max-w-4xl">
              Este módulo permite salvaguardar integralmente o banco de dados do Firestore. Você pode gerar snapshots sob demanda, 
              baixar cópias físicas em formato JSON e reverter falhas acidentais operando rollbacks estruturais em tempo recorde.
              <span className="text-[#FFCB05] font-bold block mt-1">O sistema executa backups rotineiros automáticos em background a cada 24 horas.</span>
            </p>
          </div>

          {/* Interactive Trigger Boxes Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Box A - Instant Snapshot */}
            <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-4 h-4" /> Gerar Checkpoint Sob Demanda
                </h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                  Varre todas as coleções do Firestore (Metas, DREs, CMVs, usuários, submissões de checklists de lojas, e planejamentos operacionais) e persiste o snapshot.
                </p>
              </div>
              <div>
                <button
                  onClick={handleCreateManualBackup}
                  disabled={isCreatingBackup || backupsLoading}
                  style={!(isCreatingBackup || backupsLoading) ? {
                    backgroundColor: themeButtonBg,
                    color: themeTextContrast,
                    boxShadow: `0 10px 15px -3px ${themeButtonBg}30`,
                  } : {}}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition hover:brightness-110 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 duration-200 ${
                    (isCreatingBackup || backupsLoading) ? '' : 'text-white shadow-md'
                  }`}
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Capturando Estado...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Criar Backup Manual Agora
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Box B - Import JSON Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col justify-between space-y-4 transition-colors duration-200 ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-950/20' 
                  : 'border-[#222] bg-[#111]'
              }`}
            >
              <div>
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <FileUp className="w-4 h-4" /> Restaurar Via Importação de Arquivo
                </h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                  Arraste e solte o arquivo de backup local (.json) ou clique para restaurar dados exportados fisicamente de outro checkpoint.
                </p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="backup-file-upload"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="backup-file-upload"
                  className="w-full py-3 px-4 border border-[#333] hover:border-slate-600 rounded-xl bg-black text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition duration-300"
                >
                  <Upload className="w-4 h-4 text-emerald-500" />
                  {dragActive ? 'Solte o arquivo aqui...' : 'Selecionar Arquivo de Backup'}
                </label>
              </div>

              {uploadError && (
                <div className="text-[10px] text-red-400 font-bold leading-none select-none">
                  ⚠️ {uploadError}
                </div>
              )}
            </div>

          </div>

          {/* Backup Registry Inventory */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Histórico de Checkpoints do Banco (Cloud Inventory)
            </h4>

            {backupsLoading ? (
              <div className="bg-[#111] border border-[#222] rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Sincronizando registros do Cloud Storage...</div>
              </div>
            ) : backupsList.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-2xl p-16 text-center text-slate-500">
                <Database className="w-8 h-8 text-[#333] mx-auto mb-2" />
                <p className="text-xs font-bold leading-none">Nenhum snapshot de segurança localizado.</p>
                <p className="text-[10px] text-slate-600 mt-1.5">Clique em "Criar Backup Manual Agora" para gerar o primeiro checkpoint.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {backupsList.map((bk) => (
                  <div 
                    key={bk.backupId} 
                    className="bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#333] transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs text-white font-black flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-500" /> {bk.backupId}
                        </span>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                          bk.type === 'auto' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {bk.type === 'auto' ? 'Automático' : 'Manual'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-400 font-semibold">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>Data: {new Date(bk.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>Gerado por: <strong className="text-slate-300">{bk.createdBy}</strong></span>
                        </div>
                      </div>

                      {/* Diagnostic Breakdown */}
                      <div className="mt-4 bg-black/60 p-3 rounded-xl border border-[#222] grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                        <div>
                          <div className="text-slate-500 text-[8px] uppercase tracking-wider mb-0.5">Usuários</div>
                          <div className="text-white font-mono">{bk.summary.usersCount}</div>
                        </div>
                        <div>
                          <div className="text-indigo-400 text-[8px] uppercase tracking-wider mb-0.5">DREs</div>
                          <div className="text-indigo-400 font-mono">{bk.summary.dreCount}</div>
                        </div>
                        <div>
                          <div className="text-teal-400 text-[8px] uppercase tracking-wider mb-0.5">CMV Lojas</div>
                          <div className="text-teal-400 font-mono">{bk.summary.cmvCount}</div>
                        </div>
                        <div className="col-span-3 pt-1.5 mt-1 border-t border-[#1e1e1e] flex justify-around text-slate-400">
                          <div>
                            Checklists: <strong className="text-slate-200 font-mono">{bk.summary.submissionsCount}</strong>
                          </div>
                          <div>
                            Ações Corretivas: <strong className="text-slate-200 font-mono">{bk.summary.plansCount}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Checkpoint row buttons actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e1e1e]/60">
                      <button
                        onClick={() => setShowRestoreConfirm(bk)}
                        className="py-2 px-1 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-500/20 text-blue-300 hover:text-white transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 animate-pulse" />
                        Restaurar
                      </button>

                      <button
                        onClick={() => handleDownloadBackup(bk.backupId)}
                        className="py-2 px-1 rounded-xl bg-black hover:bg-slate-800 border border-[#222] text-slate-300 hover:text-white transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>

                      <button
                        onClick={() => handleDeleteBackup(bk.backupId)}
                        className="py-2 px-1 rounded-xl bg-rose-955/20 hover:bg-rose-900/30 border border-rose-500/10 text-rose-400 hover:text-rose-200 transition text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Deletar
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Security Status Dashboard */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left/Main Column - Status Card & Security List */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Threat Level status badge */}
              <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                recentSecurityEvents.length === 0
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                  : recentSecurityEvents.length <= 3
                  ? 'bg-amber-955/20 border-amber-500/30 text-amber-500 animate-pulse'
                  : 'bg-red-955/20 border-red-500/40 text-red-400 animate-pulse'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    recentSecurityEvents.length === 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : recentSecurityEvents.length <= 3
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {recentSecurityEvents.length === 0 ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 animate-bounce" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-0.5">Diagnóstico de Ameaça Recente (48h)</span>
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      Nível de Alerta: {' '}
                      <span className={
                        recentSecurityEvents.length === 0 
                          ? 'text-emerald-400' 
                          : recentSecurityEvents.length <= 3 
                          ? 'text-amber-400' 
                          : 'text-rose-500 font-bold'
                      }>
                        {recentSecurityEvents.length === 0 
                          ? 'Mínimo (Seguro)' 
                          : recentSecurityEvents.length <= 3 
                          ? 'Moderado (Atenção)' 
                          : 'Crítico (Alto Risco)'
                        }
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
                      {recentSecurityEvents.length === 0
                        ? 'Nenhuma brecha de segurança ou tentativa de acesso não autorizado detectada nas últimas 48 horas.'
                        : `Mapeamos ${recentSecurityEvents.length} incidente(s) de segurança nas últimas 48 horas. Verifique os relatórios forenses abaixo.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Incidents timeline lists */}
              <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#222] mb-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-500 animate-pulse" /> Histórico de Alertas Recentes (Últimas 48h)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] text-slate-400 font-mono font-bold uppercase tracking-wider border border-[#222]">
                    {recentSecurityEvents.length} Ocorrências
                  </span>
                </div>

                {recentSecurityEvents.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white uppercase">Nenhum incidente de segurança</h5>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        O monitoramento heurístico do Firebase está ativo. Tentativas de invasão, tentativas de login malsucedidas de IPs bloqueados e acessos de rotas desautorizadas serão mostradas aqui instantaneamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSecurityEvents.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-5 rounded-2xl border transition duration-300 relative overflow-hidden group ${
                          log.action === 'SECURITY_BREACH_ATTEMPT'
                            ? 'bg-red-950/10 border-red-500/20 hover:border-red-500/30'
                            : 'bg-amber-955/10 border-amber-500/20 hover:border-amber-500/30'
                        }`}
                      >
                        {/* Status bar highlighting threat type */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                          log.action === 'SECURITY_BREACH_ATTEMPT' ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
                        }`} />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${
                                log.action === 'SECURITY_BREACH_ATTEMPT'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              }`}>
                                {log.action}
                              </span>
                              
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 font-bold">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <p className="text-white text-xs font-semibold leading-relaxed">
                              {log.description}
                            </p>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-slate-400 font-semibold uppercase">
                              <div>IP: <span className="font-mono text-slate-300 font-bold">{log.ipAddress || 'Não resolvido'}</span></div>
                              {log.userName && <div>Usuário: <span className="text-slate-300 font-bold">{log.userName} ({log.userRole})</span></div>}
                              {log.storeCode !== 'N/A' && <div>Store: <span className="text-[#FFCB05] font-mono font-bold">{log.storeCode} - {log.storeName}</span></div>}
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedLog(log)}
                            className="shrink-0 p-2 text-slate-400 hover:text-white border border-[#222] bg-[#0c0c0c] hover:bg-[#1a1a1a] rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-auto hover:scale-[1.02]"
                          >
                            <Terminal className="w-3.5 h-3.5 text-[#FFCB05]" />
                            Forense
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Simulator Box & Guides */}
            <div className="space-y-6">
              
              {/* Simulator Card block */}
              <div className="bg-gradient-to-b from-[#111] to-black border border-[#222] p-6 rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-black text-[#FFCB05] uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-500" /> Console de Simulação de Riscos
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                    Como administrador geral, você pode usar este sandbox para simular eventos de segurança reais direto no Firebase. Isso injeta logs imediatos e valida visualmente o comportamento dos relatórios.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => simulateSecurityEvent('BREACH')}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/45 border border-red-500/20 hover:border-red-500/40 text-red-300 hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                    Simular Tentativa de Invasão (Breach)
                  </button>

                  <button
                    onClick={() => simulateSecurityEvent('UNAUTHORIZED')}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-950/20 hover:bg-amber-900/35 border border-amber-500/20 hover:border-amber-500/40 text-amber-300 hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Simular Acesso Não Autorizado
                  </button>
                </div>
              </div>

              {/* Security Recommendations Guidelines Card */}
              <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" /> Cartilha de Segurança de TI
                </h4>
                
                <div className="space-y-4 text-[11px] text-slate-400 font-semibold leading-relaxed">
                  <div className="border-l-2 border-indigo-500 pl-3">
                    <h5 className="font-bold text-slate-200 uppercase text-[10px]">Proteção da Credencial 'adm'</h5>
                    <p className="mt-0.5 text-slate-400">As credenciais com nível de acesso ROOT devem possuir chaves RSA fortes e rotação periódica das senhas no Google Firebase Auth.</p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h5 className="font-bold text-slate-200 uppercase text-[10px]">Restrições de IP Geográfico</h5>
                    <p className="mt-0.5 text-slate-400">Dispositivos externos que tentem transacionar ou alterar valores do CMV em canais desautorizados são marcados automaticamente em tempo real.</p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <h5 className="font-bold text-slate-200 uppercase text-[10px]">Auditoria Forense Ativa</h5>
                    <p className="mt-0.5 text-slate-400">Sempre que um alerta for gerado (indicador vermelho piscando no painel), inspecione os metadados brutos (User Agent, IPs, etc.) e as rotinas executadas para resguardar a integridade corporativa.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Diagnostic overview banner */}
          <div className="bg-gradient-to-r from-amber-950/20 via-black to-slate-900/10 border border-amber-500/20 rounded-2xl p-6">
            <h3 className="text-base font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500 animate-pulse" /> DIAGNÓSTICO PROFUNDO & RASTREAMENTO DE INTEGRIDADE
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 max-w-4xl">
              Análise ativa da presença física de lançamentos de DRE e CMV diretamente nas coleções do Firestore. 
              Esta ferramenta localiza automaticamente estados inconsistentes, faturamentos zerados e permite a 
              <strong className="text-amber-400"> restauração cirúrgica isolada</strong> de arquivos apagados a partir de payloads de segurança históricos, sem sobrescrever o banco de dados atual.
            </p>
          </div>

          {/* If scanResult is empty (scanning is false) */}
          {scanResult.length === 0 && !scanning && (
            <div className="bg-[#111] border border-[#222] p-10 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
              <Database className="w-12 h-12 text-slate-600 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Varredura Pendente</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Execute o Deep Scan para ler a estrutura completa de documentos e carregar o mapa de integridade de faturamentos de todas as unidades.
                </p>
              </div>
              <button
                onClick={runDeepScan}
                className="py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Iniciar Varredura Agora
              </button>
            </div>
          )}

          {scanning && (
            <div className="bg-[#111] border border-[#222] p-20 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
              <div>
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">Inspecionando os nós do Firestore...</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  Varrendo coleções 'dre_periods' e subcoleções de lojas, e analisando retroativamente payloads de backups no Firebase.
                </p>
              </div>
            </div>
          )}

          {scanResult.length > 0 && !scanning && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Store matrices column-span 2 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#111] border border-[#222] p-6 rounded-2xl">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" /> Mapa de Presença e Status de DRE (2025 - 2026)
                  </h4>

                  <div className="space-y-8">
                    {scanResult.map((store) => (
                      <div key={store.storeId} className="border-b border-[#222] last:border-b-0 pb-6 last:pb-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-white shrink-0">{store.storeName}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Código: ST-{store.storeId}</span>
                        </div>

                        {/* List of years */}
                        {['2026', '2025'].map(year => (
                          <div key={year} className="space-y-2">
                            <div className="text-[10px] font-bold text-slate-400">{year}</div>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {Object.entries(store.periodsStatus[year] || {}).map(([month, meta]: any) => {
                                const monthLabelMap: any = {
                                  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
                                  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
                                };
                                const isOnline = meta.status === 'ONLINE';
                                const isEmpty = meta.status === 'EMPTY_STRUCTURE';
                                const isMissing = meta.status === 'MISSING';

                                return (
                                  <div 
                                    key={month}
                                    className={`p-2 rounded-xl text-center border relative group select-none transition ${
                                      isOnline
                                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40'
                                        : isEmpty
                                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 hover:border-amber-500/50 animate-pulse'
                                        : 'bg-[#080808] border-red-500/10 text-slate-600 hover:border-red-500/20'
                                    }`}
                                  >
                                    <div className="text-[10px] font-black">{monthLabelMap[month]}</div>
                                    <div className="text-[8px] font-mono font-bold tracking-tighter mt-1 truncate leading-none">
                                      {isOnline && (
                                        <span>R$ {(meta.faturamento / 1000).toFixed(0)}k</span>
                                      )}
                                      {isEmpty && (
                                        <span className="text-amber-500 font-black">ZERADO</span>
                                      )}
                                      {isMissing && (
                                        <span className="text-red-500">AUSENTE</span>
                                      )}
                                    </div>

                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black border border-[#333] p-2.5 rounded-lg text-[9px] text-[#ccc] whitespace-nowrap z-50 shadow-2xl space-y-1">
                                      <div className="font-bold text-white uppercase text-center">{monthLabelMap[month]}/{year}</div>
                                      <div>Status: <span className="font-bold">{meta.status}</span></div>
                                      {isOnline && (
                                        <div>Receita: <span className="font-mono text-emerald-400 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta.faturamento)}</span></div>
                                      )}
                                      {meta.updatedAt && (
                                        <div>Atualizado em: <span className="font-mono">{meta.updatedAt}</span></div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit trail regarding DRE actions specifically */}
                <div className="bg-[#111] border border-[#222] p-6 rounded-2xl">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> Histórico Forense de Modificações do DRE
                  </h4>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs.filter(l => l.action === 'DRE_SAVE' || l.action === 'DRE_DELETE' || l.action === 'SYSTEM_RESTORE' || l.action === 'DRE_SAVE').slice(0, 15).map((log) => (
                      <div key={log.id} className="bg-black/50 border border-[#222] p-3 rounded-xl flex items-start gap-3 text-xs justify-between hover:border-slate-800 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[8px] font-black tracking-wider rounded uppercase ${
                              log.action === 'DRE_DELETE' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                              log.action === 'SYSTEM_RESTORE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-slate-300 font-medium pr-10">{log.description}</p>
                        </div>
                        <div className="text-right shrink-0 text-[10px] text-slate-500 font-bold">
                          <div>{log.userName}</div>
                          <div className="text-[8px] font-mono">{log.ipAddress || 'IP local'}</div>
                        </div>
                      </div>
                    ))}
                    {logs.filter(l => l.action === 'DRE_SAVE' || l.action === 'DRE_DELETE' || l.action === 'SYSTEM_RESTORE').length === 0 && (
                      <div className="text-center p-8 text-slate-600 font-bold">Nenhum evento de DRE registrado na fita de auditoria recente.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recovery Suggestions Harvester Sidebar */}
              <div className="space-y-6">
                <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex flex-col space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Archive className="w-4 h-4 text-amber-400 animate-bounce shrink-0" /> Restauração Cirúrgica de DREs
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1.5">
                      O detector analisou detalhadamente o payload de cada snapshot de backup e localizou os seguintes registros saudáveis de DREs perdidas.
                      Clique para restaurar apenas este mês para a unidade especificada de forma isolada e segura.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {foundDREInBackups.map((item, idx) => {
                      const itemKey = `${item.backupId}-${item.storeId}-${item.periodId}`;
                      const isWorking = restoringSingleItem === itemKey;

                      const [y, m] = item.periodId.split('-');
                      const monthsNames: any = {
                        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
                        '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
                      };
                      const monthStr = monthsNames[m] || m;

                      return (
                        <div key={idx} className="bg-black border border-[#222] p-4 rounded-xl space-y-3 hover:border-amber-500/20 transition duration-300">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white uppercase italic">{item.storeName}</span>
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-bold">{monthStr} / {y}</span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-500">Faturamento no Backup:</span>
                              <strong className="text-emerald-400 font-mono">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.faturamento)}
                              </strong>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-500">Origem Backup ID:</span>
                              <strong className="text-slate-300 font-mono underline">{item.backupId}</strong>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-500">Data de Geração:</span>
                              <span className="text-slate-400 font-mono">{new Date(item.backupDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRestoreSingleDRE(item.backupId, item.storeId, item.periodId)}
                            disabled={restoringSingleItem !== null}
                            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition duration-200 disabled:opacity-40 shadow-md"
                          >
                            {isWorking ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Recuperando Período...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restaurar Apenas Este Período
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}

                    {foundDREInBackups.length === 0 && (
                      <div className="text-center py-12 px-4 border border-[#222] border-dashed rounded-xl space-y-2">
                        <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto" />
                        <div className="text-[11px] font-bold text-slate-500">Nenhum registro individual recuperável localizado</div>
                        <p className="text-[9px] text-[#444] leading-relaxed">
                          Não foram localizados snapshots nos backups salvos contendo dados preenchidos de faturamento para os períodos identificados como vazios ou inexistentes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Database Rollback / Restoration Confirmation Modal overlay */}
      <AnimatePresence>
        {showRestoreConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#080808] border-2 border-red-500/20 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-[#222] flex items-center justify-between bg-red-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <h3 className="text-sm font-black uppercase text-red-400 tracking-wider">Atenção: Sobrescrita de Dados</h3>
                </div>
                <button 
                  onClick={() => setShowRestoreConfirm(null)}
                  disabled={isRestoring}
                  className="p-1 rounded-lg hover:bg-red-900/10 text-slate-400 hover:text-white transition disabled:opacity-30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="border border-red-500/20 bg-red-950/10 p-4 rounded-xl text-xs text-red-300 font-bold leading-relaxed">
                  Esta ação é irreversível e substituirá integralmente os registros atuais no Firestore para refletir 
                  exatamente os dados salvos no checkpoint <strong className="text-white underline font-mono">{showRestoreConfirm.backupId}</strong>.
                </div>

                <div className="bg-black/40 p-4 rounded-xl border border-[#222] space-y-2 text-xs">
                  <div className="text-slate-400 uppercase tracking-widest font-bold text-[9px] mb-1">Resumo das Modificações:</div>
                  <div className="flex justify-between border-b border-[#111] pb-1.5 font-semibold">
                    <span className="text-slate-500">Usuários Restaurados:</span>
                    <strong className="text-white font-mono">{showRestoreConfirm.summary?.usersCount ?? showRestoreConfirm.payload?.users?.length ?? 0}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#111] pb-1.5 font-semibold">
                    <span className="text-indigo-400">Total DREs a Importar:</span>
                    <strong className="text-indigo-400 font-mono">{showRestoreConfirm.summary?.dreCount ?? 0}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#111] pb-1.5 font-semibold">
                    <span className="text-teal-400">Lançamentos de CMV:</span>
                    <strong className="text-teal-400 font-mono">{showRestoreConfirm.summary?.cmvCount ?? 0}</strong>
                  </div>
                  <div className="flex justify-between pb-0.5 font-semibold">
                    <span className="text-slate-400">Checklists Realizados:</span>
                    <strong className="text-white font-mono">{showRestoreConfirm.summary?.submissionsCount ?? 0}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowRestoreConfirm(null)}
                    disabled={isRestoring}
                    className="flex-1 py-3 px-4 border border-[#222] bg-[#111] hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white text-xs font-bold uppercase transition disabled:opacity-30"
                  >
                    Abortar Operação
                  </button>

                  <button
                    onClick={() => handleRestoreFromSnapshot(showRestoreConfirm)}
                    disabled={isRestoring}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Reescrevendo Banco...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        Executar Rollback
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-medium">
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
                  <div className="bg-black/40 p-3 rounded-xl border border-[#1e1e1e] text-slate-400 font-mono text-[11px] leading-relaxed break-all font-semibold">
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
