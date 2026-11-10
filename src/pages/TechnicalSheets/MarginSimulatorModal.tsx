import React, { useState, useId } from 'react';
import { 
  X, 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  Store, 
  Bike, 
  Check, 
  DollarSign, 
  Percent, 
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { TechnicalSheet, ChannelType } from '../../types/technicalSheet';
import { formatarMoedaBRL, formatarPercentualBRL, getCmvStatus } from '../../utils/foodServiceMath';

interface MarginSimulatorModalProps {
  sheet: TechnicalSheet;
  isOpen: boolean;
  onClose: () => void;
  onApplyNewPrice: (sheetId: string, newPrice: number, newFee: number) => void;
}

export const MarginSimulatorModal: React.FC<MarginSimulatorModalProps> = ({
  sheet,
  isOpen,
  onClose,
  onApplyNewPrice,
}) => {
  const channelFeeId = useId();
  const taxFeeId = useId();
  const [salePrice, setSalePrice] = useState<number>(sheet.precoVenda);
  const [channelType, setChannelType] = useState<ChannelType>(sheet.canal);
  const [channelFeePercent, setChannelFeePercent] = useState<number>(
    sheet.taxaCanalPercent || (sheet.canal === 'IFOOD' ? 28 : 7)
  );
  const [taxPercent, setTaxPercent] = useState<number>(sheet.impostoSimplesPercent || 5);
  const [simulatedUnitsPerMonth, setSimulatedUnitsPerMonth] = useState<number>(300);

  if (!isOpen) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Cálculos dinâmicos em tempo real
  const custoTotal = Number(sheet.custoTotal) || 0;
  const currentPrice = Number(salePrice) || 0;
  
  const cmvPercent = currentPrice > 0 ? (custoTotal / currentPrice) * 100 : 0;
  const taxaCanalReais = currentPrice * (channelFeePercent / 100);
  const impostoReais = currentPrice * (taxPercent / 100);
  const lucroLiquidoUnitario = currentPrice - taxaCanalReais - impostoReais - custoTotal;
  const margemLiquidaPercent = currentPrice > 0 ? (lucroLiquidoUnitario / currentPrice) * 100 : 0;

  // Projeção mensal
  const receitaMensal = currentPrice * simulatedUnitsPerMonth;
  const lucroMensalTotal = lucroLiquidoUnitario * simulatedUnitsPerMonth;

  // Preço sugerido para CMV Alvo de 30%
  const precoSugeridoCMV30 = custoTotal / 0.30;
  
  // Preço sugerido para Margem Líquida Alvo de 35%
  // P - (P * taxa) - (P * imposto) - C = P * margemAlvo
  // P * (1 - taxa/100 - imposto/100 - margemAlvo/100) = C
  const denominador = 1 - (channelFeePercent / 100) - (taxPercent / 100) - 0.35;
  const precoSugeridoMargem35 = denominador > 0 ? custoTotal / denominador : 0;

  const handleApply = () => {
    onApplyNewPrice(sheet.id, currentPrice, channelFeePercent);
    onClose();
  };

  const handleChannelChange = (newChan: ChannelType) => {
    setChannelType(newChan);
    setChannelFeePercent(newChan === 'IFOOD' ? 28 : 7);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-linear-to-r from-orange-50 to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  Simulador de Margens & Preço
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-600 font-medium">Custo Fixo Base: {formatCurrency(custoTotal)}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {sheet.nome}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            
            {/* Canal de Venda Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Canal de Venda
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleChannelChange('BALCAO')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channelType === 'BALCAO'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Balcão (7%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange('IFOOD')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    channelType === 'IFOOD'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>iFood (28%)</span>
                </button>
              </div>
            </div>

            {/* Preço de Venda Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Preço de Venda no Cardápio (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Volume de Vendas Estimado */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Vendas Estimadas / Mês
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={simulatedUnitsPerMonth}
                  onChange={(e) => setSimulatedUnitsPerMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-800"
                />
                <span className="text-xs text-slate-500 whitespace-nowrap">pratos</span>
              </div>
            </div>
          </div>

          {/* Sliders de Taxas (Ajuste Fino de Comissões) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <label htmlFor={channelFeeId} className="flex items-center gap-1.5 cursor-pointer">
                  <span>Taxa Comissional do Canal ({channelType})</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </label>
                <span className="font-mono font-bold text-red-600">{channelFeePercent}%</span>
              </div>
              <input
                id={channelFeeId}
                type="range"
                min="0"
                max="35"
                step="0.5"
                value={channelFeePercent}
                onChange={(e) => setChannelFeePercent(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0% (Próprio)</span>
                <span>12% (Básico)</span>
                <span>28% (Entrega Parceira)</span>
                <span>32%</span>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <label htmlFor={taxFeeId} className="flex items-center gap-1.5 cursor-pointer">
                  <span>Impostos Estimados (Simples Nacional)</span>
                </label>
                <span className="font-mono font-bold text-slate-700">{taxPercent}%</span>
              </div>
              <input
                id={taxFeeId}
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                className="w-full accent-slate-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0%</span>
                <span>4%</span>
                <span>6%</span>
                <span>12%</span>
              </div>
            </div>
          </div>

          {/* DRE Unitário Visual (Dedução Passo a Passo) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 text-white px-5 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Demonstrativo Unitário por Prato Vendido</span>
              <span className="text-amber-400 font-mono text-sm">
                Preço: {formatCurrency(currentPrice)}
              </span>
            </div>
            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="p-3.5 flex items-center justify-between bg-white">
                <span className="font-bold text-slate-800">(+) Receita Bruta Praticada</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(currentPrice)}</span>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-slate-50/50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  (-) Taxa do Canal ({channelFeePercent}%)
                </span>
                <span className="font-mono text-red-600 font-semibold">
                  - {formatCurrency(taxaCanalReais)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-slate-50/50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  (-) Impostos Fiscais ({taxPercent}%)
                </span>
                <span className="font-mono text-slate-700 font-semibold">
                  - {formatCurrency(impostoReais)}
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between bg-slate-50/50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  (-) Custo Direto (Insumos + Embalagens)
                </span>
                <span className="font-mono text-orange-600 font-semibold">
                  - {formatCurrency(custoTotal)}
                </span>
              </div>

              {/* Resultado Líquido */}
              <div className={`p-4 flex items-center justify-between ${
                lucroLiquidoUnitario > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
              }`}>
                <div>
                  <span className="font-black text-sm block">
                    (=) Margem de Contribuição Líquida Unitária
                  </span>
                  <span className="text-xs opacity-80">
                    Lucro limpo gerado por cada prato vendido após todos os custos diretos
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black font-mono block">
                    {formatCurrency(lucroLiquidoUnitario)}
                  </span>
                  <span className="text-xs font-bold uppercase">
                    Margem: {margemLiquidaPercent.toFixed(1)}% | CMV: {cmvPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Projeções */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block">CMV Teórico</span>
              {(() => {
                const status = getCmvStatus(cmvPercent, 0.32);
                return (
                  <div>
                    <span className={`text-2xl font-black font-mono mt-1 block ${status.textoClasse}`}>
                      {formatarPercentualBRL(cmvPercent, 1)}
                    </span>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${status.badgeClasse}`}>
                      {status.descricao}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs font-semibold text-slate-500 block">
                Faturamento Mensal Estimado
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
                {formatCurrency(receitaMensal)}
              </span>
              <span className="text-[11px] text-slate-400">
                Base: {simulatedUnitsPerMonth} pedidos/mês
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50/70 border-emerald-200">
              <span className="text-xs font-semibold text-emerald-700 block">
                Margem de Contribuição Mensal Projetada
              </span>
              <span className="text-2xl font-black font-mono text-emerald-800 mt-1 block">
                {formatCurrency(lucroMensalTotal)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">
                Margem operacional líquida
              </span>
            </div>
          </div>

          {/* Sugestões Inteligentes de Precificação */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Sugestões Automáticas de Precificação Corporativa</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Para Atingir CMV Alvo de 30%:</span>
                  <span className="text-base font-black text-amber-700 font-mono">
                    {formatCurrency(precoSugeridoCMV30)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSalePrice(Number(precoSugeridoCMV30.toFixed(2)))}
                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                >
                  Usar
                </button>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Para Margem Líquida Alvo de 35%:</span>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {formatCurrency(precoSugeridoMargem35)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSalePrice(Number(precoSugeridoMargem35.toFixed(2)))}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  Usar
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Preço de {formatCurrency(currentPrice)} na Ficha</span>
          </button>
        </div>

      </div>
    </div>
  );
};
