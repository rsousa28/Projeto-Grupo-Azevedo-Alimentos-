import React from 'react';
import { ViabilityPlanilha } from '../../types/holding';
import { useStore } from '../../contexts/StoreContext';

interface ViabilityPlanilhaViewProps {
  viability: ViabilityPlanilha;
  compact?: boolean;
}

export function ViabilityPlanilhaView({ viability, compact = false }: ViabilityPlanilhaViewProps) {
  const { isDarkMode } = useStore();

  const formatMoney = (val: number, isNegative = false) => {
    const formatted = Math.abs(val).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (isNegative && val > 0) {
      return `-${formatted}`;
    }
    return formatted;
  };

  const formatPercent = (val: number) => {
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const formatDays = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const hoverClass = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50';
  const labelMutedClass = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const labelBoldClass = isDarkMode ? 'text-slate-100 font-semibold' : 'text-slate-800 font-semibold';
  const valueBoldClass = isDarkMode ? 'text-white font-bold' : 'text-slate-900 font-bold';
  const valueNormalClass = isDarkMode ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold';

  return (
    <div className="w-full space-y-3 font-sans text-xs select-none">
      {/* Container da Planilha com visual idêntico ao modelo */}
      <div className={`border rounded-xl overflow-hidden shadow-sm ${
        isDarkMode ? 'border-[#345120] bg-[#0e0e10]' : 'border-emerald-200 bg-white shadow-xs'
      }`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#4a7227] text-white border-b border-[#3b5b20]">
              <th className="py-2.5 px-4 text-left font-extrabold text-sm tracking-wide">
                Parametros de Entrada e Indicadores
              </th>
              <th className="py-2.5 px-4 text-right font-extrabold text-sm tracking-wide w-40 sm:w-48">
                Total
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-[#222522] text-slate-200' : 'divide-slate-200 text-slate-700'}`}>
            {/* 1. Faturamento mensal */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelBoldClass}`}>Faturamento mensal</td>
              <td className={`py-1.5 px-4 text-right ${valueBoldClass}`}>
                {formatMoney(viability.monthlyRevenue)}
              </td>
            </tr>

            {/* 2. Compras mensais */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Compras mensais (Premissa: CMV = Reposição de Estoque)
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.monthlyPurchases, true)}
              </td>
            </tr>

            {/* 3. Lucro bruto total mensal */}
            <tr className={`${hoverClass} transition-colors ${isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50/60'}`}>
              <td className={`py-1.5 px-4 font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Lucro bruto total mensal adicionado mensal
              </td>
              <td className={`py-1.5 px-4 text-right font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatMoney(viability.grossProfit)}
              </td>
            </tr>

            {/* 4. Margem bruta% */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelBoldClass}`}>Margem bruta%</td>
              <td className={`py-1.5 px-4 text-right ${labelBoldClass}`}>
                {formatPercent(viability.grossMarginPercent)}
              </td>
            </tr>

            {/* 5. CMV */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelBoldClass}`}>CMV</td>
              <td className={`py-1.5 px-4 text-right ${labelBoldClass}`}>
                {formatPercent(viability.cmvPercent)}
              </td>
            </tr>

            {/* 6. Despesas Fixas */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Despesas Fixas mensais adicionadas (invariável ao volume)
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.fixedExpenses, true)}
              </td>
            </tr>

            {/* 7. Despesas variáveis Marketing (exibido apenas se houver) */}
            {viability.marketingExpense > 0 && (
              <tr className={`${hoverClass} transition-colors`}>
                <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                  Despesas variáveis com Fundo de Marketing
                </td>
                <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                  {formatMoney(viability.marketingExpense, true)}
                </td>
              </tr>
            )}

            {/* 8. Despesas variáveis Royalties (exibido apenas se houver) */}
            {viability.royaltiesExpense > 0 && (
              <tr className={`${hoverClass} transition-colors`}>
                <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                  Despesas variáveis com Royalties
                </td>
                <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                  {formatMoney(viability.royaltiesExpense, true)}
                </td>
              </tr>
            )}

            {/* 9. Despesas variáveis Taxas Cartão e Pix */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Despesas variáveis com Taxas de cartão e pix
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.cardFeesExpense, true)}
              </td>
            </tr>

            {/* 10. EBITDA mensal adicionado */}
            <tr className={`${hoverClass} transition-colors ${isDarkMode ? 'bg-white/[0.03]' : 'bg-emerald-50/40'}`}>
              <td className={`py-1.5 px-4 font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                EBITDA mensal adicionado
              </td>
              <td className={`py-1.5 px-4 text-right font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatMoney(viability.ebitdaMonthly)}
              </td>
            </tr>

            {/* 11. Margem EBITDA% */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelBoldClass}`}>Margem EBITDA%</td>
              <td className={`py-1.5 px-4 text-right ${labelBoldClass}`}>
                {formatPercent(viability.ebitdaMarginPercent)}
              </td>
            </tr>

            {/* 12. Peso da venda a prazo */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Peso da venda a prazo nas vendas totais
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatPercent(viability.creditSalesPercent)}
              </td>
            </tr>

            {/* 13. Prazo médio clientes */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Prazo médio clientes em dias
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatDays(viability.clientTermDays)}
              </td>
            </tr>

            {/* 14. Peso compras a prazo */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Peso das compras a prazo nas vendas totais
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatPercent(viability.creditPurchasesPercent)}
              </td>
            </tr>

            {/* 15. Prazo médio fornecedor */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Prazo médio do fornecedor em dias
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatDays(viability.supplierTermDays)}
              </td>
            </tr>

            {/* 16. Estoque em dias */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Estoque em dias
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatDays(viability.stockDays)}
              </td>
            </tr>

            {/* 17. Investimento em Contas a Receber */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Investimento em Contas a Receber mensal
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatMoney(viability.receivablesInvestment)}
              </td>
            </tr>

            {/* 18. Financiamento de Fornecedores */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Financiamento de Fornecedores mensal
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatMoney(viability.supplierFinancing)}
              </td>
            </tr>

            {/* 19. Investimento em Estoque */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 ${labelMutedClass}`}>
                Investimento em Estoque mensal
              </td>
              <td className={`py-1.5 px-4 text-right ${valueNormalClass}`}>
                {formatMoney(viability.stockInvestment)}
              </td>
            </tr>

            {/* 20. Necessidade de Capital de Giro (NCG) mensal - Destacada em Verde */}
            <tr className={`text-white border-t border-b ${
              isDarkMode ? 'bg-[#38551f] border-[#2d4419]' : 'bg-emerald-700 border-emerald-800'
            }`}>
              <td className="py-2 px-4 font-extrabold text-xs">
                Necessidade de Capital de Giro (NCG) mensal
              </td>
              <td className="py-2 px-4 text-right font-black text-sm">
                {formatMoney(viability.ncgMonthly)}
              </td>
            </tr>

            {/* 21. Capex (bens de capital) para 12 meses */}
            <tr className={`${hoverClass} transition-colors`}>
              <td className={`py-1.5 px-4 font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Capex (bens de capital) para 12 meses
              </td>
              <td className={`py-1.5 px-4 text-right font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatMoney(viability.capex)}
              </td>
            </tr>

            {/* 22. Investimento (CAPEX + NCG x 12 meses) - Destacada em Verde */}
            <tr className={`text-white border-t border-b ${
              isDarkMode ? 'bg-[#38551f] border-[#2d4419]' : 'bg-emerald-700 border-emerald-800'
            }`}>
              <td className="py-2 px-4 font-extrabold text-xs">
                Investimento (CAPEX + NCG x 12 meses)
              </td>
              <td className="py-2 px-4 text-right font-black text-sm">
                {formatMoney(viability.totalInvestment)}
              </td>
            </tr>

            {/* 23. Payback em Meses - Destacada em Verde */}
            <tr className={`text-white ${isDarkMode ? 'bg-[#38551f]' : 'bg-emerald-800'}`}>
              <td className="py-2.5 px-4 font-extrabold text-sm tracking-wide">
                Payback em Meses
              </td>
              <td className="py-2.5 px-4 text-right font-black text-base text-amber-300">
                {viability.paybackMonths.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Faixa Ponto de Equilíbrio */}
      <div className={`flex rounded-xl overflow-hidden border shadow-sm ${
        isDarkMode ? 'border-[#2f491c]' : 'border-slate-300'
      }`}>
        <div className={`text-white font-black text-xs sm:text-sm py-2.5 px-4 uppercase tracking-wider flex-1 flex items-center justify-end pr-6 ${
          isDarkMode ? 'bg-[#2d481a]' : 'bg-emerald-700'
        }`}>
          PONTO DE EQUILÍBRIO
        </div>
        <div className={`font-black text-sm sm:text-base py-2.5 px-4 w-40 sm:w-48 text-right flex items-center justify-end ${
          isDarkMode ? 'bg-[#b4b7ba] text-slate-900' : 'bg-slate-200 text-slate-900'
        }`}>
          {formatMoney(viability.breakEvenMonthly)}
        </div>
      </div>
    </div>
  );
}
