import React, { useState } from 'react';
import { 
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Info,
  ArrowRight,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronDown,
  AlertCircle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useStore } from '../contexts/StoreContext';
import DataEntrySection from '../components/DataEntrySection';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Finance() {
  const { isDarkMode, dreTimeline, brandColors, currentStore } = useStore();
  const [selectedPeriod, setSelectedPeriod] = useState('Março 2024');
  const [showEntry, setShowEntry] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['receita', 'deducoes', 'cmv', 'despesas_var', 'despesas_fixas_5', 'despesas_fixas_6', 'despesas_fixas_7', 'despesas_fixas_8', 'despesas_fixas_9', 'financeiro']);
  
  const currentMonthData = dreTimeline[2];
  const prevMonthData = dreTimeline[1];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const dreGroups = [
    {
      id: 'receita',
      label: '1. RECEITA BRUTA',
      isTotal: false,
      items: [
        { label: 'Venda Balcão', valor: currentMonthData.receitaBalcao ?? (currentMonthData.faturamento * 0.45) },
        { label: 'Venda Delivery', valor: currentMonthData.receitaDelivery ?? (currentMonthData.faturamento * 0.55) },
      ],
      total: currentMonthData.faturamento
    },
    {
      id: 'deducoes',
      label: '2. DEDUÇÕES DA RECEITA',
      isTotal: false,
      items: [
        { label: 'DARF / SIMPLES', valor: -currentMonthData.taxes },
      ],
      total: -currentMonthData.taxes
    },
    {
      id: 'cmv',
      label: '3. CUSTOS VARIÁVEIS DAS MERCADORIAS (CMV)',
      isTotal: false,
      items: [
        { label: 'CMV Total', valor: -currentMonthData.cmv },
      ],
      total: -currentMonthData.cmv
    },
    {
      id: 'despesas_variaveis',
      label: '4. DESPESAS VARIÁVEIS',
      isTotal: false,
      items: [
        { label: 'Taxas de Cartão', valor: -2500 },
        { label: 'Taxa Motoqueiro', valor: -3200 },
        { label: 'Taxa Ifood', valor: -5600 },
        { label: 'Frete Compras', valor: -800 },
        { label: 'Fundo de Marketing - Franquia', valor: -currentMonthData.marketing },
        { label: 'Royalties - Franquia', valor: -currentMonthData.royalties },
        { label: 'Taxa Bancaria + Juros', valor: -450 },
        { label: 'Taxas PIX', valor: -120 },
        { label: 'Bonificações / Comissões', valor: -300 },
        { label: 'Descontos / Cortesia', valor: -200 },
        { label: 'Despesas Ifood', valor: -150 },
      ],
      total: -(currentMonthData.despesasVariaveis || 0)
    },
    {
      id: 'margem_contribuicao',
      label: '(=) MARGEM DE CONTRIBUIÇÃO',
      isTotal: true,
      total: currentMonthData.faturamento - currentMonthData.taxes - currentMonthData.cmv - (currentMonthData.despesasVariaveis || 0),
      highlight: true,
      color: currentStore.brand === 'BEBELU' ? 'text-amber-600' : 'text-blue-600'
    },
    {
      id: 'despesas_fixas_5',
      label: '5. COLABORADORES E ENCARGOS',
      isTotal: false,
      items: [
        { label: 'Salários', valor: -(currentMonthData.payroll * 0.5) },
        { label: 'Pro Labore', valor: -(currentMonthData.payroll * 0.15) },
        { label: 'Encargos (INSS/FGTS)', valor: -(currentMonthData.payroll * 0.15) },
        { label: 'Benefícios (VT/VA)', valor: -(currentMonthData.payroll * 0.1) },
        { label: 'Outros (Diárias/Prêmios)', valor: -(currentMonthData.payroll * 0.1) },
      ],
      total: -currentMonthData.payroll
    },
    {
      id: 'despesas_fixas_6',
      label: '6. DESPESAS COM FUNCIONAMENTO',
      isTotal: false,
      items: [
        { label: 'Aluguel & Condomínio', valor: -currentMonthData.rent },
        { label: 'Energia Elétrica', valor: -2800 },
        { label: 'Água / Esgoto', valor: -600 },
        { label: 'Internet / Telefonia', valor: -250 },
      ],
      total: -(currentMonthData.rent + 3650)
    },
    {
      id: 'despesas_fixas_7',
      label: '7. DESPESAS COM MANUTENÇÃO',
      isTotal: false,
      items: [
        { label: 'Manutenção Sistemas', valor: -450 },
        { label: 'Manutenção Equipamentos', valor: -600 },
        { label: 'Locação Máquinas', valor: -400 },
      ],
      total: -1450
    },
    {
      id: 'despesas_fixas_8',
      label: '8. DESPESAS COMERCIAIS',
      isTotal: false,
      items: [
        { label: 'Marketing Digital', valor: -1500 },
        { label: 'Taxa Aplicativo', valor: -300 },
      ],
      total: -1800
    },
    {
      id: 'despesas_fixas_9',
      label: '9. DESPESAS ADMINISTRATIVAS',
      isTotal: false,
      items: [
        { label: 'Contabilidade', valor: -850 },
        { label: 'Consultoria', valor: -1200 },
        { label: 'Limpeza e Materiais', valor: -900 },
        { label: 'Taxas e Licenças', color: 'text-slate-400', valor: -550 },
        { label: 'Outros Operacionais', valor: -(currentMonthData.operational - (850+1200+900+550)) },
      ],
      total: -currentMonthData.operational
    },
    {
      id: 'resultado_operacional_financeiro',
      label: '(=) EBITDA - RESULTADO OPERACIONAL',
      isTotal: true,
      total: currentMonthData.ebitda,
      color: currentStore.brand === 'BEBELU' ? 'text-amber-600' : 'text-indigo-600'
    },
    {
      id: 'apuracao_financeira',
      label: '10. APURAÇÃO DO RESULTADO FINANCEIRO',
      isTotal: false,
      items: [
        { label: 'Taxas Ifood', valor: -1200 },
        { label: 'Tarifas Bancárias', valor: -400 },
        { label: 'Juros Recebidos', valor: 50 },
      ],
      total: -(currentMonthData.resultadoFinanceiro || 1550)
    },
    {
      id: 'resultado_gri',
      label: '(=) RESULTADO OPERACIONAL ANTES DO GRI',
      isTotal: true,
      total: currentMonthData.ebitda - (currentMonthData.resultadoFinanceiro || 1550),
      color: 'text-amber-600'
    },
    {
      id: 'gri_final',
      label: '11. GRI - SECRETARIA DE ESTADO',
      isTotal: false,
      items: [
        { label: 'GRI (Estado)', valor: -0 },
      ],
      total: -0
    },
    {
      id: 'resultado_liquido',
      label: '(=) RESULTADO LÍQUIDO FINANCEIRO',
      isTotal: true,
      total: currentMonthData.netProfit,
      highlight: true,
      color: 'text-green-600',
      border: true
    }
  ];

  const marginBruta = ((currentMonthData.faturamento - currentMonthData.cmv) / currentMonthData.faturamento) * 100;
  const lucratividade = (currentMonthData.netProfit / currentMonthData.faturamento) * 100;

  // Simulate yearly data for the current month comparison
  const yearlyComparisonData = [
    { year: '2024', faturamento: currentMonthData.faturamento * 0.78, color: '#94a3b8' },
    { year: '2025', faturamento: currentMonthData.faturamento * 0.89, color: '#6366f1' },
    { year: '2026', faturamento: currentMonthData.faturamento, color: '#4f46e5' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold dark:text-white italic tracking-tighter">
            {showEntry ? 'Lançamentos DRE' : `DRE Inteligente - ${selectedPeriod}`}
          </h2>
          <p className="text-slate-500 font-medium lowercase">
            {showEntry ? 'Preencha os dados financeiros da unidade' : 'Demonstrativo de Resultados do Exercício Detalhado'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowEntry(!showEntry)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFB800] hover:bg-black text-black hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FFB800]/20"
          >
            {showEntry ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                Voltar à DRE
              </>
            ) : (
              <>
                Lançamentos DRE
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          {!showEntry && (
            <>
              <div className={`relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isDarkMode ? 'bg-[#1E1E1E] border-[#333] text-white' : 'bg-white border-slate-200'}`}>
                <BarChart3 className="w-4 h-4" style={{ color: brandColors.primary }} />
                <span className="text-xs font-black uppercase tracking-widest">Comparativo Ativo</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
              <button className={`p-2 rounded-xl border transition-all active:scale-95 ${isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200 shadow-sm'}`}>
                <Download className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {showEntry ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DataEntrySection isEmbedded={true} mode="finance" />
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: 'Margem Bruta', value: `${marginBruta.toFixed(1)}%`, trend: '+2.1%', color: 'text-indigo-600' },
           { label: 'Lucratividade', value: `${lucratividade.toFixed(1)}%`, trend: '+0.8%', color: 'text-green-500' },
           { label: 'Ponto Equilíbrio', value: formatCurrency(88500), trend: '-4%', color: 'text-amber-500' },
           { label: 'Ticket Médio', value: formatCurrency(72.5), trend: '+5.2%', color: 'text-blue-500' },
         ].map((stat) => (
           <div key={stat.label} className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
             <div className="flex items-center justify-between">
               <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
               <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                 {stat.trend}
               </div>
             </div>
           </div>
         ))}
      </div>

      {/* Comparativo Anual do Mês Chart */}
      <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-black dark:text-white uppercase tracking-tighter italic text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: brandColors.primary }} /> Comparativo Anual do Mês
            </h3>
            <p className="text-[10px] text-slate-500 font-medium italic">Faturamento de Março em 2024, 2025 e 2026</p>
          </div>
          <div className="flex gap-4">
             {yearlyComparisonData.map(item => (
               <div key={item.year} className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                 <span className="text-[10px] font-bold text-slate-400 uppercase">{item.year}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyComparisonData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
              <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#888', fontSize: 11, fontWeight: 800}} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#888', fontSize: 11, fontWeight: 800}}
                tickFormatter={(val) => `R$ ${val/1000}k`}
              />
              <Tooltip 
                cursor={{fill: isDarkMode ? '#ffffff05' : '#00000005'}}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
              />
              <Bar dataKey="faturamento" radius={[12, 12, 0, 0]}>
                {yearlyComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main DRE Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
             <div className={`px-8 py-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50/50 border-slate-100'}`}>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Estrutura de Resultados</span>
               <div className="flex gap-12">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">AV %</span>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Valor Nominal</span>
               </div>
             </div>

             <div className="p-4 space-y-2">
                {dreGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    {/* Group Header */}
                    <div 
                      onClick={() => !group.isTotal && toggleGroup(group.id)}
                      className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all cursor-pointer ${
                        group.isTotal 
                          ? (isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-indigo-50/50 border border-indigo-100/50')
                          : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                      } ${group.border ? 'border-2 border-green-500/30 shadow-lg shadow-green-500/10' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {!group.isTotal && (
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroups.includes(group.id) ? '' : '-rotate-90'}`} />
                        )}
                        <span className={`text-xs font-black italic tracking-tighter ${group.isTotal ? (group.color || 'dark:text-white') : 'text-slate-500'}`}>
                          {group.label}
                        </span>
                      </div>
                      <div className="flex gap-10 items-center">
                         <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-10 text-right">
                           {((Math.abs(group.total) / currentMonthData.faturamento) * 100).toFixed(1)}%
                         </span>
                         <span className={`text-sm font-black w-32 text-right ${group.isTotal ? (group.color || 'dark:text-white') : (isDarkMode ? 'text-slate-300' : 'text-slate-900')}`}>
                           {formatCurrency(group.total)}
                         </span>
                      </div>
                    </div>

                    {/* Group Items */}
                    <AnimatePresence>
                      {expandedGroups.includes(group.id) && !group.isTotal && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1 px-4"
                        >
                          {group.items && group.items.map(item => (
                            <div key={item.label} className="flex items-center justify-between px-8 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <span className="text-[11px] font-medium text-slate-500 italic lowercase">{item.label}</span>
                              <div className="flex gap-10">
                                 <span className="text-[9px] font-bold text-slate-400 w-10 text-right">
                                   {((Math.abs(item.valor) / currentMonthData.faturamento) * 100).toFixed(1)}%
                                 </span>
                                 <span className={`text-[11px] font-bold w-32 text-right ${item.valor < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                   {formatCurrency(item.valor)}
                                 </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
             </div>
          </div>

          {/* Ranking de Lucratividade Section */}
          <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black dark:text-white uppercase tracking-tighter italic text-lg">Top Lucratividade</h3>
                <p className="text-[10px] text-slate-500 font-medium italic">Baseado nas Fichas Técnicas importadas</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { name: 'Burger Classic', margin: '63%', value: 21.50, color: 'bg-green-500' },
                 { name: 'Batata G', margin: '76%', value: 13.80, color: 'bg-indigo-500' },
                 { name: 'Soda Italiana', margin: '82%', value: 15.40, color: 'bg-blue-500' },
               ].map((item, i) => (
                 <div key={i} className={`p-5 rounded-3xl border transition-all hover:scale-105 cursor-pointer ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-[10px] font-black text-white`}>#{i+1}</div>
                      <span className="text-[10px] font-black text-green-500">{item.margin} mrg</span>
                    </div>
                    <div className="text-xs font-black dark:text-white uppercase tracking-tighter mb-1">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold italic">{formatCurrency(item.value)} lucro liq.</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
           <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Insights da Gestão</h4>
              <div className="space-y-6">
                 <div className="flex gap-4">
                   <div className="p-2 bg-indigo-500/10 rounded-xl">
                     <TrendingUp className="w-5 h-5 text-indigo-500" />
                   </div>
                   <div>
                     <div className="text-xs font-black dark:text-white mb-1 uppercase tracking-tighter">Oportunidade Delivery</div>
                     <p className="text-[10px] text-slate-500 italic leading-relaxed">As taxas iFood subiram 1.2% este mês. Considere incentivar o canal direto.</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="p-2 bg-red-500/10 rounded-xl">
                     <AlertCircle className="w-5 h-5 text-red-500" />
                   </div>
                   <div>
                     <div className="text-xs font-black dark:text-white mb-1 uppercase tracking-tighter">Alerta Insumos</div>
                     <p className="text-[10px] text-slate-500 italic leading-relaxed">Proteína com variação de +8% no custo unitário. Revise preços.</p>
                   </div>
                 </div>
              </div>

              <div className={`mt-10 p-5 rounded-3xl border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${
                isDarkMode ? 'bg-black/20 border-white/5 hover:bg-[#E63946]' : 'bg-slate-50 border-slate-100 hover:bg-[#0066FF]'
              }`}>
                 <div className="flex items-center gap-3">
                   <FileText className="w-5 h-5 text-[#0066FF] dark:text-[#E63946] group-hover:text-white transition-colors" />
                   <span className="text-[10px] font-black uppercase tracking-widest dark:text-white group-hover:text-white transition-colors">Exportar DRE PDF</span>
                 </div>
                 <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </div>
           </div>

           <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 shadow-xl shadow-slate-900/20'}`}>
              <div className="flex items-center gap-3 text-white mb-4">
                <Zap className="w-5 h-5 fill-white" />
                <span className="text-xs font-black uppercase tracking-[0.2em] italic">Consultoria Online</span>
              </div>
              <p className="text-white/60 text-[10px] leading-relaxed mb-6">
                Como posso ajudar a otimizar sua margem este mês? Pergunte sobre qualquer conta da DRE.
              </p>
              <button 
                className="w-full py-3 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                style={currentStore.brand === 'BEBELU' ? { color: '#000', backgroundColor: '#FFCB05' } : {}}
              >
                Falar com consultor IA
              </button>
           </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
