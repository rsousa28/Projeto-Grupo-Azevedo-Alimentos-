import React, { useState, useMemo, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  History, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  Layers, 
  Scale, 
  DollarSign, 
  Database,
  ArrowUpDown,
  Tag,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { IngredientMaster, IngredientCategory, AllergenType } from '../../types/foodService';
import { IngredientService, ImpactAnalysis } from '../../services/IngredientService';
import { IngredientFormModal } from './IngredientFormModal';
import { IngredientPriceHistoryModal } from './IngredientPriceHistoryModal';
import { PriceImpactAlertModal } from './PriceImpactAlertModal';
import { MigrationSimulationModal } from './MigrationSimulationModal';
import { QuickPriceUpdateModal } from './QuickPriceUpdateModal';
import { 
  formatarMoedaBRL, 
  calcularCustoUnitarioInsumo, 
  formatarCustoUnidadeUso, 
  formatarFatorBRL, 
  formatarDataBRL,
  formatarPercentualBRL
} from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';
import * as XLSX from 'xlsx';

interface IngredientsTabProps {
  storeId?: string;
  storeName?: string;
}

const CATEGORIES: { label: string; value: 'TODAS' | IngredientCategory }[] = [
  { label: 'Todas as Categorias', value: 'TODAS' },
  { label: 'Proteínas & Carnes', value: 'PROTEINAS' },
  { label: 'Massas & Farinhas', value: 'MASSAS' },
  { label: 'Laticínios & Queijos', value: 'LATICINIOS' },
  { label: 'Molhos & Caldos', value: 'MOLHOS' },
  { label: 'Hortifrúti & Frescos', value: 'HORTIFRUTI' },
  { label: 'Temperos & Condimentos', value: 'TEMPEROS' },
  { label: 'Embalagens Delivery', value: 'EMBALAGENS' },
  { label: 'Descartáveis & Talheres', value: 'DESCARTAVEIS' },
  { label: 'Outros', value: 'OUTROS' },
];

export const IngredientsTab: React.FC<IngredientsTabProps> = ({
  storeId = '3',
  storeName = 'Vero Pasta'
}) => {
  const { success, error, info } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data State
  const [ingredients, setIngredients] = useState<IngredientMaster[]>(() => 
    IngredientService.getIngredients(storeId)
  );

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'TODAS' | IngredientCategory>('TODAS');
  const [selectedAllergen, setSelectedAllergen] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<'NOME' | 'PRECO_ASC' | 'PRECO_DESC' | 'CUSTO_ASC' | 'CUSTO_DESC'>('NOME');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickUpdateOpen, setIsQuickUpdateOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientMaster | null>(null);
  const [historyIngredient, setHistoryIngredient] = useState<IngredientMaster | null>(null);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [impactData, setImpactData] = useState<{ impact: ImpactAnalysis; name: string } | null>(null);

  // Filtered & Sorted Ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      const matchesSearch = 
        ing.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ing.fornecedorPadrao || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.categoria.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        selectedCategory === 'TODAS' || ing.categoria === selectedCategory;

      const matchesAllergen = 
        selectedAllergen === 'TODOS' || 
        (selectedAllergen === 'SEM_ALERGENO' ? ing.alergenos.length === 0 : ing.alergenos.includes(selectedAllergen as AllergenType));

      return matchesSearch && matchesCategory && matchesAllergen;
    }).sort((a, b) => {
      const custoA = calcularCustoUnitarioInsumo(a.precoEmbalagemCompraCentavos, a.quantidadeEmbalagemCompra);
      const custoB = calcularCustoUnitarioInsumo(b.precoEmbalagemCompraCentavos, b.quantidadeEmbalagemCompra);

      if (sortBy === 'NOME') return a.nome.localeCompare(b.nome);
      if (sortBy === 'PRECO_ASC') return a.precoEmbalagemCompraCentavos - b.precoEmbalagemCompraCentavos;
      if (sortBy === 'PRECO_DESC') return b.precoEmbalagemCompraCentavos - a.precoEmbalagemCompraCentavos;
      if (sortBy === 'CUSTO_ASC') return custoA - custoB;
      if (sortBy === 'CUSTO_DESC') return custoB - custoA;
      return 0;
    });
  }, [ingredients, searchQuery, selectedCategory, selectedAllergen, sortBy]);

  // KPIs com Insumos Desatualizados (> 15 dias) e Maior Alta no Mês
  const kpis = useMemo(() => {
    const total = ingredients.length;
    const embalagens = ingredients.filter(i => i.categoria === 'EMBALAGENS' || i.categoria === 'DESCARTAVEIS').length;
    const comAlergenos = ingredients.filter(i => i.alergenos && i.alergenos.length > 0).length;
    
    // Insumos com preço desatualizado (> 15 dias)
    const agora = Date.now();
    const limite15DiasMs = 15 * 24 * 60 * 60 * 1000;
    const desatualizados = ingredients.filter(i => {
      if (!i.dataUltimaCompra) return true;
      const dataCompra = new Date(i.dataUltimaCompra).getTime();
      return isNaN(dataCompra) || (agora - dataCompra) > limite15DiasMs;
    });

    // Maior alta de preço no mês (via histórico)
    let maiorAlta = { nome: 'Preços Estáveis', delta: 0 };
    ingredients.forEach(i => {
      const hist = IngredientService.getPriceHistory(i.id);
      if (hist && hist.length >= 2) {
        const recente = hist[0];
        const anterior = hist[1];
        const custoRec = calcularCustoUnitarioInsumo(recente.precoEmbalagemCompraCentavos, recente.quantidadeEmbalagemCompra);
        const custoAnt = calcularCustoUnitarioInsumo(anterior.precoEmbalagemCompraCentavos, anterior.quantidadeEmbalagemCompra);
        if (custoAnt > 0) {
          const delta = ((custoRec - custoAnt) / custoAnt) * 100;
          if (delta > maiorAlta.delta) {
            maiorAlta = { nome: i.nome, delta: Number(delta.toFixed(1)) };
          }
        }
      }
    });

    return { 
      total, 
      embalagens, 
      comAlergenos, 
      desatualizadosCount: desatualizados.length,
      maiorAlta
    };
  }, [ingredients]);

  // Actions
  const handleBatchPriceUpdate = (updates: Array<{ id: string; novoPrecoCentavos: number; fornecedor?: string; pesoVariavelRealG?: number }>) => {
    const list = IngredientService.getIngredients(storeId);
    let count = 0;
    const hoje = new Date().toISOString().split('T')[0];

    updates.forEach(u => {
      const item = list.find(i => i.id === u.id);
      if (item && item.precoEmbalagemCompraCentavos !== u.novoPrecoCentavos) {
        const updated: IngredientMaster = {
          ...item,
          precoEmbalagemCompraCentavos: u.novoPrecoCentavos,
          fornecedorPadrao: u.fornecedor || item.fornecedorPadrao,
          dataUltimaCompra: hoje,
          updatedAt: new Date().toISOString()
        };
        IngredientService.saveIngredient(updated, storeId, 'Nota Fiscal do Dia');
        count++;
      }
    });

    setIngredients(IngredientService.getIngredients(storeId));
    setIsQuickUpdateOpen(false);
    success(`${count} insumo(s) tiveram o preço atualizado com histórico registrado!`, 'Atualização em Lote Concluída');
  };

  // Actions
  const handleSaveIngredient = (saved: IngredientMaster) => {
    const { updatedList, impact } = IngredientService.saveIngredient(saved, storeId);
    setIngredients(updatedList);

    if (impact.hasPriceChange) {
      setImpactData({ impact, name: saved.nome });
      info(`Preço alterado. Recalculando impactos em cascata...`, 'Preço Atualizado');
    } else {
      success(`O insumo "${saved.nome}" foi salvo com sucesso.`, 'Insumo Cadastrado');
    }
  };

  const handleDeleteIngredient = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente excluir o insumo "${name}"?`)) {
      const updated = IngredientService.deleteIngredient(id, storeId);
      setIngredients(updated);
      info(`O insumo "${name}" foi removido do catálogo.`, 'Insumo Excluído');
    }
  };

  const handleExportExcel = () => {
    IngredientService.exportToExcel(ingredients, storeName);
    success('Planilha de insumos exportada com sucesso!', 'Exportação Concluída');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          error('O arquivo importado está vazio.', 'Arquivo Vazio');
          return;
        }

        const res = IngredientService.importFromData(data, storeId);
        setIngredients(IngredientService.getIngredients(storeId));

        if (res.errors.length > 0) {
          info(`Importados: ${res.imported}, Atualizados: ${res.updated}. Avisos: ${res.errors.length}`, 'Importação Parcial');
        } else {
          success(`${res.imported + res.updated} insumos importados com sucesso!`, 'Importação Concluída');
        }
      } catch (err: any) {
        error(`Falha ao ler planilha: ${err.message || err}`, 'Erro na Importação');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">
              Catálogo de Insumos & Matérias-Primas
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {storeName}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Base unificada de preços de compra, fatores de rendimento técnico (FC/IC) e alérgenos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsMigrationOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-[#202020] hover:bg-gray-50 border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Simulação de unificação de fichas e backup de dados"
          >
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span>Migração & Backup</span>
          </button>

          <button
            onClick={() => setIsQuickUpdateOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Atualização rápida em lote da nota fiscal do dia ou XML da SEFAZ"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-900" />
            <span>Atualização Rápida (Nota do Dia)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-white dark:bg-[#202020] hover:bg-gray-50 border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white dark:bg-[#202020] hover:bg-gray-50 border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              setEditingIngredient(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Insumo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Insumos */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Insumos</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {kpis.total}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">Matérias-primas e insumos</span>
        </div>

        {/* Card 2: Embalagens */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Embalagens & Delivery</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {kpis.embalagens}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Potes, sacos e descartáveis</span>
        </div>

        {/* Card 3: Preço Desatualizado (> 15 dias) */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Preço Desatualizado (&gt; 15 dias)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {kpis.desatualizadosCount}
          </div>
          <span className="text-[10px] text-amber-600/80 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Necessitam cotação recente
          </span>
        </div>

        {/* Card 4: Maior Alta de Preço no Mês */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Maior Alta no Mês</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 font-mono truncate" title={kpis.maiorAlta.nome}>
            {kpis.maiorAlta.delta > 0 ? `+${formatarPercentualBRL(kpis.maiorAlta.delta / 100)}` : 'Estável'}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate block" title={kpis.maiorAlta.nome}>
            {kpis.maiorAlta.nome}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar insumo por nome, fornecedor ou categoria..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Categoria */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold focus:outline-hidden focus:border-amber-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Alérgenos */}
          <div className="md:col-span-2">
            <select
              value={selectedAllergen}
              onChange={e => setSelectedAllergen(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold focus:outline-hidden focus:border-amber-500"
            >
              <option value="TODOS">Todos Alérgenos</option>
              <option value="GLUTEN">Glúten</option>
              <option value="LACTOSE">Lactose</option>
              <option value="OVOS">Ovos</option>
              <option value="SEM_ALERGENO">Sem Alérgenos</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold focus:outline-hidden focus:border-amber-500"
            >
              <option value="NOME">Nome (A-Z)</option>
              <option value="CUSTO_ASC">Menor Custo Unitário</option>
              <option value="CUSTO_DESC">Maior Custo Unitário</option>
              <option value="PRECO_DESC">Maior Preço Compra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Ingredients */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-xs overflow-hidden">
        {filteredIngredients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Nenhum insumo encontrado
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Tente ajustar os filtros de busca ou cadastre uma nova matéria-prima para sua unidade.
            </p>
            <button
              onClick={() => {
                setEditingIngredient(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Insumo</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-[#333] text-[10px] font-black uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">Insumo & Fornecedor</th>
                  <th className="px-3 py-3.5">Categoria</th>
                  <th className="px-3 py-3.5">Embalagem Compra</th>
                  <th className="px-4 py-3.5">Custo por Unidade de Uso</th>
                  <th className="px-3 py-3.5">Rendimento (FC / IC)</th>
                  <th className="px-3 py-3.5">Alérgenos</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
                {filteredIngredients.map(ing => {
                  const custoUnitario = calcularCustoUnitarioInsumo(ing.precoEmbalagemCompraCentavos, ing.quantidadeEmbalagemCompra);
                  const precoCompraFormatado = formatarMoedaBRL(ing.precoEmbalagemCompraCentavos, true);
                  const custoFormatado = formatarCustoUnidadeUso(custoUnitario, ing.unidadeUso);

                  return (
                    <tr key={ing.id} className="hover:bg-amber-500/5 transition-colors group">
                      {/* Insumo */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-gray-900 dark:text-white text-xs">
                          {ing.nome}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          {ing.fornecedorPadrao ? (
                            <span>{ing.fornecedorPadrao}</span>
                          ) : (
                            <span className="italic text-gray-300">Sem fornecedor</span>
                          )}
                          <span>•</span>
                          <span>Comprado em {formatarDataBRL(ing.dataUltimaCompra)}</span>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-3 py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300">
                          {ing.categoria}
                        </span>
                      </td>

                      {/* Embalagem de Compra */}
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-gray-800 dark:text-gray-200">
                          {ing.unidadeCompraNome}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {precoCompraFormatado}
                          <span className="text-[10px] text-gray-400 ml-1">
                            ({ing.quantidadeEmbalagemCompra}{ing.unidadeUso})
                          </span>
                        </div>
                      </td>

                      {/* Custo de Uso (Principal em R$/kg ou R$/L + Secundário em R$/g ou ml com vírgula) */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                          {custoFormatado.principal}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {custoFormatado.secundario}
                        </div>
                      </td>

                      {/* FC e IC com vírgula */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span title="Fator de Correção (Perda no pré-preparo)">
                            <strong className="text-gray-700 dark:text-gray-300">FC:</strong> {formatarFatorBRL(ing.fatorCorrecao)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span title="Índice de Cocção (Variação no cozimento)">
                            <strong className="text-gray-700 dark:text-gray-300">IC:</strong> {formatarFatorBRL(ing.indiceCoccao)}
                          </span>
                        </div>
                      </td>

                      {/* Alérgenos */}
                      <td className="px-3 py-3.5">
                        {ing.alergenos && ing.alergenos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ing.alergenos.map(al => (
                              <span
                                key={al}
                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              >
                                {al}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Livre
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setHistoryIngredient(ing)}
                            title="Histórico de Preços e Comparativo de Fornecedores"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingIngredient(ing);
                              setIsFormOpen(true);
                            }}
                            title="Editar Insumo"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteIngredient(ing.id, ing.nome)}
                            title="Excluir Insumo"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuickPriceUpdateModal
        isOpen={isQuickUpdateOpen}
        onClose={() => setIsQuickUpdateOpen(false)}
        ingredients={ingredients}
        onSaveBatch={handleBatchPriceUpdate}
      />

      <IngredientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveIngredient}
        initialData={editingIngredient}
        storeId={storeId}
      />

      <IngredientPriceHistoryModal
        isOpen={!!historyIngredient}
        onClose={() => setHistoryIngredient(null)}
        ingredient={historyIngredient}
      />

      <PriceImpactAlertModal
        isOpen={!!impactData}
        onClose={() => setImpactData(null)}
        impact={impactData?.impact || null}
        ingredientName={impactData?.name || ''}
      />

      <MigrationSimulationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        onMigrationComplete={() => {
          setIngredients(IngredientService.getIngredients(storeId));
        }}
      />
    </div>
  );
};
