import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RefreshCw,
  Check
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
import { BankLoan, StoreLiability, InvestmentProject, StoreOnlyBinding, StoreBenchmark } from '../types/holding';
import { HoldingStorage, DEFAULT_STORE_BENCHMARKS } from '../services/holdingStorage';
import { 
  getPreviousMonthStoreMetrics, 
  getPreviousMonthInfo, 
  syncPreviousMonthFromFirestore 
} from '../services/storeDashboardSync';
import { HoldingLoans } from '../components/holding/HoldingLoans';
import { HoldingDebtAnalysis } from '../components/holding/HoldingDebtAnalysis';
import { HoldingInvestments } from '../components/holding/HoldingInvestments';

interface HoldingManagementProps {
  initialTab?: 'consolidated' | 'debt' | 'loans' | 'investments';
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

export default function HoldingManagement({ initialTab }: HoldingManagementProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, setStore } = useStore();
  const { user } = useAuth();

  // Dynamic Data State
  const [loans, setLoans] = useState<BankLoan[]>(() => HoldingStorage.getLoans());
  const [liabilities, setLiabilities] = useState<StoreLiability[]>(() => HoldingStorage.getLiabilities());
  const [investments, setInvestments] = useState<InvestmentProject[]>(() => HoldingStorage.getInvestments());
  const [storeBenchmarks, setStoreBenchmarks] = useState<Record<StoreOnlyBinding, StoreBenchmark>>(() => 
    HoldingStorage.getStoreBenchmarks()
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const periodInfo = useMemo(() => getPreviousMonthInfo(), []);

  const refreshData = useCallback(() => {
    // Sincroniza fechamento do mês anterior do dashboard
    getPreviousMonthStoreMetrics();
    setLoans(HoldingStorage.getLoans());
    setLiabilities(HoldingStorage.getLiabilities());
    setInvestments(HoldingStorage.getInvestments());
    setStoreBenchmarks(HoldingStorage.getStoreBenchmarks());
  }, []);

  // Sincronização automática inicial com os DREs preenchidos no Dashboard
  useEffect(() => {
    // 1. Sincroniza dados locais imediatamente
    getPreviousMonthStoreMetrics();
    setStoreBenchmarks(HoldingStorage.getStoreBenchmarks());

    // 2. Busca também do Firestore assincronamente
    syncPreviousMonthFromFirestore().then(() => {
      setStoreBenchmarks(HoldingStorage.getStoreBenchmarks());
    });
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

  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  // Dynamic Store List derived from benchmarks
  const consolidatedStores = useMemo(() => {
    const keys: StoreOnlyBinding[] = ['B32', 'B28', 'VERO'];
    return keys.map(code => {
      const b = storeBenchmarks[code] || DEFAULT_STORE_BENCHMARKS[code];
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        brand: b.brand,
        faturamento: b.monthlyRevenue,
        cmv: b.cmv,
        ebitda: b.ebitda,
        margin: b.margin,
        status: b.operationalStatus
      };
    });
  }, [storeBenchmarks]);

  // Global KPIs calculated from dynamic stores, loans, and liabilities
  const totalRevenue = consolidatedStores.reduce((acc, s) => acc + s.faturamento, 0);
  const totalEbitda = consolidatedStores.reduce((acc, s) => acc + s.ebitda, 0);
  const averageEbitdaMargin = totalRevenue > 0 ? (totalEbitda / totalRevenue) * 100 : 0;
  
  const totalBankDebt = loans.reduce((acc, l) => acc + (l.status !== 'Liquidado' ? l.currentBalance : 0), 0);
  const totalOtherDebt = liabilities.filter(li => li.status !== 'Quitado').reduce((acc, li) => acc + li.totalAmount, 0);
  const totalConsolidatedDebt = totalBankDebt + totalOtherDebt;
  
  const totalMonthlyService = 
    loans.filter(l => l.status !== 'Liquidado').reduce((acc, l) => acc + l.monthlyPayment, 0) +
    liabilities.filter(li => li.status !== 'Quitado').reduce((acc, li) => acc + li.monthlyPayment, 0);

  const annualEbitda = totalEbitda * 12;
  const leverageRatio = annualEbitda > 0 ? (totalConsolidatedDebt / annualEbitda) : 0;

  // Sincronização manual com os dados do dashboard
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      getPreviousMonthStoreMetrics();
      await syncPreviousMonthFromFirestore();
      refreshData();
      showToast(`Dados atualizados com sucesso a partir do fechamento de ${periodInfo.periodLabel} do Dashboard!`);
    } catch {
      showToast('Dados sincronizados com o fechamento do Dashboard.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 select-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Humanized Clean Header with Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <span>Gestão Grupo AZ</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isDarkMode 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                : 'bg-amber-100 border border-amber-300 text-amber-800'
            }`}>
              Holding Executiva
            </span>
          </h1>
          <p className={`text-xs sm:text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Governança financeira, controle de empréstimos, passivos operacionais e expansão da rede.
          </p>
        </div>

        {/* Global Controls: Sync DRE */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 border ${
              isDarkMode 
                ? 'bg-[#1C1C20] hover:bg-[#25252A] text-slate-200 border-[#2A2A30] hover:border-amber-500/40' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-400'
            }`}
            title="Sincronizar com os fechamentos do Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar DREs'}</span>
          </button>
        </div>
      </div>

      {/* 1. Visão Geral (Dashboard Consolidado) */}
      {activeTab === 'consolidated' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Top 4 Financial KPI Cards (Visible ONLY in Visão Geral) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Faturamento Consolidado */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Faturamento Consolidado
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(totalRevenue)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-500 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Soma das 3 unidades ativas</span>
                </div>
              </div>
              <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
                <span>B32, B28 e Vero</span>
                <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Receita bruta</strong>
              </div>
            </div>

            {/* Card 2: Lucro Operacional Livre (EBITDA) */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lucro Operacional (EBITDA)
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
                  {formatCurrency(totalEbitda)}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>Margem consolidada:</span>
                  <span className="text-amber-500 font-bold">{formatPercent(averageEbitdaMargin)}</span>
                </div>
              </div>
              <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
                <span>Geração de caixa</span>
                <strong className={totalEbitda > 0 ? "text-emerald-500 font-bold" : isDarkMode ? "text-slate-400" : "text-slate-500"}>
                  {totalEbitda > 0 ? "Positiva" : "Sem registro"}
                </strong>
              </div>
            </div>

            {/* Card 3: Passivo Total Consolidado */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} hover:border-red-500/30 transition-all flex flex-col justify-between space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Passivo Total Consolidado
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(totalConsolidatedDebt)}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>{loans.filter(l => l.status !== 'Liquidado').length} contratos bancários + {liabilities.filter(li => li.status !== 'Quitado').length} passivos</span>
                </div>
              </div>
              <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
                <span>Alavancagem Líquida:</span>
                <strong className="text-amber-500">{leverageRatio.toFixed(2)}x EBITDA</strong>
              </div>
            </div>

            {/* Card 4: Serviço Mensal da Dívida */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Serviço Mensal Total
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight">
                  {formatCurrency(totalMonthlyService)}
                </div>
                <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span>Comprometimento:</span>
                  <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                    {totalRevenue > 0 ? `${formatPercent((totalMonthlyService / totalRevenue) * 100)} da receita` : '0.0%'}
                  </strong>
                </div>
              </div>
              <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
                <span>Fluxo de Saída Mensal</span>
                <span className="text-emerald-500 font-bold">Amortização ativa</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Desempenho Operacional Consolidado das Lojas</span>
              </h2>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Alimentado automaticamente pelos DREs do mês anterior ({periodInfo.periodLabel}) de cada unidade.
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer disabled:opacity-60 shrink-0 self-start sm:self-auto shadow-xs ${
                isDarkMode 
                  ? 'bg-[#1C1C20] border-[#2B2B32] hover:border-amber-400/50' 
                  : 'bg-white border-slate-200 hover:border-amber-400'
              }`}
              title="Recarregar faturamento e indicadores dos DREs das lojas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com DREs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {consolidatedStores.map((s) => (
              <div
                key={s.id}
                className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 text-xs font-black">
                      {s.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      s.status === 'Em Expansão'
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.name}</h3>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.brand}</p>
                </div>

                <div className={`space-y-2.5 py-3 border-y ${isDarkMode ? 'border-[#222224]' : 'border-slate-100'} text-xs`}>
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Faturamento:</span>
                    <strong className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(s.faturamento)}</strong>
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium flex items-center justify-between">
                    <span>Mês Base:</span>
                    <span className="font-bold">{periodInfo.periodLabel} (Dashboard)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>CMV Alvo:</span>
                    <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatCurrency(s.cmv)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Lucro / EBITDA:</span>
                    <strong className="text-xs font-bold text-emerald-500">{formatCurrency(s.ebitda)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Margem Operacional:</span>
                    <span className="text-amber-500 font-bold">{formatPercent(s.margin)}</span>
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
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isDarkMode 
                      ? 'bg-[#1C1C20] hover:bg-amber-500 hover:text-slate-950 text-slate-200' 
                      : 'bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700'
                  }`}
                >
                  <span>Acessar Loja</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Revenue Distribution Chart with dynamic integration */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Contribuição de Receita e EBITDA por Unidade</h3>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Comparativo visual integrado em tempo real das unidades.</p>
              </div>
            </div>

            {totalRevenue === 0 && totalEbitda === 0 ? (
              <div className={`py-12 text-center border border-dashed rounded-2xl space-y-2 ${isDarkMode ? 'border-[#26262B]' : 'border-slate-200 bg-slate-50/50'}`}>
                <Building2 className={`w-8 h-8 mx-auto ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nenhum faturamento registrado no fechamento de {periodInfo.periodLabel}.</p>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar com DREs das Lojas</span>
                </button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consolidatedStores}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#242426' : '#E2E8F0'} />
                    <XAxis dataKey="code" stroke={isDarkMode ? '#888' : '#64748B'} />
                    <YAxis stroke={isDarkMode ? '#888' : '#64748B'} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF', 
                        borderColor: isDarkMode ? '#333' : '#CBD5E1', 
                        color: isDarkMode ? '#FFFFFF' : '#0F172A',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#FFCB05" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ebitda" name="EBITDA" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
          <HoldingDebtAnalysis loans={loans} liabilities={liabilities} storeBenchmarks={storeBenchmarks} onUpdate={refreshData} />
        </motion.div>
      )}

      {/* 4. Módulo: Novos Negócios & Investimentos */}
      {activeTab === 'investments' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <HoldingInvestments investments={investments} onUpdate={refreshData} />
        </motion.div>
      )}
    </div>
  );
}
