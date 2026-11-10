import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Store, 
  Bike, 
  Sparkles, 
  ChefHat, 
  Scale, 
  Clock, 
  Download, 
  RefreshCw, 
  ArrowUpDown, 
  Layers, 
  Package, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  Copy, 
  Eye, 
  FileSpreadsheet,
  Printer,
  Sliders,
  UtensilsCrossed
} from 'lucide-react';
import { TechnicalSheet, ChannelType, SheetCategory, SubRecipe } from '../types/technicalSheet';
import { TechnicalSheetService } from '../services/TechnicalSheetService';
import { TechnicalSheetModal } from './TechnicalSheets/TechnicalSheetModal';
import { TechnicalSheetFormModal } from './TechnicalSheets/TechnicalSheetFormModal';
import { MarginSimulatorModal } from './TechnicalSheets/MarginSimulatorModal';
import { SubRecipesTab } from './TechnicalSheets/SubRecipesTab';
import { PriceMatrixSimulatorTab } from './TechnicalSheets/PriceMatrixSimulatorTab';
import { IngredientsTab } from './TechnicalSheets/IngredientsTab';
import { IngredientService } from '../services/IngredientService';
import { formatarMoedaBRL, formatarPercentualBRL, getCmvStatus } from '../utils/foodServiceMath';
import { useToast } from '../contexts/ToastContext';

type TopModuleTab = 'INSUMOS' | 'SUB_RECEITAS' | 'CARDAPIO' | 'SIMULADOR' | 'ENGENHARIA';

