import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  ShoppingBag, Clock, Users, ArrowUpRight, ArrowDownRight,
  Zap, Info, Target, Calendar, ArrowRight, ArrowLeft, Sparkles, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  mostProfitable,
  lowMarginProducts
} from '../lib/mockData';
import { useStore } from '../contexts/StoreContext';
import DataEntrySection from '../components/DataEntrySection';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    isDarkMode, 
    currentStore, 
    brandColors,
    metrics, 
    dreTimeline, 
    metaVsRealizado, 
    operationalMetrics, 
    topProducts, 
    yearlyHistory,
    deliveryChannels,
    salesByHour,
    salesByDay,
    peakHour,
    clearAllData
  } = useStore();

  const [showEntry, setShowEntry] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('05');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const businessQuotes = [
    "O segredo do sucesso no food service é constância e qualidade.",
    "Gestão é fazer as coisas bem; liderança é fazer as coisas certas.",
    "O que não é medido não é gerenciado. Olhe seus números hoje.",
    "A excelência não é um ato, mas um hábito diário na cozinha.",
    "Um cliente satisfeito é a sua melhor estratégia de marketing.",
    "Qualidade significa fazer certo quando ninguém está olhando.",
    "Inovação separa um líder de um seguidor.",
    "A disciplina é a ponte entre metas e realizações.",
    "Sucesso é a soma de pequenos esforços repetidos dia após dia.",
    "Grandes coisas nunca vêm de zonas de conforto."
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % businessQuotes.length);
    }, 10000); // Mudar a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

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

  const { loadDREPeriod, loadCMVPeriod } = useStore();

  React.useEffect(() => {
    if (currentStore.id !== 'admin-global') {
      loadDREPeriod(selectedMonth, selectedYear);
      
      // Pre-load previous years for comparison to ensure chart is populated
      const prevYear1 = (parseInt(selectedYear) - 1).toString();
      const prevYear2 = (parseInt(selectedYear) - 2).toString();
      loadDREPeriod(selectedMonth, prevYear1);
      loadDREPeriod(selectedMonth, prevYear2);
      
      loadCMVPeriod(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, currentStore.id]);

  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label;
  
  const currentMonthData = dreTimeline.find(d => 
    d.month === currentMonthLabel && (d.year === selectedYear || (!d.year && selectedYear === '2026'))
  ) || {
    month: currentMonthLabel || 'Não Iniciado',
    faturamento: 0,
    receitaBalcao: 0,
    receitaDelivery: 0,
    receitaIfood: 0,
    receitaWedo: 0,
    taxes: 0,
    cmv: 0,
    payroll: 0,
    royalties: 0,
    rent: 0,
    marketing: 0,
    operational: 0,
    ebitda: 0,
    netProfit: 0,
    quantidadePedidos: 0
  };
  
  const dynamicDeliveryChannels = [
    { name: 'iFood', valor: currentMonthData.receitaIfood || 0, color: '#991B1B' },
    { name: 'WEDO', valor: currentMonthData.receitaWedo || 0, color: '#0066FF' },
    { name: 'Balcão', valor: currentMonthData.receitaBalcao || 0, color: isDarkMode ? '#64748b' : '#FFB800' }
  ];

  // Dynamic yearly data for the current month comparison
  const yearNum = parseInt(selectedYear);
  const yearsToCompare = [
    (yearNum - 2).toString(),
    (yearNum - 1).toString(),
    selectedYear
  ];

  const yearlyComparisonData = yearsToCompare.map((y, idx) => {
    const timelineData = dreTimeline.find(p => 
      p.month === currentMonthLabel && 
      (p.year === y || (!p.year && y === '2026'))
    );
    
    const faturamento = y === selectedYear 
      ? (currentMonthData.faturamento || 0) 
      : (timelineData ? timelineData.faturamento : (yearlyHistory[y] || 0));

    const colors = [
      isDarkMode ? '#333' : '#cbd5e1',
      '#6366f1',
      '#4f46e5'
    ];
    
    return {
      year: y,
      faturamento,
      color: colors[idx]
    };
  });

  const currentTopProducts = topProducts.length > 0 ? topProducts : [];
  const dynamicMostProfitable = [...currentTopProducts]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 3)
    .map(p => ({ id: p.id, name: p.name, profit: (p.faturamento * (p.margin/100)) / (p.quantidadeVendas || 1), margin: p.margin }));
    
  const dynamicLowMargin = [...currentTopProducts]
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 3)
    .map(p => ({ id: p.id, name: p.name, margin: p.margin, status: p.margin < 30 ? 'crítico' : 'atenção' }));

  const faturamento = currentMonthData.faturamento || 0;
  const netProfit = currentMonthData.netProfit || 0;
  const cmvRate = faturamento > 0 ? (currentMonthData.cmv / faturamento) * 100 : 0;
  const ticketMedio = currentMonthData.quantidadePedidos > 0 ? faturamento / currentMonthData.quantidadePedidos : 0;
  const totalPedidos = currentMonthData.quantidadePedidos || 0;
  const margemOperacional = faturamento > 0 ? (currentMonthData.ebitda / faturamento) * 100 : 0;

  const getFeaturedInsight = () => {
    if (cmvRate > 35) return `Seu CMV de ${cmvRate.toFixed(1)}% está acima do ideal. Verifique fichas técnicas de proteínas.`;
    if (margemOperacional < 15 && faturamento > 0) return `Sua margem operacional está pressionada. Analise despesas fixas no financeiro.`;
    if (ticketMedio < 45 && faturamento > 0) return `Ticket médio abaixo do esperado (R$ ${ticketMedio.toFixed(2)}). Sugerimos combos premium.`;
    if (topProducts.length > 0) return `O produto ${topProducts[0].name} é seu maior destaque. Considere aumentar a exposição dele.`;
    return "Analiso sua rede em tempo real. Alimente o sistema para receber insights acionáveis.";
  };

  const featuredInsight = getFeaturedInsight();

  const displayMetrics = [
    { label: 'Faturamento Total', valor: faturamento, format: 'currency', trend: 'up', change: '0' },
    { label: 'Lucro Líquido', valor: netProfit, format: 'currency', trend: 'up', change: '0' },
    { label: 'CMV Médio', valor: cmvRate, format: 'percent', trend: 'down', change: '0' },
    { label: 'Ticket Médio', valor: ticketMedio, format: 'currency', trend: 'up', change: '0' },
    { label: 'Pedidos Totais', valor: totalPedidos, format: 'number', trend: 'up', change: '0' },
    { label: 'Margem Operac.', valor: margemOperacional, format: 'percent', trend: 'up', change: '0' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {currentStore.code === 'ROOT' ? 'Visão Consolidada - Root' : (showEntry ? 'Lançamentos Dashboard' : 'Performance de Vendas')}
          </h2>
          <p className={`text-sm font-medium italic ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>
            {currentStore.code === 'ROOT' 
              ? 'Métricas agregadas do Grupo Azevedo'
              : (showEntry ? 'Preencha os dados da unidade' : 'Dados consolidados da unidade selecionada')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl mr-2">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              {months.map(m => (
                <option key={m.value} value={m.value} className="dark:bg-[#1E1E1E]">{m.label}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              {['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map(year => (
                <option key={year} value={year} className="dark:bg-[#1E1E1E]">{year}</option>
              ))}
            </select>
          </div>

          {currentStore.code !== 'ROOT' && (
            <>

              <button 
                onClick={() => setShowEntry(!showEntry)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFB800] hover:bg-black text-black hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FFB800]/20"
              >
                {showEntry ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                  </>
                ) : (
                  <>
                    Lançamentos Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
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
          <DataEntrySection 
            isEmbedded={true} 
            mode="dashboard" 
            initialMonth={selectedMonth}
            initialYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </motion.div>
      ) : (
        <>
          {/* Welcome & Insights Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500`}
        style={currentStore.brand === 'BEBELU' 
          ? { backgroundColor: '#FFCB0510', borderColor: '#FFCB0530' }
          : { backgroundColor: isDarkMode ? '#E6394610' : '#0066FF05', borderColor: isDarkMode ? '#E6394620' : '#0066FF10' }
        }
      >
        <div className="flex items-center gap-4">
          <div 
            className={`p-4 rounded-2xl shadow-lg transition-colors duration-500`}
            style={{ backgroundColor: brandColors.button, boxShadow: `0 10px 15px -3px ${brandColors.button}30` }}
          >
            <Zap className={`w-6 h-6 animate-pulse ${currentStore.brand === 'BEBELU' ? 'text-black' : 'text-white'}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>Eficiência Operacional</h2>
            <div className="h-10 flex items-center">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={currentQuoteIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`text-sm font-bold italic line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}
                >
                  {businessQuotes[currentQuoteIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
        {/* Chat button removed */}
      </motion.div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {displayMetrics.map((metric, i) => {
          const isHealthy = metric.trend === 'up' && metric.label !== 'CMV Médio' || (metric.label === 'CMV Médio' && metric.trend === 'down');
          const statusColor = isHealthy ? 'text-green-500 bg-green-500/10' : 'text-red-700 bg-red-700/10';
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>{metric.label}</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {metric.change}%
                </div>
              </div>
              <div className={`text-lg font-black break-all leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {metric.format === 'currency' ? formatCurrency(metric.valor as number) : `${metric.valor}${metric.format === 'percent' ? '%' : ''}`}
              </div>
              <div className="text-[9px] text-slate-400 mt-1 italic">vs. mês anterior</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              <TrendingUp className="w-5 h-5" style={{ color: brandColors.primary }} /> Crescimento Mensal
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brandColors.primary }} /> Faturamento
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dreTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="faturamento" stroke={brandColors.button} strokeWidth={3} fill={brandColors.button} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meta vs Realizado */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>Meta vs. Realizado</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metaVsRealizado}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <Tooltip />
                <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                  {metaVsRealizado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-black/20 text-center">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Atingimento</div>
            <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {((metaVsRealizado[1].valor / metaVsRealizado[0].valor) * 100).toFixed(1)}%
            </div>
            {metaVsRealizado[1].valor < metaVsRealizado[0].valor ? (
              <p className="text-[10px] text-red-700 font-bold mt-1">
                Faltam {formatCurrency(metaVsRealizado[0].valor - metaVsRealizado[1].valor)} para a meta
              </p>
            ) : (
              <p className="text-[10px] text-green-500 font-bold mt-1">
                Meta batida! {formatCurrency(metaVsRealizado[1].valor - metaVsRealizado[0].valor)} acima do esperado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly & Daily Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <Clock className="w-5 h-5 text-orange-500" /> Faturamento por Horário
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByHour}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
                  labelStyle={{ color: '#888' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}
                />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 text-center italic">Horário de pico detectado: <span className="font-bold text-slate-900 dark:text-white">{peakHour}h</span></p>
        </div>

        {/* Comparativo Mensal YoY */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Histórico de {currentMonthData.month}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium italic">Evolução do mesmo mês em {yearsToCompare.join(', ')}</p>
            </div>
            <div className="flex gap-3">
               {yearlyComparisonData.map(item => (
                 <div key={item.year} className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                   <span className="text-[9px] font-bold text-slate-500">{item.year}</span>
                 </div>
               ))}
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparisonData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
                <XAxis 
                  dataKey="year" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#888', fontSize: 11, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#888', fontSize: 11, fontWeight: 700}}
                  tickFormatter={(val) => `R$ ${val/1000}k`}
                />
                <Tooltip 
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
      </div>

      {/* Products Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Profitable */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Oportunidade: Ticket Médio</h3>
          </div>
          <div className="space-y-4">
            {dynamicMostProfitable.length > 0 ? dynamicMostProfitable.map((p, i) => (
              <div key={p.id || `profit-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                <div className="overflow-visible pr-2">
                  <div className="text-xs font-bold dark:text-white uppercase italic break-words whitespace-normal leading-tight">{p.name}</div>
                  <div className="text-[10px] text-slate-500">Margem: {p.margin}%</div>
                </div>
                <div className="text-sm font-black text-green-500 whitespace-nowrap">+{formatCurrency(p.profit)}</div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-xs italic">Nenhum produto cadastrado</div>
            )}
          </div>
        </div>

        {/* Low Margin Products */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-red-700" />
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>CMV Alerta: Proteínas</h3>
          </div>
          <div className="space-y-4">
            {dynamicLowMargin.length > 0 ? dynamicLowMargin.map((p, i) => (
              <div key={p.id || `low-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                <div className="overflow-visible pr-2">
                  <div className="text-xs font-bold dark:text-white uppercase italic break-words whitespace-normal leading-tight">{p.name}</div>
                  <div className="text-[10px] text-slate-500">Status: {p.status}</div>
                </div>
                <div className={`text-sm font-black text-red-700 whitespace-nowrap`}>
                  {p.margin}%
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400 text-xs italic">Nenhum produto cadastrado</div>
            )}
          </div>
        </div>

        {/* Resumo DRE */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>DRE Resumido</h3>
          <div className="space-y-3">
             {[
               { label: 'Receita Bruta', valor: currentMonthData.faturamento, color: 'text-indigo-600' },
               { label: 'Custos Variáveis', valor: -(currentMonthData.cmv + currentMonthData.taxes), color: 'text-red-700' },
               { label: 'Margem de Contrib.', valor: currentMonthData.faturamento - currentMonthData.cmv - currentMonthData.taxes, bold: true },
               { label: 'Custos Fixos', valor: -(currentMonthData.payroll + currentMonthData.rent + currentMonthData.marketing + currentMonthData.operational), color: 'text-red-700' },
               { label: 'Resultado Líquido', valor: currentMonthData.netProfit, color: 'text-green-500', bold: true, big: true }
             ].map((item) => (
               <div key={item.label} className={`flex items-center justify-between py-1 ${item.big ? 'border-t dark:border-[#333] pt-4 mt-2' : ''}`}>
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${item.bold ? (isDarkMode ? 'dark:text-white' : 'text-black') : (isDarkMode ? 'text-slate-500' : 'text-slate-700')}`}>{item.label}</span>
                 <span className={`text-sm font-black ${item.color || (isDarkMode ? 'dark:text-white' : 'text-black')} ${item.big ? 'text-lg' : ''}`}>
                   {formatCurrency(item.valor)}
                 </span>
               </div>
             ))}
          </div>
          <button className="w-full mt-6 py-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:underline">Ver DRE Completo</button>
        </div>
      </div>

      {/* Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery vs Counter */}
        <div className={`p-6 rounded-3xl border transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <ShoppingBag className="w-5 h-5" style={{ color: '#991B1B' }} /> Origem dos Pedidos
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[200px] w-full md:w-1/2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dynamicDeliveryChannels}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="valor"
                  >
                    {dynamicDeliveryChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className={`text-xl font-black ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>
                  R$ {(dynamicDeliveryChannels.reduce((sum, channel) => sum + channel.valor, 0) / 1000).toFixed(0)}k
                </div>
                <div className="text-[8px] text-slate-500 uppercase font-black">Total</div>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {dynamicDeliveryChannels.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                    <span className="text-xs font-bold dark:text-slate-300 uppercase">{channel.name}</span>
                  </div>
                  <div className={`text-xs font-black uppercase ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>
                    {formatCurrency(channel.valor)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Indicators */}
        <div className={`p-6 rounded-3xl border transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <Zap className="w-5 h-5 text-yellow-500" /> Indicadores Operacionais
          </h3>
          <div className="space-y-6">
            {operationalMetrics.map((op) => {
              const Icon = op.icon === 'Clock' ? Clock : op.icon === 'ShoppingBag' ? ShoppingBag : Target;
              return (
                <div key={op.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{op.label}</span>
                    </div>
                    <span className={`text-sm font-black ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>{op.valor}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#333] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${op.percent}%` }}
                      className={`h-full rounded-full transition-colors duration-500`}
                      style={{ backgroundColor: op.critical ? '#991B1B' : brandColors.button }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Efficiency Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className={`lg:col-span-2 p-8 rounded-3xl border transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Engenharia de Cardápio</h3>
            <button className="text-sm font-bold text-indigo-600 hover:underline">Ver Tabela ABC</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-bold">Produto</th>
                  <th className="pb-4 font-bold">Vendas</th>
                  <th className="pb-4 font-bold">Margem</th>
                  <th className="pb-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
                {topProducts.length > 0 ? topProducts.map((p) => (
                  <tr key={p.id} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-50 text-slate-900'
                        }`}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className={`font-bold text-sm group-hover:text-amber-600 transition-colors uppercase italic break-words whitespace-normal leading-tight ${isDarkMode ? 'text-[#FFB800]' : 'text-slate-900'}`}>{p.name}</div>
                          <div className="text-xs text-slate-500">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className={`font-bold text-sm ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>{p.quantidadeVendas} un</div>
                      <div className="text-xs text-slate-500">{formatCurrency(p.faturamento)}</div>
                    </td>
                    <td className="py-4">
                      <div className={`text-sm font-bold ${p.margin > 60 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {p.margin}%
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.margin > 60 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {p.margin > 60 ? 'Estrela' : 'Burro de Carga'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">
                      Nenhum produto cadastrado para análise. Use a seção de lançamentos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Tips */}
        <div className={`p-8 rounded-3xl border transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          <div className={`p-6 rounded-2xl border transition-all ${
            isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dica Operacional</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
              Reduzindo o CMV em 2%, seu lucro operacional mensal pode crescer aproximadamente R$ 2.500,00 na unidade atual.
            </p>
          </div>
        </div>
      </div>
        </>
      )}

    </div>
  );
}
