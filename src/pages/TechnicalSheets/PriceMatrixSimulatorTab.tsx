import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Store, 
  Bike, 
  Download, 
  Check, 
  RefreshCw, 
  Sliders, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Save,
  CheckCircle2,
  Settings2,
  Info
} from 'lucide-react';
import { TechnicalSheet, ChannelType } from '../../types/technicalSheet';
import { TechnicalSheetService } from '../../services/TechnicalSheetService';
import { useToast } from '../../contexts/ToastContext';
import { 
  formatarMoedaBRL, 
  formatarPercentualBRL, 
  getCmvStatus, 
  MeioPagamentoMix, 
  MIX_PAGAMENTOS_BALCAO_PADRAO, 
  calcularTaxaMediaPonderadaBalcao 
} from '../../utils/foodServiceMath';
import { ApplyPriceConfirmationModal, PriceUpdateItem } from './ApplyPriceConfirmationModal';
import { CounterPaymentMixModal } from './CounterPaymentMixModal';

interface PriceMatrixSimulatorTabProps {
  sheets: TechnicalSheet[];
  onApplyNewPrices: (updatedSheets: TechnicalSheet[]) => void;
}

interface SimulatedDishRow {
  sheet: TechnicalSheet;
  precoAtual: number;
  custoTotal: number;
  cmvAtual: number; // decimal (ex: 0.301)
  margemAtualReais: number;
  margemAtualPercent: number; // decimal (ex: 0.369)
  precoSimulado: number;
  cmvSimulado: number; // decimal
  taxaCanalSimulada: number; // decimal
  margemSimuladaReais: number;
  margemSimuladaPercent: number; // decimal
  deltaMargemReais: number;
  volumeMensalEstimado: number;
  lucroAdicionalMensal: number;
}

