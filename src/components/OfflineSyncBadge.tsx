import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  CloudUpload, 
  X, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { useSyncManager } from '../hooks/useSyncManager';
import { useStore } from '../contexts/StoreContext';
import { useToast } from '../contexts/ToastContext';

export default function OfflineSyncBadge() {
  const { isDarkMode } = useStore();
  const { success, warning, error: toastError } = useToast();

  const {
    isOnline,
    pendingCount,
    isSyncing,
    pendingItems,
    syncNow,
    refreshPendingItems,
  } = useSyncManager();

  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  const handleManualSync = async () => {
    if (!isOnline) {
      warning('Seu dispositivo está sem conexão com a internet no momento.', 'Sem Conexão');
      return;
    }

    try {
      const { syncedCount, failedCount } = await syncNow();

      if (syncedCount > 0) {
        success(`${syncedCount} checklist(s) sincronizado(s) com a nuvem Firestore com sucesso!`, 'Sincronização Concluída');
      } else if (failedCount > 0) {
        warning(`${failedCount} item(ns) falharam ao enviar. Tente novamente mais tarde.`, 'Falha de Envio');
      } else {
        success('Todos os dados já estão sincronizados!', 'Nuvem Atualizada');
      }
    } catch (err: any) {
      toastError(err.message || 'Erro durante a sincronização local-first.');
    }
  };

  return (
    <div className="relative inline-block">
      {/* Network & IndexedDB Sync Trigger Button */}
      <button
        onClick={() => {
          refreshPendingItems();
          setIsOpenModal(true);
        }}
        title={
          !isOnline
            ? "Você está offline. Salvos no IndexedDB serão enviados ao reconectar."
            : pendingCount > 0
            ? `${pendingCount} item(ns) pendente(s) de sincronização local-first`
            : "Conexão com Firestore e IndexedDB ativos"
        }
        className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider shadow-2xs active:scale-95 ${
          !isOnline
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
            : pendingCount > 0
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300 animate-pulse'
            : isDarkMode
            ? 'bg-[#1E1E1E] border-[#2A2A2A] text-slate-400 hover:text-white'
            : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="italic">Offline</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px]">
                {pendingCount}
              </span>
            )}
          </>
        ) : pendingCount > 0 ? (
          <>
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="italic">{isSyncing ? 'Sincronizando...' : `${pendingCount} Offline`}</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden lg:inline text-[9.5px] text-slate-400 font-bold">Offline-First OK</span>
          </>
        )}
      </button>

      {/* Sync Manager Modal */}
      <AnimatePresence>
        {isOpenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
                isDarkMode ? 'bg-[#181818] border-[#333] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center justify-between ${
                !isOnline
                  ? isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                  : isDarkMode ? 'bg-[#1F1F1F] border-[#282828]' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFCB05] text-[#7F300C] flex items-center justify-center font-black shadow-xs shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tight leading-none">
                      Sincronizador Local-First (IndexedDB)
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
                      Status de Conexão: 
                      {isOnline ? (
                        <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                          ● Online
                        </span>
                      ) : (
                        <span className="text-amber-500 font-extrabold flex items-center gap-1">
                          ● Sem Conexão
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpenModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Explanation Banner */}
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  isDarkMode ? 'bg-[#202020] border-[#303030]' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="font-black uppercase tracking-wider text-[10px] text-slate-500 mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Resiliência Sem Sinal de Rede</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Seu aplicativo salva e valida todos os checklists localmente no banco IndexedDB do próprio dispositivo. Quando você recupera o sinal da internet, os dados são transmitidos automaticamente para a nuvem.
                  </p>
                </div>

                {/* Queue Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Checklists no Guarda-Roupas Offline ({pendingItems.length})
                    </span>
                  </div>

                  {pendingItems.length > 0 ? (
                    <div className="space-y-2">
                      {pendingItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                            isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                              {item.submission.templateTitle}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                              Enviado por: {item.submission.submittedBy} • Conformidade: {item.submission.conformityIndex.toFixed(0)}%
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              item.syncStatus === 'syncing'
                                ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                                : item.syncStatus === 'failed'
                                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            }`}>
                              {item.syncStatus === 'syncing'
                                ? 'Enviando...'
                                : item.syncStatus === 'failed'
                                ? 'Erro ao enviar'
                                : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold italic flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                      <span>Nenhum checklist pendente na fila local. Todos os registros estão em dia na nuvem!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t flex items-center justify-end gap-3 ${
                isDarkMode ? 'border-[#282828] bg-[#1F1F1F]' : 'border-slate-100 bg-slate-50/80'
              }`}>
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                >
                  Fechar
                </button>

                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || pendingItems.length === 0 || !isOnline}
                  className="px-5 py-2.5 rounded-xl bg-[#FFCB05] text-[#7F300C] font-black uppercase tracking-wider text-xs italic flex items-center gap-2 hover:bg-[#F3BD00] transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sincronizar Agora</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
