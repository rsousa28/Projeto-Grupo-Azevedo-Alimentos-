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
  AlertTriangle, Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  mostProfitable,
  lowMarginProducts
} from '../lib/mockData';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { DREData } from '../types';
import DataEntrySection from '../components/DataEntrySection';
import { generateDailyQuote, DailyQuote } from '../services/geminiService';


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

  const isBebelu = currentStore.brand === 'BEBELU';
  const themeButtonBg = brandColors.button;
  const themeTextContrast = isBebelu ? '#121212' : '#FFFFFF';

  const currentInitialDate = new Date();
  const initialMonthStr = String(currentInitialDate.getMonth() + 1).padStart(2, '0');
  const initialYearStr = String(currentInitialDate.getFullYear());

  const [showEntry, setShowEntry] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(initialMonthStr);
  const [selectedYear, setSelectedYear] = useState(initialYearStr);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [dailyQuote, setDailyQuote] = useState<DailyQuote | null>({
    quote: "A excelência não é um ato de esforço isolado, mas sim a busca incessante por conformidade, disciplina e padrão.",
    author: "Conselho Executivo de Governança",
    explanation: "Consolidar os números operacionais deste mês e manter o rigor nos processos."
  });
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [selectedChartMonthCode, setSelectedChartMonthCode] = useState<string>(initialMonthStr);
  const [chartViewMode, setChartViewMode] = useState<'grouped' | 'stacked' | 'area'>('grouped');
  const [exportingPDF, setExportingPDF] = useState(false);

  React.useEffect(() => {
    setSelectedChartMonthCode(selectedMonth);
  }, [selectedMonth]);

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

  const fetchQuote = React.useCallback(async () => {
    setLoadingQuote(true);
    try {
      const q = await generateDailyQuote();
      setDailyQuote(q);
    } catch (e) {
      console.error("Error loading custom daily quote:", e);
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  React.useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleRefreshQuote = async () => {
    fetchQuote();
  };

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

  // Derived operational metrics based on selected month/year data
  const derivedOperationalMetrics = React.useMemo(() => {
    const tempoMedioVal = currentMonthData?.tempoMedio !== undefined ? currentMonthData.tempoMedio : 25;
    const avaliacaoIfoodVal = currentMonthData?.avaliacaoIfood !== undefined ? currentMonthData.avaliacaoIfood : 4.8;

    const tempoPercent = Math.max(0, Math.min(100, (20 / (tempoMedioVal || 1)) * 100));
    const avaliacaoPercent = (avaliacaoIfoodVal / 5) * 100;

    return [
      { 
        label: 'Tempo de Produção', 
        valor: `${tempoMedioVal} min`, 
        target: '20 min', 
        percent: tempoPercent, 
        icon: 'Clock',
        critical: tempoMedioVal > 20
      },
      { 
        label: 'Avaliação iFood', 
        valor: `${avaliacaoIfoodVal.toFixed(1)} / 5.0`, 
        target: '4.8', 
        percent: avaliacaoPercent, 
        icon: 'Star',
        critical: avaliacaoIfoodVal < 4.8 
      }
    ];
  }, [currentMonthData]);

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

  const deliveryVsBalcaoAnnualData = React.useMemo(() => {
    const monthsMapToLabel: Record<string, string> = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
      '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    return Object.entries(monthsMapToLabel).map(([code, name]) => {
      const match = activeDreTimeline.find(p => p.month === name && (p.year === selectedYear || (!p.year && selectedYear === '2026')));
      
      const balcao = match ? (match.receitaBalcao || 0) : 0;
      const ifoodVal = match ? (match.receitaIfood || 0) : 0;
      const wedoVal = match ? (match.receitaWedo || 0) : 0;
      const totalDeliveryCalculated = ifoodVal + wedoVal;
      const faturamentoTotal = match ? (match.faturamento || 0) : 0;
      
      const delivery = totalDeliveryCalculated > 0 
        ? totalDeliveryCalculated 
        : Math.max(0, faturamentoTotal - balcao);

      const total = balcao + delivery;
      const balcaoPct = total > 0 ? (balcao / total) * 100 : 0;
      const deliveryPct = total > 0 ? (delivery / total) * 100 : 0;

      return {
        monthCode: code,
        month: name,
        balcao,
        delivery,
        total,
        balcaoPct,
        deliveryPct
      };
    });
  }, [activeDreTimeline, selectedYear]);

  const selectedChartMonthData = React.useMemo(() => {
    return deliveryVsBalcaoAnnualData.find(d => d.monthCode === selectedChartMonthCode) || deliveryVsBalcaoAnnualData[4]; // standard fallback is Maio
  }, [deliveryVsBalcaoAnnualData, selectedChartMonthCode]);

  const isPatriciab = 
    user?.role === 'MANAGER' ||
    user?.role?.startsWith('MANAGER_') ||
    user?.username === 'patriciab28' || 
    user?.username?.toLowerCase().includes('andressa') ||
    user?.username?.toLowerCase().includes('michele');

  const displayMetrics = [
    { label: 'Faturamento Total', valor: faturamento, format: 'currency', trend: 'up', change: '0' },
    ...(!isPatriciab ? [{ label: 'Lucro Líquido', valor: netProfit, format: 'currency', trend: netProfit < 0 ? 'down' : 'up', change: '0' }] : []),
    { label: 'CMV Médio', valor: cmvRate, format: 'percent', trend: 'down', change: '0' },
    ...(!isPatriciab ? [{ label: 'Margem Operac.', valor: margemOperacional, format: 'percent', trend: margemOperacional < 0 ? 'down' : 'up', change: '0' }] : []),
  ];

  const exportDashboardPDF = async () => {
    setExportingPDF(true);

    // Color conversion algorithms matching CSS Color Level 4
    const oklabToRgb = (l: number, oklabA: number, oklabB: number, a: number = 1): string => {
      const l_ = l + 0.3963377774 * oklabA + 0.2158037573 * oklabB;
      const m_ = l - 0.1055613458 * oklabA - 0.0638541728 * oklabB;
      const s_ = l - 0.0894841775 * oklabA - 1.2914855480 * oklabB;

      const l_3 = l_ * l_ * l_;
      const m_3 = m_ * m_ * m_;
      const s_3 = s_ * s_ * s_;

      let rLinear = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
      let gLinear = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
      let bLinear = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

      const f = (cVal: number) => {
        if (cVal <= 0.0031308) return 12.92 * cVal;
        return 1.055 * Math.pow(cVal, 1 / 2.4) - 0.055;
      };

      const r = Math.round(Math.max(0, Math.min(1, f(rLinear))) * 255);
      const g = Math.round(Math.max(0, Math.min(1, f(gLinear))) * 255);
      const b = Math.round(Math.max(0, Math.min(1, f(bLinear))) * 255);

      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const oklchToRgb = (l: number, c: number, h: number, a: number = 1): string => {
      const hRad = (h * Math.PI) / 180;
      const oklabA = c * Math.cos(hRad);
      const oklabB = c * Math.sin(hRad);
      return oklabToRgb(l, oklabA, oklabB, a);
    };

    const replaceOklchInText = (text: string): string => {
      if (!text) return text;
      const regex = /oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*[\/,\s]\s*([0-9.]+%?))?\s*\)|oklch\(\s*([0-9.]+%?)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+%?))?\s*\)/g;
      return text.replace(regex, (match, l1, c1, h1, a1, l2, c2, h2, a2) => {
        try {
          const lStr = l1 || l2;
          const cStr = c1 || c2;
          const hStr = h1 || h2;
          const aStr = a1 || a2;

          let l = parseFloat(lStr);
          if (lStr.includes('%')) l = l / 100;
          let c = parseFloat(cStr);
          let h = parseFloat(hStr);
          let a = 1;
          if (aStr) {
            let parsedA = parseFloat(aStr);
            if (aStr.includes('%')) parsedA = parsedA / 100;
            a = parsedA;
          }
          return oklchToRgb(l, c, h, a);
        } catch (e) {
          return 'rgba(255, 255, 255, 1)';
        }
      });
    };

    const replaceOklabInText = (text: string): string => {
      if (!text) return text;
      const regex = /oklab\(\s*([0-9.]+%?)\s+([-+]?[0-9.]+)\s+([-+]?[0-9.]+)(?:\s*[\/,\s]\s*([0-9.]+%?))?\s*\)|oklab\(\s*([0-9.]+%?)\s*,\s*([-+]?[0-9.]+)\s*,\s*([-+]?[0-9.]+)(?:\s*,\s*([0-9.]+%?))?\s*\)/g;
      return text.replace(regex, (match, l1, a1, b1, alpha1, l2, a2, b2, alpha2) => {
        try {
          const lStr = l1 || l2;
          const aParamStr = a1 || a2;
          const bParamStr = b1 || b2;
          const aStr = alpha1 || alpha2;

          let l = parseFloat(lStr);
          if (lStr.includes('%')) l = l / 100;
          let oklabA = parseFloat(aParamStr);
          let oklabB = parseFloat(bParamStr);
          let a = 1;
          if (aStr) {
            let parsedA = parseFloat(aStr);
            if (aStr.includes('%')) parsedA = parsedA / 100;
            a = parsedA;
          }
          return oklabToRgb(l, oklabA, oklabB, a);
        } catch (e) {
          return 'rgba(255, 255, 255, 1)';
        }
      });
    };

    const replaceColorsInText = (text: string): string => {
      if (!text) return text;
      let res = replaceOklchInText(text);
      res = replaceOklabInText(res);
      return res;
    };

    // Statefully map and swap styles for html2canvas
    const savedStyles = new Map<HTMLStyleElement, string>();
    document.querySelectorAll('style').forEach((styleTag) => {
      if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
        savedStyles.set(styleTag, styleTag.textContent);
        styleTag.textContent = replaceColorsInText(styleTag.textContent);
      }
    });

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Top Indigo Header Banner
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 42, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("AZEVEDO FOODS - CORPORATIVO", 15, 16);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 255);
      doc.text(`Relatório Consolidado de Desempenho e Indicadores Financeiros`, 15, 23);
      doc.text(`Unidade Selecionada: ${currentStore.name} (${currentStore.code})`, 15, 29);
      
      const mesExtenso = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
      doc.text(`Período de Análise: ${mesExtenso} / ${selectedYear}`, 135, 16);
      doc.text(`Extraído em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 135, 23);
      doc.text(`Assinado Digitalmente (b32 Conectividade)`, 135, 29);

      // Yellow indicator line beneath banner
      doc.setFillColor(255, 184, 0);
      doc.rect(0, 42, 210, 2, 'F');

      // SECTION 1: Indicadores Operacionais
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("1. PRINCIPAIS INDICADORES OPERACIONAIS", 15, 52);

      const kpiRows = displayMetrics.map(m => {
        let valStr = "";
        if (m.format === 'currency') valStr = formatCurrency(m.valor as number);
        else if (m.format === 'percent') valStr = formatPercent(m.valor as number);
        else valStr = formatNumber(m.valor as number);
        return [m.label, valStr];
      });

      autoTable(doc, {
        startY: 55,
        head: [['Indicador de Performance', 'Apurado no Período']],
        body: kpiRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        margin: { left: 15, right: 15 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 8;

      // SECTION 2: DRE Resumido
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("2. DEMONSTRATIVO DE RESULTADOS DO EXERCÍCIO (DRE RESUMIDO)", 15, currentY);

      const faturamentoBase = currentMonthData.faturamento || 1;
      const getPctStr = (val: number) => `${((val / faturamentoBase) * 100).toFixed(1)}%`;

      const dreRows = [
        ['Receita Bruta (Faturamento)', formatCurrency(currentMonthData.faturamento), '100%'],
        ['(-) Custos Variáveis (CMV + Impostos)', formatCurrency(-dashVariableExpenses), getPctStr(-dashVariableExpenses)],
        ['(=) Margem de Contribuição', formatCurrency(dashMargemContrib), getPctStr(dashMargemContrib)],
        ['(-) Custos Fixos (Pessoal + Ocupação + Operacionais)', formatCurrency(-dashFixedExpenses), getPctStr(-dashFixedExpenses)],
        ['(=) Resultado Líquido', formatCurrency(currentMonthData.netProfit), getPctStr(currentMonthData.netProfit)]
      ];

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Rubrica Financeira', 'Valor Realizado', 'Fração sobre Receita']],
        body: dreRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // SECTION 3: Distribuição de Custos, Despesas / Desempenho
      if (currentY + 45 > 280) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      if (isRoot) {
        doc.text("3. DESEMPENHO POR UNIDADE (VISÃO CONSOLIDADA)", 15, currentY);
        const storeRows = storesPerformance.map((s, idx) => [
          `#${idx + 1} - ${s.name}`,
          formatCurrency(s.faturamento),
          `${s.cmvPct.toFixed(1)}%`,
          formatCurrency(s.netProfit),
          `${s.netProfitPct.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Unidade', 'Faturamento', 'CMV %', 'Lucro Líquido', 'Margem de Lucro']],
          body: storeRows,
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2.2 },
          margin: { left: 15, right: 15 }
        });
      } else {
        doc.text("3. COMPOSIÇÃO DE CUSTOS E DESPESAS OPERACIONAIS", 15, currentY);
        const expenseRows = expenseDistribution.map(exp => [
          exp.name,
          formatCurrency(exp.value),
          `${exp.pct.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Categoria de Gasto', 'Valor Apurado', 'Percentual sobre Receita']],
          body: expenseRows,
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2.2 },
          margin: { left: 15, right: 15 }
        });
      }

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // Capture function to safely snapshot charts with double oklch/oklab replacement
      const captureChart = async (id: string, title?: string): Promise<number> => {
        const chartEl = document.getElementById(id);
        if (!chartEl) return 0;
        
        try {
          const canvas = await html2canvas(chartEl, {
            scale: 1.8,
            useCORS: true,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
            logging: false,
            onclone: (clonedDoc) => {
              clonedDoc.querySelectorAll('*').forEach((el: any) => {
                try {
                  const styleAttr = el.getAttribute('style');
                  if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                    el.setAttribute('style', replaceColorsInText(styleAttr));
                  }
                  const style = window.getComputedStyle(el);
                  const props = [
                    'backgroundColor', 'color', 'borderColor', 
                    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 
                    'stroke', 'fill'
                  ];
                  props.forEach(prop => {
                    const val = style[prop as any];
                    if (val && (val.includes('oklch') || val.includes('oklab'))) {
                      el.style[prop] = replaceColorsInText(val);
                    }
                  });
                } catch (e) {}
              });
            }
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 180;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (currentY + imgHeight > 275) {
            doc.addPage();
            currentY = 15;
            if (title) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(100, 116, 139);
              doc.text(`${title} (Visualização Gráfica)`, 15, currentY);
              currentY += 5;
            }
          }
          
          doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
          return imgHeight;
        } catch (e) {
          console.warn(`Erro ao capturar gráfico com o ID ${id}:`, e);
          return 0;
        }
      };

      // PAGE 2: Canais de Distribuição
      doc.addPage();
      currentY = 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("4. DESEMPENHO ANUAL DE CANAIS DE DISTRIBUIÇÃO", 15, currentY);
      currentY += 3;

      const channelRows = deliveryVsBalcaoAnnualData.map(d => [
        d.month,
        formatCurrency(d.balcao),
        `${d.balcaoPct.toFixed(1)}%`,
        formatCurrency(d.delivery),
        `${d.deliveryPct.toFixed(1)}%`,
        formatCurrency(d.total)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Período', 'Faturamento Balcão', 'Participação Balcão', 'Faturamento Delivery', 'Participação Delivery', 'Total Canal']],
        body: channelRows,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Gráfico de Origem dos Pedidos (Balcão vs. Delivery)", 15, currentY);
      currentY += 3;

      const chartBalcaoH = await captureChart('chart-balcao-delivery', "Balcão vs. Delivery");
      if (chartBalcaoH > 0) {
        currentY += chartBalcaoH + 12;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.text("[Gráfico Balcão vs Delivery carregando ou indisponível]", 15, currentY + 3);
        currentY += 10;
      }

      // PAGE 3: Crescimento Mensal
      doc.addPage();
      currentY = 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("5. CRESCIMENTO E EVOLUÇÃO MENSAL DO FATURAMENTO (HISTÓRICO MÊS A MÊS)", 15, currentY);
      currentY += 3;

      const growthRows = sortedChartData.map(d => [
        d.month,
        formatCurrency(d.faturamento),
        d.receitaBalcao ? formatCurrency(d.receitaBalcao) : '-',
        d.receitaDelivery ? formatCurrency(d.receitaDelivery) : '-'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Mês', 'Faturamento Total', 'Venda Balcão', 'Venda Delivery']],
        body: growthRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.8 },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Gráfico de Tendência e Crescimento de Faturamento", 15, currentY);
      currentY += 3;

      const chartCrescimentoH = await captureChart('chart-crescimento-mensal', "Crescimento Mensal");
      if (chartCrescimentoH > 0) {
        currentY += chartCrescimentoH + 12;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.text("[Gráfico de Crescimento Mensal indisponível]", 15, currentY + 3);
        currentY += 10;
      }

      // PAGE 4: Acompanhamento de Metas de Faturamento & YoY History (2024, 2025, 2026)
      doc.addPage();
      currentY = 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("6. ACOMPANHAMENTO DE METAS DE VENDAS", 15, currentY);
      currentY += 3;

      const metaDiff = activeRealizado - activeMeta;
      const metaPct = activeMeta > 0 ? (activeRealizado / activeMeta) * 100 : 0;
      const metaRows = [
        ['Faturamento Meta Planejado', formatCurrency(activeMeta)],
        ['Faturamento Realizado Praticado', formatCurrency(activeRealizado)],
        ['Desvio Absoluto (Realizado vs. Meta)', formatCurrency(metaDiff)],
        ['Aproveitamento de Meta (%)', `${metaPct.toFixed(1)}%`]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['Métrica de Meta', 'Indicador Obtido']],
        body: metaRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2 },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Gráfico Comparativo de Metas vs. Realizado", 15, currentY);
      currentY += 3;

      const chartMetaRealizadoH = await captureChart('chart-meta-realizado', "Meta vs Realizado");
      if (chartMetaRealizadoH > 0) {
        currentY += chartMetaRealizadoH + 12;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.text("[Gráfico de Meta vs Realizado indisponível]", 15, currentY + 3);
        currentY += 10;
      }

      // SECTION 7: YoY Comparison (2024, 2025, 2026)
      if (currentY + 50 > 280) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("7. COMPARATIVO HISTÓRICO ANUAL (YoY - 2024, 2025, 2026)", 15, currentY);
      currentY += 3;

      const yoyRows = yearlyComparisonData.map(d => [
        `Ano ${d.year}`,
        formatCurrency(d.faturamento)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Ano de Exercício', 'Faturamento Realizado']],
        body: yoyRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2 },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Gráfico de Evolução Histórica YoY", 15, currentY);
      currentY += 3;

      const chartYoyH = await captureChart('chart-historico-anos', "Histórico YoY");
      if (chartYoyH > 0) {
        currentY += chartYoyH + 12;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.text("[Gráfico Histórico de Anos indisponível]", 15, currentY + 3);
        currentY += 10;
      }

      // Add standard headers, page numbers to the footers of all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Desempenho Corporativo Grupo Azevedo - Privado e Confidencial | Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
      }

      doc.save(`Relatorio_Performance_${currentStore.code}_${selectedYear}_${selectedMonth}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      // Always restore document stylesheet text content to revert color replacements
      savedStyles.forEach((content, styleTag) => {
        styleTag.textContent = content;
      });
      setExportingPDF(false);
    }
  };

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

          <button
            onClick={exportDashboardPDF}
            disabled={exportingPDF}
            aria-label="Baixar Relatório em PDF"
            style={{
              backgroundColor: themeButtonBg,
              color: themeTextContrast,
              boxShadow: `0 10px 15px -3px ${themeButtonBg}40`,
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Download className={`w-4 h-4 ${exportingPDF ? 'animate-spin' : ''}`} />
            {exportingPDF ? 'Gerando Relatório...' : 'Baixar Relatório (PDF)'}
          </button>

          {currentStore.code !== 'ROOT' && (
            <>

              <button 
                onClick={() => setShowEntry(!showEntry)}
                style={{
                  backgroundColor: themeButtonBg,
                  color: themeTextContrast,
                  boxShadow: `0 10px 15px -3px ${themeButtonBg}40`,
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 hover:brightness-110 cursor-pointer"
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
          {/* Daily Inspiration Widget */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl border transition-all duration-500 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${
              isDarkMode 
                ? 'bg-[#151515] border-[#2d2d2a]' 
                : 'bg-[#FCFCFA] border-[#ECECE6] shadow-sm shadow-slate-100/50'
            }`}
            id="dashboard_daily_inspiration"
          >
            {/* Background decorative faint brand seal or quote mark */}
            <div className={`absolute right-4 bottom-[-16px] text-[100px] font-black pointer-events-none select-none leading-none opacity-[0.03] lg:opacity-[0.04] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              “
            </div>

            <div className="flex items-start gap-4 flex-1 w-full">
              {/* Accent vertical high-contrast line */}
              <div className="w-1 self-stretch rounded-full bg-[#FFCB05]" />
              
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Insight de Desempenho & Governança
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-[#FFCB05] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" /> IA Ativa
                  </span>
                </div>

                <div className="min-h-[50px] flex items-center pr-3">
                  <AnimatePresence mode="wait">
                    {loadingQuote ? (
                      <motion.div
                        key="shimmer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 w-full animate-pulse"
                      >
                        <div className={`h-4 w-3/4 rounded-md ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                        <div className={`h-3 w-1/2 rounded-md ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={dailyQuote?.quote}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="space-y-1"
                      >
                        <p className={`text-base md:text-[17px] font-black tracking-tight leading-relaxed italic ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-800'
                        }`}>
                          "{dailyQuote?.quote}"
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <p className={`text-[10.5px] font-black tracking-widest uppercase italic text-[#7F300C] dark:text-[#FFCB05]`}>
                            — {dailyQuote?.author}
                          </p>
                          {dailyQuote?.explanation && (
                            <>
                              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                              <p className={`text-[10.5px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {dailyQuote?.explanation}
                              </p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Brand visual tags or quick actions */}
            <div className="flex items-center gap-3 self-stretch md:self-auto shrink-0 w-full md:w-auto justify-end md:justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-zinc-800/85 pt-3 md:pt-0 md:pl-5">
              <button 
                onClick={handleRefreshQuote}
                disabled={loadingQuote}
                title="Buscar novo ensinamento executivo (IA)"
                className={`p-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#1e1e1e] border border-[#2d2d2a] text-slate-400 hover:text-white' 
                    : 'bg-[#F2EFF0]/70 border border-slate-200/60 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 shadow-sm'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${loadingQuote ? 'animate-spin text-amber-500' : ''}`} />
              </button>
              
              {currentStore.brand === 'BEBELU' ? (
                <div className="hidden lg:flex flex-col items-end text-right justify-center pointer-events-none select-none shrink-0 font-display pl-2 leading-tight">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#7F300C] dark:text-[#FFCB05]">BEBELU SANDUÍCHES</span>
                  <span className="text-[7.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Fortaleza • Desde 1986</span>
                </div>
              ) : currentStore.brand === '4ESTYLOS' ? (
                <div className="hidden lg:flex flex-col items-end text-right justify-center pointer-events-none select-none shrink-0 font-display pl-2 leading-tight">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#E63946] dark:text-[#E63946]">4 ESTYLOS PIZZA</span>
                  <span className="text-[7.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Mossoró • Alta Gastronomia</span>
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-end text-right justify-center pointer-events-none select-none shrink-0 font-display pl-2 leading-tight">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">GRUPO AZEVEDO</span>
                  <span className="text-[7.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider font-mono">Holding Alimentos</span>
                </div>
              )}
            </div>
          </motion.div>

      {/* Main KPIs */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isPatriciab ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
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
        <div id="chart-crescimento-mensal" className={`lg:col-span-2 p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
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
        <div id="chart-meta-realizado" className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
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
            <div id="chart-distribuicao-custos" className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
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
        <div id="chart-historico-anos" className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'} ${(!isRoot && user?.role !== 'ADMIN') ? 'lg:col-span-2' : ''}`}>
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

      {/* Comparativo de Canais do Ano: Balcão vs Delivery */}
      <div id="chart-balcao-delivery" className={`p-6 rounded-3xl border transition-colors duration-500 ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className={`text-lg font-black uppercase italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <ShoppingBag className="w-5 h-5 text-indigo-500" /> Balcão vs. Delivery ({selectedYear})
            </h3>
            <p className="text-[10px] text-slate-500 font-medium italic">Histórico anual detalhado canal por canal. Clique nas colunas para selecionar o mês de análise.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-100 dark:border-[#333]">
              {[
                { id: 'grouped', name: 'Agrupado' },
                { id: 'stacked', name: 'Empilhado' },
                { id: 'area', name: 'Área' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChartViewMode(m.id as any)}
                  style={chartViewMode === m.id ? { backgroundColor: themeButtonBg, color: themeTextContrast } : {}}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    chartViewMode === m.id
                      ? 'shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* Quick Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/20 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-[#333]">
              <span className="text-[8px] font-black uppercase text-slate-400">Análise:</span>
              <select
                value={selectedChartMonthCode}
                onChange={(e) => setSelectedChartMonthCode(e.target.value)}
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none py-0.5 cursor-pointer text-slate-900 dark:text-white"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value} className="bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Channel Chart View */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewMode === 'area' ? (
                  <AreaChart data={deliveryVsBalcaoAnnualData} onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const payload = data.activePayload[0].payload;
                      setSelectedChartMonthCode(payload.monthCode);
                    }
                  }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#888', fontSize: 10}} 
                      tickFormatter={(val) => `R$ ${val/1000}k`}
                    />
                    <Tooltip
                      labelStyle={{ color: '#888', fontWeight: 'bold' }}
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: number) => [formatCurrency(val)]}
                    />
                    <defs>
                      <linearGradient id="colorBalcao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDarkMode ? '#64748b' : '#FFB800'} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={isDarkMode ? '#64748b' : '#FFB800'} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" name="Balcão" dataKey="balcao" stroke={isDarkMode ? '#64748b' : '#FFB800'} strokeWidth={3} fillOpacity={1} fill="url(#colorBalcao)" />
                    <Area type="monotone" name="Delivery" dataKey="delivery" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorDelivery)" />
                  </AreaChart>
                ) : (
                  <BarChart data={deliveryVsBalcaoAnnualData} onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const payload = data.activePayload[0].payload;
                      setSelectedChartMonthCode(payload.monthCode);
                    }
                  }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10}} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#888', fontSize: 10}} 
                      tickFormatter={(val) => `R$ ${val/1000}k`}
                    />
                    <Tooltip
                      labelStyle={{ color: '#888', fontWeight: 'bold' }}
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: number) => [formatCurrency(val)]}
                    />
                    <Bar 
                      name="Balcão" 
                      dataKey="balcao" 
                      stackId={chartViewMode === 'stacked' ? 'a' : undefined} 
                      fill={isDarkMode ? '#64748b' : '#FFB800'} 
                      radius={chartViewMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    />
                    <Bar 
                      name="Delivery" 
                      dataKey="delivery" 
                      stackId={chartViewMode === 'stacked' ? 'a' : undefined} 
                      fill="#4f46e5" 
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Custom Interactive Legends */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold pt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: isDarkMode ? '#64748b' : '#FFB800' }} />
                <span className="text-slate-500 dark:text-slate-400">Faturamento Balcão (Retirada)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#4f46e5]" />
                <span className="text-slate-500 dark:text-slate-400">Faturamento Delivery (Entregas)</span>
              </div>
            </div>
          </div>

          {/* Mini-dashboard details about the selected month */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-[#121212] border-[#292929]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-dashed border-slate-200 dark:border-[#333] pb-3">
                <span 
                  style={{ color: brandColors.primary }}
                  className="text-[11px] font-black uppercase tracking-wider"
                >
                  Análise: {selectedChartMonthData.month}
                </span>
                <span 
                  style={{
                    backgroundColor: `${brandColors.primary}1A`,
                    color: brandColors.primary
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                >
                  {selectedYear}
                </span>
              </div>

              {/* Total Row */}
              <div className="mb-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Faturamento Acumulado</span>
                <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(selectedChartMonthData.total)}
                </span>
              </div>

              <div className="space-y-4">
                {/* Channel 1: Balcao */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Faturamento Balcão</span>
                    <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(selectedChartMonthData.balcao)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Participação</span>
                    <span className="font-bold">{selectedChartMonthData.balcaoPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${selectedChartMonthData.balcaoPct}%`, 
                        backgroundColor: isDarkMode ? '#64748b' : '#FFB800' 
                      }} 
                    />
                  </div>
                </div>

                {/* Channel 2: Delivery */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Faturamento Delivery</span>
                    <span className="font-black text-indigo-500">
                      {formatCurrency(selectedChartMonthData.delivery)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Participação</span>
                    <span className="font-bold text-slate-300">{selectedChartMonthData.deliveryPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-[#4f46e5]" 
                      style={{ width: `${selectedChartMonthData.deliveryPct}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-[#333] space-y-1">
              <span className="text-[10px] text-slate-400 font-black uppercase block">Canal Predominante</span>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  selectedChartMonthData.total === 0 
                    ? 'text-slate-400' 
                    : selectedChartMonthData.delivery >= selectedChartMonthData.balcao 
                      ? 'text-indigo-400' 
                      : 'text-amber-500'
                }`}>
                  {selectedChartMonthData.total === 0 
                    ? 'Sem dados líquidos' 
                    : selectedChartMonthData.delivery >= selectedChartMonthData.balcao 
                      ? 'Delivery predominante' 
                      : 'Balcão predominante'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium italic">
                  {selectedChartMonthData.total > 0 && (
                    selectedChartMonthData.delivery >= selectedChartMonthData.balcao 
                      ? `${selectedChartMonthData.deliveryPct.toFixed(0)}% do volume`
                      : `${selectedChartMonthData.balcaoPct.toFixed(0)}% do volume`
                  )}
                </span>
              </div>
            </div>
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
      <div className="w-full">
        {/* Operational Indicators */}
        <div className={`p-6 rounded-3xl border transition-colors duration-500 ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <Zap className="w-5 h-5 text-yellow-500" /> Indicadores Operacionais
          </h3>
          <div className="space-y-6">
            {derivedOperationalMetrics.map((op) => {
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


        </>
      )}

    </div>
  );
}
