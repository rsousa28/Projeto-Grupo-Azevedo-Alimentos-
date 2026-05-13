import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  TrendingUp, 
  AlertTriangle,
  ChevronDown,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { Insumo } from '../types';
import { inventoryItems } from '../lib/mockData';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function CMV() {
  const { isDarkMode } = useStore();

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">CMV & Insumos</h2>
          <p className="text-slate-500">Controle de custos, estoque e fichas técnicas</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold border transition-all ${
            isDarkMode ? 'border-[#333] text-white hover:bg-[#1E1E1E]' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
          }`}>
            <Download className="w-5 h-5" /> Exportar CSV
          </button>
          <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            isDarkMode ? 'bg-[#E63946] text-white shadow-red-500/20' : 'bg-[#0066FF] text-white shadow-blue-500/20'
          }`}>
            <Plus className="w-5 h-5" /> Novo Insumo
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">CMV Consolidad (Mês)</div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold dark:text-white">32.4%</span>
            <span className="text-green-500 text-xs font-bold mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 rotate-180" /> -2.1%
            </span>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-[#333] rounded-full overflow-hidden">
            <div className={`h-full w-[32.4%] ${isDarkMode ? 'bg-[#E63946]' : 'bg-[#0066FF]'}`} />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Capital em Estoque</div>
          <div className="text-3xl font-bold dark:text-white">{formatCurrency(42500)}</div>
          <div className="text-xs text-slate-400 mt-2 italic">Reflete o valor total de insumos ativos</div>
        </div>

        <div className={`p-6 rounded-3xl border transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Itens em Alerta</div>
          <div className="flex items-center gap-2 text-3xl font-bold text-red-500">
            <AlertTriangle className="w-6 h-6" /> 08
          </div>
          <div className="text-xs text-slate-400 mt-2 font-bold uppercase">Abaixo do estoque mínimo</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`rounded-3xl border overflow-hidden transition-colors ${
        isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="p-6 border-b dark:border-[#333] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar insumo, categoria ou fornecedor..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl transition-all outline-none border focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900'
              }`}
            />
          </div>
          <div className="flex gap-2">
            <button className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200'}`}>
              <Filter className="w-5 h-5" />
            </button>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200'}`}>
              <span className="text-sm font-bold uppercase tracking-wider">Período</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? 'text-slate-500 bg-black/20' : 'text-slate-400 bg-slate-50'}`}>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Estoque Atual</th>
                <th className="px-6 py-4">Valor Unit.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
              {inventoryItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-black/10 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold dark:text-white uppercase italic">{item.name}</div>
                    <div className="text-xs text-slate-500">Unidade: {item.unit}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm dark:text-slate-300 font-medium">{item.supplier}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`text-sm font-bold ${item.stock < item.minStock ? 'text-red-500' : 'dark:text-white'}`}>
                      {item.stock} {item.unit}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">Mínimo: {item.minStock}</div>
                  </td>
                  <td className="px-6 py-5 font-bold dark:text-slate-300">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.stock < item.minStock 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-green-500/10 text-green-500'
                    }`}>
                      {item.stock < item.minStock ? 'Crítico' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-2">
                       <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#333] rounded-lg transition-colors text-slate-400">
                         <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t dark:border-[#333] flex items-center justify-between">
          <div className="text-sm text-slate-500">Mostrando 3 de 150 insumos</div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-900 border border-transparent rounded-lg transition-colors">Anterior</button>
            <button className={`px-4 py-2 text-sm font-bold rounded-lg border transition-all ${
              isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-100 text-slate-900'
            }`}>1</button>
            <button className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-900 border border-transparent rounded-lg transition-colors">2</button>
            <button className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-900 border border-transparent rounded-lg transition-colors">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
