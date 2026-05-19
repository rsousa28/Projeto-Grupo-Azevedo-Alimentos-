import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  MoreVertical,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { CashFlowEntry } from '../types';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(val);

const CashFlow: React.FC = () => {
  const { isDarkMode } = useStore();
  const [selectedRange, setSelectedRange] = useState('month');
  const [activeTab, setActiveTab] = useState<'operational' | 'managerial'>('operational');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Data
  const entries: CashFlowEntry[] = [
    { id: '1', date: '2026-05-19', description: 'Vendas iFood Diário', category: 'Vendas Delivery', type: 'INCOME', value: 4580.50, status: 'CONFIRMED', paymentMethod: 'PIX' },
    { id: '2', date: '2026-05-19', description: 'Compra Hortifruti', category: 'Insumos', type: 'EXPENSE', value: 850.00, status: 'CONFIRMED', paymentMethod: 'Dinheiro' },
    { id: '3', date: '2026-05-18', description: 'Energia Elétrica', category: 'Ocupação', type: 'EXPENSE', value: 2450.00, status: 'PENDING', paymentMethod: 'Boleto' },
    { id: '4', date: '2026-05-18', description: 'Repasse Unidade Riomar', category: 'Transferência', type: 'INCOME', value: 12000.00, status: 'CONFIRMED', paymentMethod: 'TED' },
    { id: '5', date: '2026-05-17', description: 'Marketing Digital Ads', category: 'Marketing', type: 'EXPENSE', value: 1500.00, status: 'CONFIRMED', paymentMethod: 'Cartão Corp.' },
  ];

  const totals = useMemo(() => {
    const income = entries.filter(e => e.type === 'INCOME').reduce((acc, curr) => acc + curr.value, 0);
    const expense = entries.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => acc + curr.value, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`p-4 md:p-8 min-h-screen ${isDarkMode ? 'bg-[#0f0f0f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Fluxo de Caixa</h1>
          </div>
          <p className="text-slate-500 font-bold italic text-sm">Controle Operacional e Gerencial do Grupo Azevedo</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('operational')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'operational' 
                  ? 'bg-white dark:bg-[#333] text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Operacional
            </button>
            <button 
              onClick={() => setActiveTab('managerial')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'managerial' 
                  ? 'bg-white dark:bg-[#333] text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Gerencial
            </button>
          </div>

          <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
            isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <Download className="w-3 h-3 text-indigo-500" />
            Exportar
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95">
            <Plus className="w-3 h-3" />
            Lançamento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Entradas Totais', value: totals.income, icon: ArrowUpRight, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Saídas Totais', value: totals.expense, icon: ArrowDownLeft, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Saldo Acumulado', value: totals.balance, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-[#222]' : 'bg-white border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Este Mês</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase italic tracking-tighter">{card.label}</p>
              <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(card.value)}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      {activeTab === 'operational' ? (
        <div className={`rounded-3xl border ${isDarkMode ? 'bg-black/40 border-[#222]' : 'bg-white border-slate-100 shadow-sm'} overflow-hidden`}>
          {/* Controls */}
          <div className="p-6 border-b dark:border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar lançamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                  isDarkMode ? 'bg-black/40 border-[#333] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                } border`}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button className={`p-2 rounded-lg border transition-all ${
                viewMode === 'list' 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : isDarkMode ? 'bg-black/40 border-[#333] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`} onClick={() => setViewMode('list')}>
                <ListIcon className="w-4 h-4" />
              </button>
              <button className={`p-2 rounded-lg border transition-all ${
                viewMode === 'grid' 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : isDarkMode ? 'bg-black/40 border-[#333] text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`} onClick={() => setViewMode('grid')}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-[10px] uppercase font-black tracking-[0.2em] ${isDarkMode ? 'text-slate-500 bg-white/5' : 'text-slate-400 bg-slate-50/50'}`}>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-[#222]">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-black uppercase italic tracking-tighter text-slate-900 dark:text-[#FFB800]">
                        {entry.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-[#333] px-2 py-1 rounded-md">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{entry.paymentMethod}</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${entry.status === 'CONFIRMED' ? 'text-green-500' : 'text-amber-500'}`}>
                        {entry.status === 'CONFIRMED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {entry.status === 'CONFIRMED' ? 'Conciliado' : 'Pendente'}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-black whitespace-nowrap ${entry.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.type === 'INCOME' ? '+' : '-'}{formatCurrency(entry.value)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-[#333] rounded-lg transition-colors text-slate-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Managerial Charts placeholder or specialized summary */}
          <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-[#222]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <h3 className="text-lg font-black uppercase italic tracking-tighter mb-6">Estrutura Gerencial</h3>
            <div className="space-y-4">
              {[
                { label: 'Faturamento Bruto', value: 45000, color: 'text-indigo-500' },
                { label: 'Custos Variáveis', value: 15750, color: 'text-red-400' },
                { label: 'Margem de Contribuição', value: 29250, color: 'text-green-500' },
                { label: 'Custos Fixos', value: 12000, color: 'text-red-500' },
                { label: 'EBITDA (LAJIDA)', value: 17250, color: 'text-indigo-600', highlight: true },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl ${row.highlight ? (isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : 'bg-slate-50 dark:bg-black/20'}`}>
                  <span className={`text-xs font-black uppercase italic ${row.highlight ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-700') : 'text-slate-500'}`}>{row.label}</span>
                  <span className={`text-sm font-black ${row.color}`}>{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-[#222]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Ponto de Equilíbrio</h3>
              <PieChart className="w-5 h-5 text-indigo-500" />
            </div>
            
            <div className="flex flex-col items-center justify-center py-10">
              <div className="relative w-48 h-48 flex items-center justify-center">
                 <div className="absolute inset-0 rounded-full border-8 border-slate-100 dark:border-[#222]"></div>
                 <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent animate-spin-slow"></div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-indigo-600">68%</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atingido</div>
                 </div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-xs font-bold text-slate-500 italic">Faltam {formatCurrency(8250)} para cobrir o custo fixo do período.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;
