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

        {/* Global Controls: Sync DRE */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-[#1C1C20] hover:bg-[#25252A] text-slate-200 border border-[#2A2A30] hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
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
                <strong className={totalEbitda > 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  {totalEbitda > 0 ? "Positiva" : "Sem registro"}
                </strong>
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
                  <span>{loans.filter(l => l.status !== 'Liquidado').length} contratos bancários + {liabilities.filter(li => li.status !== 'Quitado').length} passivos</span>
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
                  <strong className="text-white">
                    {totalRevenue > 0 ? `${formatPercent((totalMonthlyService / totalRevenue) * 100)} da receita` : '0.0%'}
                  </strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
                <span>Fluxo de Saída Mensal</span>
                <span className="text-emerald-400 font-bold">Amortização ativa</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Desempenho Operacional Consolidado das Lojas</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Alimentado automaticamente pelos DREs do mês anterior ({periodInfo.periodLabel}) de cada unidade.
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C20] border border-[#2B2B32] hover:border-amber-400/50 transition-all cursor-pointer disabled:opacity-60 shrink-0 self-start sm:self-auto shadow-sm"
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
                  <div className="text-[10px] text-emerald-400/90 font-medium flex items-center justify-between">
                    <span>Mês Base:</span>
                    <span className="font-bold">{periodInfo.periodLabel} (Dashboard)</span>
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

          {/* Revenue Distribution Chart with dynamic integration */}
          <div className="p-6 rounded-2xl border border-[#242426] bg-[#141416] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white">Contribuição de Receita e EBITDA por Unidade</h3>
                <p className="text-xs text-slate-400 font-medium">Comparativo visual integrado em tempo real das unidades.</p>
              </div>
            </div>

            {totalRevenue === 0 && totalEbitda === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#26262B] rounded-2xl space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Nenhum faturamento registrado no fechamento de {periodInfo.periodLabel}.</p>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar com DREs das Lojas</span>
                </button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consolidatedStores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242426" />
                    <XAxis dataKey="code" stroke="#888" />
                    <YAxis stroke="#888" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                      contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', borderRadius: '12px' }}
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
