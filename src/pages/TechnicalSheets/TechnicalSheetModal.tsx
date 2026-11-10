import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ChefHat, 
  Scale, 
  Clock, 
  Layers, 
  Package, 
  Utensils, 
  AlertCircle, 
  Percent, 
  DollarSign, 
  CheckCircle2, 
  FileText,
  Store,
  Bike,
  Sparkles,
  Edit2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Link as LinkIcon
} from 'lucide-react';
import { TechnicalSheet } from '../../types/technicalSheet';
import { 
  formatarMoedaBRL, 
  formatarPercentualBRL, 
  getCmvStatus, 
  formatarCustoUnidadeUso,
  formatarDataBRL
} from '../../utils/foodServiceMath';

interface TechnicalSheetModalProps {
  sheet: TechnicalSheet;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (sheet: TechnicalSheet) => void;
  onOpenSimulator: (sheet: TechnicalSheet) => void;
  initialTab?: 'FINANCEIRO' | 'COZINHA' | 'INFLACAO';
}

export const TechnicalSheetModal: React.FC<TechnicalSheetModalProps> = ({
  sheet,
  isOpen,
  onClose,
  onEdit,
  onOpenSimulator,
  initialTab = 'FINANCEIRO'
}) => {
  const [activeTab, setActiveTab] = useState<'FINANCEIRO' | 'COZINHA' | 'INFLACAO'>(initialTab);

  if (!isOpen) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handlePrint = () => {
    window.print();
  };

  // Status visual padronizado do CMV
  const cmvStatus = getCmvStatus(sheet.cmvTeoricoPercent, 0.32);

  // Mock histórico padrão caso não exista na ficha
  const defaultInflation = [
    { 
      mes: 'Nov/2025', 
      custoTotal: Number((sheet.custoTotal * 0.94).toFixed(2)), 
      precoVenda: sheet.precoVenda > 30 ? sheet.precoVenda - 2 : sheet.precoVenda - 1, 
      cmvPercent: Number(((sheet.custoTotal * 0.94) / (sheet.precoVenda > 30 ? sheet.precoVenda - 2 : sheet.precoVenda - 1) * 100).toFixed(2)),
      motivoVariacao: 'Cotação de fornecedores estável',
      itemPrincipalImpactado: 'Insumo Base'
    },
    { 
      mes: 'Dez/2025', 
      custoTotal: Number((sheet.custoTotal * 0.97).toFixed(2)), 
      precoVenda: sheet.precoVenda > 30 ? sheet.precoVenda - 2 : sheet.precoVenda - 1, 
      cmvPercent: Number(((sheet.custoTotal * 0.97) / (sheet.precoVenda > 30 ? sheet.precoVenda - 2 : sheet.precoVenda - 1) * 100).toFixed(2)),
      motivoVariacao: 'Aumento sazonal de fim de ano nos lácteos e carnes',
      itemPrincipalImpactado: 'Laticínios / Proteína'
    },
    { 
      mes: 'Jan/2026', 
      custoTotal: sheet.custoTotal, 
      precoVenda: sheet.precoVenda, 
      cmvPercent: sheet.cmvTeoricoPercent,
      motivoVariacao: 'Reajuste equilibrado no cardápio restabelecendo a margem líquida',
      itemPrincipalImpactado: 'Tabela Vigente'
    }
  ];

  const inflationData = sheet.historicoInflacao && sheet.historicoInflacao.length > 0 
    ? sheet.historicoInflacao 
    : defaultInflation;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-2xl shrink-0 ${
              sheet.canal === 'IFOOD' 
                ? 'bg-red-50 text-red-600 border border-red-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {sheet.canal === 'IFOOD' ? <Bike className="w-6 h-6" /> : <Store className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase ${
                  sheet.canal === 'IFOOD' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Canal {sheet.canal === 'IFOOD' ? 'iFood Delivery' : 'Balcão / Salão'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {sheet.categoria}
                </span>
                <span className="text-xs text-slate-400">
                  Atualizado em: {new Date(sheet.ultimaAtualizacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {sheet.nome}
              </h2>
              {sheet.descricao && (
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-xl">
                  {sheet.descricao}
                </p>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => onOpenSimulator(sheet)}
              className="px-3 py-2 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Abrir Simulador de Preço e Margens"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Simulador</span>
            </button>
            <button
              onClick={() => onEdit(sheet)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Highlights Bar (Visible in Visão 1 & Visão 3) */}
        {activeTab !== 'COZINHA' && (
          <div className="bg-slate-900 text-white px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left border-b border-slate-800">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Custo Direto Total</p>
              <p className="text-lg font-black text-white">{formatCurrency(sheet.custoTotal)}</p>
              <span className="text-[10px] text-slate-400">
                Insumos {formatCurrency(sheet.custoInsumos)} + Emb. {formatCurrency(sheet.custoEmbalagens)}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Preço de Venda</p>
              <p className="text-lg font-black text-amber-400">{formatCurrency(sheet.precoVenda)}</p>
              <span className="text-[10px] text-slate-400">Cardápio Oficial</span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">CMV Teórico</p>
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className={`text-lg font-black ${cmvStatus.textoClasse}`}>
                  {formatarPercentualBRL(sheet.cmvTeoricoPercent, 1)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase border ${cmvStatus.badgeClasse}`}>
                  {cmvStatus.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Meta padrão: ≤ 32%</span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Margem de Contribuição</p>
              <p className="text-lg font-black text-emerald-400">{formatCurrency(sheet.margemContribuicaoReais)}</p>
              <span className="text-[10px] text-slate-400">
                Líquida: {formatarPercentualBRL(sheet.margemContribuicaoPercent, 1)} (Taxa: {formatarPercentualBRL(sheet.taxaCanalPercent, 1)})
              </span>
            </div>
          </div>
        )}

        {/* 3 VISÕES PRINCIPAIS EM ABAS:
            Visão 1: Engenharia de Custos (Financeiro)
            Visão 2: Ficha Técnica Operacional (Modo Cozinha / POP)
            Visão 3: Histórico de Inflação do Prato (Tendência 3 meses) */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('FINANCEIRO')}
              className={`py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'FINANCEIRO'
                  ? 'border-orange-500 text-orange-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Visão 1: Engenharia de Custos (Financeiro)</span>
            </button>

            <button
              onClick={() => setActiveTab('COZINHA')}
              className={`py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'COZINHA'
                  ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ChefHat className="w-4 h-4 text-amber-600" />
              <span>Visão 2: Modo Cozinha (POP)</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">
                Sem R$
              </span>
            </button>

            <button
              onClick={() => setActiveTab('INFLACAO')}
              className={`py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'INFLACAO'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Visão 3: Histórico de Inflação</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-800 font-bold">
                3 Meses
              </span>
            </button>
          </div>

          {activeTab === 'COZINHA' && (
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Imprimir POP da Cozinha para fixar na bancada"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir POP Cozinha</span>
            </button>
          )}
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* VISÃO 1: ENGENHARIA DE CUSTOS (FINANCEIRO) */}
          {activeTab === 'FINANCEIRO' && (
            <div className="space-y-6">
              
              {/* Tabela de Insumos com Vínculo de Sub-Receita */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Detalhamento de Insumos da Receita
                    </h3>
                    <p className="text-xs text-slate-500">
                      Custos diretos por gramatura com vínculo automático a bases corporativas.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Subtotal Insumos:</span>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(sheet.custoInsumos)}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Insumo</th>
                        <th className="py-3 px-3 text-center">Unidade</th>
                        <th className="py-3 px-3 text-right">Quantidade</th>
                        <th className="py-3 px-3 text-right">Custo Unitário</th>
                        <th className="py-3 px-4 text-right">Custo Total</th>
                        <th className="py-3 px-3 text-right text-slate-500">% do Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sheet.ingredientes.map((item, idx) => {
                        const pctOfInsumos = sheet.custoInsumos > 0 
                          ? ((item.custoTotal / sheet.custoInsumos) * 100).toFixed(1) 
                          : '0';
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span>{item.nome}</span>
                                {item.subRecipeId && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <LinkIcon className="w-2.5 h-2.5" /> Sub-Receita
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                                {item.unidade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                              {item.quantidade} {item.unidade}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                              {formatCurrency(item.custoUnitario)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(item.custoTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-xs">
                              {pctOfInsumos}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-right">
                          Subtotal dos Ingredientes:
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-base font-black text-orange-600">
                          {formatCurrency(sheet.custoInsumos)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 text-xs font-mono">
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabela de Embalagens do Canal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Embalagens e Descartáveis ({sheet.canal === 'IFOOD' ? 'iFood Delivery' : 'Balcão / Salão'})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Materiais consumidos diretamente na entrega ou serviço de salão.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Subtotal Embalagens:</span>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(sheet.custoEmbalagens)}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Item de Embalagem / Descartável</th>
                        <th className="py-3 px-3 text-right">Quantidade</th>
                        <th className="py-3 px-3 text-right">Custo Unitário</th>
                        <th className="py-3 px-4 text-right">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sheet.embalagens.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {item.nome}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            {item.quantidade} un
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                            {formatCurrency(item.custoUnitario)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.custoTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-right">
                          Subtotal de Embalagens:
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-base font-black text-orange-600">
                          {formatCurrency(sheet.custoEmbalagens)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tributos & Taxas de Canal (Alíquotas e Comissões) */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-orange-500" />
                  <span>Deduções Obrigatórias: Tributos & Taxas do Canal ({sheet.canal})</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      Comissão do Canal ({sheet.canal === 'IFOOD' ? 'iFood' : 'Cartões Balcão'})
                    </span>
                    <span className="text-base font-black text-red-600 font-mono block mt-1">
                      {formatarPercentualBRL(sheet.taxaCanalPercent, 1)} ({formatCurrency(sheet.precoVenda * (sheet.taxaCanalPercent > 1 ? sheet.taxaCanalPercent / 100 : sheet.taxaCanalPercent))})
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      Imposto Simples Nacional
                    </span>
                    <span className="text-base font-black text-gray-800 font-mono block mt-1">
                      {formatarPercentualBRL(sheet.impostoSimplesPercent, 1)} ({formatCurrency(sheet.precoVenda * (sheet.impostoSimplesPercent > 1 ? sheet.impostoSimplesPercent / 100 : sheet.impostoSimplesPercent))})
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      Margem de Contribuição Líquida
                    </span>
                    <span className="text-base font-black text-emerald-600 font-mono block mt-1">
                      {formatCurrency(sheet.margemContribuicaoReais)} ({formatarPercentualBRL(sheet.margemContribuicaoPercent, 1)})
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VISÃO 2: FICHA TÉCNICA OPERACIONAL (MODO COZINHA / POP - ZERO R$) */}
          {activeTab === 'COZINHA' && (
            <div id="kitchen-pop-sheet" className="space-y-6 print:p-0 print:space-y-4">
              
              {/* Header do Modo Cozinha */}
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0">
                    <ChefHat className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold tracking-widest text-amber-800 uppercase bg-amber-100 px-2 py-0.5 rounded-sm">
                      POP - Procedimento Operacional Padrão
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">
                      {sheet.nome}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Instruções padronizadas para a linha de produção | Modo Cozinha (Sem Valores em R$)
                    </p>
                  </div>
                </div>

                {/* Badges de Operação: Peso e Tempo */}
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold">
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>Peso Final</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {sheet.pesoFinalGramas}g
                    </span>
                    <span className="text-[10px] block text-slate-400">± 15g tolerância</span>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Tempo Médio</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {sheet.tempoPreparoMinutos} min
                    </span>
                    <span className="text-[10px] block text-slate-400">ticket pronto</span>
                  </div>
                </div>
              </div>

              {/* Utensílios Padrão de Medida */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Utensils className="w-4 h-4 text-orange-600" />
                  <span>Utensílios de Medida e Padrão da Estação</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sheet.utensiliosPadrao.map((utensil, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 shadow-2xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {utensil}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabela de Gramaturas Operacionais (SEM R$) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Gramaturas e Proporções dos Insumos (Pesar na Balança Digital)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Insumo / Ingrediente</th>
                        <th className="py-2.5 px-4 text-center">Unidade</th>
                        <th className="py-2.5 px-4 text-right">Quantidade Exata</th>
                        <th className="py-2.5 px-4 text-left">Ponto / Especificação de Cozinha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sheet.ingredientes.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            {item.nome}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase">
                              {item.unidade}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-base font-black text-amber-600">
                            {item.quantidade} {item.unidade}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">
                            Pesar em balança digital tarada
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modo de Preparo Cronológico (POP) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Passo a Passo de Preparo Cronológico (POP)
                </h4>
                <div className="space-y-3">
                  {sheet.passosPreparo.map((passo) => (
                    <div
                      key={passo.passo}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-amber-400 transition-colors flex items-start gap-3.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {passo.passo}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-bold text-slate-900 text-sm">
                            {passo.titulo || `Etapa ${passo.passo}`}
                          </h5>
                          {passo.tempoMinutos && (
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              ~{passo.tempoMinutos} min
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                          {passo.descricao}
                        </p>
                        {passo.alertaPonto && (
                          <div className="mt-2 p-2 bg-amber-50 border-l-2 border-amber-500 rounded-r-md text-xs text-amber-900 font-medium">
                            <span className="font-bold">Atenção ao Ponto:</span> {passo.alertaPonto}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {sheet.observacoesCozinha && (
                <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Observação Crítica do Chef/Gerente: </span>
                  {sheet.observacoesCozinha}
                </div>
              )}
            </div>
          )}

          {/* VISÃO 3: HISTÓRICO DE INFLAÇÃO DO PRATO (TENDÊNCIA 3 MESES) */}
          {activeTab === 'INFLACAO' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                    Tendência Trimestral de Custos
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Variação de CMV & Inflação de Insumos (Últimos 3 Meses)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Acompanhamento histórico da flutuação de insumos alimentícios e repasse de preços ao cardápio.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">CMV Atual</span>
                  <span className="text-2xl font-black text-purple-700 font-mono">
                    {formatarPercentualBRL(sheet.cmvTeoricoPercent, 1)}
                  </span>
                </div>
              </div>

              {/* Cards Comparativos dos 3 Meses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {inflationData.map((pt, idx) => {
                  const ptCmvStatus = getCmvStatus(pt.cmvPercent, 0.32);
                  return (
                    <div
                      key={pt.mes || idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                          <span>{pt.mes}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${ptCmvStatus.badgeClasse}`}>
                            CMV: {formatarPercentualBRL(pt.cmvPercent, 1)}
                          </span>
                        </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Custo Direto:</span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(pt.custoTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Preço Venda:</span>
                          <span className="font-mono font-bold text-orange-600">{formatCurrency(pt.precoVenda)}</span>
                        </div>
                      </div>
                    </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800 block">Fator Principal:</span>
                        {pt.motivoVariacao || 'Variação dentro da curva esperada'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Análise de Diagnóstico de Custos */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs text-gray-700">
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Diagnóstico Executivo do Prato:
                </span>
                <p className="leading-relaxed">
                  O prato apresenta uma estabilidade controlada nos últimos 90 dias, mantendo o CMV na faixa de{' '}
                  <strong>{sheet.cmvTeoricoPercent.toFixed(1)}%</strong>. 
                  Os insumos mais sensíveis a oscilações inflacionárias nesta receita são as proteínas e laticínios. 
                  Caso o fornecedor aplique reajustes acima de 8%, recomenda-se utilizar o <strong>Simulador de Precificação</strong> para readequar a tabela.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Grupo Azevedo Alimentos &bull; Ficha Técnica Oficial #{sheet.id}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
