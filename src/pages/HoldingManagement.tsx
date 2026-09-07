import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  TrendingDown, 
  TrendingUp, 
  Landmark, 
  Briefcase, 
  Wallet, 
  ArrowLeftRight, 
  DollarSign, 
  PieChart as PieIcon, 
  Percent, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Download, 
  Filter, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  Scale,
  Sparkles,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Coins
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

interface HoldingManagementProps {
  initialTab?: 'consolidated' | 'debt' | 'loans' | 'investments' | 'cash-flow';
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

// Mock Corporate Financial Data for Holding AZ
const CONSOLIDATED_STORES = [
  { id: '1', code: 'B32', name: 'Bebelu Mossoró', brand: 'BEBELU', faturamento: 284500, cmv: 96730, ebitda: 45520, margin: 16.0, status: 'Positivo' },
  { id: '2', code: 'B28', name: 'Bebelu Rio Mar', brand: 'BEBELU', faturamento: 241800, cmv: 84630, ebitda: 36270, margin: 15.0, status: 'Positivo' },
  { id: '3', code: 'VERO', name: 'Vero Pasta', brand: 'VERO PASTA', faturamento: 198400, cmv: 59520, ebitda: 37690, margin: 19.0, status: 'Expansão' },
];

const DEBT_BREAKDOWN = [
  { category: 'Empréstimos Bancários & Giro', amount: 840000, percent: 52.5, color: '#3B82F6' },
  { category: 'Financiamentos de Máquinas / Capex', amount: 380000, percent: 23.7, color: '#10B981' },
  { category: 'Parcelamento Tributário (REFIS)', amount: 260000, percent: 16.3, color: '#F59E0B' },
  { category: 'Mútuos e Contratos Estruturais', amount: 120000, percent: 7.5, color: '#8B5CF6' },
];

const BANK_LOANS = [
  {
    id: 'L-01',
    bank: 'Bradesco Corporate',
    modality: 'Capital de Giro Expansão',
    principal: 450000,
    currentBalance: 312000,
    installmentsTotal: 36,
    installmentsPaid: 11,
    monthlyPayment: 15850,
    rate: 'CDI + 2.8% a.a.',
    nextDue: '2026-09-25',
    status: 'Em Dia',
    destination: 'Expansão Vero Pasta'
  },
  {
    id: 'L-02',
    bank: 'Banco do Brasil',
    modality: 'PRONAMPE / FCO',
    principal: 300000,
    currentBalance: 245000,
    installmentsTotal: 48,
    installmentsPaid: 9,
    monthlyPayment: 8920,
    rate: 'Selic + 4.5% a.a.',
    nextDue: '2026-09-18',
    status: 'Em Dia',
    destination: 'Modernização B32 Mossoró'
  },
  {
    id: 'L-03',
    bank: 'Santander Empresas',
    modality: 'Máquinas & Equipamentos',
    principal: 280000,
    currentBalance: 168000,
    installmentsTotal: 24,
    installmentsPaid: 10,
    monthlyPayment: 13400,
    rate: 'TJLP + 3.1% a.a.',
    nextDue: '2026-09-30',
    status: 'Em Dia',
    destination: 'Equipamentos Cozinha B28'
  },
  {
    id: 'L-04',
    bank: 'Caixa Econômica',
    modality: 'Capital de Giro',
    principal: 150000,
    currentBalance: 115000,
    installmentsTotal: 24,
    installmentsPaid: 6,
    monthlyPayment: 7200,
    rate: 'CDI + 3.2% a.a.',
    nextDue: '2026-10-05',
    status: 'Em Dia',
    destination: 'Fundo de Reserva Holding'
  },
];

const NEW_INVESTMENTS = [
  {
    id: 'INV-01',
    projectName: 'Expansão Vero Pasta - Loja 02 (Sul)',
    type: 'Nova Unidade Física',
    stage: 'Obras e Reformas',
    capexBudget: 420000,
    spentSoFar: 285000,
    projectedMonthlyRevenue: 185000,
    expectedPaybackMonths: 18,
    projectedRoi: '34% a.a.',
    targetLaunch: 'Novembro / 2026',
    responsible: 'Diretoria de Expansão'
  },
  {
    id: 'INV-02',
    projectName: 'Dark Kitchen Central Bebelu',
    type: 'Infraestrutura de Delivery',
    stage: 'Prospecção Imobiliária',
    capexBudget: 190000,
    spentSoFar: 35000,
    projectedMonthlyRevenue: 120000,
    expectedPaybackMonths: 14,
    projectedRoi: '42% a.a.',
    targetLaunch: 'Janeiro / 2027',
    responsible: 'Operações Grupo AZ'
  },
  {
    id: 'INV-03',
    projectName: 'Automação & Totens de Autoatendimento B32/B28',
    type: 'Tecnologia Operacional',
    stage: 'Implantação Piloto',
    capexBudget: 75000,
    spentSoFar: 62000,
    projectedMonthlyRevenue: 28000, // Ganho de giro
    expectedPaybackMonths: 8,
    projectedRoi: '55% a.a.',
    targetLaunch: 'Outubro / 2026',
    responsible: 'Tecnologia & Inovação'
  }
];

const HOLDING_CASH_TRANSFERS = [
  { id: 'T-01', date: '05/09/2026', type: 'ENTRADA', origin: 'B32 (Mossoró)', destination: 'Holding AZ', description: 'Repasse Royalties & Fundo Promoção', value: 17070, status: 'Liquidado' },
  { id: 'T-02', date: '05/09/2026', type: 'ENTRADA', origin: 'B28 (Rio Mar)', destination: 'Holding AZ', description: 'Repasse Royalties & Fundo Promoção', value: 14508, status: 'Liquidado' },
  { id: 'T-03', date: '04/09/2026', type: 'SAÍDA', origin: 'Holding AZ', destination: 'Bradesco Corporate', description: 'Amortização Empréstimo Giro L-01', value: 15850, status: 'Liquidado' },
  { id: 'T-04', date: '02/09/2026', type: 'SAÍDA', origin: 'Holding AZ', destination: 'Fornecedor Obra Vero Sul', description: 'Pagamento Empreiteira - Fase 2', value: 45000, status: 'Liquidado' },
  { id: 'T-05', date: '01/09/2026', type: 'ENTRADA', origin: 'Vero Pasta', destination: 'Holding AZ', description: 'Distribuição Mútuo Corporativo', value: 12000, status: 'Liquidado' },
];

export default function HoldingManagement({ initialTab }: HoldingManagementProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, setStore } = useStore();
  const { user } = useAuth();