export default function TechnicalSheets() {
  const { showToast, success, info } = useToast();
  
  // Navigation State between Module Tabs
  const [activeModuleTab, setActiveModuleTab] = useState<TopModuleTab>('INSUMOS');

  // Data State
  const [sheets, setSheets] = useState<TechnicalSheet[]>(() => TechnicalSheetService.getSheets());
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>(() => TechnicalSheetService.getSubRecipes());
  const [ingredientsCount] = useState<number>(() => IngredientService.getIngredients('3').length);
  
  // Filters State for Aba 1 (Cardápio)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<'TODOS' | ChannelType>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<'TODAS' | SheetCategory>('TODAS');
  const [sortBy, setSortBy] = useState<'NOME' | 'CMV_ASC' | 'CMV_DESC' | 'PRECO_DESC' | 'MARGEM_DESC'>('CMV_ASC');

  // Modal States
  const [selectedSheetForDetail, setSelectedSheetForDetail] = useState<{ sheet: TechnicalSheet; initialTab: 'FINANCEIRO' | 'COZINHA' | 'INFLACAO' } | null>(null);
  const [sheetToEdit, setSheetToEdit] = useState<TechnicalSheet | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [sheetForSimulator, setSheetForSimulator] = useState<TechnicalSheet | null>(null);

  const formatCurrency = (val: number) => formatarMoedaBRL(val);

  // Filtered & Sorted Sheets for Tab 1
  const filteredSheets = useMemo(() => {
    return sheets.filter((sheet) => {
      const matchesSearch = 
        sheet.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.descricao?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.ingredientes.some(i => i.nome.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesChannel = 
        selectedChannel === 'TODOS' || sheet.canal === selectedChannel;

      const matchesCategory = 
        selectedCategory === 'TODAS' || sheet.categoria === selectedCategory;

      return matchesSearch && matchesChannel && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'NOME') return a.nome.localeCompare(b.nome);
      if (sortBy === 'CMV_ASC') return a.cmvTeoricoPercent - b.cmvTeoricoPercent;
      if (sortBy === 'CMV_DESC') return b.cmvTeoricoPercent - a.cmvTeoricoPercent;
      if (sortBy === 'PRECO_DESC') return b.precoVenda - a.precoVenda;
      if (sortBy === 'MARGEM_DESC') return b.margemContribuicaoReais - a.margemContribuicaoReais;
      return 0;
    });
  }, [sheets, searchQuery, selectedChannel, selectedCategory, sortBy]);

  // Global KPIs calculated from all currently active sheets
  const kpis = useMemo(() => {
    const totalCount = sheets.length;
    if (totalCount === 0) {
      return { totalCount: 0, balcaoCount: 0, ifoodCount: 0, cmvMedio: 0, custoMedio: 0, margemMediaReais: 0 };
    }

    const balcaoCount = sheets.filter(s => s.canal === 'BALCAO').length;
    const ifoodCount = sheets.filter(s => s.canal === 'IFOOD').length;

    const cmvMedio = sheets.reduce((sum, s) => sum + s.cmvTeoricoPercent, 0) / totalCount;
    const custoMedio = sheets.reduce((sum, s) => sum + s.custoTotal, 0) / totalCount;
    const margemMediaReais = sheets.reduce((sum, s) => sum + s.margemContribuicaoReais, 0) / totalCount;

    return { totalCount, balcaoCount, ifoodCount, cmvMedio, custoMedio, margemMediaReais };
  }, [sheets]);

  // Actions
  const handleSaveSheet = (saved: TechnicalSheet) => {
    const updated = TechnicalSheetService.saveSheet(saved);
    setSheets(updated);
    success(`A receita "${saved.nome}" foi atualizada com sucesso.`, 'Ficha Técnica Salva');
  };

  const handleDeleteSheet = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente excluir a ficha técnica "${name}"?`)) {
      const updated = TechnicalSheetService.deleteSheet(id);
      setSheets(updated);
      info(`A ficha "${name}" foi removida.`, 'Ficha Excluída');
    }
  };

  /**
   * Duplica para o canal oposto, ajustando automaticamente
   * as embalagens de Balcão para Delivery ou vice-versa!
   */
  const handleDuplicateToOppositeChannel = (sheet: TechnicalSheet) => {
    const targetChannel = sheet.canal === 'IFOOD' ? 'BALCAO' : 'IFOOD';
    const updated = TechnicalSheetService.duplicateSheet(sheet.id, targetChannel);
    setSheets(updated);
    success(
      `Criada versão para ${targetChannel === 'IFOOD' ? 'iFood (com embalagens térmicas e taxa 28%)' : 'Balcão (com papel bandeja e taxa 7%)'}.`,
      'Ficha Duplicada para Canal Oposto'
    );
  };

  const handleApplySimulatedPrice = (sheetId: string, newPrice: number, newFee: number) => {
    const target = sheets.find(s => s.id === sheetId);
    if (!target) return;

    const updatedSheet: TechnicalSheet = {
      ...target,
      precoVenda: newPrice,
      taxaCanalPercent: newFee,
    };

    const recalculated = TechnicalSheetService.saveSheet(updatedSheet);
    setSheets(recalculated);
    success(`Novo preço de ${formatCurrency(newPrice)} aplicado com sucesso.`, 'Preço Atualizado');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Restaurar o banco de receitas padrão do Grupo Azevedo com os dados homologados? Suas edições locais serão substituídas.')) {
      const defaults = TechnicalSheetService.resetToDefault();
      setSheets(defaults);
      setSubRecipes(TechnicalSheetService.getSubRecipes());
      info('Todas as fichas e sub-receitas foram reiniciadas.', 'Padrão Restaurado');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Nome do Prato',
      'Canal',
      'Categoria',
      'Custo Insumos (R$)',
      'Custo Embalagens (R$)',
      'Custo Direto Total (R$)',
      'Preço Venda (R$)',
      'CMV Teórico (%)',
      'Taxa Canal (%)',
      'Margem Contribuição (R$)',
      'Margem Contribuição (%)',
      'Peso Final (g)',
      'Tempo Preparo (min)'
    ];

    const rows = filteredSheets.map(s => [
      `"${s.nome}"`,
      s.canal,
      s.categoria,
      s.custoInsumos.toFixed(2),
      s.custoEmbalagens.toFixed(2),
      s.custoTotal.toFixed(2),
      s.precoVenda.toFixed(2),
      s.cmvTeoricoPercent.toFixed(2),
      s.taxaCanalPercent.toFixed(1),
      s.margemContribuicaoReais.toFixed(2),
      s.margemContribuicaoPercent.toFixed(1),
      s.pesoFinalGramas,
      s.tempoPreparoMinutos
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fichas_Tecnicas_Grupo_Azevedo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Arquivo CSV com todas as fichas gerado com sucesso.', 'Exportação Concluída');
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16">
      
      {/* 1. Header Superior da Página */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Título & Subtítulo */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800">
                    Food Service &bull; Grupo Azevedo
                  </span>
                  <span className="text-xs text-gray-400">&bull;</span>
                  <span className="text-xs text-gray-500">Engenharia de Cardápio & Cozinha</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-0.5">
                  Fichas Técnicas & Custos
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Gestão padronizada de receitas, sub-receitas de bases culinárias, matriz DRE e procedimentos de cozinha.
                </p>
              </div>
            </div>

            {/* Ações Primárias do Header */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                title="Exportar todas as fichas para planilha"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSheetToEdit(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ NOVA FICHA TÉCNICA</span>
              </button>
            </div>

          </div>

          {/* SISTEMA DE 5 ABAS ENTERPRISE (EM ORDEM OPERACIONAL) */}
          <div className="flex items-center gap-2 mt-6 pt-2 border-t border-gray-100 overflow-x-auto pb-1">
            {/* Aba 1: Insumos */}
            <button
              type="button"
              onClick={() => setActiveModuleTab('INSUMOS')}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeModuleTab === 'INSUMOS'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Aba 1: Insumos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeModuleTab === 'INSUMOS' ? 'bg-white/20 text-white font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {ingredientsCount}
              </span>
            </button>

            {/* Aba 2: Sub-Receitas */}
            <button
              type="button"
              onClick={() => setActiveModuleTab('SUB_RECEITAS')}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeModuleTab === 'SUB_RECEITAS'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20 font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Aba 2: Sub-Receitas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeModuleTab === 'SUB_RECEITAS' ? 'bg-white/20 text-white font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {subRecipes.length}
              </span>
            </button>

            {/* Aba 3: Fichas Técnicas */}
            <button
              type="button"
              onClick={() => setActiveModuleTab('CARDAPIO')}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeModuleTab === 'CARDAPIO'
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20 font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Aba 3: Fichas Técnicas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeModuleTab === 'CARDAPIO' ? 'bg-white/20 text-white font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {sheets.length}
              </span>
            </button>

            {/* Aba 4: Precificação & Margem (DRE) */}
            <button
              type="button"
              onClick={() => setActiveModuleTab('SIMULADOR')}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeModuleTab === 'SIMULADOR'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Aba 4: Precificação (DRE)</span>
            </button>

            {/* Aba 5: Engenharia de Cardápio (Kasavana & Smith) */}
            <button
              type="button"
              onClick={() => setActiveModuleTab('ENGENHARIA')}
              className={`py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeModuleTab === 'ENGENHARIA'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Aba 5: Engenharia de Cardápio</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full">
                Fase 5
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL DE ACORDO COM A ABA SELECIONADA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ==================================================== */}
        {/* ABA 1: INSUMOS (CADASTRO, FC/IC, HISTÓRICO E EXCEL)  */}
        {/* ==================================================== */}
        {activeModuleTab === 'INSUMOS' && (
          <IngredientsTab 
            storeId="3" 
            storeName="Vero Pasta" 
          />
        )}

        {/* ==================================================== */}
        {/* ABA 3: FICHAS TÉCNICAS (CARDS E GESTÃO POR CANAL)    */}
        {/* ==================================================== */}
        {activeModuleTab === 'CARDAPIO' && (
          <div className="space-y-6">
            
            {/* Cards de Resumo (KPIs - no topo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total de Fichas */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total de Receitas
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 font-mono">
                  {kpis.totalCount}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Store className="w-3 h-3" /> {kpis.balcaoCount} Balcão
                  </span>
                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Bike className="w-3 h-3" /> {kpis.ifoodCount} iFood
                  </span>
                </div>
              </div>

              {/* Card 2: CMV Médio Geral */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    CMV Médio Teórico
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 font-mono">
                  {formatarPercentualBRL(kpis.cmvMedio, 1)}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {(() => {
                    const status = getCmvStatus(kpis.cmvMedio, 0.32);
                    return (
                      <span className={`font-bold px-2 py-0.5 rounded-md border ${status.badgeClasse}`}>
                        {status.descricao}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Card 3: Custo Médio Direto */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Custo Direto Médio
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 font-mono">
                  {formatCurrency(kpis.custoMedio)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Insumos culinários + embalagens
                </p>
              </div>

              {/* Card 4: Margem Média de Contribuição */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Margem Contribuição
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
                  {formatCurrency(kpis.margemMediaReais)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Margem unitária média após taxas e custos diretos
                </p>
              </div>

            </div>

            {/* Filtros e Controles de Busca */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs space-y-4">
              
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                
                {/* Input de Busca em Tempo Real */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por prato (ex: Spaghetti, Wrap, Lasanha, Frango)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Ordenação */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    Ordenar por:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="CMV_ASC">Menor CMV %</option>
                    <option value="MARGEM_DESC">Maior margem em R$ (mais lucrativo)</option>
                    <option value="CMV_DESC">Maior CMV % (Atenção)</option>
                    <option value="PRECO_DESC">Maior Preço de Cardápio</option>
                    <option value="NOME">Nome do Prato (A-Z)</option>
                  </select>
                </div>

              </div>

              {/* Filtros em Pílulas: Canal e Categoria */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                
                {/* Canal: Todos, Balcão, iFood */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Canal:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('TODOS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedChannel === 'TODOS'
                        ? 'bg-gray-900 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({sheets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('BALCAO')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedChannel === 'BALCAO'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Balcão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('IFOOD')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedChannel === 'IFOOD'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-gray-100 text-red-800 hover:bg-red-50'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>iFood</span>
                  </button>
                </div>

                {/* Categorias: Todas, Massas, Wraps, Lasanhas, Parmegianas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Categoria:
                  </span>
                  {(['TODAS', 'MASSAS', 'WRAPS', 'LASANHAS', 'PARMEGIANAS'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'TODAS' ? 'Todas' : cat.toLowerCase()}
                    </button>
                  ))}
                </div>

              </div>

            </div>

            {/* Grid de Fichas Técnicas */}
            {filteredSheets.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Nenhuma ficha técnica encontrada
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  Nenhum prato corresponde aos filtros selecionados. Tente ajustar os termos da busca ou os canais.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedChannel('TODOS');
                      setSelectedCategory('TODAS');
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restaurar Fichas Homologadas</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSheets.map((sheet) => {
                  const cmvStatus = getCmvStatus(sheet.cmvTeoricoPercent, 0.32);

                  return (
                    <div
                      key={sheet.id}
                      className="bg-white rounded-2xl border border-gray-200/90 hover:border-orange-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group p-5 sm:p-6"
                    >
                      {/* 1. Header: Badges de Canal, Categoria e Gramatura */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              sheet.canal === 'IFOOD'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {sheet.canal === 'IFOOD' ? <Bike className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                              {sheet.canal === 'IFOOD' ? 'iFood' : 'Balcão'}
                            </span>

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              {sheet.categoria}
                            </span>
                          </div>

                          <span className="text-xs font-semibold text-gray-400 font-mono">
                            {sheet.pesoFinalGramas}g
                          </span>
                        </div>

                        {/* 2. Título sem corte com wrap de até 2 linhas completas e title no hover */}
                        <h3 
                          title={sheet.nome}
                          className="text-base sm:text-lg font-black text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 min-h-[3rem] leading-snug flex items-center"
                        >
                          {sheet.nome}
                        </h3>

                        {sheet.descricao && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1 mb-2">
                            {sheet.descricao}
                          </p>
                        )}
                      </div>

                      {/* 3. Core Gerencial: Bloco Superior e Bloco Inferior */}
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        
                        {/* Bloco Superior: Preço Cardápio em destaque & CMV Teórico com Semáforo Padronizado */}
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              Preço Cardápio
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-orange-600 font-mono block leading-none mt-1">
                              {formatCurrency(sheet.precoVenda)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              CMV Teórico
                            </span>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <span className={`text-lg font-black font-mono leading-none ${cmvStatus.textoClasse}`}>
                                {formatarPercentualBRL(sheet.cmvTeoricoPercent, 1)}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${cmvStatus.badgeClasse}`}>
                                {cmvStatus.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bloco Inferior: Custo Direto Total & Margem de Contribuição */}
                        <div className="grid grid-cols-2 gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              Custo Direto Total
                            </span>
                            <span className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                              {formatCurrency(sheet.custoTotal)}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              Insumos + Emb.
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              Margem de Contribuição
                            </span>
                            <span className="text-sm font-black text-emerald-600 font-mono block mt-0.5">
                              {formatCurrency(sheet.margemContribuicaoReais)}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 block">
                              {formatarPercentualBRL(sheet.margemContribuicaoPercent, 0)} margem
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* 4. Rodapé do Card: Apenas os botões de ação limpos */}
                      <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSheetForDetail({ sheet, initialTab: 'FINANCEIRO' })}
                          className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>Ver Ficha</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateToOppositeChannel(sheet)}
                            title={`Duplicar para canal ${sheet.canal === 'IFOOD' ? 'Balcão' : 'iFood'}`}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Copy className="w-4 h-4" />
                            <span className="hidden xl:inline text-xs font-semibold">Duplicar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSheetToEdit(sheet);
                              setIsFormOpen(true);
                            }}
                            title="Editar Ficha Técnica"
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden xl:inline text-xs font-semibold">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSheet(sheet.id, sheet.nome)}
                            title="Excluir Ficha Técnica"
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ==================================================== */}
        {/* ABA 2: SUB-RECEITAS / PRODUÇÃO DE COZINHA            */}
        {/* ==================================================== */}
        {activeModuleTab === 'SUB_RECEITAS' && (
          <SubRecipesTab
            subRecipes={subRecipes}
            sheets={sheets}
            onSubRecipesChange={(newSubs, updatedSheets) => {
              setSubRecipes(newSubs);
              setSheets(updatedSheets);
            }}
          />
        )}

        {/* ==================================================== */}
        {/* ABA 4: SIMULADOR DE PRECIFICAÇÃO & MARGEM (DRE)       */}
        {/* ==================================================== */}
        {activeModuleTab === 'SIMULADOR' && (
          <PriceMatrixSimulatorTab
            sheets={sheets}
            onApplyNewPrices={(updatedSheets) => {
              setSheets(updatedSheets);
            }}
          />
        )}

        {/* ==================================================== */}
        {/* ABA 5: ENGENHARIA DE CARDÁPIO (KASAVANA & SMITH)      */}
        {/* ==================================================== */}
        {activeModuleTab === 'ENGENHARIA' && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Módulo Avançado • Fase 5 do Cronograma</span>
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Matriz de Engenharia de Cardápio (Kasavana & Smith)
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                  Classificação cruzada de Popularidade (Volume de Vendas) versus Lucratividade (Margem Unitária) com importador direto de relatórios de itens vendidos do iFood e PDV.
                </p>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600">
                Aguardando conclusão das Fases 1 a 4
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="text-2xl">⭐</span>
                <h4 className="font-bold text-gray-900 mt-2">Estrelas (Stars)</h4>
                <p className="text-xs text-gray-600 mt-1">Alta popularidade e alta margem. Manter rigorosamente o padrão e visibilidade máxima.</p>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-2xl">🐴</span>
                <h4 className="font-bold text-gray-900 mt-2">Burros de Carga (Plowhorses)</h4>
                <p className="text-xs text-gray-600 mt-1">Alta popularidade e baixa margem. Reajustar preço suavemente ou otimizar insumos.</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                <span className="text-2xl">🧩</span>
                <h4 className="font-bold text-gray-900 mt-2">Quebra-Cabeças (Puzzles)</h4>
                <p className="text-xs text-gray-600 mt-1">Baixa popularidade e alta margem. Pratos rentáveis que precisam de mais marketing e destaque.</p>
              </div>
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="text-2xl">🐕</span>
                <h4 className="font-bold text-gray-900 mt-2">Cães (Dogs)</h4>
                <p className="text-xs text-gray-600 mt-1">Baixa popularidade e baixa margem. Candidatos a reformulação ou eliminação do cardápio.</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL EXPANDIDO DE FICHA TÉCNICA (COM AS 3 VISÕES) */}
      {selectedSheetForDetail && (
        <TechnicalSheetModal
          sheet={selectedSheetForDetail.sheet}
          isOpen={!!selectedSheetForDetail}
          initialTab={selectedSheetForDetail.initialTab}
          onClose={() => setSelectedSheetForDetail(null)}
          onEdit={(s) => {
            setSelectedSheetForDetail(null);
            setSheetToEdit(s);
            setIsFormOpen(true);
          }}
          onOpenSimulator={(s) => {
            setSelectedSheetForDetail(null);
            setSheetForSimulator(s);
          }}
        />
      )}

      {/* MODAL DE CADASTRO E EDIÇÃO COMPLETO */}
      {isFormOpen && (
        <TechnicalSheetFormModal
          sheet={sheetToEdit}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSheetToEdit(null);
          }}
          onSave={handleSaveSheet}
        />
      )}

      {/* MODAL DO SIMULADOR RÁPIDO DE MARGEM UNITÁRIA */}
      {sheetForSimulator && (
        <MarginSimulatorModal
          sheet={sheetForSimulator}
          isOpen={!!sheetForSimulator}
          onClose={() => setSheetForSimulator(null)}
          onApplyNewPrice={handleApplySimulatedPrice}
        />
      )}

    </div>
  );
}
