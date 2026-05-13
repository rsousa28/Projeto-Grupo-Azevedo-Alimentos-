import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  ShoppingBag, Clock, Users, ArrowUpRight, ArrowDownRight,
  Zap, Info, Target, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  mostProfitable,
  lowMarginProducts
} from '../lib/mockData';
import { useStore } from '../contexts/StoreContext';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Dashboard() {
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
    peakHour
  } = useStore();
  
  const currentMonthData = dreTimeline[dreTimeline.length - 1];
  const yearlyComparisonData = [
    { year: '2024', faturamento: yearlyHistory['2024'] || currentMonthData.faturamento * 0.78, color: isDarkMode ? '#333' : '#cbd5e1' },
    { year: '2025', faturamento: yearlyHistory['2025'] || currentMonthData.faturamento * 0.89, color: '#6366f1' },
    { year: '2026', faturamento: currentMonthData.faturamento, color: '#4f46e5' },
  ];

  return (
    <div className="space-y-8 pb-10">
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
          <div>
            <h2 className="text-2xl font-bold dark:text-white leading-tight">Insight da IA</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg">
              Seu faturamento em <span className="font-bold dark:text-white">Pizza de Calabresa</span> cresceu 15% este mês. Sugerimos um combo promocional com bebida para aumentar o ticket médio.
            </p>
          </div>
        </div>
        <button className={`px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
          isDarkMode ? 'bg-white text-black' : 'bg-slate-900 text-white'
        }`}>
          Ver Mais Insights
        </button>
      </motion.div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, i) => {
          const isHealthy = metric.trend === 'up' && metric.label !== 'CMV Médio' || (metric.label === 'CMV Médio' && metric.trend === 'down');
          const statusColor = isHealthy ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';
          
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
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{metric.label}</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {metric.change}%
                </div>
              </div>
              <div className="text-lg font-black dark:text-white truncate">
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
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
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
          <h3 className="text-lg font-bold dark:text-white mb-6">Meta vs. Realizado</h3>
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
              <p className="text-[10px] text-red-500 font-bold mt-1">
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
          <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Fluxo por Horário
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByHour}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                <Tooltip />
                <Area type="monotone" dataKey="vendas" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 text-center italic">Horário de pico detectado: <span className="font-bold text-slate-900 dark:text-white">{peakHour}h</span></p>
        </div>

        {/* Comparativo Mensal YoY */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Histórico de {currentMonthData.month}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium italic">Evolução do mesmo mês em 2024, 2025 e 2026</p>
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
            <h3 className="text-lg font-bold dark:text-white">Top Lucratividade</h3>
          </div>
          <div className="space-y-4">
            {mostProfitable.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                <div>
                  <div className="text-xs font-bold dark:text-white uppercase italic">{p.name}</div>
                  <div className="text-[10px] text-slate-500">Margem: {p.margin}%</div>
                </div>
                <div className="text-sm font-black text-green-500">+{formatCurrency(p.profit)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Margin Products */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold dark:text-white">Alerta de Margem</h3>
          </div>
          <div className="space-y-4">
            {lowMarginProducts.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20">
                <div>
                  <div className="text-xs font-bold dark:text-white uppercase italic">{p.name}</div>
                  <div className="text-[10px] text-slate-500">Status: {p.status}</div>
                </div>
                <div className={`text-sm font-black ${p.status === 'crítico' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {p.margin}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo DRE */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-lg font-bold dark:text-white mb-6">DRE Resumido</h3>
          <div className="space-y-3">
             {[
               { label: 'Receita Bruta', valor: currentMonthData.faturamento, color: 'text-indigo-600' },
               { label: 'Custos Variáveis', valor: -(currentMonthData.cmv + currentMonthData.taxes), color: 'text-red-500' },
               { label: 'Margem de Contrib.', valor: currentMonthData.faturamento - currentMonthData.cmv - currentMonthData.taxes, bold: true },
               { label: 'Custos Fixos', valor: -(currentMonthData.payroll + currentMonthData.rent + currentMonthData.marketing + currentMonthData.operational), color: 'text-red-500' },
               { label: 'Resultado Líquido', valor: currentMonthData.netProfit, color: 'text-green-500', bold: true, big: true }
             ].map((item) => (
               <div key={item.label} className={`flex items-center justify-between py-1 ${item.big ? 'border-t dark:border-[#333] pt-4 mt-2' : ''}`}>
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${item.bold ? 'dark:text-white' : 'text-slate-500'}`}>{item.label}</span>
                 <span className={`text-sm font-black ${item.color || 'dark:text-white'} ${item.big ? 'text-lg' : ''}`}>
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
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#EA1D2C]" /> Origem dos Pedidos
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[200px] w-full md:w-1/2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deliveryChannels}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="valor"
                  >
                    {deliveryChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-black dark:text-white">R$ 125k</div>
                <div className="text-[8px] text-slate-500 uppercase font-black">Total</div>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {deliveryChannels.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                    <span className="text-xs font-bold dark:text-slate-300 uppercase">{channel.name}</span>
                  </div>
                  <div className="text-xs font-black dark:text-white">
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
          <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
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
                    <span className="text-sm font-black dark:text-white">{op.valor}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#333] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${op.percent}%` }}
                      className={`h-full rounded-full transition-colors duration-500`}
                      style={{ backgroundColor: op.critical ? '#EF4444' : brandColors.button }}
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
            <h3 className="text-lg font-bold dark:text-white">Engenharia de Cardápio</h3>
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
                {topProducts.map((p) => (
                  <tr key={p.id} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isDarkMode ? 'bg-[#333] text-white' : 'bg-slate-50 text-slate-900'
                        }`}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm dark:text-white group-hover:text-indigo-600 transition-colors uppercase italic">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-sm dark:text-white">{p.quantidadeVendas} un</div>
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
                ))}
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
    </div>
  );
}
