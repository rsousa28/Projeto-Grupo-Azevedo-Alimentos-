import React, { useState } from 'react';
import { 
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { dreTimeline } from '../lib/mockData';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Finance() {
  const { isDarkMode } = useStore();
  const currentMonthData = dreTimeline[2];

  const financialItems = [
    { label: 'Receita Bruta', value: currentMonthData.revenue, color: 'text-indigo-600', icon: DollarSign },
    { label: 'Taxas Delivery (iFood/App)', value: -currentMonthData.taxes, color: 'text-red-500', icon: Info },
    { label: 'CMV (Insumos)', value: -currentMonthData.cmv, color: 'text-red-500', icon: PieIcon },
    { label: 'Folha de Pagamento', value: -currentMonthData.payroll, color: 'text-red-500', icon: Briefcase },
    { label: 'Royalties (5%)', value: -currentMonthData.royalties, color: 'text-red-500', icon: Info },
    { label: 'Aluguel & Condomínio', value: -currentMonthData.rent, color: 'text-red-500', icon: Info },
    { label: 'Marketing', value: -currentMonthData.marketing, color: 'text-red-500', icon: TrendingUp },
    { label: 'Despesas Operacionais', value: -currentMonthData.operational, color: 'text-red-500', icon: Info },
    { label: 'EBITDA', value: currentMonthData.ebitda, color: 'text-indigo-600', font: 'font-extrabold', highlight: true },
    { label: 'LUCRO LÍQUIDO', value: currentMonthData.netProfit, color: 'text-green-500', font: 'font-black text-xl', highlight: true, border: true },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Financeiro DRE</h2>
          <p className="text-slate-500">Demonstrativo de Resultados do Exercício Detalhado</p>
        </div>
        <div className="flex gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333] text-white' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-sm font-bold uppercase tracking-widest">Março 2024</span>
          </div>
          <button className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200'}`}>
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DRE List */}
        <div className={`lg:col-span-2 rounded-3xl border overflow-hidden transition-colors ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-6 border-b dark:border-[#333] flex items-center justify-between ${isDarkMode ? 'bg-black/20' : 'bg-slate-50'}`}>
            <h3 className="font-bold dark:text-white uppercase tracking-wider italic text-sm">Descrição das Operações</h3>
            <h3 className="font-bold dark:text-white uppercase tracking-wider italic text-sm">Valores Consolidados</h3>
          </div>
          <div className="p-2">
             {financialItems.map((item, idx) => (
               <div 
                 key={item.label}
                 className={`flex items-center justify-between p-4 px-6 rounded-2xl transition-all ${
                   item.highlight ? (isDarkMode ? 'bg-black/40 my-1' : 'bg-indigo-50/50 my-1') : ''
                 } ${item.border ? (isDarkMode ? 'border-2 border-green-500/30' : 'border-2 border-green-500/20 shadow-lg shadow-green-500/5') : ''}`}
               >
                 <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.value < 0 ? (isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') : (isDarkMode ? 'bg-indigo-500/10 text-indigo-500' : 'bg-indigo-50 text-indigo-600')
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs ${item.font || 'font-medium'} dark:text-slate-300 uppercase italic`}>{item.label}</span>
                 </div>
                 <span className={`text-sm ${item.font || 'font-bold'} ${item.color}`}>
                   {formatCurrency(item.value)}
                 </span>
               </div>
             ))}
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border transition-colors ${
            isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
          }`}>
             <h4 className="font-bold dark:text-white mb-6 uppercase tracking-widest text-sm italic">Análise de Margens</h4>
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">Margem Bruta</div>
                  <div className="text-2xl font-black text-indigo-600">67.2%</div>
                </div>
                <div className="h-px bg-slate-100 dark:bg-[#333]" />
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">Lucratividade Real</div>
                  <div className="text-2xl font-black text-green-500">25.7%</div>
                </div>
             </div>
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className={`p-6 rounded-3xl border bg-gradient-to-br transition-all cursor-pointer ${
              isDarkMode 
                ? 'from-[#E63946] to-[#801a23] border-[#E63946] shadow-xl shadow-red-500/20' 
                : 'from-[#0066FF] to-[#004bb3] border-[#0066FF] shadow-xl shadow-blue-500/20'
            }`}
          >
            <div className="flex items-center gap-3 text-white mb-4">
               <Zap className="w-5 h-5 fill-white" />
               <span className="font-bold italic uppercase tracking-wider text-sm">Simulador de Metas</span>
            </div>
            <p className="text-white/80 text-[10px] leading-relaxed mb-6 italic">
              Veja o impacto instantâneo no seu lucro líquido ao ajustar vendas.
            </p>
            <div className="flex items-center justify-between text-white border-t border-white/20 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest">Acessar</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
