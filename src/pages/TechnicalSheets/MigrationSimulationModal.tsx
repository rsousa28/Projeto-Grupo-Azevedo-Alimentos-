import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  UtensilsCrossed, 
  Package, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { FoodServiceMigrationService, MigrationDryRunResult } from '../../services/FoodServiceMigrationService';
import { formatarMoedaBRL } from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';

interface MigrationSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

export const MigrationSimulationModal: React.FC<MigrationSimulationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete
}) => {
  const { success, error, info } = useToast();
  const [simulation, setSimulation] = useState<MigrationDryRunResult>(() => 
    FoodServiceMigrationService.runDryRunSimulation()
  );
  const [activeStep, setActiveStep] = useState<'SIMULACAO' | 'CONCLUIDO'>('SIMULACAO');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const res = FoodServiceMigrationService.createBackup(true);
    if (res.success) {
      success('Arquivo JSON de backup baixado com sucesso no seu dispositivo.', 'Backup Concluído');
    } else {
      error('Falha ao exportar backup de segurança.', 'Erro');
    }
  };

  const handleExecuteMigration = () => {
    if (!window.confirm('Deseja realmente executar a migração? Um backup automático será criado previamente e você poderá desfazer a qualquer momento.')) {
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const res = FoodServiceMigrationService.executeMigration();
      setIsProcessing(false);
      if (res.success) {
        success(res.message, 'Migração Concluída');
        setSimulation(FoodServiceMigrationService.runDryRunSimulation());
        setActiveStep('CONCLUIDO');
        if (onMigrationComplete) onMigrationComplete();
      } else {
        error(res.message, 'Erro na Migração');
      }
    }, 400);
  };

  const handleRollback = () => {
    if (!window.confirm('Tem certeza de que deseja desfazer a migração e restaurar os dados anteriores do backup?')) {
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const res = FoodServiceMigrationService.rollbackMigration();
      setIsProcessing(false);
      if (res.success) {
        info(res.message, 'Rollback Executado');
        setSimulation(FoodServiceMigrationService.runDryRunSimulation());
        if (onMigrationComplete) onMigrationComplete();
      } else {
        error(res.message, 'Erro no Rollback');
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#2C2C2C] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2C2C2C] flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
                  Migração Segura & Unificação de Fichas
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  simulation.alreadyMigrated
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  {simulation.alreadyMigrated ? 'Migrado' : 'Modo Simulação (Dry-Run)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Unifica os pares Balcão/iFood, cataloga os insumos e preserva backup completo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Card de Segurança & Backup */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Garantia de Rollback & Backup Automático
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Você pode baixar o arquivo JSON de backup a qualquer momento e reverter qualquer alteração com 1 clique.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="px-3.5 py-2 bg-white dark:bg-[#202020] hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup JSON</span>
            </button>
          </div>

          {/* Métricas do De/Para */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-gray-400">Fichas Legadas</span>
              <div className="text-xl font-black text-gray-700 dark:text-gray-300 font-mono">
                {simulation.totalFichasLegadas}
              </div>
              <span className="text-[10px] text-gray-400">4 Balcão + 4 iFood</span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Pratos Unificados</span>
              <div className="text-xl font-black text-amber-600 font-mono">
                {simulation.totalPratosUnificados}
              </div>
              <span className="text-[10px] text-amber-600">1 card por prato</span>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-gray-400">Sub-Receitas</span>
              <div className="text-xl font-black text-gray-700 dark:text-gray-300 font-mono">
                {simulation.totalSubReceitas}
              </div>
              <span className="text-[10px] text-gray-400">Bases mantidas</span>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Insumos Mestre</span>
              <div className="text-xl font-black text-blue-600 font-mono">
                {simulation.totalInsumosCatalogados}
              </div>
              <span className="text-[10px] text-blue-600">Com FC, IC e Alérgenos</span>
            </div>
          </div>

          {/* Tabela de De/Para (Simulação de Unificação) */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2.5 flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-500" />
              <span>Simulação de Unificação de Pratos (De 2 Fichas Separadas ➔ 1 Ficha com 2 Canais)</span>
            </h4>

            <div className="border border-gray-200 dark:border-[#333] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-[#333] text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Prato Unificado</th>
                    <th className="px-3 py-3">Categoria</th>
                    <th className="px-3 py-3">Custo Insumos Base</th>
                    <th className="px-3 py-3">Preço Balcão</th>
                    <th className="px-3 py-3">Preço iFood</th>
                    <th className="px-4 py-3 text-right">Embalagens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
                  {simulation.paresUnificados.map((par, i) => (
                    <tr key={i} className="hover:bg-amber-500/5 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        {par.pratoNome}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300">
                          {par.categoria}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono font-medium text-gray-600 dark:text-gray-400">
                        {formatarMoedaBRL(par.custoInsumosBase)}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-emerald-600">
                        {formatarMoedaBRL(par.precoBalcao)}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-rose-500">
                        {formatarMoedaBRL(par.precoIfood)}
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] text-gray-500">
                        <span>Balcão: {par.embalagensBalcaoCount} un</span>
                        <span className="mx-1.5">•</span>
                        <span>iFood: {par.embalagensIfoodCount} un</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#2C2C2C] flex items-center justify-between bg-gray-50 dark:bg-[#1A1A1A]">
          <div>
            {simulation.alreadyMigrated && (
              <button
                onClick={handleRollback}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desfazer Migração (Rollback)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl hidden sm:inline-block">
                🔒 Execução definitiva bloqueada até a Fase 3
              </span>
              <button
                disabled={true}
                title="A unificação definitiva será ativada na Fase 3 quando a tela de prato único com abas de canais estiver pronta. Por enquanto, utilize o Backup e a Simulação Dry-Run."
                className="px-4 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center gap-2 opacity-70"
              >
                <Play className="w-4 h-4 text-gray-400" />
                <span>Execução na Fase 3</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
