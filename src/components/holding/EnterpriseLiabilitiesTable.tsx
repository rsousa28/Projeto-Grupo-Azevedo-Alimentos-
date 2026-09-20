import React, { useState, useMemo } from 'react';
import { 
  TreasuryLiability, 
  PendingLiabilityRecord, 
  OverdueLiabilityRecord, 
  SettledLiabilityRecord,
  MoneyUtils, 
  SettleLiabilityPayload 
} from '../../types/treasuryDomain';
import { LiabilityStatusBadge } from './LiabilityStatusBadge';
import { SettlementExecutionModal } from './SettlementExecutionModal';
import { AccessibleConfirmDialog } from './AccessibleConfirmDialog';
import { Check, CheckCircle2, FileText, Trash2, Filter } from 'lucide-react';

interface EnterpriseLiabilitiesTableProps {
  readonly liabilities: TreasuryLiability[];
  readonly isDarkMode: boolean;
  readonly onSettle: (payload: SettleLiabilityPayload) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<void> | void;
  readonly onViewSettlementReceipt?: (record: SettledLiabilityRecord) => void;
}

/**
 * Tabela de Passivos & Obrigações Empresariais com:
 * - Conformidade WCAG 2.1 AA (tags <table>, <caption> oculta, <th> com scope)
 * - Separação estrita de estados (discriminated union)
 * - Formatação monetária segura em Cents (sem erros de float)
 * - Exibição de valores zerados tratados como marcadores semânticos (—)
 */
