import React from 'react';
import { ViabilityPlanilha } from '../../types/holding';

interface ViabilityPlanilhaViewProps {
  viability: ViabilityPlanilha;
  compact?: boolean;
}

export function ViabilityPlanilhaView({ viability, compact = false }: ViabilityPlanilhaViewProps) {
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

  return (
    <div className="w-full space-y-3 font-sans text-xs select-none">
      {/* Container da Planilha com visual idêntico ao modelo */}
      <div className="border border-[#345120] rounded-xl overflow-hidden shadow-lg bg-[#0e0e10]">
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
          <tbody className="divide-y divide-[#222522] text-slate-200">
            {/* 1. Faturamento mensal */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-semibold text-slate-100">Faturamento mensal</td>
              <td className="py-1.5 px-4 text-right font-bold text-white">
                {formatMoney(viability.monthlyRevenue)}
              </td>
            </tr>

            {/* 2. Compras mensais */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Compras mensais (Premissa: CMV = Reposição de Estoque)
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.monthlyPurchases, true)}
              </td>
            </tr>

            {/* 3. Lucro bruto total mensal */}
            <tr className="hover:bg-white/5 transition-colors bg-white/[0.02]">
              <td className="py-1.5 px-4 font-extrabold text-white">
                Lucro bruto total mensal adicionado mensal
              </td>
              <td className="py-1.5 px-4 text-right font-black text-white">
                {formatMoney(viability.grossProfit)}
              </td>
            </tr>

            {/* 4. Margem bruta% */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-bold text-slate-100">Margem bruta%</td>
              <td className="py-1.5 px-4 text-right font-bold text-slate-100">
                {formatPercent(viability.grossMarginPercent)}
              </td>
            </tr>

            {/* 5. CMV */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-bold text-slate-100">CMV</td>
              <td className="py-1.5 px-4 text-right font-bold text-slate-100">
                {formatPercent(viability.cmvPercent)}
              </td>
            </tr>

            {/* 6. Despesas Fixas */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Despesas Fixas mensais adicionadas (invariável ao volume)
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.fixedExpenses, true)}
              </td>
            </tr>

            {/* 7. Despesas variáveis Marketing (exibido apenas se houver) */}
            {viability.marketingExpense > 0 && (
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-1.5 px-4 font-normal text-slate-300">
                  Despesas variáveis com Fundo de Marketing
                </td>
                <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                  {formatMoney(viability.marketingExpense, true)}
                </td>
              </tr>
            )}

            {/* 8. Despesas variáveis Royalties (exibido apenas se houver) */}
            {viability.royaltiesExpense > 0 && (
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-1.5 px-4 font-normal text-slate-300">
                  Despesas variáveis com Royalties
                </td>
                <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                  {formatMoney(viability.royaltiesExpense, true)}
                </td>
              </tr>
            )}

            {/* 9. Despesas variáveis Taxas Cartão e Pix */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Despesas variáveis com Taxas de cartão e pix
              </td>
              <td className="py-1.5 px-4 text-right font-bold text-rose-500">
                {formatMoney(viability.cardFeesExpense, true)}
              </td>
            </tr>

            {/* 10. EBITDA mensal adicionado */}
            <tr className="hover:bg-white/5 transition-colors bg-white/[0.03]">
              <td className="py-1.5 px-4 font-extrabold text-white">
                EBITDA mensal adicionado
              </td>
              <td className="py-1.5 px-4 text-right font-black text-white">
                {formatMoney(viability.ebitdaMonthly)}
              </td>
            </tr>

            {/* 11. Margem EBITDA% */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-bold text-slate-100">Margem EBITDA%</td>
              <td className="py-1.5 px-4 text-right font-bold text-slate-100">
                {formatPercent(viability.ebitdaMarginPercent)}
              </td>
            </tr>

            {/* 12. Peso da venda a prazo */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Peso da venda a prazo nas vendas totais
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-200">
                {formatPercent(viability.creditSalesPercent)}
              </td>
            </tr>

            {/* 13. Prazo médio clientes */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Prazo médio clientes em dias
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-200">
                {formatDays(viability.clientTermDays)}
              </td>
            </tr>

            {/* 14. Peso compras a prazo */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Peso das compras a prazo nas vendas totais
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-200">
                {formatPercent(viability.creditPurchasesPercent)}
              </td>
            </tr>

            {/* 15. Prazo médio fornecedor */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Prazo médio do fornecedor em dias
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-200">
                {formatDays(viability.supplierTermDays)}
              </td>
            </tr>

            {/* 16. Estoque em dias */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Estoque em dias
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-200">
                {formatDays(viability.stockDays)}
              </td>
            </tr>

            {/* 17. Investimento em Contas a Receber */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Investimento em Contas a Receber mensal
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-100">
                {formatMoney(viability.receivablesInvestment)}
              </td>
            </tr>

            {/* 18. Financiamento de Fornecedores */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Financiamento de Fornecedores mensal
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-100">
                {formatMoney(viability.supplierFinancing)}
              </td>
            </tr>

            {/* 19. Investimento em Estoque */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-normal text-slate-300">
                Investimento em Estoque mensal
              </td>
              <td className="py-1.5 px-4 text-right font-semibold text-slate-100">
                {formatMoney(viability.stockInvestment)}
              </td>
            </tr>

            {/* 20. Necessidade de Capital de Giro (NCG) mensal - Destacada em Verde */}
            <tr className="bg-[#38551f] text-white border-t border-b border-[#2d4419]">
              <td className="py-2 px-4 font-extrabold text-xs">
                Necessidade de Capital de Giro (NCG) mensal
              </td>
              <td className="py-2 px-4 text-right font-black text-sm">
                {formatMoney(viability.ncgMonthly)}
              </td>
            </tr>

            {/* 21. Capex (bens de capital) para 12 meses */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="py-1.5 px-4 font-extrabold text-slate-100">
                Capex (bens de capital) para 12 meses
              </td>
              <td className="py-1.5 px-4 text-right font-black text-white">
                {formatMoney(viability.capex)}
              </td>
            </tr>

            {/* 22. Investimento (CAPEX + NCG x 12 meses) - Destacada em Verde */}
            <tr className="bg-[#38551f] text-white border-t border-b border-[#2d4419]">
              <td className="py-2 px-4 font-extrabold text-xs">
                Investimento (CAPEX + NCG x 12 meses)
              </td>
              <td className="py-2 px-4 text-right font-black text-sm">
                {formatMoney(viability.totalInvestment)}
              </td>
            </tr>

            {/* 23. Payback em Meses - Destacada em Verde */}
            <tr className="bg-[#38551f] text-white">
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
      <div className="flex rounded-xl overflow-hidden border border-[#2f491c] shadow-md">
        <div className="bg-[#2d481a] text-white font-black text-xs sm:text-sm py-2.5 px-4 uppercase tracking-wider flex-1 flex items-center justify-end pr-6">
          PONTO DE EQUILÍBRIO
        </div>
        <div className="bg-[#b4b7ba] text-slate-900 font-black text-sm sm:text-base py-2.5 px-4 w-40 sm:w-48 text-right flex items-center justify-end">
          {formatMoney(viability.breakEvenMonthly)}
        </div>
      </div>
    </div>
  );
}
