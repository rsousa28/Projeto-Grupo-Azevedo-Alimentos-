import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  TrendingDown, 
  TrendingUp, 
  Landmark, 
  Briefcase, 
  Scale, 
  DollarSign, 
  Percent, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Download, 
  Filter, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Coins,
  RefreshCw
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
  Area 
} from 'recharts';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { BankLoan, StoreLiability } from '../types/holding';
import { HoldingStorage, STORE_BENCHMARKS } from '../services/holdingStorage';
import { HoldingLoans } from '../components/holding/HoldingLoans';
import { HoldingDebtAnalysis } from '../components/holding/HoldingDebtAnalysis';

interface HoldingManagementProps {
  initialTab?: 'consolidated' | 'debt' | 'loans' | 'investments';
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

const CONSOLIDATED_STORES = [
  { id: '1', code: 'B32', name: 'Bebelu Mossoró', brand: 'BEBELU', faturamento: 284500, cmv: 96730, ebitda: 45520, margin: 16.0, status: 'Operação Positiva' },
  { id: '2', code: 'B28', name: 'Bebelu Rio Mar', brand: 'BEBELU', faturamento: 241800, cmv: 84630, ebitda: 36270, margin: 15.0, status: 'Operação Positiva' },
  { id: '3', code: 'VERO', name: 'Vero Pasta', brand: 'VERO PASTA', faturamento: 198400, cmv: 59520, ebitda: 37690, margin: 19.0, status: 'Em Expansão' },
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
    projectedMonthlyRevenue: 28000,
    expectedPaybackMonths: 8,
    projectedRoi: '55% a.a.',
    targetLaunch: 'Outubro / 2026',
    responsible: 'Tecnologia & Inovação'
  }
];