export const PriceMatrixSimulatorTab: React.FC<PriceMatrixSimulatorTabProps> = ({
  sheets,
  onApplyNewPrices,
}) => {
  const { success, info } = useToast();

  // Channel Fee Overrides for What-If Scenarios
  const [ifoodFeeOverride, setIfoodFeeOverride] = useState<number>(0.28); // 28% em decimal
  const [mixBalcao, setMixBalcao] = useState<MeioPagamentoMix[]>(() => [...MIX_PAGAMENTOS_BALCAO_PADRAO]);
  
  // Taxa média ponderada calculada do balcão (em decimal)
  const balcaoFeeCalculated = useMemo(() => {
    return calcularTaxaMediaPonderadaBalcao(mixBalcao);
  }, [mixBalcao]);

  // Modals state
  const [isMixModalOpen, setIsMixModalOpen] = useState(false);
  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState(false);

  // Price adjustment multipliers or custom overrides per dish
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    sheets.forEach(s => {
      initial[s.id] = s.precoVenda;
    });
    return initial;
  });

  // Estimated monthly sales volume per dish (for DRE projection)
  const [volumeEstimates, setVolumeEstimates] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    sheets.forEach(s => {
      // Estimated default monthly sales by dish category (140 iFood, 180 Balcão)
      initial[s.id] = s.canal === 'IFOOD' ? 140 : 180;
    });
    return initial;
  });

  const [filterChannel, setFilterChannel] = useState<'TODOS' | ChannelType>('TODOS');

  const formatCurrency = (val: number) => formatarMoedaBRL(val);

  // Compute calculated simulation row for each dish
  const simulatedRows: SimulatedDishRow[] = useMemo(() => {
    return sheets.map(sheet => {
      const precoAtual = sheet.precoVenda;
      const custoTotal = sheet.custoTotal;
      // Normalização de segurança para decimal
      const cmvAtual = sheet.cmvTeoricoPercent > 1.0 ? sheet.cmvTeoricoPercent / 100 : sheet.cmvTeoricoPercent;
      const margemAtualReais = sheet.margemContribuicaoReais;
      const margemAtualPercent = sheet.margemContribuicaoPercent > 1.0 ? sheet.margemContribuicaoPercent / 100 : sheet.margemContribuicaoPercent;

      const precoSimulado = priceOverrides[sheet.id] !== undefined ? priceOverrides[sheet.id] : precoAtual;
      const taxaCanalSimulada = sheet.canal === 'IFOOD' ? ifoodFeeOverride : balcaoFeeCalculated;
      const impostoSimples = sheet.impostoSimplesPercent > 1.0 ? sheet.impostoSimplesPercent / 100 : (sheet.impostoSimplesPercent || 0.05);

      // CMV Simulado em decimal
      const cmvSimulado = precoSimulado > 0 ? (custoTotal / precoSimulado) : 0;
      
      const taxaReais = precoSimulado * taxaCanalSimulada;
      const impostoReais = precoSimulado * impostoSimples;
      const margemSimuladaReais = Number((precoSimulado - taxaReais - impostoReais - custoTotal).toFixed(2));
      const margemSimuladaPercent = precoSimulado > 0 ? (margemSimuladaReais / precoSimulado) : 0;

      const deltaMargemReais = Number((margemSimuladaReais - margemAtualReais).toFixed(2));
      const volume = volumeEstimates[sheet.id] || 150;
      const lucroAdicionalMensal = Number((deltaMargemReais * volume).toFixed(2));

      return {
        sheet,
        precoAtual,
        custoTotal,
        cmvAtual,
        margemAtualReais,
        margemAtualPercent,
        precoSimulado,
        cmvSimulado,
        taxaCanalSimulada,
        margemSimuladaReais,
        margemSimuladaPercent,
        deltaMargemReais,
        volumeMensalEstimado: volume,
        lucroAdicionalMensal,
      };
    });
  }, [sheets, priceOverrides, ifoodFeeOverride, balcaoFeeCalculated, volumeEstimates]);

  const filteredRows = useMemo(() => {
    if (filterChannel === 'TODOS') return simulatedRows;
    return simulatedRows.filter(r => r.sheet.canal === filterChannel);
  }, [simulatedRows, filterChannel]);

  // Overall DRE Projections
  const dreTotals = useMemo(() => {
    let faturamentoAtual = 0;
    let faturamentoSimulado = 0;
    let custoTotalMensal = 0;
    let margemAtualTotal = 0;
    let margemSimuladaTotal = 0;
    let lucroDeltaTotal = 0;
    let volumeTotal = 0;

    simulatedRows.forEach(row => {
      const vol = row.volumeMensalEstimado;
      volumeTotal += vol;
      faturamentoAtual += row.precoAtual * vol;
      faturamentoSimulado += row.precoSimulado * vol;
      custoTotalMensal += row.custoTotal * vol;
      margemAtualTotal += row.margemAtualReais * vol;
      margemSimuladaTotal += row.margemSimuladaReais * vol;
      lucroDeltaTotal += row.lucroAdicionalMensal;
    });

    const cmvMedioSimulado = faturamentoSimulado > 0 ? (custoTotalMensal / faturamentoSimulado) : 0;
    const margemMediaPercent = faturamentoSimulado > 0 ? (margemSimuladaTotal / faturamentoSimulado) : 0;

    return {
      faturamentoAtual,
      faturamentoSimulado,
      custoTotalMensal,
      margemAtualTotal,
      margemSimuladaTotal,
      lucroDeltaTotal,
      cmvMedioSimulado,
      margemMediaPercent,
      volumeTotal
    };
  }, [simulatedRows]);

  // Quick Action Presets
  const applyPresetAdjustment = (percentage: number, channel?: ChannelType) => {
    const updated = { ...priceOverrides };
    sheets.forEach(s => {
      if (!channel || s.canal === channel) {
        const adjusted = Number((s.precoVenda * (1 + percentage / 100)).toFixed(2));
        updated[s.id] = adjusted;
      }
    });
    setPriceOverrides(updated);
    info(
      `Reajuste de ${percentage > 0 ? '+' : ''}${percentage}% aplicado na simulação${channel ? ` para ${channel}` : ' global'}.`, 
      'Cenário Carregado'
    );
  };

  const applyTargetCMVPreset = (targetCMV: number = 30) => {
    const updated = { ...priceOverrides };
    sheets.forEach(s => {
      const idealPrice = Number((s.custoTotal / (targetCMV / 100)).toFixed(2));
      updated[s.id] = idealPrice;
    });
    setPriceOverrides(updated);
    info(`Preços recalculados para meta de CMV de ${targetCMV}%.`, 'Meta de CMV Aplicada');
  };

  const handleReset = () => {
    const initial: Record<string, number> = {};
    sheets.forEach(s => {
      initial[s.id] = s.precoVenda;
    });
    setPriceOverrides(initial);
    setIfoodFeeOverride(0.28);
    setMixBalcao([...MIX_PAGAMENTOS_BALCAO_PADRAO]);
    info('Todos os parâmetros foram restaurados para os valores oficiais do cardápio.', 'Simulador Resetado');
  };

  // Open confirmation modal for applying changes
  const handleOpenApplyModal = () => {
    const changed = sheets.filter(s => priceOverrides[s.id] !== s.precoVenda);
    if (changed.length === 0) {
      alert('Nenhum preço foi alterado na simulação para ser aplicado.');
      return;
    }
    setIsConfirmApplyOpen(true);
  };

  // Commit changes after user confirms in modal
  const handleConfirmApply = (motivo: string) => {
    const updates = sheets.map(s => ({
      id: s.id,
      novoPreco: priceOverrides[s.id] || s.precoVenda,
      novaTaxaCanal: s.canal === 'IFOOD' ? ifoodFeeOverride : balcaoFeeCalculated
    }));

    const updatedSheets = TechnicalSheetService.applyBatchPriceUpdates(updates);
    onApplyNewPrices(updatedSheets);
    setIsConfirmApplyOpen(false);
    success(
      `Preços atualizados com sucesso e histórico de auditoria registrado ("${motivo}").`,
      'Cardápio Atualizado'
    );
  };

  // Export Matrix CSV
  const handleExportMatrixCSV = () => {
    const headers = [
      'Prato',
      'Canal',
      'Custo Direto (R$)',
      'Preco Atual (R$)',
      'CMV Atual (%)',
      'Margem Atual (R$)',
      'Preco Simulado (R$)',
      'CMV Simulado (%)',
      'Margem Simulada (R$)',
      'Margem Simulada (%)',
      'Delta Unitario (R$)',
      'Volume Mensal Estimado',
      'Impacto Lucro Mensal (R$)'
    ];

    const rows = simulatedRows.map(r => [
      `"${r.sheet.nome}"`,
      r.sheet.canal,
      r.custoTotal.toFixed(2),
      r.precoAtual.toFixed(2),
      (r.cmvAtual * 100).toFixed(1),
      r.margemAtualReais.toFixed(2),
      r.precoSimulado.toFixed(2),
      (r.cmvSimulado * 100).toFixed(1),
      r.margemSimuladaReais.toFixed(2),
      (r.margemSimuladaPercent * 100).toFixed(1),
      r.deltaMargemReais.toFixed(2),
      r.volumeMensalEstimado,
      r.lucroAdicionalMensal.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriz_DRE_Precificacao_Grupo_Azevedo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Matriz de precificação DRE exportada para CSV.', 'Exportação Concluída');
  };

  // Build items for confirmation modal
  const changedItemsForModal: PriceUpdateItem[] = useMemo(() => {
    return simulatedRows
      .filter(r => r.precoSimulado !== r.precoAtual)
      .map(r => ({
        sheetId: r.sheet.id,
        nome: r.sheet.nome,
        canal: r.sheet.canal,
        precoAtual: r.precoAtual,
        novoPreco: r.precoSimulado,
        cmvAtual: r.cmvAtual,
        novoCmv: r.cmvSimulado
      }));
  }, [simulatedRows]);

  return (
    <div className="space-y-6">

      {/* Header Corporativo do Simulador */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Padrão Grupo Azevedo
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-emerald-400/90 font-semibold">Matriz DRE de Engenharia & Margens</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Simulador de Precificação & Margem
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Analise em tempo real o impacto financeiro de reajustes no cardápio, oscilações no mix de pagamentos ou comissões de delivery. Projete o incremento no retorno líquido antes de aplicar as alterações na operação.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportMatrixCSV}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenApplyModal}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Aplicar Reajuste ao Cardápio</span>
            </button>
          </div>
        </div>

        {/* SELO OBRIGATÓRIO: DADOS DE EXEMPLO & ORIGEM DOS VOLUMES */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
            <span>DADOS DE EXEMPLO</span>
          </div>
          <p className="text-xs text-slate-300">
            <strong>Origem:</strong> Faturamento simulado de <span className="font-mono text-white font-bold">{formatCurrency(dreTotals.faturamentoAtual)}</span> e volume de <span className="font-mono text-white font-bold">{dreTotals.volumeTotal} pratos/mês</span> calculados por estimativas padrão por canal (180 un/mês Balcão, 140 un/mês iFood). A integração com as vendas reais por item será alimentada via importador na <strong>Fase 5</strong>.
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO DRE (DASHBOARD EXECUTIVO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Faturamento Projetado */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Faturamento Mensal Simulado
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 font-mono">
            {formatCurrency(dreTotals.faturamentoSimulado)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
            <span className="text-gray-400">Atual:</span>
            <span className="text-gray-600 font-mono">{formatCurrency(dreTotals.faturamentoAtual)}</span>
            <span className={`px-1.5 py-0.2 rounded-md ${
              dreTotals.faturamentoSimulado >= dreTotals.faturamentoAtual 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {dreTotals.faturamentoAtual > 0 
                ? formatarPercentualBRL((dreTotals.faturamentoSimulado - dreTotals.faturamentoAtual) / dreTotals.faturamentoAtual, 1)
                : '0,0%'}
            </span>
          </div>
        </div>

        {/* Card 2: CMV Médio Projetado */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              CMV Projetado
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 font-mono">
            {formatarPercentualBRL(dreTotals.cmvMedioSimulado, 1)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {(() => {
              const status = getCmvStatus(dreTotals.cmvMedioSimulado, 0.32);
              return (
                <span className={`font-bold px-2 py-0.5 rounded-md border ${status.badgeClasse}`}>
                  {status.descricao}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Card 3: Margem de Contribuição Total */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Margem de Contribuição
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
            {formatCurrency(dreTotals.margemSimuladaTotal)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Margem de Contribuição: <strong className="text-emerald-700">{formatarPercentualBRL(dreTotals.margemMediaPercent, 1)}</strong> da receita
          </p>
        </div>

        {/* Card 4: Impacto / Delta Lucro Mensal */}
        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500/40 shadow-xs bg-linear-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Ganho Mensal Adicional
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${
            dreTotals.lucroDeltaTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {dreTotals.lucroDeltaTotal >= 0 ? '+' : ''}{formatCurrency(dreTotals.lucroDeltaTotal)}
          </p>
          <span className="text-xs text-emerald-800 font-semibold block mt-1">
            Projeção sobre {dreTotals.volumeTotal} pratos/mês
          </span>
        </div>

      </div>

      {/* CONTROLES DE CENÁRIO RÁPIDO & SLIDERS DE CANAIS */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-500" />
              <span>Simuladores Rápidos & Cenários What-If</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Aplique variações percentuais em lote para simular cenários de reajuste ou absorção de inflação.
            </p>
          </div>

          {/* Botões Pré-definidos */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => applyPresetAdjustment(5)}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              +5% Geral
            </button>
            <button
              type="button"
              onClick={() => applyPresetAdjustment(10, 'IFOOD')}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              +10% só iFood
            </button>
            <button
              type="button"
              onClick={() => applyTargetCMVPreset(30)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fixar CMV em 30%
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Valores</span>
            </button>
          </div>
        </div>

        {/* Sliders Interativos de Comissões e Taxas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          
          {/* Slider Taxa iFood */}
          <div className="p-3.5 bg-red-50/40 border border-red-100 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                <Bike className="w-4 h-4 text-red-600" />
                <span>Comissão iFood Delivery</span>
              </div>
              <span className="text-[11px] text-red-700/80">Comissão de intermediação e repasse iFood</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.20"
                max="0.35"
                step="0.005"
                value={ifoodFeeOverride}
                onChange={(e) => setIfoodFeeOverride(Number(e.target.value))}
                className="w-28 accent-red-600 cursor-pointer"
              />
              <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-mono font-black min-w-[54px] text-center">
                {formatarPercentualBRL(ifoodFeeOverride, 1)}
              </span>
            </div>
          </div>

          {/* Bloco Taxa Balcão com Mix Ponderado */}
          <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Store className="w-4 h-4 text-emerald-700" />
                <span>Taxa Média Ponderada Balcão</span>
              </div>
              <span className="text-[11px] text-emerald-700/80">Calculada pelo mix de Pix, Dinheiro, Débito, Crédito e VR</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-mono font-black min-w-[54px] text-center">
                {formatarPercentualBRL(balcaoFeeCalculated, 2)}
              </span>
              <button
                type="button"
                onClick={() => setIsMixModalOpen(true)}
                className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Configurar Mix de Pagamentos do Balcão"
              >
                <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mix</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* TABELA MATRIZ DRE */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        
        {/* Filtro de Canal da Tabela */}
        <div className="p-4 sm:px-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Exibir Linhas:
            </span>
            <button
              type="button"
              onClick={() => setFilterChannel('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterChannel === 'TODOS'
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todos ({simulatedRows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterChannel('BALCAO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterChannel === 'BALCAO'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Balcão ({simulatedRows.filter(r => r.sheet.canal === 'BALCAO').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterChannel('IFOOD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterChannel === 'IFOOD'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-red-800 hover:bg-red-50'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>iFood ({simulatedRows.filter(r => r.sheet.canal === 'IFOOD').length})</span>
            </button>
          </div>

          <span className="text-xs text-gray-400 font-mono">
            {filteredRows.length} pratos na visualização
          </span>
        </div>

        {/* Tabela de Preços e Impacto */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Prato & Canal</th>
                <th className="py-3 px-3 text-right">Custo Direto</th>
                <th className="py-3 px-3 text-right">Preço Atual</th>
                <th className="py-3 px-3 text-right">CMV Atual</th>
                <th className="py-3 px-3 text-right">Margem Atual</th>
                <th className="py-3 px-4 text-right bg-amber-50/80 font-black text-amber-900 border-x border-amber-200">
                  Novo Preço Simulado
                </th>
                <th className="py-3 px-3 text-right bg-amber-50/40">Novo CMV %</th>
                <th className="py-3 px-3 text-right bg-amber-50/40">Nova Margem (R$)</th>
                <th className="py-3 px-3 text-right font-black text-emerald-700">Δ Margem Unitária</th>
                <th className="py-3 px-4 text-right font-black text-gray-900">Impacto Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const isModified = row.precoSimulado !== row.precoAtual;
                const isPositiveDelta = row.deltaMargemReais >= 0;
                const cmvAtualStatus = getCmvStatus(row.cmvAtual, 0.32);
                const cmvSimuladoStatus = getCmvStatus(row.cmvSimulado, 0.32);

                return (
                  <tr key={row.sheet.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Prato & Canal */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          row.sheet.canal === 'IFOOD' ? 'bg-red-500' : 'bg-emerald-500'
                        }`} />
                        <div>
                          <p className="font-bold text-gray-900">{row.sheet.nome}</p>
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            {row.sheet.categoria} &bull; {row.sheet.canal === 'IFOOD' ? 'iFood' : 'Balcão'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Custo Direto */}
                    <td className="py-3 px-3 text-right font-mono text-gray-600">
                      {formatCurrency(row.custoTotal)}
                    </td>

                    {/* Preço Atual */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">
                      {formatCurrency(row.precoAtual)}
                    </td>

                    {/* CMV Atual */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${cmvAtualStatus.badgeClasse}`}>
                        {formatarPercentualBRL(row.cmvAtual, 1)}
                      </span>
                    </td>

                    {/* Margem Atual */}
                    <td className="py-3 px-3 text-right font-mono text-gray-700">
                      {formatCurrency(row.margemAtualReais)}{' '}
                      <span className="text-[10px] text-gray-400">({formatarPercentualBRL(row.margemAtualPercent, 0)})</span>
                    </td>

                    {/* Novo Preço Simulado (Input Dinâmico) */}
                    <td className="py-2 px-4 text-right bg-amber-50/80 border-x border-amber-200">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-amber-700 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="1"
                          value={row.precoSimulado}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setPriceOverrides(prev => ({ ...prev, [row.sheet.id]: val }));
                          }}
                          className={`w-24 px-2 py-1.5 text-right font-mono font-black text-sm rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                            isModified 
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Novo CMV % */}
                    <td className="py-3 px-3 text-right font-mono bg-amber-50/40">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${cmvSimuladoStatus.badgeClasse}`}>
                        {formatarPercentualBRL(row.cmvSimulado, 1)}
                      </span>
                    </td>

                    {/* Nova Margem Simulada */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 bg-amber-50/40">
                      {formatCurrency(row.margemSimuladaReais)}{' '}
                      <span className="text-[10px] text-emerald-600">({formatarPercentualBRL(row.margemSimuladaPercent, 0)})</span>
                    </td>

                    {/* Delta Unitário */}
                    <td className="py-3 px-3 text-right font-mono font-black">
                      <span className={`flex items-center justify-end gap-1 ${
                        isPositiveDelta ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isPositiveDelta ? '+' : ''}{formatCurrency(row.deltaMargemReais)}
                      </span>
                    </td>

                    {/* Impacto Mensal */}
                    <td className="py-3 px-4 text-right font-mono font-black">
                      <span className={`px-2 py-1 rounded-lg text-xs ${
                        row.lucroAdicionalMensal > 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : row.lucroAdicionalMensal < 0 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.lucroAdicionalMensal > 0 ? '+' : ''}{formatCurrency(row.lucroAdicionalMensal)}
                      </span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-gray-400" />
            <span>Altere os valores na coluna <strong>Novo Preço Simulado</strong> para ver o impacto instantâneo.</span>
          </div>
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>Salvar no Cardápio Oficial</span>
          </button>
        </div>

      </div>

      {/* Modal de Mix de Pagamentos do Balcão */}
      {isMixModalOpen && (
        <CounterPaymentMixModal
          isOpen={isMixModalOpen}
          onClose={() => setIsMixModalOpen(false)}
          mix={mixBalcao}
          onSave={(newMix) => {
            setMixBalcao(newMix);
            success('Mix de pagamentos do balcão atualizado e taxa recalculada.', 'Mix Salvo');
          }}
        />
      )}

      {/* Modal de Confirmação & Lista p/ Portal do iFood */}
      {isConfirmApplyOpen && (
        <ApplyPriceConfirmationModal
          isOpen={isConfirmApplyOpen}
          onClose={() => setIsConfirmApplyOpen(false)}
          onConfirm={handleConfirmApply}
          changedItems={changedItemsForModal}
          lucroDeltaMensal={dreTotals.lucroDeltaTotal}
        />
      )}

    </div>
  );
};
