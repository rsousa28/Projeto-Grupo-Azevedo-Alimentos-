import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2,
  DollarSign, 
  PieChart, 
  Target, 
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  Zap,
  Star,
  Megaphone,
  Coins,
  Sparkles,
  Percent,
  ArrowUp,
  ArrowDown,
  TrendingDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { DREData } from '../types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export default function DataEntrySection({ 
  isEmbedded = false, 
  mode = 'full',
  initialMonth = '05',
  initialYear = '2026',
  onMonthChange,
  onYearChange
}: { 
  isEmbedded?: boolean, 
  mode?: 'dashboard' | 'finance' | 'marketing' | 'full',
  initialMonth?: string,
  initialYear?: string,
  onMonthChange?: (m: string) => void,
  onYearChange?: (y: string) => void
}) {
  const { 
    isDarkMode, 
    brandColors,
    currentStore,
    metrics, 
    setMetrics, 
    metaVsRealizado, 
    setMetaVsRealizado, 
    operationalMetrics, 
    setOperationalMetrics,
    topProducts,
    setTopProducts,
    dreTimeline,
    setDreTimeline,
    yearlyHistory,
    setYearlyHistory,
    deliveryChannels,
    setDeliveryChannels,
    salesByHour,
    setSalesByHour,
    salesByDay,
    setSalesByDay,
    peakHour: globalPeakHour,
    setPeakHour,
    saveCMVPeriod,
    saveDREPeriod,
    loadDREPeriod,
    loadCMVPeriod,
  } = useStore();

  const isBebeluRioMar = currentStore?.id === '2' || currentStore?.code === 'B28';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

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

  const marketingChartData = (dreTimeline || [])
    .filter(entry => entry.details?.marketingCampaigns && (
      (entry.details.marketingCampaigns.vendasValor || 0) > 0 || 
      (entry.details.marketingCampaigns.investidoLoja || 0) > 0
    ))
    .map(entry => {
      const mkt = entry.details?.marketingCampaigns;
      const investido = mkt?.investidoLoja || 0;
      const vendas = mkt?.vendasValor || 0;
      const roas = investido > 0 ? Number((vendas / investido).toFixed(2)) : 0;
      const monthTrimmed = entry.month.trim();
      const yearStr = entry.year || '2026';
      
      return {
        month: entry.month,
        year: yearStr,
        vendas,
        investido,
        roas,
        monthLabel: `${monthTrimmed.substring(0, 3)}/${String(yearStr).substring(2, 4)}`,
        sortKey: (Number(yearStr) * 100) + (MONTH_ORDER[monthTrimmed] || 0)
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-2xl border shadow-xl ${
          isDarkMode ? 'bg-[#1A1A1A] border-[#2D2D2D] text-white' : 'bg-white border-slate-100 text-slate-800'
        }`}>
          <p className="text-xs font-black uppercase tracking-wider mb-2 text-slate-400">
            {data.month} de {data.year}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-xs text-slate-400 font-medium">Investido pela Loja:</span>
              <span className="text-xs font-bold">{formatCurrency(data.investido)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-xs text-slate-400 font-medium">Vendas Geradas:</span>
              <span className="text-xs font-bold">{formatCurrency(data.vendas)}</span>
            </div>
            <div className="flex justify-between gap-8 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1">
              <span className="text-xs text-emerald-500 font-bold">ROAS / ROI obtido:</span>
              <span className="text-xs font-black text-emerald-500">{data.roas.toFixed(2).replace('.', ',')}x</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleNumericPaste = (e: React.ClipboardEvent<HTMLInputElement>, setter: (val: number) => void) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text') || '';
    
    // Remove currency indicators like R$ or $ and trim leading/trailing whitespace
    let clean = text.replace(/R\$\s?/gi, '').replace(/\$\s?/gi, '').trim();
    if (!clean) {
      setter(0);
      return;
    }

    // Replace any spaces with standard space
    clean = clean.replace(/\s/g, ' ');

    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');

    if (hasComma && hasDot) {
      const lastCommaIndex = clean.lastIndexOf(',');
      const lastDotIndex = clean.lastIndexOf('.');
      if (lastCommaIndex > lastDotIndex) {
        // e.g. "32.935,15" or "1.234.567,89"
        // Dot is thousands separator, Comma is decimal separator
        clean = clean.replace(/[\s\.]/g, '').replace(/,/g, '.');
      } else {
        // e.g. "32,935.15" or "1,234,567.89"
        // Comma is thousands separator, Dot is decimal separator
        clean = clean.replace(/[\s,]/g, '');
      }
    } else if (hasComma) {
      // Only commas, no dots, e.g. "32935,15" or "1,234,567"
      const commaCount = (clean.match(/,/g) || []).length;
      if (commaCount > 1) {
        clean = clean.replace(/[\s,]/g, '');
      } else {
        clean = clean.replace(/\s/g, '').replace(/,/g, '.');
      }
    } else if (hasDot) {
      // Only dots, no commas, e.g. "32935.15" or "1.234.567" or "4.536"
      const dotCount = (clean.match(/\./g) || []).length;
      if (dotCount > 1) {
        clean = clean.replace(/[\s\.]/g, '');
      } else {
        const parts = clean.split('.');
        if (parts[1] && parts[1].length === 3) {
          if (parts[0] === '0') {
            clean = clean.replace(/\s/g, '');
          } else {
            clean = clean.replace(/[\s\.]/g, '');
          }
        } else {
          clean = clean.replace(/\s/g, '');
        }
      }
    } else {
      clean = clean.replace(/\s/g, '');
    }

    // Keep only numeric characters, minus sign, and dot
    clean = clean.replace(/[^\d\.-]/g, '');

    const parsed = parseFloat(clean);
    setter(isNaN(parsed) ? 0 : parsed);
  };

  // Define available tabs based on mode
  const allTabs = [
    { id: 'financial', label: 'Financeiro & DRE', icon: DollarSign },
    { id: 'channels', label: 'Canais de Venda', icon: PieChart },
    { id: 'operational', label: 'Indicadores Operacionais', icon: Zap },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'history', label: 'Histórico YoY', icon: TrendingUp },
    { id: 'goals', label: 'Metas & Performance', icon: Target },
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (mode === 'dashboard') return tab.id !== 'financial' && tab.id !== 'marketing';
    if (mode === 'finance') return tab.id === 'financial';
    if (mode === 'marketing') return tab.id === 'marketing';
    return true;
  });

  const [activeTab, setActiveTab ] = useState<'financial' | 'history' | 'goals' | 'channels' | 'hourly' | 'operational' | 'marketing'>(
    mode === 'dashboard' ? 'channels' : (mode === 'marketing' ? 'marketing' : 'financial')
  );
  const [saved, setSaved] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [isChangingPeriod, setIsChangingPeriod] = useState(false);

  // Sync with props
  useEffect(() => {
    setSelectedMonth(initialMonth);
  }, [initialMonth]);

  useEffect(() => {
    setSelectedYear(initialYear);
  }, [initialYear]);

  // Metas & Performance states
  const [faturamentoMeta, setFaturamentoMeta] = useState(metaVsRealizado[0]?.valor || 0);
  const [cmvAlvo, setCmvAlvo] = useState(0);
  const [tempoMedio, setTempoMedio] = useState(0);
  const [satisfacaoMeta, setSatisfacaoMeta] = useState(0);
  const [avaliacaoIfood, setAvaliacaoIfood] = useState(4.8);

  // History states
  const [receita2025, setReceita2025] = useState(yearlyHistory['2025'] || 0);
  const [receita2024, setReceita2024] = useState(yearlyHistory['2024'] || 0);

  // Financial / DRE states
  const [revenue, setRevenue] = useState(0);

  // Detailed states
  const [deducoes, setDeducoes] = useState<Record<string, number>>({
    darfSimples: 0,
  });

  const [cmvTotal, setCmvTotal] = useState(0);
  const [cmvBalcao, setCmvBalcao] = useState(0);
  const [cmvDelivery, setCmvDelivery] = useState(0);

  const [despesasVariaveis, setDespesasVariaveis] = useState<Record<string, number>>({
    taxaCartao: 0,
    taxaMotoqueiro: 0,
    taxaIfood: 0,
    freteCompras: 0,
    fundoMarketing: 0,
    royalties: 0,
    taxaBancariaJuros: 0,
    taxaPix: 0,
    bonificacoes: 0,
    descontos: 0,
    griSecretaria: 0,
    despesasIfood: 0
  });

  const [colaboradores, setColaboradores] = useState<Record<string, number>>({
    salarios: 0,
    proLabore: 0,
    avulso: 0,
    diarias: 0,
    premiacao: 0,
    gratificacoes: 0,
    decimoTerceiro: 0,
    ferias: 0,
    INSS: 0,
    FGTS: 0,
    rescisorias: 0,
    cortesia: 0,
    valeTransp: 0,
    valeAlim: 0,
    alimentacao: 0,
    pos: 0,
    atestadoExame: 0,
    uniformesEPI: 0,
    outrosBeneficios: 0
  });

  const [funcionamento, setFuncionamento] = useState<Record<string, number>>({
    aluguel: 0,
    condominio: 0,
    energiaCâmaraFria: 0,
    iptu: 0,
    energiaEletrica: 0,
    agua: 0,
    arCondicionado: 0,
    internetTelefonia: 0
  });

  const [manutencao, setManutencao] = useState<Record<string, number>>({
    escritorios: 0,
    locacaoMaq: 0,
    manutencaoSist: 0,
    manutencaoEquip: 0,
    outrosManutencao: 0
  });

  const [comerciais, setComerciais] = useState<Record<string, number>>({
    aplicativo: 0,
    marketing: 0,
    frete: 0
  });

  const [administrativas, setAdministrativas] = useState<Record<string, number>>({
    sindicato: 0,
    limpeza: 0,
    taxaCallCenter: 0,
    sistemaBERP: 0,
    consultoria: 0,
    contabilidade: 0,
    premiacao: 0,
    dedetizacao: 0,
    certificado: 0,
    fretesDiversos: 0,
    utensilios: 0,
    materialConsumo: 0,
    materialEscritorio: 0,
    materialLimpeza: 0,
    combustiveis: 0,
    ronyXimenes: 0,
    seguros: 0,
    taxaAlvara: 0,
    despesasOperacionales: 0,
    despesasGerais: 0
  });

  const [resultadoFinanceiro, setResultadoFinanceiro] = useState<Record<string, number>>({
    taxasIfood: 0,
    tarifasBancarias: 0,
    taxasBancarias: 0,
    jurosRecebidos: 0
  });

  const [griFinal, setGriFinal] = useState(0);

  // Marketing states
  const [mktPedidosPromocao, setMktPedidosPromocao] = useState(0);
  const [mktPedidosMaisDeUmaPromo, setMktPedidosMaisDeUmaPromo] = useState(0);
  const [mktVendasValor, setMktVendasValor] = useState(0);
  const [mktInvestidoLoja, setMktInvestidoLoja] = useState(0);
  const [mktInvestidoPlataforma, setMktInvestidoPlataforma] = useState(0);

  // Helper to get previous month data for dynamic marketing trends
  const getPreviousMonthMarketingData = () => {
    const currentMonthNum = parseInt(selectedMonth, 10);
    let prevMonthNum = currentMonthNum - 1;
    let prevYearNum = parseInt(selectedYear, 10);
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYearNum -= 1;
    }
    const prevMonthStr = String(prevMonthNum).padStart(2, '0');
    const prevYearStr = String(prevYearNum);
    
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const prevMonthLabel = months[prevMonthNum - 1];
    
    const prevDRE = dreTimeline.find(d => 
      d.month === prevMonthLabel && 
      (d.year === prevYearStr || (!d.year && prevYearStr === '2026'))
    );
    return prevDRE?.details?.marketingCampaigns;
  };

  const prevMkt = getPreviousMonthMarketingData();

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return { pct: '0%', isUp: true, isNeutral: true };
    const diff = current - previous;
    const pctVal = (diff / previous) * 100;
    return {
      pct: `${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(0)}%`,
      isUp: pctVal >= 0,
      isNeutral: Math.abs(pctVal) < 1
    };
  };

  // Live calculations
  const trendPedidos = calculateTrend(mktPedidosPromocao, prevMkt?.pedidosPromocao);
  const trendVendas = calculateTrend(mktVendasValor, prevMkt?.vendasValor);
  const trendInvestidoLoja = calculateTrend(mktInvestidoLoja, prevMkt?.investidoLoja);
  const trendInvestidoPlataforma = calculateTrend(mktInvestidoPlataforma, prevMkt?.investidoPlataforma);

  const mktTotalInvestido = mktInvestidoLoja + mktInvestidoPlataforma;
  const prevTotalInvestido = (prevMkt?.investidoLoja || 0) + (prevMkt?.investidoPlataforma || 0);
  const trendTotalInvestido = calculateTrend(mktTotalInvestido, prevTotalInvestido);

  const mktRoas = mktInvestidoLoja > 0 ? mktVendasValor / mktInvestidoLoja : 0;
  const prevRoas = (prevMkt?.investidoLoja || 0) > 0 ? (prevMkt?.vendasValor || 0) / (prevMkt?.investidoLoja || 0) : 0;
  const trendRoas = calculateTrend(mktRoas, prevRoas);

  // ROAS classification
  let roasStatus = 'Regular';
  let roasColor = 'text-yellow-600 border-yellow-250 bg-yellow-50 dark:bg-yellow-950/10 dark:text-yellow-400';
  if (mktRoas >= 10) {
    roasStatus = 'Excelente';
    roasColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400';
  } else if (mktRoas >= 5) {
    roasStatus = 'Bom';
    roasColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/10 dark:text-green-400';
  } else if (mktRoas > 0 && mktRoas < 2) {
    roasStatus = 'Baixo';
    roasColor = 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/10 dark:text-red-400';
  }

  const [localSalesByHour, setLocalSalesByHour] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (let i = 0; i < 24; i++) {
      initial[`${String(i).padStart(2, '0')}:00`] = 0;
    }
    return initial;
  });

  // Channels states
  const [receitaBalcao, setReceitaBalcao] = useState(0);
  const [receitaIfood, setReceitaIfood] = useState(0);
  const [receitaWedo, setReceitaWedo] = useState(0);
  const [receitaDelivery, setReceitaDelivery] = useState(0);
  const [quantidadePedidos, setQuantidadePedidos] = useState(0);
  const [horarioPico, setHorarioPico] = useState(globalPeakHour);
  
  // Products state (local for editing)
  const [localProducts, setLocalProducts] = useState(topProducts);

  // Sync localProducts with topProducts when topProducts changes (loaded from Firestore)
  useEffect(() => {
    setLocalProducts(topProducts);
  }, [topProducts]);

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

  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label;

  // EFFECT: Fetch period data from Firestore whenever selectedMonth or selectedYear changes
  useEffect(() => {
    if (selectedMonth && selectedYear && currentStore.id) {
      setIsChangingPeriod(true);
      Promise.all([
        loadDREPeriod(selectedMonth, selectedYear),
        loadCMVPeriod(selectedMonth, selectedYear)
      ]).finally(() => {
        setTimeout(() => {
          setIsChangingPeriod(false);
        }, 300);
      });
    }
  }, [selectedMonth, selectedYear, currentStore.id]);

  // EFFECT: Sync Delivery Revenue with Ifood + Wedo
  useEffect(() => {
    setReceitaDelivery(receitaIfood + receitaWedo);
  }, [receitaIfood, receitaWedo]);

  // EFFECT: Load data when month changes
  useEffect(() => {
    const monthData = dreTimeline.find(d => d.month === currentMonthLabel && (d.year === selectedYear || (!d.year && selectedYear === '2026')));
    if (monthData) {
      setRevenue(monthData.faturamento);
      setReceitaBalcao(monthData.receitaBalcao || 0);
      setReceitaIfood(monthData.receitaIfood || 0);
      setReceitaWedo(monthData.receitaWedo || 0);
      setReceitaDelivery(monthData.receitaDelivery || 0);
      setQuantidadePedidos(monthData.quantidadePedidos || 0);
      setCmvTotal(monthData.cmv);
      setCmvBalcao(monthData.cmvBalcao || 0);
      setCmvDelivery(monthData.cmvDelivery || 0);
      setDeducoes({ darfSimples: monthData.taxes });

      if (monthData.yearlyHistory) {
        setReceita2024(monthData.yearlyHistory['2024'] || 0);
        setReceita2025(monthData.yearlyHistory['2025'] || 0);
      } else {
        setReceita2024(0);
        setReceita2025(0);
      }
      
      // Load goals from monthData
      setFaturamentoMeta(monthData.metaFaturamento !== undefined ? monthData.metaFaturamento : (currentStore.brand === 'BEBELU' ? 140000 : 150000));
      setCmvAlvo(monthData.cmvAlvo !== undefined ? monthData.cmvAlvo : 31);
      setTempoMedio(monthData.tempoMedio !== undefined ? monthData.tempoMedio : 25);
      setSatisfacaoMeta(monthData.metaNps !== undefined ? monthData.metaNps : 9.0);
      setAvaliacaoIfood(monthData.avaliacaoIfood !== undefined ? monthData.avaliacaoIfood : 4.8);
      
      if (monthData.details) {
        if (monthData.details.deducoes) setDeducoes(monthData.details.deducoes);
        if (monthData.details.cmvDetailed) {
          setCmvBalcao(monthData.details.cmvDetailed.balcao || 0);
          setCmvDelivery(monthData.details.cmvDetailed.delivery || 0);
        }
        if (monthData.details.despesasVariaveis) setDespesasVariaveis(monthData.details.despesasVariaveis);
        if (monthData.details.colaboradores) setColaboradores(monthData.details.colaboradores);
        if (monthData.details.funcionamento) setFuncionamento(monthData.details.funcionamento);
        if (monthData.details.manutencao) setManutencao(monthData.details.manutencao);
        if (monthData.details.comerciais) setComerciais(monthData.details.comerciais);
        if (monthData.details.administrativas) setAdministrativas(monthData.details.administrativas);
        if (monthData.details.resultadoFinanceiro) setResultadoFinanceiro(monthData.details.resultadoFinanceiro);
        if (monthData.details.griFinal !== undefined) setGriFinal(monthData.details.griFinal);
        if (monthData.details.salesByHour) setLocalSalesByHour(monthData.details.salesByHour);
        if (monthData.details.marketingCampaigns) {
          const mkt = monthData.details.marketingCampaigns;
          setMktPedidosPromocao(mkt.pedidosPromocao || 0);
          setMktPedidosMaisDeUmaPromo(mkt.pedidosMaisDeUmaPromo || 0);
          setMktVendasValor(mkt.vendasValor || 0);
          setMktInvestidoLoja(mkt.investidoLoja || 0);
          setMktInvestidoPlataforma(mkt.investidoPlataforma || 0);
        } else {
          setMktPedidosPromocao(0);
          setMktPedidosMaisDeUmaPromo(0);
          setMktVendasValor(0);
          setMktInvestidoLoja(0);
          setMktInvestidoPlataforma(0);
        }
      } else {
        // Fallback for mock data without details
        setDespesasVariaveis(prev => ({ ...prev, royalties: monthData.royalties }));
        setColaboradores(prev => ({ ...prev, salarios: monthData.payroll }));
        setFuncionamento(prev => ({ ...prev, aluguel: monthData.rent }));
        setMktPedidosPromocao(0);
        setMktPedidosMaisDeUmaPromo(0);
        setMktVendasValor(0);
        setMktInvestidoLoja(0);
        setMktInvestidoPlataforma(0);
      }
    } else {
      // Reset form for fresh entry
      setRevenue(0);
      setReceitaBalcao(0);
      setReceitaIfood(0);
      setReceitaWedo(0);
      setReceitaDelivery(0);
      setQuantidadePedidos(0);
      setCmvTotal(0);
      setCmvBalcao(0);
      setCmvDelivery(0);
      setDeducoes({ darfSimples: 0 });
      setDespesasVariaveis({
        taxaCartao: 0, taxaMotoqueiro: 0, taxaIfood: 0, freteCompras: 0, fundoMarketing: 0, 
        royalties: 0, taxaBancariaJuros: 0, taxaPix: 0, bonificacoes: 0, descontos: 0, griSecretaria: 0, despesasIfood: 0
      });
      setColaboradores({
        salarios: 0, proLabore: 0, avulso: 0, diarias: 0, premiacao: 0, gratificacoes: 0,
        decimoTerceiro: 0, ferias: 0, INSS: 0, FGTS: 0, rescisorias: 0, cortesia: 0,
        valeTransp: 0, valeAlim: 0, alimentacao: 0, pos: 0, atestadoExame: 0, uniformesEPI: 0, outrosBeneficios: 0
      });
      setFuncionamento({ aluguel: 0, condominio: 0, energiaCâmaraFria: 0, iptu: 0, energiaEletrica: 0, agua: 0, arCondicionado: 0, internetTelefonia: 0 });
      setManutencao({ escritorios: 0, locacaoMaq: 0, manutencaoSist: 0, manutencaoEquip: 0, outrosManutencao: 0 });
      setComerciais({ aplicativo: 0, marketing: 0, frete: 0 });
      setAdministrativas({
        sindicato: 0, limpeza: 0, taxaCallCenter: 0, sistemaBERP: 0, consultoria: 0, contabilidade: 0, premiacao: 0, dedetizacao: 0, certificado: 0,
        fretesDiversos: 0, utensilios: 0, materialConsumo: 0, materialEscritorio: 0, materialLimpeza: 0, combustiveis: 0, ronyXimenes: 0, seguros: 0, taxaAlvara: 0, despesasOperacionales: 0, despesasGerais: 0
      });
      setResultadoFinanceiro({ taxasIfood: 0, tarifasBancarias: 0, taxasBancarias: 0, jurosRecebidos: 0 });
      setGriFinal(0);
      setMktPedidosPromocao(0);
      setMktPedidosMaisDeUmaPromo(0);
      setMktVendasValor(0);
      setMktInvestidoLoja(0);
      setMktInvestidoPlataforma(0);
      setReceita2024(0);
      setReceita2025(0);
      
      // Reset goals to defaults too
      setFaturamentoMeta(currentStore.brand === 'BEBELU' ? 140000 : 150000);
      setCmvAlvo(31);
      setTempoMedio(25);
      setSatisfacaoMeta(9.0);
      setAvaliacaoIfood(4.8);

      setLocalSalesByHour(() => {
        const initial: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
          initial[`${String(i).padStart(2, '0')}:00`] = 0;
        }
        return initial;
      });
    }
  }, [selectedMonth, dreTimeline, currentMonthLabel, selectedYear, currentStore.brand]);

  const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  const handleSave = async (isAutoSave = false) => {
    if (isChangingPeriod) {
      console.warn("Save aborted: Month transition is in progress.");
      return;
    }
    const totalDelivery = receitaIfood + receitaWedo;
    const totalRevenue = receitaBalcao + totalDelivery;

    if (isAutoSave) {
      const existingData = dreTimeline.find(d => d.month === currentMonthLabel && (d.year === selectedYear || (!d.year && selectedYear === '2026')));
      if (existingData && existingData.faturamento > 0 && totalRevenue === 0) {
        console.warn("Auto-save aborted: prevented zeroing out active faturamento data during potential transition lag.");
        return;
      }
    }

    const currentCmvTotal = cmvBalcao + cmvDelivery;
    setReceitaDelivery(totalDelivery);
    setRevenue(totalRevenue);
    setCmvTotal(currentCmvTotal);

    const totalTaxes = (deducoes.darfSimples || 0);
    // Do not include griSecretaria in totalVariaveis as it is deducted as part of Group 10 (Impostos/GRI) to prevent double counting
    const totalVariaveis = 
      (Number(despesasVariaveis.taxaCartao) || 0) +
      (Number(despesasVariaveis.taxaMotoqueiro) || 0) +
      (Number(despesasVariaveis.taxaIfood) || 0) +
      (Number(despesasVariaveis.freteCompras) || 0) +
      (Number(despesasVariaveis.fundoMarketing) || 0) +
      (Number(despesasVariaveis.royalties) || 0) +
      (Number(despesasVariaveis.taxaBancariaJuros) || 0) +
      (Number(despesasVariaveis.taxaPix) || 0) +
      (Number(despesasVariaveis.bonificacoes) || 0) +
      (Number(despesasVariaveis.descontos) || 0) +
      (Number(despesasVariaveis.despesasIfood) || 0);

    const totalPayroll = (Object.values(colaboradores) as number[]).reduce((a, b) => a + b, 0);
    const totalFunc = (Object.values(funcionamento) as number[]).reduce((a, b) => a + b, 0);
    const totalManut = (Object.values(manutencao) as number[]).reduce((a, b) => a + b, 0);
    const totalComer = (Object.values(comerciais) as number[]).reduce((a, b) => a + b, 0);
    const totalAdmin = (Object.values(administrativas) as number[]).reduce((a, b) => a + b, 0);
    const totalOperacionalFixa = totalPayroll + totalFunc + totalManut + totalComer + totalAdmin;
    
    // Subtract jurosRecebidos because it is revenue; sum the other financial expenses.
    const totalFinanc = 
      (Number(resultadoFinanceiro.taxasIfood) || 0) +
      (Number(resultadoFinanceiro.tarifasBancarias) || 0) +
      (Number(resultadoFinanceiro.taxasBancarias) || 0) -
      (Number(resultadoFinanceiro.jurosRecebidos) || 0);

    const updatedMeta = [
      { name: 'Meta', valor: faturamentoMeta, color: '#8884d8' },
      { name: 'Realizado', valor: totalRevenue, color: '#0066FF' },
    ];
    setMetaVsRealizado(updatedMeta);
    
    const updatedOperational = [...operationalMetrics];
    if (updatedOperational[0]) updatedOperational[0] = { ...updatedOperational[0], valor: `${tempoMedio} min`, percent: Math.max(0, Math.min(100, (20 / (tempoMedio || 1)) * 100)) };
    if (updatedOperational[1]) updatedOperational[1] = { ...updatedOperational[1], valor: `${avaliacaoIfood.toFixed(1)} / 5.0`, percent: (avaliacaoIfood / 5) * 100 };
    setOperationalMetrics(updatedOperational);
    
    setYearlyHistory({
      ...yearlyHistory,
      '2024': receita2024,
      '2025': receita2025,
    });
    
    const margemContribuicao = totalRevenue - totalTaxes - currentCmvTotal - totalVariaveis;
    const ebitda = margemContribuicao - totalOperacionalFixa;
    const finalGRI = Number(despesasVariaveis.griSecretaria) || 0;
    const resultadoAntesGRI = ebitda - totalFinanc;
    const netProfit = resultadoAntesGRI - finalGRI;
    
    const newDRE: DREData = {
      month: currentMonthLabel || '',
      year: selectedYear,
      faturamento: totalRevenue,
      metaFaturamento: faturamentoMeta,
      metaNps: satisfacaoMeta,
      cmvAlvo: cmvAlvo,
      tempoMedio: tempoMedio,
      avaliacaoIfood: avaliacaoIfood,
      receitaBalcao,
      receitaIfood,
      receitaWedo,
      receitaDelivery: totalDelivery,
      taxes: totalTaxes,
      cmv: currentCmvTotal,
      cmvBalcao,
      cmvDelivery,
      quantidadePedidos: quantidadePedidos,
      payroll: totalPayroll,
      royalties: Number(despesasVariaveis.royalties) || 0,
      rent: (funcionamento.aluguel || 0) + (funcionamento.condominio || 0),
      marketing: Number(despesasVariaveis.fundoMarketing) || 0,
      operational: totalOperacionalFixa - (totalPayroll + ((funcionamento.aluguel || 0) + (funcionamento.condominio || 0))),
      despesasVariaveis: totalVariaveis,
      resultadoFinanceiro: totalFinanc,
      ebitda,
      netProfit,
      yearlyHistory: {
        '2024': receita2024,
        '2025': receita2025,
      },
      details: {
        deducoes,
        cmvDetailed: {
          balcao: cmvBalcao,
          delivery: cmvDelivery
        },
        despesasVariaveis,
        colaboradores,
        funcionamento,
        manutencao,
        comerciais,
        administrativas,
        resultadoFinanceiro,
        griFinal: finalGRI,
        salesByHour: localSalesByHour,
        marketingCampaigns: {
          pedidosPromocao: mktPedidosPromocao || 0,
          pedidosMaisDeUmaPromo: mktPedidosMaisDeUmaPromo || 0,
          vendasValor: mktVendasValor || 0,
          investidoLoja: mktInvestidoLoja || 0,
          investidoPlataforma: mktInvestidoPlataforma || 0
        }
      }
    };

    const updatedTimeline = [...dreTimeline];
    const existingIndex = updatedTimeline.findIndex(d => 
      d.month === currentMonthLabel && (d.year === selectedYear || (!d.year && selectedYear === '2026'))
    );
    if (existingIndex >= 0) {
      updatedTimeline[existingIndex] = newDRE;
    } else {
      updatedTimeline.push(newDRE);
    }
    setDreTimeline(updatedTimeline);

    setDeliveryChannels([
      { name: 'iFood', valor: receitaIfood, color: '#EA1D2C' },
      { name: 'WEDO', valor: receitaWedo, color: '#0066FF' },
      { name: 'Balcão', valor: receitaBalcao, color: isDarkMode ? '#333' : '#FFB800' }
    ]);
    setPeakHour(horarioPico);
    
    const updatedMetrics = metrics.map(m => {
      if (m.label === 'Faturamento Total') {
        const diff = ((totalRevenue / 138000) - 1) * 100;
        return { ...m, valor: totalRevenue, trend: diff >= 0 ? 'up' : 'down', change: `${Math.abs(diff).toFixed(1)}%` };
      }
      if (m.label === 'Lucro Líquido') {
        return { ...m, valor: netProfit };
      }
      if (m.label === 'CMV Médio') {
         return { ...m, valor: (cmvTotal / totalRevenue) * 100 };
      }
      if (m.label === 'Pedidos Totais') {
        return { ...m, valor: quantidadePedidos };
      }
      if (m.label === 'Ticket Médio') {
        return { ...m, valor: totalRevenue / (quantidadePedidos || 1) };
      }
      return m;
    });
    setMetrics(updatedMetrics);
    setTopProducts(localProducts);
    
    // Update Sales By Hour
    const hourlyArray = Object.keys(localSalesByHour).sort().map(h => ({
      hour: h,
      faturamento: localSalesByHour[h]
    }));
    setSalesByHour(hourlyArray);
    
    setSaved(true);
    
    // Save to Firebase
    try {
      await saveDREPeriod(selectedMonth, selectedYear, newDRE);
      await saveCMVPeriod(selectedMonth, selectedYear, [], localProducts); // Inventory handling could be added later if needed
    } catch (err) {
      console.error('Error saving to Firebase:', err);
    }

    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {!isEmbedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
              {mode === 'marketing' ? 'Marketing' : 'Lançamentos'} - {currentMonthLabel}/{selectedYear}
            </h2>
            <p className="text-slate-500 font-medium">
              {mode === 'marketing' ? 'Monitore e registre a performance das campanhas de marketing e tráfego' : 'Alimente o sistema com dados reais para atualizar os dashboards'}
            </p>
          </div>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${
              currentStore.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'
            }`}
            style={{ backgroundColor: brandColors.button, boxShadow: `0 10px 15px -3px ${brandColors.button}30` }}
          >
            <Save className="w-5 h-5" /> Salvar Alterações
          </button>
        </div>
      )}

      {saved && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500 text-white flex items-center gap-3 font-bold text-sm shadow-xl shadow-green-500/20"
        >
          <CheckCircle2 className="w-5 h-5" /> Dados salvos com sucesso! O dashboard foi atualizado.
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {visibleTabs.length > 1 ? (
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-black/20 rounded-2xl w-fit">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id 
                    ? (currentStore.brand === 'BEBELU' ? 'text-[#7F300C] shadow-lg' : (isDarkMode ? 'bg-[#E63946] text-white shadow-lg' : 'bg-white text-slate-900 shadow-md'))
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                style={activeTab === tab.id && currentStore.brand === 'BEBELU' ? { backgroundColor: brandColors.button } : {}}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        ) : <div />}

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Período:</span>
          </div>
          <select 
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMonth(val);
              onMonthChange?.(val);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold outline-none transition-all cursor-pointer ${
              isDarkMode ? 'bg-[#1E1E1E] text-white' : 'bg-white text-slate-900'
            }`}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedYear(val);
              onYearChange?.(val);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold outline-none transition-all cursor-pointer ${
              isDarkMode ? 'bg-[#1E1E1E] text-white' : 'bg-white text-slate-900'
            }`}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border transition-all ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          {activeTab === 'financial' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColors.primary }} />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>1. Receita Bruta</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Balcão</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaBalcao} 
                         onPaste={(e) => handleNumericPaste(e, setReceitaBalcao)}
                         onChange={(e) => setReceitaBalcao(Number(e.target.value))} 
                         onFocus={(e) => Number(e.target.value) === 0 && (e.target.value = '')}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Delivery</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaDelivery} 
                         readOnly 
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold cursor-not-allowed opacity-75 ${isDarkMode ? 'bg-black/40 border-[#333] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} 
                       />
                     </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColors.secondary }} />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>2. Deduções da Receita</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DARF / SIMPLES</label>
                     <input 
                       type="number" 
                       value={deducoes.darfSimples} 
                       onPaste={(e) => handleNumericPaste(e, (val) => setDeducoes({...deducoes, darfSimples: val}))}
                       onChange={(e) => setDeducoes({...deducoes, darfSimples: Number(e.target.value)})} 
                       onFocus={(e) => Number(e.target.value) === 0 && (e.target.value = '')}
                       className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                     />
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full bg-red-700" />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>3. Custos Variáveis das Mercadorias</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CMV Total</label>
                     <input type="number" value={cmvBalcao + cmvDelivery} readOnly className={`w-full px-4 py-3 rounded-xl border outline-none font-bold opacity-75 ${isDarkMode ? 'bg-black/40 border-[#333] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CMV - Balcão</label>
                     <input type="number" value={cmvBalcao} onPaste={(e) => handleNumericPaste(e, setCmvBalcao)} onChange={(e) => setCmvBalcao(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CMV - Delivery</label>
                     <input type="number" value={cmvDelivery} onPaste={(e) => handleNumericPaste(e, setCmvDelivery)} onChange={(e) => setCmvDelivery(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} />
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>4. Despesas Variáveis</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                     { label: 'Taxas Cartão', key: 'taxaCartao' }, 
                     { label: 'Taxa Motoqueiro', key: 'taxaMotoqueiro' }, 
                     { label: 'Taxa Ifood', key: 'taxaIfood' }, 
                     { label: 'Frete Compras', key: 'freteCompras' }, 
                     { label: 'Fundo Marketing - Franquia', key: 'fundoMarketing' }, 
                     { label: 'Royalties - Franquia', key: 'royalties' }, 
                     { label: isBebeluRioMar ? 'Taxa Juros Banco do Nordeste' : 'Taxa Bancária + Juros', key: 'taxaBancariaJuros' }, 
                     { label: isBebeluRioMar ? 'Taxas Conta Garantida' : 'Taxas PIX', key: 'taxaPix' }, 
                     { label: 'Bonificações/Comissões', key: 'bonificacoes' }, 
                     { label: 'Descontos/Cortesia', key: 'descontos' }, 
                     { label: 'GRI - Sec. Fazenda', key: 'griSecretaria' },
                     { label: 'Despesas Ifood', key: 'despesasIfood' }
                   ].map(item => (
                     <div key={item.key} className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-slate-500 truncate block">{item.label}</label>
                       <input 
                         type="number" 
                         onPaste={(e) => handleNumericPaste(e, (val) => setDespesasVariaveis({...despesasVariaveis, [item.key]: val}))}
                         value={(despesasVariaveis as any)[item.key]} 
                         onChange={(e) => setDespesasVariaveis({...despesasVariaveis, [item.key]: Number(e.target.value)})} 
                         onFocus={(e) => Number(e.target.value) === 0 && (e.target.value = '')}
                         className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   ))}
                </div>
              </section>

              <section className="space-y-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>5. Despesas Fixas Operacionais</h4>
                </div>
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/5 px-3 py-1 rounded w-fit">Despesas com Colaboradores e Encargos</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Salários', key: 'salarios' }, { label: 'Pro Labore', key: 'proLabore' }, { label: 'Avulso', key: 'avulso' }, { label: 'Diárias', key: 'diarias' }, { label: 'Premiação', key: 'premiacao' }, { label: 'Gratificações', key: 'gratificacoes' }, { label: '13o. salário', key: 'decimoTerceiro' }, { label: 'Férias', key: 'ferias' }, { label: 'INSS', key: 'INSS' }, { label: 'FGTS', key: 'FGTS' }, { label: 'Verbas Rescisórias', key: 'rescisorias' }, { label: 'Cortesia', key: 'cortesia' }, { label: 'Vale Transp.', key: 'valeTransp' }, { label: 'Vale Alim.', key: 'valeAlim' }, { label: 'Alimentação', key: 'alimentacao' }, { label: 'POS', key: 'pos' }, { label: 'Atestado/Exame', key: 'atestadoExame' }, { label: 'Uniformes/EPI', key: 'uniformesEPI' }, { label: 'Outros Benefícios', key: 'outrosBeneficios' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                          type="number" 
                          onPaste={(e) => handleNumericPaste(e, (val) => setColaboradores({...colaboradores, [item.key]: val}))}
                          value={(colaboradores as any)[item.key]} 
                          onChange={(e) => setColaboradores({...colaboradores, [item.key]: Number(e.target.value)})} 
                          onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/5 px-3 py-1 rounded w-fit">Despesas com Funcionamento</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Aluguel', key: 'aluguel' }, { label: 'Condomínio', key: 'condominio' }, { label: isBebeluRioMar ? 'Fundo Promocional Rio Mar' : 'Energia Cam.Fria', key: 'energiaCâmaraFria' }, { label: 'IPTU', key: 'iptu' }, { label: 'Energia Elétrica', key: 'energiaEletrica' }, { label: 'Água', key: 'agua' }, { label: isBebeluRioMar ? 'Ar Condicionado e Exaustor' : 'Ar Condicionado', key: 'arCondicionado' }, { label: 'Internet + Tel.', key: 'internetTelefonia' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                          type="number" 
                          onPaste={(e) => handleNumericPaste(e, (val) => setFuncionamento({...funcionamento, [item.key]: val}))}
                          value={(funcionamento as any)[item.key]} 
                          onChange={(e) => setFuncionamento({...funcionamento, [item.key]: Number(e.target.value)})} 
                          onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-green-500 bg-green-500/5 px-3 py-1 rounded w-fit">Despesas com Manutenção</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Escritórios', key: 'escritorios' }, { label: 'Locação Maq.', key: 'locacaoMaq' }, { label: 'Manutenção Sist.', key: 'manutencaoSist' }, { label: 'Manutenção Equip.', key: 'manutencaoEquip' }, { label: 'Outros Gastos', key: 'outrosManutencao' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                          type="number" 
                          onPaste={(e) => handleNumericPaste(e, (val) => setManutencao({...manutencao, [item.key]: val}))}
                          value={(manutencao as any)[item.key]} 
                          onChange={(e) => setManutencao({...manutencao, [item.key]: Number(e.target.value)})} 
                          onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/5 px-3 py-1 rounded w-fit">Despesas Comerciais</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Aplicativo', key: 'aplicativo' }, { label: 'Marketing', key: 'marketing' }, { label: isBebeluRioMar ? 'Seguro' : 'Frete', key: 'frete' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                          type="number" 
                          onPaste={(e) => handleNumericPaste(e, (val) => setComerciais({...comerciais, [item.key]: val}))}
                          value={(comerciais as any)[item.key]} 
                          onChange={(e) => setComerciais({...comerciais, [item.key]: Number(e.target.value)})} 
                          onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-purple-500 bg-purple-500/5 px-3 py-1 rounded w-fit">Despesas Administrativas</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Sindicato', key: 'sindicato' }, { label: 'Limpeza', key: 'limpeza' }, { label: 'Taxa Call Center', key: 'taxaCallCenter' }, { label: 'Sistema BERP', key: 'sistemaBERP' }, { label: 'Consultoria', key: 'consultoria' }, { label: 'Contabilidade', key: 'contabilidade' }, { label: 'Premiação', key: 'premiacao' }, { label: 'Dedetização', key: 'dedetizacao' }, { label: 'Certificado', key: 'certificado' }, { label: 'Fretes Diversos', key: 'fretesDiversos' }, { label: 'Utensílios', key: 'utensilios' }, { label: isBebeluRioMar ? 'Material de Fardamento' : 'Material Consumo', key: 'materialConsumo' }, { label: 'Material Escritório', key: 'materialEscritorio' }, { label: 'Material Limpeza', key: 'materialLimpeza' }, { label: isBebeluRioMar ? 'Confraternização' : 'Combustíveis', key: 'combustiveis' }, { label: isBebeluRioMar ? 'Uber' : 'Retirado P. Rony', key: 'ronyXimenes' }, { label: 'Seguros', key: 'seguros' }, { label: 'Taxa Alvará', key: 'taxaAlvara' }, { label: 'Despesas Operacionais', key: 'despesasOperacionales' }, { label: 'Despesas Gerais', key: 'despesasGerais' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                       <input 
                         type="number" 
                         onPaste={(e) => handleNumericPaste(e, (val) => setAdministrativas({...administrativas, [item.key]: val}))}
                         value={(administrativas as any)[item.key]} 
                         onChange={(e) => setAdministrativas({...administrativas, [item.key]: Number(e.target.value)})} 
                         onFocus={(e) => Number(e.target.value) === 0 && (e.target.value = '')}
                         className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </motion.div>
          )}

          {activeTab === 'channels' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
               <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-[#0066FF] rounded-full" />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>Canais de Venda</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Balcão</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input type="number" value={receitaBalcao} onPaste={(e) => handleNumericPaste(e, setReceitaBalcao)} onChange={(e) => setReceitaBalcao(Number(e.target.value))} className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda iFood</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input type="number" value={receitaIfood} onPaste={(e) => handleNumericPaste(e, setReceitaIfood)} onChange={(e) => setReceitaIfood(Number(e.target.value))} className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda WEDO</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input type="number" value={receitaWedo} onPaste={(e) => handleNumericPaste(e, setReceitaWedo)} onChange={(e) => setReceitaWedo(Number(e.target.value))} className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} />
                      </div>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento {currentMonthLabel} / 2025</label>
                    <input type="number" value={receita2025} onPaste={(e) => handleNumericPaste(e, setReceita2025)} onChange={(e) => setReceita2025(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-amber-600 dark:text-amber-400 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento {currentMonthLabel} / 2024</label>
                    <input type="number" value={receita2024} onPaste={(e) => handleNumericPaste(e, setReceita2024)} onChange={(e) => setReceita2024(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-amber-600 dark:text-amber-400 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} />
                  </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento Esperado</label>
                    <input type="number" value={faturamentoMeta} onPaste={(e) => handleNumericPaste(e, setFaturamentoMeta)} onChange={(e) => setFaturamentoMeta(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-amber-600 dark:text-amber-400 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CMV Alvo (%)</label>
                    <input type="number" value={cmvAlvo} onPaste={(e) => handleNumericPaste(e, setCmvAlvo)} onChange={(e) => setCmvAlvo(Number(e.target.value))} className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-amber-600 dark:text-amber-400 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} />
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'operational' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempo Médio Geral (min)</label>
                    <input 
                      type="number" 
                      value={tempoMedio} 
                      onPaste={(e) => handleNumericPaste(e, setTempoMedio)} 
                      onChange={(e) => setTempoMedio(Number(e.target.value))} 
                      onBlur={() => handleSave(true)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Média de Avaliação iFood</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={avaliacaoIfood} 
                      onPaste={(e) => handleNumericPaste(e, setAvaliacaoIfood)} 
                      onChange={(e) => setAvaliacaoIfood(Number(e.target.value))} 
                      onBlur={() => handleSave(true)}
                      className={`w-full px-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                    />
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'marketing' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* landscape iFood card */}
              <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 rounded-full bg-rose-500" />
                  <span className={`font-sans font-black text-xs uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Resumo do Investimento (Tráfego)
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:divide-x divide-slate-100 dark:divide-slate-800">
                  {/* Valor total das vendas */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Valor total das vendas</span>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(mktVendasValor)}</span>
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendVendas.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trendVendas.isNeutral ? null : trendVendas.isUp ? '▲' : '▼'} {trendVendas.pct}
                      </span>
                    </div>
                  </div>

                  {/* Total investido pela loja */}
                  <div className="space-y-1 md:pl-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Investido pela loja</span>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(mktInvestidoLoja)}</span>
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendInvestidoLoja.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trendInvestidoLoja.isNeutral ? null : trendInvestidoLoja.isUp ? '▲' : '▼'} {trendInvestidoLoja.pct}
                      </span>
                    </div>
                  </div>

                  {/* Retorno a cada real investido */}
                  <div className="space-y-1 md:pl-6">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Retorno p/ Real (ROAS)</span>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        R${mktRoas.toFixed(2).replace('.', ',')}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase border ${roasColor}`}>
                        {roasStatus}
                      </span>
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendRoas.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trendRoas.isNeutral ? null : trendRoas.isUp ? '▲' : '▼'} {trendRoas.pct}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROI/ROAS Timeline Chart Card */}
              <div 
                id="marketing-roi-evolution"
                className={`p-6 md:p-8 rounded-[2rem] border transition-all ${
                  isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
                    <span id="label-roi-chart" className={`font-sans font-black text-xs uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Evolução do Fator de Retorno (ROAS / ROI)
                    </span>
                  </div>
                  {marketingChartData.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                        {marketingChartData.length} {marketingChartData.length === 1 ? 'Mês Registrado' : 'Meses Analisados'}
                      </span>
                    </div>
                  )}
                </div>

                {marketingChartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 mb-3">
                      <TrendingUp className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Gráfico de Evolução</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed italic">Certifique-se de salvar os lançamentos com valores maiores que R$ 0,00 para plotar a evolução da performance de marketing.</p>
                  </div>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={marketingChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid 
                          vertical={false} 
                          strokeDasharray="3 3" 
                          stroke={isDarkMode ? '#2D2D2D' : '#E2E8F0'} 
                        />
                        <XAxis 
                          dataKey="monthLabel" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ 
                            fill: isDarkMode ? '#8E8E93' : '#64748B', 
                            fontSize: 10, 
                            fontWeight: 700,
                            letterSpacing: '0.05em' 
                          }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => `${val}x`}
                          tick={{ 
                            fill: isDarkMode ? '#8E8E93' : '#64748B', 
                            fontSize: 10, 
                            fontWeight: 700 
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDarkMode ? '#333' : '#F1F5F9', strokeWidth: 1 }} />
                        <Line
                          type="monotone"
                          dataKey="roas"
                          stroke={isDarkMode ? '#6366F1' : '#4F46E5'}
                          strokeWidth={3.5}
                          activeDot={{ 
                            r: 6, 
                            fill: isDarkMode ? '#6366F1' : '#4F46E5', 
                            strokeWidth: 2, 
                            stroke: isDarkMode ? '#1E1E1E' : '#FFFFFF' 
                          }}
                          dot={{ 
                            r: 4, 
                            fill: isDarkMode ? '#6366F1' : '#4F46E5', 
                            strokeWidth: 2, 
                            stroke: isDarkMode ? '#1E1E1E' : '#FFFFFF' 
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Form Input fields */}
              <div className={`p-8 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColors.primary }} />
                  <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-white' : 'text-black'}`}>Parâmetros da Campanha de Marketing</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#7D7D7D] dark:text-slate-400">Valor Total de Vendas das campanhas</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number"
                        value={mktVendasValor || ''}
                        onPaste={(e) => handleNumericPaste(e, setMktVendasValor)}
                        onChange={(e) => setMktVendasValor(e.target.value === '' ? 0 : Number(e.target.value))}
                        onBlur={() => handleSave(true)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-[#E63946] transition-all ${isDarkMode ? 'bg-[#121212] border-[#333] text-white focus:border-[#E63946]' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-[#E63946]'}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#7D7D7D] dark:text-slate-400">Total Investido pela Loja (Ads)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number"
                        value={mktInvestidoLoja || ''}
                        onPaste={(e) => handleNumericPaste(e, setMktInvestidoLoja)}
                        onChange={(e) => setMktInvestidoLoja(e.target.value === '' ? 0 : Number(e.target.value))}
                        onBlur={() => handleSave(true)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-[#E63946] transition-all ${isDarkMode ? 'bg-[#121212] border-[#333] text-white focus:border-[#E63946]' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-[#E63946]'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {isEmbedded && (
            <button 
              onClick={handleSave}
              className={`w-full mt-8 py-4 rounded-2xl font-bold font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${
                currentStore.brand === 'BEBELU' ? 'text-[#7F300C]' : 'text-white'
              }`}
              style={{ backgroundColor: brandColors.button }}
            >
              <Save className="w-5 h-5 inline mr-2" /> Salvar Lançamentos
            </button>
          )}
        </div>

        <div className="space-y-6">
          {activeTab === 'marketing' ? (
            <>
              {/* Marketing Specific tips */}
              <div className={`p-8 rounded-[2rem] border transition-all ${
                isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
              }`}>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Métricas de Otimização</h4>
                <div className="space-y-6">
                  {[
                    { icon: Sparkles, text: 'ROAS ideal para campanhas de marketing deve ser acima de 5,0x (Retorno excelente).', color: 'text-rose-500' },
                    { icon: AlertCircle, text: 'Monitore o investimento total em relação ao faturamento para evitar estouro de verba.', color: 'text-amber-500' },
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-4">
                      <tip.icon className={`w-5 h-5 shrink-0 ${tip.color}`} />
                      <p className="text-xs text-slate-500 leading-relaxed font-medium italic">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={`p-8 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm shadow-slate-200/50'}`}>
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Atenção</h4>
               <div className="space-y-6">
                  <div className="flex gap-4">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                    <p className="text-xs text-slate-500 leading-relaxed font-medium italic">Dados atualizam o Dashboard em tempo real após salvar.</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