export const EnterpriseLiabilitiesTable: React.FC<EnterpriseLiabilitiesTableProps> = ({
  liabilities,
  isDarkMode,
  onSettle,
  onDelete,
  onViewSettlementReceipt,
}) => {
  // Filtros de visualização
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Estado para Modal de Liquidação
  const [activeSettlementTarget, setActiveSettlementTarget] = useState<PendingLiabilityRecord | OverdueLiabilityRecord | null>(null);

  // Estado para Diálogo de Eliminação
  const [targetIdToDelete, setTargetIdToDelete] = useState<string | null>(null);

  // Filtragem Otimizada
  const filteredRecords = useMemo(() => {
    return liabilities.filter((item) => {
      // Filtro por Estado
      if (statusFilter === 'ACTIVE' && item.status === 'SETTLED') return false;
      if (statusFilter === 'SETTLED' && item.status !== 'SETTLED') return false;

      // Filtro por Entidade Originadora
      if (entityFilter !== 'ALL' && item.debtorEntityId !== entityFilter) return false;

      return true;
    });
  }, [liabilities, statusFilter, entityFilter]);

  // Contadores
  const activeCount = useMemo(() => liabilities.filter(l => l.status !== 'SETTLED').length, [liabilities]);
  const settledCount = useMemo(() => liabilities.filter(l => l.status === 'SETTLED').length, [liabilities]);

  return (
    <section 
      aria-labelledby="treasury-table-heading"
      className={`rounded-2xl border ${isDarkMode ? 'bg-[#18181C] border-[#26262B]' : 'bg-white border-slate-200'} shadow-sm overflow-hidden flex flex-col`}
    >
      {/* Controles de Filtros e Cabeçalho */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-[#26262B] bg-[#141416]' : 'border-slate-100 bg-slate-50/50'} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 id="treasury-table-heading" className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Passivos & Obrigações Cadastradas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredRecords.length} de {liabilities.length} registos conciliados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Control por Situação */}
          <div 
            role="group" 
            aria-label="Filtro de Situação das Obrigações"
            className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-[#1E1E24] border-[#2C2C35]' : 'bg-slate-100 border-slate-200'}`}
          >
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({liabilities.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Em Aberto ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'SETTLED'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Quitados ({settledCount})</span>
            </button>
          </div>

          {/* Filtro de Entidade Originadora */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              aria-label="Filtrar por Entidade Devedora"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium ${
                isDarkMode 
                  ? 'bg-[#1E1E24] border-[#2C2C35] text-slate-200' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="ALL">Todas as Unidades</option>
              <option value="B32">Loja B32</option>
              <option value="B28">Loja B28</option>
              <option value="VERO">Vero Pasta</option>
              <option value="HOLDING">Holding AZ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Semântica Acessível */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <caption className="sr-only">
            Tabela de conciliação de passivos e pendências financeiras das filiais e da holding central
          </caption>
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-[#26262B] bg-[#141416] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'} font-bold uppercase tracking-wider`}>
              <th scope="col" className="py-3 px-4">Origem / Devedora</th>
              <th scope="col" className="py-3 px-4">Categoria</th>
              <th scope="col" className="py-3 px-4">Credor</th>
              <th scope="col" className="py-3 px-4 text-right">Saldo Devedor</th>
              <th scope="col" className="py-3 px-4 text-right">Parcela Mensal</th>
              <th scope="col" className="py-3 px-4 text-center">Vencimento</th>
              <th scope="col" className="py-3 px-4 text-center">Situação</th>
              <th scope="col" className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-[#222228]' : 'divide-slate-100'}`}>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  Nenhum passivo encontrado para os critérios de filtro selecionados.
                </td>
              </tr>
            ) : (
              filteredRecords.map((item) => {
                const isSettled = item.status === 'SETTLED';

                return (
                  <tr 
                    key={item.id}
                    className={`transition-colors ${isDarkMode ? 'hover:bg-[#1C1C22]' : 'hover:bg-slate-50/70'}`}
                  >
                    {/* Entidade Devedora */}
                    <td className="py-3.5 px-4 font-semibold">
                      <span className={`inline-flex px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                        item.debtorEntityId.includes('ENCERRADA')
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}>
                        {item.debtorEntityId}
                      </span>
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      {item.category}
                    </td>

                    {/* Credor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.creditor}
                        </span>
                        {isSettled && (
                          <span 
                            title="Passivo totalmente liquidado"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                          >
                            <FileText className="w-3 h-3" aria-hidden="true" />
                            <span>Comprovante</span>
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs mt-0.5">
                          {item.notes}
                        </p>
                      )}
                    </td>

                    {/* Saldo Devedor Restante */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      {isSettled ? (
                        <span className="text-emerald-600 dark:text-emerald-400">R$ 0,00</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          {MoneyUtils.formatBRL(item.outstandingBalanceCents)}
                        </span>
                      )}
                    </td>

                    {/* Parcela Mensal (Elimina cálculo se quitado) */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      {isSettled ? (
                        <span className="text-slate-400" aria-label="Sem parcelas ativas">—</span>
                      ) : (
                        MoneyUtils.formatBRL(item.installmentMonthlyCents)
                      )}
                    </td>

                    {/* Dia de Vencimento */}
                    <td className="py-3.5 px-4 text-center font-medium">
                      {isSettled ? (
                        <span className="text-xs text-slate-400">
                          Liquidado em {new Date((item as SettledLiabilityRecord).settledAtIso).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">
                          Dia {item.dueDay}
                        </span>
                      )}
                    </td>

                    {/* Badge de Situação */}
                    <td className="py-3.5 px-4 text-center">
                      <LiabilityStatusBadge 
                        status={item.status} 
                        daysOverdue={item.status === 'OVERDUE' ? item.daysOverdue : undefined}
                      />
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isSettled ? (
                          <button
                            type="button"
                            onClick={() => onViewSettlementReceipt?.(item as SettledLiabilityRecord)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 transition-colors inline-flex items-center gap-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                            aria-label={`Ver recibo do credor ${item.creditor}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Recibo</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveSettlementTarget(item as PendingLiabilityRecord | OverdueLiabilityRecord)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs inline-flex items-center gap-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                            aria-label={`Pagar obrigação com ${item.creditor}`}
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Pagar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setTargetIdToDelete(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                          aria-label={`Excluir registo do credor ${item.creditor}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Liquidação / Pagamento com Idempotência */}
      <SettlementExecutionModal
        liability={activeSettlementTarget}
        isOpen={activeSettlementTarget !== null}
        onClose={() => setActiveSettlementTarget(null)}
        onExecute={onSettle}
      />

      {/* Diálogo Acessível de Confirmação de Exclusão */}
      <AccessibleConfirmDialog
        isOpen={targetIdToDelete !== null}
        title="Eliminar Obrigação Financeira"
        description="Tem certeza de que deseja excluir este registo financeiro? Esta ação não pode ser desfeita e afetará o saldo consolidado da holding."
        confirmLabel="Sim, Eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={async () => {
          if (targetIdToDelete) {
            await onDelete(targetIdToDelete);
            setTargetIdToDelete(null);
          }
        }}
        onCancel={() => setTargetIdToDelete(null)}
      />
    </section>
  );
};