export default function HoldingManagement({ initialTab }: HoldingManagementProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, setStore } = useStore();
  const { user } = useAuth();

  // Dynamic Data State
  const [loans, setLoans] = useState<BankLoan[]>(() => HoldingStorage.getLoans());
  const [liabilities, setLiabilities] = useState<StoreLiability[]>(() => HoldingStorage.getLiabilities());

  const refreshData = useCallback(() => {
    setLoans(HoldingStorage.getLoans());
    setLiabilities(HoldingStorage.getLiabilities());
  }, []);

  // Determine active tab from URL or props
  const getActiveTabFromPath = (): 'consolidated' | 'debt' | 'loans' | 'investments' => {
    if (initialTab) return initialTab;
    const path = location.pathname;
    if (path.includes('/debt')) return 'debt';
    if (path.includes('/loans')) return 'loans';
    if (path.includes('/investments')) return 'investments';
    return 'consolidated';
  };

  const [activeTab, setActiveTab] = useState<'consolidated' | 'debt' | 'loans' | 'investments'>(getActiveTabFromPath());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  // Global KPIs calculated from dynamic loans and liabilities
  const totalRevenue = CONSOLIDATED_STORES.reduce((acc, s) => acc + s.faturamento, 0);
  const totalEbitda = CONSOLIDATED_STORES.reduce((acc, s) => acc + s.ebitda, 0);
  const averageEbitdaMargin = (totalEbitda / totalRevenue) * 100;
  
  const totalBankDebt = loans.reduce((acc, l) => acc + l.currentBalance, 0);
  const totalOtherDebt = liabilities.filter(li => li.status !== 'Quitado').reduce((acc, li) => acc + li.totalAmount, 0);
  const totalConsolidatedDebt = totalBankDebt + totalOtherDebt;
  
  const totalMonthlyService = 
    loans.filter(l => l.status !== 'Liquidado').reduce((acc, l) => acc + l.monthlyPayment, 0) +
    liabilities.filter(li => li.status !== 'Quitado').reduce((acc, li) => acc + li.monthlyPayment, 0);

  const annualEbitda = totalEbitda * 12;
  const leverageRatio = annualEbitda > 0 ? (totalConsolidatedDebt / annualEbitda) : 0;

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 select-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Humanized Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            <span>Gestão Grupo AZ</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider">
              Holding Executiva
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Governança financeira, controle de empréstimos, passivos operacionais e expansão da rede.
          </p>
        </div>

        {/* Action to restore benchmark data if needed */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            title="Restaurar dados padrão de demonstração"
            className="px-3 py-1.5 rounded-xl bg-[#1A1A1E] hover:bg-[#222228] border border-[#2B2B32] text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Padrão</span>
          </button>
        </div>
      </div>

      {/* Top 4 Financial KPI Cards (Visible across all tabs for consistent executive context) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Consolidado */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faturamento Consolidado
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
              <span>Soma das 3 unidades ativas</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>B32, B28 e Vero</span>
            <strong className="text-slate-300">Receita bruta</strong>
          </div>
        </div>

        {/* Card 2: Lucro Operacional Livre (EBITDA) */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lucro Operacional (EBITDA)
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
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Geração de caixa</span>
            <strong className="text-emerald-400 font-bold">Saudável</strong>
          </div>
        </div>

        {/* Card 3: Passivo Total Consolidado */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-red-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Passivo Total Consolidado
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalConsolidatedDebt)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-semibold">
              <span>{loans.length} contratos bancários + {liabilities.filter(li => li.status !== 'Quitado').length} passivos</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Alavancagem Líquida:</span>
            <strong className="text-amber-400">{leverageRatio.toFixed(2)}x EBITDA</strong>
          </div>
        </div>

        {/* Card 4: Serviço Mensal da Dívida */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Serviço Mensal Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              {formatCurrency(totalMonthlyService)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
              <span>Comprometimento:</span>
              <strong className="text-white">{formatPercent((totalMonthlyService / totalRevenue) * 100)} da receita</strong>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Fluxo de Saída Mensal</span>
            <span className="text-emerald-400 font-bold">Amortização ativa</span>
          </div>
        </div>
      </div>

      {/* Main View Router Driven by URL */}
      {/* 1. Visão Geral (Dashboard Consolidado) */}
      {activeTab === 'consolidated' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Desempenho Operacional Consolidado das Lojas</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Resumo individual de faturamento, margem e EBITDA operacional das 3 unidades físicas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CONSOLIDATED_STORES.map((s) => (
              <div
                key={s.id}
                className="p-6 rounded-2xl border border-[#242426] bg-[#141416] space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-black">
                      {s.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      s.status === 'Em Expansão'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {s.status}
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
                    <span className="text-slate-400">CMV Alvo:</span>
                    <span className="text-slate-300 font-medium">{formatCurrency(s.cmv)}</span>
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
                  className="w-full py-2.5 rounded-xl bg-[#1C1C20] hover:bg-amber-500 hover:text-slate-950 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Acessar Loja</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Revenue Distribution Chart */}
          <div className="p-6 rounded-2xl border border-[#242426] bg-[#141416] space-y-4 shadow-sm">
            <h3 className="text-base font-black uppercase tracking-tight text-white">Contribuição de Receita e EBITDA por Unidade</h3>
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

      {/* 2. Módulo: Empréstimos Bancários */}
      {activeTab === 'loans' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <HoldingLoans loans={loans} onUpdate={refreshData} />
        </motion.div>
      )}

      {/* 3. Módulo: Endividamento & Passivos por Loja */}
      {activeTab === 'debt' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <HoldingDebtAnalysis loans={loans} liabilities={liabilities} onUpdate={refreshData} />
        </motion.div>
      )}

      {/* 4. Módulo: Novos Negócios & Investimentos */}
      {activeTab === 'investments' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                <Briefcase className="w-6 h-6 text-amber-400" />
                <span>Pipeline de Expansão & Novos Negócios</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Projetos de Capex estruturados, novas unidades físicas e tecnologia operacional do Grupo AZ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {NEW_INVESTMENTS.map((inv) => (
              <div
                key={inv.id}
                className="p-6 rounded-3xl border border-[#242426] bg-[#141416] space-y-4 hover:border-amber-500/30 transition-all flex flex-col justify-between shadow-sm"
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

                <div className="space-y-2 p-4 rounded-2xl bg-[#1C1C20] border border-[#28282C] text-xs">
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
      {/* Modal de Confirmação para Restaurar Dados Padrão */}
      <AnimatePresence>
        {showResetConfirm && (
          <div 
            onClick={() => setShowResetConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-[#18181C] border border-[#2B2B32] rounded-3xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Recarregar Dados Padrão</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deseja recarregar os dados padrão de demonstração para empréstimos e passivos operacionais? As modificações locais serão restauradas.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    HoldingStorage.resetToDefaults();
                    refreshData();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Confirmar e Recarregar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
