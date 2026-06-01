import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  ShoppingBag, Clock, Users, ArrowUpRight, ArrowDownRight,
  Zap, Info, Target, Calendar, ArrowRight, ArrowLeft, Sparkles, Trash2, Star,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  mostProfitable,
  lowMarginProducts
} from '../lib/mockData';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { DREData } from '../types';
import DataEntrySection from '../components/DataEntrySection';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + '%';

const formatNumber = (val: number) => 
  new Intl.NumberFormat('pt-BR').format(val);

const MONTH_ORDER: Record<string, number> = {
  'Janeiro': 1,
  'Fevereiro': 2,
  'Março': 3,
  'Abril': 4,
  'Maio': 5,
  'Junho': 6,
  'Julho': 7,
  'Agosto': 8,
  'Setembro': 9,
  'Outubro': 10,
  'Novembro': 11,
  'Dezembro': 12
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [showAllProducts, setShowAllProducts] = useState(false);

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
  const isRoot = currentStore.id === 'admin-global';

  // Dynamic consolidation for Admin Global (ROOT)
  const [allStoresDreData, setAllStoresDreData] = React.useState<{ [storeId: string]: DREData[] }>({});
  const [loadingConsolidation, setLoadingConsolidation] = React.useState(false);

  React.useEffect(() => {
    if (isRoot) {
      const fetchAllStoresData = async () => {
        setLoadingConsolidation(true);
        const storeIds = ['1', '2', '3'];
        const monthsList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const yearsToLoad = [selectedYear, (parseInt(selectedYear) - 1).toString(), (parseInt(selectedYear) - 2).toString()];
        
        const tempDreData: { [storeId: string]: DREData[] } = { '1': [], '2': [], '3': [] };

        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const promises = storeIds.flatMap(storeId => {
            return yearsToLoad.flatMap(y => {
              return monthsList.map(async (m) => {
                const periodId = `${y}-${m}`;
                try {
                  const dreRef = doc(db, 'stores', storeId, 'dre_periods', periodId);
                  const snap = await getDoc(dreRef);
                  if (snap.exists()) {
                    const data = { ...snap.data(), year: y } as DREData;
                    tempDreData[storeId].push(data);
                  }
                } catch (e) {
                  // Ignore single period load failures quietly
                }
              });
            });
          });

          await Promise.all(promises);
          setAllStoresDreData(tempDreData);
        } catch (err) {
          console.error("Error loading consolidation:", err);
        } finally {
          setLoadingConsolidation(false);
        }
      };

      fetchAllStoresData();
    }
  }, [selectedYear, isRoot]);

  React.useEffect(() => {
    if (currentStore.id !== 'admin-global') {
      const allMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      allMonths.forEach(m => {
        loadDREPeriod(m, selectedYear);
      });
    }
  }, [selectedYear, currentStore.id]);

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

  const consolidatedTimeline = React.useMemo(() => {
    if (!isRoot) return [];
    
    const timelineList: DREData[] = [];
    const monthsMapToLabel: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
      '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    
    const yearsToCompile = [selectedYear, (parseInt(selectedYear) - 1).toString(), (parseInt(selectedYear) - 2).toString()];
    const storeIds = ['1', '2', '3'];

    yearsToCompile.forEach(y => {
      Object.keys(monthsMapToLabel).forEach(mCode => {
        const mLabel = monthsMapToLabel[mCode];
        
        let totalFat = 0;
        let totalCmv = 0;
        let totalPayroll = 0;
        let totalRent = 0;
        let totalMarketing = 0;
        let totalOperational = 0;
        let totalTaxes = 0;
        let totalRoyalties = 0;
        let totalEbitda = 0;
        let totalNetProfit = 0;
        let totalPedidos = 0;
        let totalReceitaIfood = 0;
        let totalReceitaWedo = 0;
        let totalReceitaBalcao = 0;
        let totalMetaFaturamento = 0;
        let exists = false;

        let totalDetailedFuncionamentoObj: Record<string, number> = {};
        let totalDetailedColaboradoresObj: Record<string, number> = {};
        let totalDetailedManutencaoObj: Record<string, number> = {};
        let totalDetailedComerciaisObj: Record<string, number> = {};
        let totalDetailedAdministrativasObj: Record<string, number> = {};
        let totalDetailedDeducoesObj: Record<string, number> = {};
        let totalDetailedDespesasVariaveisObj: Record<string, number> = {};

        storeIds.forEach(sId => {
          const list = allStoresDreData[sId] || [];
          const match = list.find(d => d.month === mLabel && d.year === y);
          if (match) {
            exists = true;
            totalFat += match.faturamento || 0;
            totalCmv += match.cmv || 0;
            totalPayroll += match.payroll || 0;
            totalRent += match.rent || 0;
            totalMarketing += match.marketing || 0;
            totalOperational += match.operational || 0;
            totalTaxes += match.taxes || 0;
            totalRoyalties += match.royalties || 0;
            totalEbitda += match.ebitda || 0;
            totalNetProfit += match.netProfit || 0;
            totalPedidos += match.quantidadePedidos || 0;
            totalReceitaIfood += match.receitaIfood || 0;
            totalReceitaWedo += match.receitaWedo || 0;
            totalReceitaBalcao += match.receitaBalcao || 0;
            totalMetaFaturamento += match.metaFaturamento || (sId === '1' ? 140000 : sId === '2' ? 140000 : 150000);

            if (match.details) {
              const det = match.details;
              if (det.funcionamento) {
                Object.entries(det.funcionamento).forEach(([k, v]) => {
                  totalDetailedFuncionamentoObj[k] = (totalDetailedFuncionamentoObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.colaboradores) {
                Object.entries(det.colaboradores).forEach(([k, v]) => {
                  totalDetailedColaboradoresObj[k] = (totalDetailedColaboradoresObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.manutencao) {
                Object.entries(det.manutencao).forEach(([k, v]) => {
                  totalDetailedManutencaoObj[k] = (totalDetailedManutencaoObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.comerciais) {
                Object.entries(det.comerciais).forEach(([k, v]) => {
                  totalDetailedComerciaisObj[k] = (totalDetailedComerciaisObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.administrativas) {
                Object.entries(det.administrativas).forEach(([k, v]) => {
                  totalDetailedAdministrativasObj[k] = (totalDetailedAdministrativasObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.deducoes) {
                Object.entries(det.deducoes).forEach(([k, v]) => {
                  totalDetailedDeducoesObj[k] = (totalDetailedDeducoesObj[k] || 0) + (Number(v) || 0);
                });
              }
              if (det.despesasVariaveis) {
                Object.entries(det.despesasVariaveis).forEach(([k, v]) => {
                  totalDetailedDespesasVariaveisObj[k] = (totalDetailedDespesasVariaveisObj[k] || 0) + (Number(v) || 0);
                });
              }
            }
          }
        });

        if (exists) {
          timelineList.push({
            month: mLabel,
            year: y,
            faturamento: totalFat,
            cmv: totalCmv,
            payroll: totalPayroll,
            rent: totalRent,
            marketing: totalMarketing,
            operational: totalOperational,
            taxes: totalTaxes,
            royalties: totalRoyalties,
            ebitda: totalEbitda,
            netProfit: totalNetProfit,
            quantidadePedidos: totalPedidos,
            receitaIfood: totalReceitaIfood,
            receitaWedo: totalReceitaWedo,
            receitaBalcao: totalReceitaBalcao,
            metaFaturamento: totalMetaFaturamento,
            details: {
              funcionamento: totalDetailedFuncionamentoObj,
              colaboradores: totalDetailedColaboradoresObj,
              manutencao: totalDetailedManutencaoObj,
              comerciais: totalDetailedComerciaisObj,
              administrativas: totalDetailedAdministrativasObj,
              deducoes: totalDetailedDeducoesObj,
              despesasVariaveis: totalDetailedDespesasVariaveisObj
            }
          });
        }
      });
    });

    return timelineList;
  }, [allStoresDreData, isRoot, selectedYear]);

  const activeDreTimeline = isRoot ? consolidatedTimeline : dreTimeline;

  const currentMonthData = activeDreTimeline.find(d => 
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

  const totalPayroll = currentMonthData.payroll || 0;
  const totalFunc = Object.values(currentMonthData.details?.funcionamento || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalManut = Object.values(currentMonthData.details?.manutencao || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalComer = Object.values(currentMonthData.details?.comerciais || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalAdmin = Object.values(currentMonthData.details?.administrativas || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  const dashFixedExpenses = currentMonthData.details 
    ? (totalPayroll + totalFunc + totalManut + totalComer + totalAdmin)
    : (totalPayroll + (currentMonthData.operational || 0));

  const dashVariableExpenses = currentMonthData.cmv + 
    (currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes) + 
    (currentMonthData.despesasVariaveis || 0);

  const dashMargemContrib = currentMonthData.faturamento - dashVariableExpenses;

  const activeMeta = currentMonthData.metaFaturamento !== undefined 
    ? currentMonthData.metaFaturamento 
    : (currentStore.brand === 'BEBELU' ? 140000 : 150000);
    
  const activeRealizado = currentMonthData.faturamento || 0;
  
  const dynamicMetaVsRealizado = [
    { name: 'Meta', valor: activeMeta, color: currentStore.brand === 'BEBELU' ? '#7F300C' : '#8884d8' },
    { name: 'Realizado', valor: activeRealizado, color: currentStore.brand === 'BEBELU' ? '#FFCB05' : (isDarkMode ? '#E63946' : '#0066FF') }
  ];
  
  const dynamicDeliveryChannels = [
    { name: 'iFood', valor: currentMonthData.receitaIfood || 0, color: '#991B1B' },
    { name: 'WEDO', valor: currentMonthData.receitaWedo || 0, color: '#0066FF' },
    { name: 'Balcão', valor: currentMonthData.receitaBalcao || 0, color: isDarkMode ? '#64748b' : '#FFB800' }
  ];

  // Memo to calculate performance breakdown of each store for ROOT mode
  const storesPerformance = React.useMemo(() => {
    if (!isRoot) return [];
    
    const storeIds = ['1', '2', '3'];
    const storeNames: Record<string, string> = {
      '1': 'Bebelu Mossoró',
      '2': 'Bebelu Riomar Papicu',
      '3': '4 Estylos Mossoró'
    };
    const storeColors: Record<string, string> = {
      '1': '#E63946',
      '2': '#FFCB05',
      '3': '#4f46e5'
    };
    
    return storeIds.map(sId => {
      const list = allStoresDreData[sId] || [];
      const match = list.find(d => d.month === currentMonthLabel && d.year === selectedYear);
      const faturamento = match ? (match.faturamento || 0) : 0;
      const cmv = match ? (match.cmv || 0) : 0;
      const cmvPct = faturamento > 0 ? (cmv / faturamento) * 100 : 0;
      const netProfit = match ? (match.netProfit || 0) : 0;
      const netProfitPct = faturamento > 0 ? (netProfit / faturamento) * 100 : 0;
      
      return {
        id: sId,
        name: storeNames[sId],
        faturamento,
        cmvPct,
        netProfit,
        netProfitPct,
        color: storeColors[sId]
      };
    }).sort((a, b) => b.faturamento - a.faturamento);
  }, [allStoresDreData, isRoot, currentMonthLabel, selectedYear]);

  const totalConsolidatedFat = storesPerformance.reduce((sum, item) => sum + item.faturamento, 0);

  // Memo to calculate exact expense distribution of the DRE for individual store mode
  const expenseDistribution = React.useMemo(() => {
    if (isRoot) return [];
    
    const faturamentoBase = currentMonthData.faturamento || 1;
    const cmvVal = currentMonthData.cmv || 0;
    const personnelVal = currentMonthData.payroll || 0;
    const taxesVal = (currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes || 0);
    const rentVal = (currentMonthData.rent || 0);
    const marketingVal = (currentMonthData.marketing || currentMonthData.details?.comerciais?.marketing || 0);
    const royaltiesVal = (currentMonthData.royalties || 0);
    const operationalVal = (currentMonthData.operational || 0);
    
    const otherCosts = Math.max(0, (currentMonthData.faturamento || 0) - (currentMonthData.netProfit || 0) - (cmvVal + personnelVal + taxesVal + rentVal + marketingVal + royaltiesVal + operationalVal));

    return [
      { name: 'Pessoal (Salários/Encargos)', value: personnelVal, pct: (personnelVal / faturamentoBase) * 100, color: '#0066FF' },
      { name: 'Impostos e Deduções', value: taxesVal, pct: (taxesVal / faturamentoBase) * 100, color: '#6B7280' },
      { name: 'Ocupação (Aluguel/Energia)', value: rentVal, pct: (rentVal / faturamentoBase) * 100, color: '#FFB800' },
      { name: 'Marketing / Comercial', value: marketingVal, pct: (marketingVal / faturamentoBase) * 100, color: '#EC4899' },
      { name: 'Royalties / Franquia', value: royaltiesVal, pct: (royaltiesVal / faturamentoBase) * 100, color: '#8B5CF6' },
      { name: 'Outras Operacionais', value: operationalVal + otherCosts, pct: ((operationalVal + otherCosts) / faturamentoBase) * 100, color: '#10B981' }
    ].filter(item => item.value > 0);
  }, [currentMonthData, isRoot]);

  // Dynamic yearly data for the current month comparison
  const yearNum = parseInt(selectedYear);
  const yearsToCompare = [
    (yearNum - 2).toString(),
    (yearNum - 1).toString(),
    selectedYear
  ];

  const yearlyComparisonData = yearsToCompare.map((y, idx) => {
    const timelineData = activeDreTimeline.find(p => 
      p.month === currentMonthLabel && 
      (p.year === y || (!p.year && y === '2026'))
    );
    
    const faturamento = y === selectedYear 
      ? (currentMonthData.faturamento || 0) 
      : (timelineData ? timelineData.faturamento : (yearlyHistory[y] || 0));

    const colors = [
      isDarkMode ? '#475569' : '#CBD5E1',
      '#8B5CF6',
      '#0EA5E9'
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

  // Filter and sort the activeDreTimeline for the "Crescimento Mensal" chart to show the selected year's data sorted chronologically
  const sortedChartData = activeDreTimeline
    .filter(p => {
      const pYear = p.year || '2026';
      return pYear === selectedYear;
    })
    .sort((a, b) => {
      const indexA = MONTH_ORDER[a.month] || 0;
      const indexB = MONTH_ORDER[b.month] || 0;
      return indexA - indexB;
    });

  const isPatriciab = 
    user?.role === 'MANAGER' ||
    user?.role?.startsWith('MANAGER_') ||
    user?.username === 'patriciab28' || 
    user?.username?.toLowerCase().includes('paloma');

  const displayMetrics = [
    { label: 'Faturamento Total', valor: faturamento, format: 'currency', trend: 'up', change: '0' },
    ...(!isPatriciab ? [{ label: 'Lucro Líquido', valor: netProfit, format: 'currency', trend: netProfit < 0 ? 'down' : 'up', change: '0' }] : []),
    { label: 'CMV Médio', valor: cmvRate, format: 'percent', trend: 'down', change: '0' },
    { label: 'Ticket Médio', valor: ticketMedio, format: 'currency', trend: 'up', change: '0' },
    { label: 'Pedidos Totais', valor: totalPedidos, format: 'number', trend: 'up', change: '0' },
    ...(!isPatriciab ? [{ label: 'Margem Operac.', valor: margemOperacional, format: 'percent', trend: margemOperacional < 0 ? 'down' : 'up', change: '0' }] : []),
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
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 mr-2">
            <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              {months.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white">{m.label}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
            >
              {['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map(year => (
                <option key={year} value={year} className="bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white">{year}</option>
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
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isPatriciab ? 'xl:grid-cols-4' : 'xl:grid-cols-6'} gap-4`}>
        {displayMetrics.map((metric, i) => {
          const isCmv = metric.label === 'CMV Médio';
          const isHealthy = isCmv 
            ? (metric.valor as number) <= 36 
            : metric.trend === 'up';
          const statusColor = isHealthy ? 'text-green-500 bg-green-500/10' : 'text-red-700 bg-red-700/10';
          
          const isLossOrNegativeMargin = 
            (isCmv && (metric.valor as number) > 36) ||
            (!isCmv && (metric.label === 'Lucro Líquido' || metric.label === 'Margem Operac.') && (metric.valor as number) < 0);
            
          const isProfitOrPositiveMargin = 
            (isCmv && (metric.valor as number) <= 36) ||
            (!isCmv && (metric.label === 'Lucro Líquido' || metric.label === 'Margem Operac.') && (metric.valor as number) > 0);
          
          const cardBg = isLossOrNegativeMargin 
            ? (isDarkMode ? 'bg-red-950/20' : 'bg-red-50/50') 
            : isProfitOrPositiveMargin
              ? (isDarkMode ? 'bg-emerald-950/20' : 'bg-emerald-50/50')
              : (isDarkMode ? 'bg-[#1E1E1E]' : 'bg-white');
            
          const cardBorder = isLossOrNegativeMargin 
            ? 'border-red-500/30' 
            : isProfitOrPositiveMargin
              ? 'border-emerald-500/30 shadow-sm shadow-emerald-500/5'
              : (isDarkMode ? 'border-[#333]' : 'border-slate-100 shadow-sm');
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-2xl border transition-all duration-300 ${cardBg} ${cardBorder}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>{metric.label}</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {isCmv 
                    ? ((metric.valor as number) > 36 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />)
                    : (metric.trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />)
                  }
                  {metric.change}%
                </div>
              </div>
              <div className={`text-lg font-black break-all leading-tight flex items-center gap-1.5 ${
                isLossOrNegativeMargin 
                  ? 'text-red-600 dark:text-red-400 animate-pulse' 
                  : isProfitOrPositiveMargin
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (isDarkMode ? 'text-white' : 'text-black')
              }`}>
                {isLossOrNegativeMargin && (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                {isProfitOrPositiveMargin && (
                  <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {metric.format === 'currency' ? (
                  formatCurrency(metric.valor as number)
                ) : metric.format === 'percent' ? (
                  formatPercent(metric.valor as number)
                ) : (
                  formatNumber(metric.valor as number)
                )}
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
              <AreaChart data={sortedChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                  labelStyle={{ color: '#888' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
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
              <BarChart data={dynamicMetaVsRealizado}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                  labelStyle={{ color: '#888' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                  {dynamicMetaVsRealizado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-black/20 text-center">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Atingimento</div>
            <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {(dynamicMetaVsRealizado[0].valor > 0) ? (
                `${((dynamicMetaVsRealizado[1].valor / dynamicMetaVsRealizado[0].valor) * 100).toFixed(1)}%`
              ) : (
                '0.0%'
              )}
            </div>
            {dynamicMetaVsRealizado[1].valor < dynamicMetaVsRealizado[0].valor ? (
              <p className="text-[10px] text-red-700 font-bold mt-1">
                Faltam {formatCurrency(dynamicMetaVsRealizado[0].valor - dynamicMetaVsRealizado[1].valor)} para a meta
              </p>
            ) : (
              <p className="text-[10px] text-green-500 font-bold mt-1">
                Meta batida! {formatCurrency(dynamicMetaVsRealizado[1].valor - dynamicMetaVsRealizado[0].valor)} acima do esperado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hourly & Daily Sales replaced with dynamic Unit Performance / Expenses Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Card replacing Faturamento por Horário */}
        {isRoot ? (
          <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <PieIcon className="w-5 h-5 text-emerald-500" /> Desempenho por Unidade
                </h3>
                <p className="text-[10px] text-slate-500 font-medium italic">Faturamento por loja em {currentMonthLabel}/{selectedYear}</p>
              </div>
              <span className="text-xs bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full font-bold uppercase italic">Rank</span>
            </div>
            
            <div className="space-y-5">
              {storesPerformance.map((store, i) => {
                const pctOfTotal = totalConsolidatedFat > 0 ? (store.faturamento / totalConsolidatedFat) * 100 : 0;
                return (
                  <div key={store.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#333] text-[10px] font-black text-slate-500">#{i + 1}</span>
                        <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{store.name}</span>
                      </div>
                      <div className="text-right">
                        <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatCurrency(store.faturamento)}</span>
                        <span className="text-slate-400 text-[10px] ml-1.5 font-normal flex-none">({pctOfTotal.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Performance bar */}
                    <div className="w-full bg-slate-100 dark:bg-black/20 h-2.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pctOfTotal}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: store.color }}
                      />
                    </div>
                    {/* Tiny stats beneath */}
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>CMV: <strong className={store.cmvPct > 35 ? 'text-rose-500' : 'text-emerald-500'}>{store.cmvPct.toFixed(1)}%</strong></span>
                      <span>Lucro Líquido: <strong className={store.netProfit < 0 ? 'text-rose-500' : 'text-emerald-500'}>{formatCurrency(store.netProfit)} ({store.netProfitPct.toFixed(1)}%)</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          user?.role === 'ADMIN' ? (
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                <PieIcon className="w-5 h-5 text-indigo-500" /> Distribuição de Custos e Despesas
              </h3>
              <p className="text-[10px] text-slate-500 mb-6 italic">Composição de gastos no acumulado de {currentMonthLabel}/{selectedYear}</p>
              
              <div className="space-y-4">
                {expenseDistribution.length > 0 ? expenseDistribution.map((exp) => (
                  <div key={exp.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500 dark:text-slate-400">{exp.name}</span>
                      <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                        {formatCurrency(exp.value)} <span className="text-[10px] text-slate-400 font-normal">({exp.pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-black/20 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${exp.pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: exp.color }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    Abra a aba Lançamentos para informar despesas relativas a este período.
                  </div>
                )}
              </div>
            </div>
          ) : null
        )}

        {/* Comparativo Mensal YoY */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'} ${(!isRoot && user?.role !== 'ADMIN') ? 'lg:col-span-2' : ''}`}>
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

      {/* DRE Resumido Row */}
      {!isPatriciab && (
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>DRE Resumido</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
             {[
               { label: 'Receita Bruta', valor: currentMonthData.faturamento, color: 'text-indigo-600 dark:text-indigo-400' },
               { label: 'Custos Variáveis', valor: -dashVariableExpenses, color: 'text-red-700 dark:text-red-400' },
               { label: 'Margem de Contrib.', valor: dashMargemContrib, bold: true },
               { label: 'Custos Fixos', valor: -dashFixedExpenses, color: 'text-red-700 dark:text-red-400' },
               { label: 'Resultado Líquido', valor: currentMonthData.netProfit, color: 'text-green-500 dark:text-green-400', bold: true, big: true }
             ].map((item) => {
               const isResultadoLiquido = item.label === 'Resultado Líquido';
               const isLoss = isResultadoLiquido && item.valor < 0;
               const finalColor = isResultadoLiquido 
                 ? (isLoss ? 'text-red-600 dark:text-red-400' : 'text-green-500 dark:text-green-400') 
                 : item.color;
               
               const cardBg = isLoss 
                 ? (isDarkMode ? 'bg-red-950/20' : 'bg-red-50/50') 
                 : (isDarkMode ? 'bg-black/20' : 'bg-slate-50');
                 
               const cardBorder = isLoss 
                 ? 'border-red-500/30 shadow-sm shadow-red-500/5' 
                 : (isDarkMode ? 'border-[#333]' : 'border-slate-100 shadow-sm');

               return (
                 <div 
                   key={item.label} 
                   className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 ${cardBg} ${cardBorder}`}
                 >
                   <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${item.bold ? (isDarkMode ? 'text-slate-200' : 'text-slate-900') : 'text-slate-400'}`}>
                     {item.label}
                   </span>
                   <span className={`text-sm font-black flex items-center gap-1.5 ${finalColor || (isDarkMode ? 'text-white' : 'text-slate-950')} ${item.big ? 'text-lg' : ''}`}>
                     {isLoss && (
                       <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce shrink-0" />
                     )}
                     {formatCurrency(item.valor)}
                   </span>
                 </div>
               );
             })}
          </div>
        </div>
      )}

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
                  <Tooltip 
                    formatter={(value: any) => {
                      const totalVal = dynamicDeliveryChannels.reduce((sum, channel) => sum + channel.valor, 0);
                      const percentage = totalVal > 0 ? (Number(value) / totalVal) * 100 : 0;
                      return [`${formatCurrency(Number(value))} (${percentage.toFixed(1)}%)`, 'Faturamento'];
                    }}
                    labelStyle={{ color: '#888' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  />
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
              {(() => {
                const totalVal = dynamicDeliveryChannels.reduce((sum, channel) => sum + channel.valor, 0);
                return dynamicDeliveryChannels.map((channel) => {
                  const percentage = totalVal > 0 ? (channel.valor / totalVal) * 100 : 0;
                  return (
                    <div key={channel.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                        <span className="text-xs font-bold dark:text-slate-300 uppercase">{channel.name}</span>
                      </div>
                      <div className={`text-xs font-black uppercase flex items-center gap-2 ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>
                        <span>{formatCurrency(channel.valor)}</span>
                        <span className="text-[10px] font-bold text-slate-400">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                });
              })()}
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
              const Icon = op.icon === 'Clock' ? Clock : op.icon === 'Star' ? Star : op.icon === 'ShoppingBag' ? ShoppingBag : Target;
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
            <button 
              onClick={() => setShowAllProducts(!showAllProducts)}
              className="text-sm font-bold text-indigo-600 dark:text-[#FFCB05] hover:underline cursor-pointer transition-all"
            >
              {showAllProducts ? 'Ver Resumo' : 'Ver Tabela ABC'}
            </button>
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
                {topProducts.length > 0 ? (showAllProducts ? topProducts : topProducts.slice(0, 5)).map((p) => {
                  const mVal = typeof p.margin === 'number' ? p.margin : parseFloat(p.margin || '0');
                  const isHigh = !isNaN(mVal) && mVal > 60;
                  return (
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
                        <div className={`text-sm font-bold ${isHigh ? 'text-green-500' : 'text-yellow-500'}`}>
                          {isNaN(mVal) ? '0.0%' : `${mVal.toFixed(1)}%`}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isHigh ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {isHigh ? 'Estrela' : 'Burro de Carga'}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
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
