import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  DollarSign, 
  PieChart, 
  Target, 
  Package, 
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  BookOpen,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { DREData } from '../types';

export default function DataEntry() {
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
    saveDREPeriod,
    saveCMVPeriod
  } = useStore();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };
  const [activeTab, setActiveTab ] = useState<'financial' | 'products' | 'history' | 'goals' | 'channels'>('financial');
  const [saved, setSaved] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('05'); // Maio
  const [selectedYear, setSelectedYear] = useState('2026');

  // Metas & Performance states
  const [faturamentoMeta, setFaturamentoMeta] = useState(metaVsRealizado[0]?.valor || 140000);
  const [cmvAlvo, setCmvAlvo] = useState(31);
  const [tempoMedio, setTempoMedio] = useState(25);
  const [satisfacaoMeta, setSatisfacaoMeta] = useState(9.0);

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
  const [cmvPerc, setCmvPerc] = useState(32);

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
    outros: 0
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
    outros: 0
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
    despesasOperacionais: 0,
    despesasGerais: 0
  });

  const [resultadoFinanceiro, setResultadoFinanceiro] = useState<Record<string, number>>({
    taxasIfood: 0,
    tarifasBancarias: 0,
    taxasBancarias: 0,
    jurosRecebidos: 0
  });

  const [griFinal, setGriFinal] = useState(0);

  // Channels states
  const [receitaBalcao, setReceitaBalcao] = useState(0);
  const [receitaIfood, setReceitaIfood] = useState(0);
  const [receitaWedo, setReceitaWedo] = useState(0);
  const [receitaDelivery, setReceitaDelivery] = useState(0);
  const [quantidadePedidos, setQuantidadePedidos] = useState(0);
  const [horarioPico, setHorarioPico] = useState(globalPeakHour);
  
  // Products state (local for editing)
  const [localProducts, setLocalProducts] = useState(topProducts);

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

  // EFFECT: Sync Delivery Revenue with Ifood + Wedo
  useEffect(() => {
    setReceitaDelivery(receitaIfood + receitaWedo);
  }, [receitaIfood, receitaWedo]);

  // EFFECT: Load data when month changes
  useEffect(() => {
    const monthData = dreTimeline.find(d => d.month === currentMonthLabel);
    if (monthData) {
      setRevenue(monthData.faturamento);
      setReceitaBalcao(monthData.receitaBalcao || 0);
      setReceitaIfood(monthData.receitaIfood || 0);
      setReceitaWedo(monthData.receitaWedo || 0);
      setReceitaDelivery(monthData.receitaDelivery || 0);
      setQuantidadePedidos(monthData.quantidadePedidos || 0);
      setCmvTotal(monthData.cmv);
      setDeducoes({ darfSimples: monthData.taxes });
      
      if (monthData.details) {
        if (monthData.details.deducoes) setDeducoes(monthData.details.deducoes);
        if (monthData.details.despesasVariaveis) setDespesasVariaveis(monthData.details.despesasVariaveis);
        if (monthData.details.colaboradores) setColaboradores(monthData.details.colaboradores);
        if (monthData.details.funcionamento) setFuncionamento(monthData.details.funcionamento);
        if (monthData.details.manutencao) setManutencao(monthData.details.manutencao);
        if (monthData.details.comerciais) setComerciais(monthData.details.comerciais);
        if (monthData.details.administrativas) setAdministrativas(monthData.details.administrativas);
        if (monthData.details.resultadoFinanceiro) setResultadoFinanceiro(monthData.details.resultadoFinanceiro);
        if (monthData.details.griFinal !== undefined) setGriFinal(monthData.details.griFinal);
      } else {
        // Fallback for mock data without details
        setDespesasVariaveis(prev => ({ ...prev, royalties: monthData.royalties }));
        setColaboradores(prev => ({ ...prev, salarios: monthData.payroll }));
        setFuncionamento(prev => ({ ...prev, aluguel: monthData.rent }));
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
      setDeducoes({ darfSimples: 0 });
      setDespesasVariaveis({
        taxaCartao: 0, taxaMotoqueiro: 0, taxaIfood: 0, freteCompras: 0, fundoMarketing: 0, 
        royalties: 0, taxaBancariaJuros: 0, taxaPix: 0, bonificacoes: 0, descontos: 0, despesasIfood: 0
      });
      setColaboradores({
        salarios: 0, proLabore: 0, avulso: 0, diarias: 0, premiacao: 0, gratificacoes: 0,
        decimoTerceiro: 0, ferias: 0, INSS: 0, FGTS: 0, rescisorias: 0, cortesia: 0,
        valeTransp: 0, valeAlim: 0, alimentacao: 0, pos: 0, atestadoExame: 0, uniformesEPI: 0, outros: 0
      });
      setFuncionamento({ aluguel: 0, condominio: 0, energiaCâmaraFria: 0, iptu: 0, energiaEletrica: 0, agua: 0, arCondicionado: 0, internetTelefonia: 0 });
      setManutencao({ escritorios: 0, locacaoMaq: 0, manutencaoSist: 0, manutencaoEquip: 0, outros: 0 });
      setComerciais({ aplicativo: 0, marketing: 0, frete: 0 });
      setAdministrativas({
        sindicato: 0, limpeza: 0, taxaCallCenter: 0, sistemaBERP: 0, consultoria: 0, contabilidade: 0, premiacao: 0, dedetizacao: 0, certificado: 0,
        fretesDiversos: 0, utensilios: 0, materialConsumo: 0, materialEscritorio: 0, materialLimpeza: 0, combustiveis: 0, ronyXimenes: 0, seguros: 0, taxaAlvara: 0, despesasOperacionais: 0, despesasGerais: 0
      });
      setResultadoFinanceiro({ taxasIfood: 0, tarifasBancarias: 0, taxasBancarias: 0, jurosRecebidos: 0 });
      setGriFinal(0);
    }
  }, [selectedMonth, dreTimeline]);

  const years = ['2023', '2024', '2025', '2026'];

  const handleSave = () => {
    // 0. Recalculate total revenue from channels
    const totalDelivery = receitaIfood + receitaWedo;
    const totalRevenue = receitaBalcao + totalDelivery;
    setReceitaDelivery(totalDelivery);
    setRevenue(totalRevenue);

    // Derived totals for calculations
    const totalTaxes = (deducoes.darfSimples || 0);
    const totalVariaveis = (Object.values(despesasVariaveis) as number[]).reduce((a, b) => a + b, 0);
    const totalPayroll = (Object.values(colaboradores) as number[]).reduce((a, b) => a + b, 0);
    const totalFunc = (Object.values(funcionamento) as number[]).reduce((a, b) => a + b, 0);
    const totalManut = (Object.values(manutencao) as number[]).reduce((a, b) => a + b, 0);
    const totalComer = (Object.values(comerciais) as number[]).reduce((a, b) => a + b, 0);
    const totalAdmin = (Object.values(administrativas) as number[]).reduce((a, b) => a + b, 0);
    const totalOperacionalFixa = totalPayroll + totalFunc + totalManut + totalComer + totalAdmin;
    const totalFinanc = (Object.values(resultadoFinanceiro) as number[]).reduce((a, b) => a + b, 0);

    // 1. Update Metas & Performance
    const updatedMeta = [
      { name: 'Meta', valor: faturamentoMeta, color: '#8884d8' },
      { name: 'Realizado', valor: totalRevenue, color: '#0066FF' },
    ];
    setMetaVsRealizado(updatedMeta);
 
    // 2. Update Operational Metrics
    const updatedOperational = [...operationalMetrics];
    updatedOperational[0] = { ...updatedOperational[0], valor: `${tempoMedio} min` };
    updatedOperational[2] = { ...updatedOperational[2], valor: satisfacaoMeta.toFixed(1) };
    setOperationalMetrics(updatedOperational);
 
    // 3. Update History YoY
    setYearlyHistory({
      ...yearlyHistory,
      '2024': receita2024,
      '2025': receita2025,
    });
 
    // 4. Update Financial (DRE Timeline)
    const margemContribuicao = totalRevenue - totalTaxes - cmvTotal - totalVariaveis;
    const ebitda = margemContribuicao - totalOperacionalFixa;
    const resultadoAntesGRI = ebitda - totalFinanc;
    const netProfit = resultadoAntesGRI - griFinal;
    
    const newDRE: DREData = {
      month: currentMonthLabel || '',
      faturamento: totalRevenue,
      receitaBalcao,
      receitaIfood,
      receitaWedo,
      receitaDelivery: totalDelivery,
      taxes: totalTaxes,
      cmv: cmvTotal,
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
      details: {
        deducoes,
        despesasVariaveis,
        colaboradores,
        funcionamento,
        manutencao,
        comerciais,
        administrativas,
        resultadoFinanceiro,
        griFinal
      }
    };

    const updatedTimeline = [...dreTimeline];
    const existingIndex = updatedTimeline.findIndex(d => d.month === currentMonthLabel);
    if (existingIndex >= 0) {
      updatedTimeline[existingIndex] = newDRE;
    } else {
      updatedTimeline.push(newDRE);
    }
    setDreTimeline(updatedTimeline);

    // PERSISTENCE TO FIRESTORE
    if (currentStore.id !== 'admin-global') {
      saveDREPeriod(selectedMonth, selectedYear, newDRE);
      saveCMVPeriod(selectedMonth, selectedYear, [], localProducts);
    }

    // 5. Update Channels & Peak Hour
    setDeliveryChannels([
      { name: 'iFood', valor: receitaIfood, color: '#EA1D2C' },
      { name: 'WEDO', valor: receitaWedo, color: '#0066FF' },
      { name: 'Balcão', valor: receitaBalcao, color: isDarkMode ? '#333' : '#FFB800' }
    ]);
    setPeakHour(horarioPico);
 
    // 6. Update Main Metrics
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
 
    // 7. Update Products
    setTopProducts(localProducts);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Lançamentos - {currentMonthLabel}/{selectedYear}</h2>
          <p className="text-slate-500">Alimente o sistema com dados reais para atualizar os dashboards</p>
        </div>
        <button 
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 ${
            currentStore.brand === 'BEBELU' ? 'text-black' : 'text-white'
          }`}
          style={{ backgroundColor: brandColors.button, boxShadow: `0 10px 15px -3px ${brandColors.button}30` }}
        >
          <Save className="w-5 h-5" /> Salvar Alterações
        </button>
      </div>

      {/* Persistence Feedback */}
      {saved && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500 text-white flex items-center gap-3 font-bold text-sm shadow-xl shadow-green-500/20"
        >
          <CheckCircle2 className="w-5 h-5" /> Dados salvos com sucesso! O dashboard foi atualizado.
        </motion.div>
      )}

      {/* Tabs & Period Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex gap-4 p-1.5 bg-slate-100 dark:bg-black/20 rounded-2xl w-fit">
          {[
            { id: 'financial', label: 'Financeiro & DRE', icon: DollarSign },
            { id: 'channels', label: 'Canais & Picos', icon: PieChart },
            { id: 'products', label: 'Fichas & Produtos', icon: BookOpen },
            { id: 'history', label: 'Histórico YoY', icon: TrendingUp },
            { id: 'goals', label: 'Metas & Performance', icon: Target },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? (currentStore.brand === 'BEBELU' ? 'text-black shadow-lg' : (isDarkMode ? 'bg-[#E63946] text-white shadow-lg' : 'bg-white text-slate-900 shadow-md'))
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              style={activeTab === tab.id && currentStore.brand === 'BEBELU' ? { backgroundColor: brandColors.button } : {}}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Período:</span>
          </div>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
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
            onChange={(e) => setSelectedYear(e.target.value)}
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
        {/* Main Form Area */}
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border transition-all ${
          isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'
        }`}>
          {activeTab === 'financial' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              {/* RECEITA BRUTA */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColors.primary }} />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">1. Receita Bruta</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Balcão</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaBalcao || ''}
                         onChange={(e) => setReceitaBalcao(e.target.value === '' ? 0 : Number(e.target.value))}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Delivery (Soma iFood + WEDO)</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaDelivery || ''}
                          readOnly
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold cursor-not-allowed opacity-75 ${isDarkMode ? 'bg-black/40 border-[#333] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} 
                        />
                     </div>
                   </div>
                </div>
              </section>

              {/* DEDUÇÕES E CMV */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandColors.secondary }} />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">2 & 3. Deduções e CMV</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DARF / SIMPLES</label>
                     <input 
                        type="number" 
                        value={deducoes.darfSimples}
                        onChange={(e) => setDeducoes({...deducoes, darfSimples: Number(e.target.value)})}
                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Custo Variável das Mercadorias (CMV Total)</label>
                     <input 
                        type="number" 
                        value={cmvTotal}
                        onChange={(e) => setCmvTotal(Number(e.target.value))}
                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                     />
                   </div>
                </div>
              </section>

              {/* DESPESAS VARIÁVEIS */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">4. Despesas Variáveis</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                     { label: 'Taxas Cartão', key: 'taxaCartao' },
                     { label: 'Taxa Motoqueiro', key: 'taxaMotoqueiro' },
                     { label: 'Taxa Ifood', key: 'taxaIfood' },
                     { label: 'Frete Compras', key: 'freteCompras' },
                     { label: 'Fundo Marketing', key: 'fundoMarketing' },
                     { label: 'Royalties', key: 'royalties' },
                     { label: 'Taxa Bancária + Juros', key: 'taxaBancariaJuros' },
                     { label: 'Taxas PIX', key: 'taxaPix' },
                     { label: 'Bonificações/Comissões', key: 'bonificacoes' },
                     { label: 'Descontos/Cortesia', key: 'descontos' },
                     { label: 'Despesas Ifood', key: 'despesasIfood' }
                   ].map(item => (
                     <div key={item.key} className="space-y-1">
                       <label className="text-[8px] font-black uppercase text-slate-500 truncate block">{item.label}</label>
                       <input 
                          type="number" 
                          value={(despesasVariaveis as any)[item.key]}
                          onChange={(e) => setDespesasVariaveis({...despesasVariaveis, [item.key]: Number(e.target.value)})}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   ))}
                </div>
              </section>

              {/* DESPESAS FIXAS OPERACIONAIS */}
              <section className="space-y-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">Despesas Fixas Operacionais</h4>
                </div>
                
                {/* Colaboradores */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/5 px-3 py-1 rounded w-fit">Colaboradores e Encargos</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Salários', key: 'salarios' },
                      { label: 'Pro Labore', key: 'proLabore' },
                      { label: 'Avulso', key: 'avulso' },
                      { label: 'Diárias', key: 'diarias' },
                      { label: 'Premiação', key: 'premiacao' },
                      { label: 'Gratificações', key: 'gratificacoes' },
                      { label: '13o. salário', key: 'decimoTerceiro' },
                      { label: 'Férias', key: 'ferias' },
                      { label: 'INSS', key: 'INSS' },
                      { label: 'FGTS', key: 'FGTS' },
                      { label: 'Rescisórias', key: 'rescisorias' },
                      { label: 'Cortesia', key: 'cortesia' },
                      { label: 'Vale Transp.', key: 'valeTransp' },
                      { label: 'Vale Alim.', key: 'valeAlim' },
                      { label: 'Alimentação', key: 'alimentacao' },
                      { label: 'POS', key: 'pos' },
                      { label: 'Atestado/Exame', key: 'atestadoExame' },
                      { label: 'Uniformes/EPI', key: 'uniformesEPI' },
                      { label: 'Outros', key: 'outros' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                           type="number" 
                           value={(colaboradores as any)[item.key]}
                           onChange={(e) => setColaboradores({...colaboradores, [item.key]: Number(e.target.value)})}
                           className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funcionamento */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/5 px-3 py-1 rounded w-fit">Despesas com Funcionamento</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Aluguel', key: 'aluguel' },
                      { label: 'Condomínio', key: 'condominio' },
                      { label: 'Energia Cam.Fria', key: 'energiaCâmaraFria' },
                      { label: 'IPTU', key: 'iptu' },
                      { label: 'Energia Elétrica', key: 'energiaEletrica' },
                      { label: 'Água', key: 'agua' },
                      { label: 'Ar Condicionado', key: 'arCondicionado' },
                      { label: 'Internet + Tel.', key: 'internetTelefonia' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                           type="number" 
                           value={(funcionamento as any)[item.key]}
                           onChange={(e) => setFuncionamento({...funcionamento, [item.key]: Number(e.target.value)})}
                           className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manutenção */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/5 px-3 py-1 rounded w-fit">Despesas com Manutenção</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Escritórios', key: 'escritorios' },
                      { label: 'Locação Maq/Equip', key: 'locacaoMaq' },
                      { label: 'Manut. Sistemas', key: 'manutencaoSist' },
                      { label: 'Manut. Equip/Refo', key: 'manutencaoEquip' },
                      { label: 'Outros (Max 10%)', key: 'outros' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                           type="number" 
                           value={(manutencao as any)[item.key]}
                           onChange={(e) => setManutencao({...manutencao, [item.key]: Number(e.target.value)})}
                           className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comerciais */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-pink-500 bg-pink-500/5 px-3 py-1 rounded w-fit">Despesas Comerciais</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Aplicativo', key: 'aplicativo' },
                      { label: 'Marketing', key: 'marketing' },
                      { label: 'Frete', key: 'frete' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                           type="number" 
                           value={(comerciais as any)[item.key]}
                           onChange={(e) => setComerciais({...comerciais, [item.key]: Number(e.target.value)})}
                           className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Administrativas */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <h5 className="text-[10px] font-black uppercase text-slate-500 bg-slate-500/5 px-3 py-1 rounded w-fit">Despesas Administrativas</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Sindicato', key: 'sindicato' },
                      { label: 'Limpeza', key: 'limpeza' },
                      { label: 'Call Center', key: 'taxaCallCenter' },
                      { label: 'Sistema BERP', key: 'sistemaBERP' },
                      { label: 'Consultoria', key: 'consultoria' },
                      { label: 'Contabilidade', key: 'contabilidade' },
                      { label: 'Premiação', key: 'premiacao' },
                      { label: 'Dedetização', key: 'dedetizacao' },
                      { label: 'Certificado', key: 'certificado' },
                      { label: 'Fretes Diversos', key: 'fretesDiversos' },
                      { label: 'Utensílios', key: 'utensilios' },
                      { label: 'Mat. Consumo', key: 'materialConsumo' },
                      { label: 'Mat. Escritório', key: 'materialEscritorio' },
                      { label: 'Mat. Limpeza', key: 'materialLimpeza' },
                      { label: 'Combustíveis', key: 'combustiveis' },
                      { label: 'Rony Ximenes', key: 'ronyXimenes' },
                      { label: 'Seguros/Segur.', key: 'seguros' },
                      { label: 'Alvará', key: 'taxaAlvara' },
                      { label: 'Op. Diversas', key: 'despesasOperacionais' },
                      { label: 'Gerais (Max 10%)', key: 'despesasGerais' }
                    ].map(item => (
                      <div key={item.key}>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                        <input 
                           type="number" 
                           value={(administrativas as any)[item.key]}
                           onChange={(e) => setAdministrativas({...administrativas, [item.key]: Number(e.target.value)})}
                           className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* APURAÇÃO RESULTADO FINANCEIRO */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-yellow-400 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">Apuração Resultado Financeiro</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                     { label: 'Taxas Ifood', key: 'taxasIfood' },
                     { label: 'Tarifas Bancárias', key: 'tarifasBancarias' },
                     { label: 'Taxas Bancarias', key: 'taxasBancarias' },
                     { label: 'Juros Recebidos (-)', key: 'jurosRecebidos' },
                   ].map(item => (
                     <div key={item.key}>
                       <label className="text-[8px] font-bold text-slate-400 block mb-1">{item.label}</label>
                       <input 
                          type="number" 
                          value={(resultadoFinanceiro as any)[item.key]}
                          onChange={(e) => setResultadoFinanceiro({...resultadoFinanceiro, [item.key]: Number(e.target.value)})}
                          className={`w-full px-2 py-2 rounded-lg border outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   ))}
                </div>
              </section>

              {/* GRI FINAL */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">GRI - Secretaria de Estado</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic font-medium">GRI Final</label>
                     <input 
                        type="number" 
                        value={griFinal}
                        onChange={(e) => setGriFinal(Number(e.target.value))}
                        className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                     />
                   </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'channels' && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-[#0066FF] rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">Canais de Venda</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda Balcão</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaBalcao}
                         onChange={(e) => setReceitaBalcao(Number(e.target.value))}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda iFood</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaIfood}
                         onChange={(e) => setReceitaIfood(Number(e.target.value))}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Venda WEDO</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                       <input 
                         type="number" 
                         value={receitaWedo}
                         onChange={(e) => setReceitaWedo(Number(e.target.value))}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`} 
                       />
                     </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">Picos de Venda</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Horário de Pico</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                         <Zap className="w-4 h-4" />
                       </span>
                       <select 
                         value={horarioPico}
                         onChange={(e) => setHorarioPico(e.target.value)}
                         className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold ${isDarkMode ? 'bg-[#121212] border-[#333] text-white' : 'bg-slate-50 border-slate-100'}`}
                       >
                         {Array.from({length: 24}).map((_, i) => (
                           <option key={i} value={`${i}:00`}>{i}:00h</option>
                         ))}
                       </select>
                     </div>
                   </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }} 
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white italic">Fichas Técnicas & Engenharia de Cardápio</h4>
                  <button 
                    onClick={() => {
                      const newProd = {
                        id: Math.random().toString(),
                        name: 'Novo Produto ' + (localProducts.length + 1),
                        quantidadeVendas: 100,
                        faturamento: 5000,
                        margin: 65,
                        category: 'Comida'
                      };
                      setLocalProducts([...localProducts, newProd]);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#0066FF] hover:underline"
                  >
                    + Simular Novo Produto
                  </button>
                </div>
                
                <div className={`p-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center transition-all ${
                  isDarkMode ? 'border-[#333] hover:border-[#E63946]' : 'border-slate-200 hover:border-[#0066FF]'
                }`}>
                   <div className="p-4 bg-slate-100 dark:bg-[#333] rounded-3xl mb-4">
                     <Plus className="w-8 h-8 text-slate-400" />
                   </div>
                   <p className="text-sm font-bold dark:text-white mb-1">Importar Planilha de Fichas Técnicas</p>
                   <p className="text-xs text-slate-500">O sistema cruzará estes dados com o faturamento para calcular o Top Lucratividade.</p>
                </div>

                <div className="space-y-4 pt-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic">Top Lucratividade (Simulação)</h4>
                  <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? 'border-[#333]' : 'border-slate-100'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`font-bold uppercase tracking-widest ${isDarkMode ? 'bg-black/20 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                        <tr>
                          <th className="px-6 py-4 italic">Produto</th>
                          <th className="px-6 py-4 italic">Custo (FT)</th>
                          <th className="px-6 py-4 italic">Preço Venda</th>
                          <th className="px-6 py-4 italic">Margem R$</th>
                          <th className="px-6 py-4 italic">Margem %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-[#333]">
                        {localProducts.map((p, i) => (
                          <tr key={p.id || i} className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <td className="px-6 py-4 italic text-indigo-500 uppercase">
                              <input 
                                type="text"
                                value={p.name}
                                onChange={(e) => {
                                  const updated = [...localProducts];
                                  updated[i] = { ...updated[i], name: e.target.value };
                                  setLocalProducts(updated);
                                }}
                                className={`bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full`}
                              />
                            </td>
                            <td className="px-6 py-4">{formatCurrency(p.faturamento / (p.quantidadeVendas || 1) * 0.4)}</td>
                            <td className="px-6 py-4">{formatCurrency(p.faturamento / p.quantidadeVendas)}</td>
                            <td className="px-6 py-4 text-green-500">{formatCurrency(p.faturamento / p.quantidadeVendas * 0.6)}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded bg-green-500/10 text-green-500">{p.margin}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic">Desperdício & Perda</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-red-500 uppercase">Perda de Proteína (kg)</span>
                      <input type="number" step="0.1" className={`w-24 px-3 py-2 rounded-lg border outline-none text-right font-bold ${isDarkMode ? 'bg-black/40 border-[#333] text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-red-500 uppercase">Outras Perdas (R$)</span>
                      <input type="number" className={`w-24 px-3 py-2 rounded-lg border outline-none text-right font-bold ${isDarkMode ? 'bg-black/40 border-[#333] text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }} 
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Comparativo Histórico ({currentMonthLabel})</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento {currentMonthLabel} / 2025</div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        value={receita2025}
                        onChange={(e) => setReceita2025(Number(e.target.value))}
                        placeholder="0,00" 
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento {currentMonthLabel} / 2024</div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number" 
                        value={receita2024}
                        onChange={(e) => setReceita2024(Number(e.target.value))}
                        placeholder="0,00" 
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                      />
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                   <p className="text-[10px] text-slate-400 font-medium italic">
                     * Estes valores alimentam o gráfico de comparação anual no Dashboard e na aba Financeiro. 
                     Insira os valores reais fechados dos anos anteriores para uma análise precisa de crescimento.
                   </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }} 
               animate={{ opacity: 1, x: 0 }}
               className="space-y-8"
            >
              <div className="space-y-8">
                <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
                   <div className="flex items-center gap-3 mb-6">
                     <Target className="w-5 h-5 text-indigo-500" />
                     <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Metas de Unidade - Março</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Faturamento Esperado</div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                          <input 
                            type="number" 
                            value={faturamentoMeta}
                            onChange={(e) => setFaturamentoMeta(Number(e.target.value))}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">CMV Alvo (%)</div>
                        <div className="relative">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                          <input 
                            type="number" 
                            value={cmvAlvo}
                            onChange={(e) => setCmvAlvo(Number(e.target.value))}
                            className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Meta Satisfação (NPS)</div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            <Target className="w-4 h-4" />
                          </span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={satisfacaoMeta}
                            onChange={(e) => setSatisfacaoMeta(Number(e.target.value))}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Pedidos Totais no Mês</div>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            <TrendingUp className="w-4 h-4" />
                          </span>
                          <input 
                            type="number" 
                            value={quantidadePedidos || ''}
                            onChange={(e) => setQuantidadePedidos(e.target.value === '' ? 0 : Number(e.target.value))}
                            className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                          />
                        </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-slate-500/5 border border-slate-500/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Performance Operacional</h4>
                  </div>
                  <div className="max-w-md">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">Tempo Médio Geral (min)</div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          <Clock className="w-4 h-4" />
                        </span>
                        <input 
                          type="number" 
                          value={tempoMedio}
                          onChange={(e) => setTempoMedio(Number(e.target.value))}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold text-indigo-600 ${isDarkMode ? 'bg-black/40 border-[#333]' : 'bg-white border-slate-200'}`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className={`p-8 rounded-[2rem] border transition-all ${
            isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm shadow-slate-200/50'
          }`}>
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 italic">Atenção no Preenchimento</h4>
             <div className="space-y-6">
                {[
                  { icon: AlertCircle, text: 'Valores de DRE são liquidados automaticamente após salvar.', color: 'text-amber-500' },
                  { icon: TrendingUp, text: 'O sistema utiliza esses dados para gerar os Insights de IA.', color: 'text-indigo-500' },
                  { icon: FileText, text: 'Mantenha as metas atualizadas para medir o ROI operacional.', color: 'text-slate-400' },
                ].map((tip, i) => (
                  <div key={i} className="flex gap-4">
                    <tip.icon className={`w-5 h-5 shrink-0 ${tip.color}`} />
                    <p className="text-xs text-slate-500 leading-relaxed font-medium italic">{tip.text}</p>
                  </div>
                ))}
             </div>

             <div className={`mt-8 p-6 rounded-2xl border transition-all ${
               isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
             }`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-2 italic">Aviso Auditoria</div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Todas as alterações neste módulo são registradas no log de auditoria com data, hora e IP do operador.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
