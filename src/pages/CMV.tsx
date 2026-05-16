import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle,
  ChevronDown,
  Download,
  Calendar,
  Sparkles,
  Save,
  Check,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import CSVImportModal from '../components/CSVImportModal';
import { analyzeMenuEngineering } from '../services/geminiService';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function CMV() {
  const { 
    isDarkMode, 
    brandColors, 
    currentStore, 
    topProducts,
    inventoryItems,
    saveCMVPeriod, 
    loadCMVPeriod,
    setTopProducts,
    setInventoryItems
  } = useStore();

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('05'); // Default to May
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const categories = [
    'Todos',
    'Bebidas',
    'Combo Lojista',
    'Delicias',
    'HotDog',
    'Linha Catupiry',
    'Linha Especial',
    'Linha Embativel',
    'Linha Infatil',
    'Linha Pestisco',
    'Linha Super',
    'Linha Tradicional',
    'Naturais Light',
    'Opcionais',
    'Promo',
    'Saladas',
    'Sobremesa',
    'Sucos',
    'Sucos Naturais'
  ];

  const activeProducts = topProducts.filter(p => p.active !== false);
  const negativeMarginProducts = topProducts.filter(p => (p.margin || 0) < 0 && p.active !== false);

  const analyzeNegativeMargins = async () => {
    if (negativeMarginProducts.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeMenuEngineering(negativeMarginProducts);
      setAiAnalysis(result || "Sem análise disponível.");
    } catch (error) {
      console.error("Erro na análise IA:", error);
      setAiAnalysis("Não foi possível gerar a análise no momento. Verifique sua conexão ou tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-load data when period changes
  useEffect(() => {
    const loadData = async () => {
      const hasData = await loadCMVPeriod(selectedMonth, selectedYear);
      if (!hasData) {
        // If no data exists for the period, clear the state to avoid "ghost data" from previous months
        setTopProducts([]);
        setInventoryItems([]);
      }
    };
    loadData();
  }, [selectedMonth, selectedYear, currentStore.id]);

  const handleSavePeriod = async () => {
    setIsSaving(true);
    try {
      await saveCMVPeriod(selectedMonth, selectedYear, inventoryItems, topProducts);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);
    } catch (err) {
      alert('Erro ao salvar dados do período.');
    } finally {
      setIsSaving(false);
    }
  };

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  // Calculate Consolidated CMV
  const totalFaturamento = activeProducts.reduce((acc, curr) => acc + (curr.faturamento || 0), 0);
  const totalCmvValor = activeProducts.reduce((acc, curr) => acc + ((curr.cmv || 0) * (curr.quantidadeVendas || 0)), 0);
  const consolidatedCmvPercent = totalFaturamento > 0 ? (totalCmvValor / totalFaturamento) * 100 : 0;

  const avgMargin = activeProducts.length > 0 
    ? activeProducts.reduce((acc, curr) => acc + (curr.margin || 0), 0) / activeProducts.length 
    : 0;

  const toggleProductStatus = (productId: string) => {
    setTopProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, active: p.active === false ? true : false } : p
    ));
  };

  const filteredProducts = topProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    let aValue: any;
    let bValue: any;

    if (key === 'name') {
      aValue = a.name.toLowerCase();
      bValue = b.name.toLowerCase();
    } else if (key === 'quantidadeVendas') {
      aValue = a.quantidadeVendas || 0;
      bValue = b.quantidadeVendas || 0;
    } else if (key === 'pMedio') {
      aValue = (a.faturamento || 0) / (a.quantidadeVendas || 1);
      bValue = (b.faturamento || 0) / (b.quantidadeVendas || 1);
    } else if (key === 'cmv') {
      aValue = a.cmv || 0;
      bValue = b.cmv || 0;
    } else if (key === 'cmvTotal') {
      aValue = (a.cmv || 0) * (a.quantidadeVendas || 0);
      bValue = (b.cmv || 0) * (b.quantidadeVendas || 0);
    } else if (key === 'lucroBrutoTotal') {
      aValue = (a.faturamento || 0) - ((a.cmv || 0) * (a.quantidadeVendas || 0));
      bValue = (b.faturamento || 0) - ((b.cmv || 0) * (b.quantidadeVendas || 0));
    } else if (key === 'lucroBrutoUnid') {
      const aMedio = (a.faturamento || 0) / (a.quantidadeVendas || 1);
      const bMedio = (b.faturamento || 0) / (b.quantidadeVendas || 1);
      aValue = aMedio - (a.cmv || 0);
      bValue = bMedio - (b.cmv || 0);
    } else if (key === 'cmvPercent') {
      const aMedio = (a.faturamento || 0) / (a.quantidadeVendas || 1);
      const bMedio = (b.faturamento || 0) / (b.quantidadeVendas || 1);
      aValue = aMedio > 0 ? ((a.cmv || 0) / aMedio) * 100 : 0;
      bValue = bMedio > 0 ? ((b.cmv || 0) / bMedio) * 100 : 0;
    } else if (key === 'margin') {
      aValue = a.margin || 0;
      bValue = b.margin || 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className={`text-3xl font-bold uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Engenharia de Cardápio (CMV)</h2>
          <p className="text-slate-500 font-medium italic">Análise de rentabilidade e fichas técnicas por período</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 p-1 rounded-2xl">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              {months.map(m => (
                <option key={m.value} value={m.value} className="dark:bg-[#1E1E1E]">{m.label}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              <option value="2025" className="dark:bg-[#1E1E1E]">2025</option>
              <option value="2026" className="dark:bg-[#1E1E1E]">2026</option>
            </select>
          </div>

          <button 
            onClick={handleSavePeriod}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              showSavedFeedback 
                ? 'bg-green-500 text-white' 
                : isDarkMode ? 'bg-[#333] text-white hover:bg-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : showSavedFeedback ? (
              <Check className="w-3 h-3" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {showSavedFeedback ? 'Salvo!' : 'Salvar Período'}
          </button>

          <div className="flex gap-2 flex-1 md:flex-none">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold border transition-all hover:scale-105 active:scale-95 ${
              isDarkMode ? 'border-[#333] text-white hover:bg-black' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
            }`}>
              <Sparkles className="w-5 h-5 text-[#FFB800]" /> Importar via IA
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {negativeMarginProducts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-3xl border-2 border-red-700/20 bg-red-50/30 dark:bg-red-950/10 transition-colors relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-20 h-20 text-red-700" />
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-700 rounded-2xl shadow-lg shadow-red-700/20">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-black uppercase italic tracking-tighter flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Alerta de Engenharia de Cardápio (IA)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
                Identificamos <span className="font-black text-red-700">{negativeMarginProducts.length} produtos</span> com margem de contribuição negativa. Estes itens estão gerando prejuízo direto a cada venda.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {negativeMarginProducts.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-black/40 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className={`text-xs font-black uppercase italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</span>
                    <span className="text-xs font-black text-red-700">{p.margin}%</span>
                    <button 
                      onClick={() => toggleProductStatus(p.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-700 transition-all"
                    >
                      Desativar
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={analyzeNegativeMargins}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                  {isAnalyzing ? "Analisando..." : "Consultar Recomendação IA"}
                </button>
              </div>

              {aiAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white/50 dark:bg-black/30 rounded-2xl border border-red-200 dark:border-red-900/20 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed"
                >
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-red-700 uppercase tracking-widest">
                    <Check className="w-3 h-3" /> Sugestões Estratégicas
                  </div>
                  <div className="whitespace-pre-line">
                    {aiAnalysis}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>CMV Consolidado (Mês)</div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-black italic ${isDarkMode ? 'text-white' : 'text-black'}`}>{consolidatedCmvPercent.toFixed(1)}%</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Valor do CMV</span>
              <span className="text-sm font-black text-amber-500">{formatCurrency(totalCmvValor)}</span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-[#333] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${consolidatedCmvPercent}%`, backgroundColor: brandColors.button }} />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>Margem Média Estimada</div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-black italic ${isDarkMode ? 'text-white' : 'text-black'}`}>{avgMargin.toFixed(1)}%</span>
            <span className="text-blue-500 text-xs font-bold mb-1 italic">Sugestão: Min. 65%</span>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-[#333] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700 bg-blue-500" style={{ width: `${avgMargin}%` }} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`rounded-[2.5rem] border overflow-hidden transition-colors ${
        isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-xl shadow-slate-100'
      }`}>
        <div className="p-6 border-b dark:border-[#333] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${currentStore.brand === 'BEBELU' || isDarkMode ? 'text-amber-500' : 'text-[#FFB800]'}`}>Análise Detalhada</div>
            <div className={`text-lg font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Produtos & Engenharia</div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl transition-all outline-none border text-xs font-bold ${
                  isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}
              />
            </div>
            
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`appearance-none pl-10 pr-10 py-2 rounded-xl border transition-all outline-none text-xs font-bold cursor-pointer ${
                  isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200 shadow-sm text-slate-900'
                }`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-[#1E1E1E]">{cat}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-[0.2em] font-black ${isDarkMode ? 'text-slate-500 bg-black/20' : 'text-slate-400 bg-slate-50/50'}`}>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Produto
                    {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-center cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('quantidadeVendas')}>
                  <div className="flex items-center justify-center gap-1">
                    Quant.
                    {sortConfig?.key === 'quantidadeVendas' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-right cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('pMedio')}>
                  <div className="flex items-center justify-end gap-1">
                    P. Médio
                    {sortConfig?.key === 'pMedio' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-right cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('cmv')}>
                  <div className="flex items-center justify-end gap-1">
                    CMV Méd.
                    {sortConfig?.key === 'cmv' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-right cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('cmvTotal')}>
                  <div className="flex items-center justify-end gap-1">
                    CMV Total
                    {sortConfig?.key === 'cmvTotal' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-right cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('lucroBrutoTotal')}>
                  <div className="flex items-center justify-end gap-1">
                    L. Bruto
                    {sortConfig?.key === 'lucroBrutoTotal' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-right cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('lucroBrutoUnid')}>
                  <div className="flex items-center justify-end gap-1">
                    L.B. Unid
                    {sortConfig?.key === 'lucroBrutoUnid' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-3 py-5 text-center cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('cmvPercent')}>
                  <div className="flex items-center justify-center gap-1">
                    CMV%
                    {sortConfig?.key === 'cmvPercent' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th className="px-8 py-5 text-right whitespace-nowrap cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => handleSort('margin')}>
                  <div className="flex items-center justify-end gap-1">
                    Margem %
                    {sortConfig?.key === 'margin' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
              {sortedProducts.length > 0 ? sortedProducts.map((product) => {
                const pMedio = product.faturamento / (product.quantidadeVendas || 1);
                const cmvMedio = product.cmv || 0;
                const cmvTotal = cmvMedio * product.quantidadeVendas;
                const lucroBrutoTotal = product.faturamento - cmvTotal;
                const lucroBrutoUnid = pMedio - cmvMedio;
                const cmvPercent = pMedio > 0 ? (cmvMedio / pMedio) * 100 : 0;
                
                return (
                  <tr key={product.id} className={`hover:bg-slate-50/50 dark:hover:bg-black/10 transition-colors group ${product.active === false ? 'opacity-40 grayscale' : ''}`}>
                    <td className="px-6 py-6">
                      <button 
                        onClick={() => toggleProductStatus(product.id)}
                        className={`w-10 h-5 rounded-full relative transition-all ${
                          product.active === false 
                            ? 'bg-slate-200 dark:bg-[#333]' 
                            : 'bg-green-500 shadow-sm shadow-green-500/30'
                        }`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                          product.active === false ? 'left-1' : 'left-6'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-6 min-w-[180px]">
                      <div className="font-black text-slate-900 dark:text-[#FFB800] uppercase italic tracking-tighter transition-colors line-clamp-1">{product.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold italic">{product.category || 'Geral'}</div>
                    </td>
                    <td className="px-3 py-6 text-center text-xs font-black dark:text-slate-300 italic">
                      {product.quantidadeVendas}
                    </td>
                    <td className="px-3 py-6 text-right text-xs font-black dark:text-slate-300">
                      {formatCurrency(pMedio)}
                    </td>
                    <td className="px-3 py-6 text-right text-xs font-black text-amber-500">
                      {formatCurrency(cmvMedio)}
                    </td>
                    <td className="px-3 py-6 text-right text-xs font-black text-slate-400">
                      {formatCurrency(cmvTotal)}
                    </td>
                    <td className="px-3 py-6 text-right text-xs font-black text-green-600">
                      {formatCurrency(lucroBrutoTotal)}
                    </td>
                    <td className="px-3 py-6 text-right text-xs font-black dark:text-slate-300">
                      {formatCurrency(lucroBrutoUnid)}
                    </td>
                    <td className="px-3 py-6 text-center text-[10px] font-black text-red-400 italic">
                      {cmvPercent.toFixed(1)}%
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-black italic ${product.margin >= 65 ? 'text-green-500' : 'text-amber-500'}`}>
                          {product.margin}%
                        </span>
                        <div className="w-16 h-1 mt-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${product.margin >= 65 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${product.margin}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center text-slate-400 text-xs italic font-medium uppercase tracking-widest">
                    Nenhum produto cadastrado para análise de margem. Importe seu relatório de vendas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 border-t dark:border-[#333] flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-left">
            Mostrando {topProducts.length} produtos
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Anterior</button>
            <button className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-100 text-black'
            }`}>1</button>
            <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black dark:hover:text-white transition-colors">Próximo</button>
          </div>
        </div>
      </div>

      <CSVImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        type="products" 
      />
    </div>
  );
}