  // Determine active tab from URL or props
  const getActiveTabFromPath = (): 'consolidated' | 'debt' | 'loans' | 'investments' | 'cash-flow' => {
    if (initialTab) return initialTab;
    const path = location.pathname;
    if (path.includes('/debt')) return 'debt';
    if (path.includes('/loans')) return 'loans';
    if (path.includes('/investments')) return 'investments';
    if (path.includes('/cash-flow')) return 'cash-flow';
    return 'consolidated';
  };

  const [activeTab, setActiveTab] = useState<'consolidated' | 'debt' | 'loans' | 'investments' | 'cash-flow'>(getActiveTabFromPath());

  React.useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tab: 'consolidated' | 'debt' | 'loans' | 'investments' | 'cash-flow') => {
    setActiveTab(tab);
    navigate(`/holding/${tab}`);
  };

  // KPI Calculations
  const totalRevenue = CONSOLIDATED_STORES.reduce((acc, s) => acc + s.faturamento, 0);
  const totalEbitda = CONSOLIDATED_STORES.reduce((acc, s) => acc + s.ebitda, 0);
  const averageEbitdaMargin = (totalEbitda / totalRevenue) * 100;
  const totalDebt = DEBT_BREAKDOWN.reduce((acc, d) => acc + d.amount, 0);
  const totalMonthlyDebtService = BANK_LOANS.reduce((acc, l) => acc + l.monthlyPayment, 0);
  const leverageRatio = totalDebt / (totalEbitda * 12); // Dívida Líquida / EBITDA anualizado

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 select-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Humanized Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            Gestão Grupo AZ
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Acompanhamento financeiro consolidado e estratégico das 3 unidades.
          </p>
        </div>
      </div>

      {/* Top 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Geral */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faturamento Geral
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+8,4% vs mês anterior</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2">
            Soma das 3 unidades
          </div>
        </div>

        {/* Card 2: Lucro Líquido / Caixa Livre */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lucro Líquido / Caixa
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalEbitda)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
              <span>Margem consolidada:</span>
              <span className="text-amber-400 font-bold">{formatPercent(averageEbitdaMargin)}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2">
            EBITDA operacional livre
          </div>
        </div>

        {/* Card 3: Dívida Total / Empréstimos */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-red-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dívida Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalDebt)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-semibold">
              <span>4 contratos bancários ativos</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2">
            Alavancagem: <strong className="text-slate-200">{leverageRatio.toFixed(2)}x</strong> EBITDA
          </div>
        </div>

        {/* Card 4: Parcela Mensal dos Empréstimos */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Parcela Mensal
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              {formatCurrency(totalMonthlyDebtService)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
              <span>Próximo vencimento:</span>
              <strong className="text-white">18/09</strong>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2">
            Serviço mensal da dívida
          </div>
        </div>
      </div>

      {/* Main Content Area Driven Solely by Sidebar Route (No redundant horizontal tabs) */}
      {activeTab === 'consolidated' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                Comparativo das Lojas
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Desempenho operacional individual de cada unidade no mês
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CONSOLIDATED_STORES.map((s) => (
              <div
                key={s.id}
                className="p-6 rounded-2xl border border-[#242426] bg-[#161618] space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-black">
                      {s.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      s.status === 'Expansão'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {s.status === 'Expansão' ? 'Em Expansão' : 'Operação Positiva'}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{s.brand}</p>
                </div>

                <div className="space-y-2.5 py-3 border-y border-[#222224] text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Faturamento:</span>
                    <strong className="text-sm font-black text-white">{formatCurrency(s.faturamento)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Lucro / EBITDA:</span>
                    <strong className="text-xs font-bold text-emerald-400">{formatCurrency(s.ebitda)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Margem Operacional:</span>
                    <span className="text-amber-300 font-bold">{formatPercent(s.margin)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const foundStore = STORES.find(st => st.id === s.id);
                    if (foundStore) {
                      setStore(foundStore);
                      navigate('/dashboard');
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#202024] hover:bg-amber-500 hover:text-slate-950 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Acessar Loja</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Revenue Distribution Chart */}
          <div className="p-6 rounded-2xl border border-[#242426] bg-[#161618] space-y-4 shadow-sm">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Contribuição de Receita por Unidade</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONSOLIDATED_STORES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#242426" />
                  <XAxis dataKey="code" stroke="#888" />
                  <YAxis stroke="#888" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '12px' }}
                  />
                  <Bar dataKey="faturamento" name="Faturamento" fill="#FFCB05" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="ebitda" name="EBITDA" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Empréstimos & Dívidas (acessível via menu lateral) */}
      {(activeTab === 'loans' || activeTab === 'debt') && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Empréstimos & Dívidas</h2>
              <p className="text-xs text-slate-400 font-medium">Contratos bancários ativos, taxas negociadas e amortização</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {BANK_LOANS.map((l) => (
              <div
                key={l.id}
                className="p-6 rounded-2xl border border-[#242426] bg-[#161618] space-y-4 hover:border-amber-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-amber-400" />
                    <span className="text-base font-black text-white">{l.bank}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    {l.status}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-amber-400 font-bold">{l.modality}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Destinação: {l.destination}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#1D1D20] border border-[#262629] text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Saldo Devedor:</span>
                    <strong className="text-white text-sm">{formatCurrency(l.currentBalance)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Parcela Mensal:</span>
                    <strong className="text-amber-400 text-sm">{formatCurrency(l.monthlyPayment)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Taxa:</span>
                    <span className="text-slate-200 font-semibold">{l.rate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Amortização:</span>
                    <span className="text-slate-200 font-semibold">{l.installmentsPaid} / {l.installmentsTotal} parcelas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#222]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Próximo Vencimento: {l.nextDue}</span>
                  </span>
                  <span className="text-slate-300 font-bold">{formatPercent((l.installmentsPaid / l.installmentsTotal) * 100)} quitado</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2 p-6 rounded-2xl border border-[#242426] bg-[#161618] space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Detalhamento por Linha de Crédito</h3>
              <div className="space-y-3">
                {DEBT_BREAKDOWN.map((d, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#1D1D20] border border-[#262629] flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.category}</span>
                      </div>
                      <div className="text-xs text-slate-400">Participação: {d.percent}% da dívida total</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-white">{formatCurrency(d.amount)}</div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Amortização em andamento</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-[#242426] bg-[#161618] flex flex-col justify-between space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Índice de Alavancagem</h3>
              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2 my-auto">
                <div className="text-3xl font-black text-amber-400">{leverageRatio.toFixed(2)}x</div>
                <div className="text-xs font-bold text-slate-200">Dívida Líquida / EBITDA Anual</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Índice dentro da zona de conforto estruturada para operações de varejo alimentar (&lt; 2.5x).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#1D1D20] border border-[#262629] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Passivo Bruto:</span>
                  <strong className="text-red-400">{formatCurrency(totalDebt)}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Custo Médio da Dívida:</span>
                  <strong className="text-white">CDI + 2.9% a.a.</strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 4: Investimentos em Novos Negócios */}
      {activeTab === 'investments' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Pipeline de Expansão & Novos Negócios</h2>
              <p className="text-xs text-slate-400 font-medium">Projetos de Capex, novas unidades físicas e dark kitchens</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {NEW_INVESTMENTS.map((inv) => (
              <div
                key={inv.id}
                className="p-6 rounded-3xl border border-[#262626] bg-[#161616] space-y-4 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                      {inv.type}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                      {inv.stage}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-tight">{inv.projectName}</h3>
                  <p className="text-xs text-slate-400">Responsável: {inv.responsible}</p>
                </div>

                <div className="space-y-2 p-4 rounded-2xl bg-[#1F1F1F] border border-[#282828] text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Orçamento Capex:</span>
                    <strong className="text-white">{formatCurrency(inv.capexBudget)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aportado até o momento:</span>
                    <span className="text-amber-400 font-bold">{formatCurrency(inv.spentSoFar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Receita Mensal Projetada:</span>
                    <strong className="text-emerald-400">{formatCurrency(inv.projectedMonthlyRevenue)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payback Estimado:</span>
                    <span className="text-slate-200 font-semibold">{inv.expectedPaybackMonths} meses</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI Projetado:</span>
                    <strong className="text-amber-300">{inv.projectedRoi}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#222] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Previsão de Abertura:</span>
                  <strong className="text-white">{inv.targetLaunch}</strong>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab 5: Fluxo de Caixa Holding / Contas Matriz */}
      {activeTab === 'cash-flow' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Tesouraria Holding & Contas Matriz</h2>
              <p className="text-xs text-slate-400 font-medium">Fluxo de transferências intercompany, royalties de franquias e mútuos</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-[#262626] bg-[#161616] space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Histórico Recente de Movimentações Matriz</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#262626] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Destino</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {HOLDING_CASH_TRANSFERS.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{t.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          t.type === 'ENTRADA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{t.origin}</td>
                      <td className="py-3 px-4 text-slate-300">{t.destination}</td>
                      <td className="py-3 px-4 text-slate-400">{t.description}</td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        t.type === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {t.type === 'ENTRADA' ? '+' : '-'} {formatCurrency(t.value)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
