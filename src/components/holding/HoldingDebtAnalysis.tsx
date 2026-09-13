import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  Percent, 
  X, 
  Receipt, 
  Store,
  Trash2,
  Pencil,
  PieChart as PieChartIcon,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { BankLoan, StoreLiability, StoreOnlyBinding, StoreBenchmark } from '../../types/holding';
import { HoldingStorage, DEFAULT_STORE_BENCHMARKS, getUnitLabel } from '../../services/holdingStorage';
import { getPreviousMonthInfo } from '../../services/storeDashboardSync';
import { useStore } from '../../contexts/StoreContext';

interface HoldingDebtAnalysisProps {
  loans: BankLoan[];
  liabilities: StoreLiability[];
  storeBenchmarks?: Record<StoreOnlyBinding, StoreBenchmark>;
  onUpdate: () => void;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

// Formata valor digitado em Real brasileiro (BRL) - ex: 125000 -> R$ 1.250,00
const formatBRLInput = (value: string): string => {
  const cleanDigits = value.replace(/\D/g, '');
  if (!cleanDigits) return '';
  const numValue = Number(cleanDigits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

// Converte string monetária formatada para número float
const parseBRLToNumber = (val: string): number => {
  const cleanDigits = val.replace(/\D/g, '');
  if (!cleanDigits) return 0;
  return Number(cleanDigits) / 100;
};

export const HoldingDebtAnalysis: React.FC<HoldingDebtAnalysisProps> = ({ loans, liabilities, storeBenchmarks, onUpdate }) => {
  const { isDarkMode } = useStore();
  const periodInfo = useMemo(() => getPreviousMonthInfo(), []);
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liabilityToDelete, setLiabilityToDelete] = useState<{ id: string; creditor: string } | null>(null);

  // Form State for Liability (Add or Edit)
  const [unit, setUnit] = useState<string>('B32');
  const [isClosedStore, setIsClosedStore] = useState(false);
  const [payerResponsibility, setPayerResponsibility] = useState<string>('HOLDING');
  const [isCustomPayer, setIsCustomPayer] = useState(false);
  const customPayerInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>('REFIS / Tributos Parcelados');
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [installmentsRemaining, setInstallmentsRemaining] = useState('12');
  const [status, setStatus] = useState<StoreLiability['status']>('Em Dia');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [notes, setNotes] = useState('');

  // Closed Stores state & quick add
  const [closedStores, setClosedStores] = useState<string[]>(() => HoldingStorage.getClosedStores());
  const [showAddClosedStore, setShowAddClosedStore] = useState(false);
  const [newClosedStoreInput, setNewClosedStoreInput] = useState('');

  const CATEGORY_SUGGESTIONS = [
    'REFIS / Tributos Parcelados',
    'Fornecedores Renegociados',
    'Acordo Trabalhista',
    'Aluguel / Condomínio Pendente',
    'Rescisões',
    'Empréstimo Pessoal Sócio'
  ];

  // Esc Key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddNewClosedStore = () => {
    if (!newClosedStoreInput.trim()) return;
    const updated = HoldingStorage.addClosedStore(newClosedStoreInput);
    setClosedStores(updated);
    const addedName = newClosedStoreInput.trim().includes('[ENCERRADA]') 
      ? newClosedStoreInput.trim() 
      : `${newClosedStoreInput.trim()} [ENCERRADA]`;
    setUnit(addedName);
    setIsClosedStore(true);
    setPayerResponsibility('HOLDING');
    setNewClosedStoreInput('');
    setShowAddClosedStore(false);
    showToast(`Loja encerrada "${addedName}" adicionada com sucesso!`);
  };

  const handleRemoveClosedStore = (storeToRemove: string) => {
    const updated = HoldingStorage.removeClosedStore(storeToRemove);
    setClosedStores(updated);
    if (unit === storeToRemove) {
      setUnit('B32');
      setIsClosedStore(false);
      setPayerResponsibility('B32');
      setIsCustomPayer(false);
    }
    showToast(`Unidade "${storeToRemove}" removida com sucesso.`);
  };

  const formatPayerLabel = (val?: string) => {
    if (!val) return '';
    if (val === 'HOLDING') return 'Caixa Central Holding';
    if (val === 'RATEIO') return 'Rateio Lojas';
    if (val === 'B32') return 'B32 (Mossoró)';
    if (val === 'B28') return 'B28 (Rio Mar)';
    if (val === 'VERO') return 'Vero Pasta';
    return val;
  };

  // 1. Cálculos consolidados e por loja
  const storeMetrics = useMemo(() => {
    const storeKeys: StoreOnlyBinding[] = ['B32', 'B28', 'VERO'];
    const currentBenchmarks = storeBenchmarks || HoldingStorage.getStoreBenchmarks();

    const perStore = storeKeys.map(key => {
      const benchmark = currentBenchmarks[key] || DEFAULT_STORE_BENCHMARKS[key];
      const storeLoans = loans.filter(l => l.unit === key);
      const storeLiabs = liabilities.filter(li => li.unit === key);

      const bankDebt = storeLoans.reduce((acc, l) => acc + (l.status !== 'Liquidado' ? l.currentBalance : 0), 0);
      const bankMonthly = storeLoans.reduce((acc, l) => acc + (l.status !== 'Liquidado' ? l.monthlyPayment : 0), 0);

      const otherDebt = storeLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.totalAmount : 0), 0);
      const otherMonthly = storeLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.monthlyPayment : 0), 0);

      const totalDebt = bankDebt + otherDebt;
      const totalMonthlyService = bankMonthly + otherMonthly;

      // Comprometimento da receita (% que vai para quitar parcelas)
      const cashCommitmentPercent = benchmark.monthlyRevenue > 0 
        ? (totalMonthlyService / benchmark.monthlyRevenue) * 100 
        : 0;

      // Lucro líquido após o serviço da dívida
      const postDebtProfit = benchmark.ebitda - totalMonthlyService;

      // Classificação visual de risco
      let healthStatus: 'Saudável' | 'Atenção' | 'Alto Risco' = 'Saudável';
      if (totalMonthlyService === 0) {
        healthStatus = 'Saudável';
      } else if (benchmark.monthlyRevenue === 0 && totalMonthlyService > 0) {
        healthStatus = 'Atenção';
      } else if (cashCommitmentPercent > 20) {
        healthStatus = 'Alto Risco';
      } else if (cashCommitmentPercent > 12) {
        healthStatus = 'Atenção';
      }

      return {
        key,
        benchmark,
        totalDebt,
        totalMonthlyService,
        cashCommitmentPercent,
        postDebtProfit,
        healthStatus
      };
    });

    // Passivos de Lojas Encerradas
    const closedLiabs = liabilities.filter(li => li.isClosedStore || li.unit.includes('[ENCERRADA]'));
    const closedDebt = closedLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.totalAmount : 0), 0);
    const closedMonthly = closedLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.monthlyPayment : 0), 0);

    // Passivos da Holding Central
    const holdingLoans = loans.filter(l => l.unit === 'HOLDING');
    const holdingLiabs = liabilities.filter(li => li.unit === 'HOLDING');
    const holdingDebt = 
      holdingLoans.reduce((acc, l) => acc + (l.status !== 'Liquidado' ? l.currentBalance : 0), 0) +
      holdingLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.totalAmount : 0), 0);
    const holdingMonthly = 
      holdingLoans.reduce((acc, l) => acc + (l.status !== 'Liquidado' ? l.monthlyPayment : 0), 0) +
      holdingLiabs.reduce((acc, li) => acc + (li.status !== 'Quitado' ? li.monthlyPayment : 0), 0);

    // Consolidado do Grupo (3 Lojas + Encerradas + Holding)
    const storesTotalDebt = perStore.reduce((acc, s) => acc + s.totalDebt, 0);
    const storesMonthlyService = perStore.reduce((acc, s) => acc + s.totalMonthlyService, 0);

    const consolidatedTotalDebt = storesTotalDebt + closedDebt + holdingDebt;
    const consolidatedMonthlyService = storesMonthlyService + closedMonthly + holdingMonthly;
    const consolidatedRevenue = perStore.reduce((acc, s) => acc + s.benchmark.monthlyRevenue, 0);
    const consolidatedEbitda = perStore.reduce((acc, s) => acc + s.benchmark.ebitda, 0);
    const consolidatedNetProfit = consolidatedEbitda - consolidatedMonthlyService;

    return {
      perStore,
      closedDebt,
      closedMonthly,
      holdingDebt,
      holdingMonthly,
      consolidated: {
        totalDebt: consolidatedTotalDebt,
        monthlyService: consolidatedMonthlyService,
        revenue: consolidatedRevenue,
        netProfit: consolidatedNetProfit
      }
    };
  }, [loans, liabilities, storeBenchmarks]);

  // 2. Dados da Rosca (Donut Chart) de Distribuição da Dívida
  const donutData = useMemo(() => {
    const items = [
      {
        name: 'B32 (Mossoró)',
        shortName: 'B32 Mossoró',
        value: storeMetrics.perStore.find(s => s.key === 'B32')?.totalDebt || 0,
        color: '#10B981' // Verde esmeralda
      },
      {
        name: 'B28 (Rio Mar)',
        shortName: 'B28 Rio Mar',
        value: storeMetrics.perStore.find(s => s.key === 'B28')?.totalDebt || 0,
        color: '#3B82F6' // Azul
      },
      {
        name: 'Vero Pasta',
        shortName: 'Vero Pasta',
        value: storeMetrics.perStore.find(s => s.key === 'VERO')?.totalDebt || 0,
        color: '#8B5CF6' // Roxo
      },
      {
        name: 'Lojas Encerradas',
        shortName: 'Lojas Encerradas',
        value: storeMetrics.closedDebt,
        color: '#EF4444' // Vermelho
      },
      {
        name: 'Holding Central AZ',
        shortName: 'Holding AZ',
        value: storeMetrics.holdingDebt,
        color: '#F59E0B' // Âmbar
      }
    ];

    return items.filter(i => i.value > 0);
  }, [storeMetrics]);

  // 3. Tabela Filtrada de Passivos
  const filteredLiabilities = useMemo(() => {
    if (selectedUnit === 'ALL') return liabilities;
    if (selectedUnit === 'HOLDING') {
      return liabilities.filter(li => li.unit === 'HOLDING' || li.unit.toLowerCase().includes('holding'));
    }
    if (selectedUnit === 'ENCERRADA') {
      return liabilities.filter(li => li.isClosedStore || li.unit.includes('[ENCERRADA]'));
    }
    return liabilities.filter(li => li.unit === selectedUnit);
  }, [liabilities, selectedUnit]);

  // Abertura do Modal para Criação
  const handleOpenCreateModal = () => {
    setEditingLiabilityId(null);
    setUnit('B32');
    setIsClosedStore(false);
    setPayerResponsibility('B32');
    setIsCustomPayer(false);
    setCategory('REFIS / Tributos Parcelados');
    setCreditor('');
    setTotalAmount('');
    setMonthlyPayment('');
    setDueDay('');
    setInstallmentsRemaining('12');
    setStatus('Em Dia');
    setNotes('');
    setIsModalOpen(true);
  };

  // Abertura do Modal para Edição
  const handleOpenEditModal = (liab: StoreLiability) => {
    setEditingLiabilityId(liab.id);
    setUnit(liab.unit);
    const isClosed = Boolean(liab.isClosedStore || liab.unit.includes('[ENCERRADA]'));
    setIsClosedStore(isClosed);

    const payer = liab.payerResponsibility || (isClosed ? 'HOLDING' : liab.unit);
    setPayerResponsibility(payer);
    const isStandard = ['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payer);
    setIsCustomPayer(!isStandard);

    setCategory(liab.category);
    setCreditor(liab.creditor);
    setTotalAmount(formatBRLInput(Math.round(liab.totalAmount * 100).toString()));
    setMonthlyPayment(formatBRLInput(Math.round(liab.monthlyPayment * 100).toString()));
    setDueDay(liab.dueDay ? liab.dueDay.toString() : '');
    setInstallmentsRemaining(liab.installmentsRemaining ? liab.installmentsRemaining.toString() : '');
    setStatus(liab.status || 'Em Dia');
    setDueDate(liab.dueDate || '2026-09-30');
    setNotes(liab.notes || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLiabilityId(null);
  };

  // Handle Due Day Change (1 a 31)
  const handleDueDayChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setDueDay('');
      return;
    }
    const num = parseInt(clean, 10);
    if (num === 0) return;
    if (num > 31) {
      setDueDay('31');
      return;
    }
    setDueDay(num.toString());
  };

  // Salvar (Criar ou Atualizar)
  const handleSaveLiability = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseBRLToNumber(totalAmount);
    const monthlyNum = parseBRLToNumber(monthlyPayment);
    const installments = parseInt(installmentsRemaining, 10) || 0;
    const dueDayNum = parseInt(dueDay, 10) || undefined;

    const finalUnit = unit?.trim() || 'B32';
    const isClosed = isClosedStore || finalUnit.includes('[ENCERRADA]') || closedStores.includes(finalUnit);
    const finalCategory = category?.trim() || 'Outros Passivos';
    const finalCreditor = creditor?.trim() || 'A Definir / Diversos';

    let finalAmount = amountNum;
    let finalMonthly = monthlyNum;

    if (finalAmount <= 0 && finalMonthly > 0 && installments > 0) {
      finalAmount = finalMonthly * installments;
    } else if (finalMonthly <= 0 && finalAmount > 0 && installments > 0) {
      finalMonthly = Math.round(finalAmount / installments);
    } else if (finalAmount > 0 && finalMonthly <= 0) {
      finalMonthly = finalAmount;
    } else if (finalMonthly > 0 && finalAmount <= 0) {
      finalAmount = finalMonthly;
    }

    const payload = {
      unit: finalUnit,
      unitName: getUnitLabel(finalUnit, isClosed).name,
      isClosedStore: isClosed,
      payerResponsibility: (isClosed || finalUnit === 'HOLDING') ? (payerResponsibility?.trim() || 'HOLDING') : finalUnit,
      category: finalCategory,
      creditor: finalCreditor,
      totalAmount: finalAmount,
      monthlyPayment: finalMonthly,
      installmentsRemaining: installments > 0 ? installments : undefined,
      dueDay: dueDayNum,
      dueDate,
      status: status || 'Em Dia',
      notes: notes.trim()
    };

    if (editingLiabilityId) {
      HoldingStorage.updateLiability(editingLiabilityId, payload);
      showToast('Passivo atualizado com sucesso!');
    } else {
      HoldingStorage.addLiability(payload);
      showToast('Passivo registrado com sucesso!');
    }

    handleCloseModal();
    onUpdate();
  };

  // Excluir Passivo
  const handleRequestDeleteLiability = (id: string, creditorName: string) => {
    setLiabilityToDelete({ id, creditor: creditorName });
  };

  const handleConfirmDeleteLiability = () => {
    if (!liabilityToDelete) return;
    HoldingStorage.deleteLiability(liabilityToDelete.id);
    onUpdate();
    showToast(`Passivo com "${liabilityToDelete.creditor}" excluído com sucesso.`);
    setLiabilityToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topo: Título Limpo e o ÚNICO Botão de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2.5`}>
            <Scale className="w-6 h-6 text-amber-500" />
            <span>Endividamento & Análise de Passivos</span>
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-1`}>
            Visão financeira clara e consolidada da saúde das operações do Grupo AZ.
          </p>
        </div>

        {/* ÚNICO Botão de Ação em Destaque */}
        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar Passivo / Dívida</span>
        </button>
      </div>

      {/* 1. Cards de Resumo do Endividamento Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Card: Dívida Total em Aberto */}
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#232328] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} flex flex-col justify-between shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
              Dívida Total em Aberto
            </span>
            <div className={`w-9 h-9 rounded-xl ${isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'} flex items-center justify-center`}>
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl lg:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
              {formatCurrency(storeMetrics.consolidated.totalDebt)}
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-1`}>
              Total consolidado somando empréstimos e pendências
            </div>
          </div>
        </div>

        {/* Card: Parcelas Deste Mês */}
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#232328] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} flex flex-col justify-between shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
              Parcelas Deste Mês
            </span>
            <div className={`w-9 h-9 rounded-xl ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'} flex items-center justify-center`}>
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl lg:text-3xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} tracking-tight`}>
              {formatCurrency(storeMetrics.consolidated.monthlyService)}
            </div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-1`}>
              Valor total que sairá do caixa no mês para quitar parcelas
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cards Comparativos das 3 Lojas (B32, B28, Vero Pasta) */}
      <div className="space-y-4">
        <div>
          <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Saúde & Comprometimento das Lojas Ativas
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-0.5`}>
            Avaliação direta do percentual da receita de cada unidade direcionado ao pagamento de dívidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {storeMetrics.perStore.map((s) => {
            const isSelected = selectedUnit === s.key;
            return (
              <div
                key={s.key}
                onClick={() => setSelectedUnit(selectedUnit === s.key ? 'ALL' : s.key)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-5 ${
                  isSelected 
                    ? isDarkMode
                      ? 'border-amber-400 bg-[#18181D] shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30'
                      : 'border-amber-500 bg-amber-50/50 shadow-md ring-1 ring-amber-400/30'
                    : isDarkMode
                      ? 'border-[#232328] bg-[#141416] hover:border-slate-600 hover:bg-[#16161A]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                }`}
              >
                {/* Cabeçalho: Nome da Loja + Status visual claro */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.benchmark.name}</h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>{s.benchmark.brand}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    s.healthStatus === 'Saudável'
                      ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : s.healthStatus === 'Atenção'
                      ? isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-amber-50 text-amber-700 border-amber-200'
                      : isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      s.healthStatus === 'Saudável' ? (isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500') : s.healthStatus === 'Atenção' ? (isDarkMode ? 'bg-amber-400' : 'bg-amber-500') : (isDarkMode ? 'bg-rose-400' : 'bg-rose-500')
                    }`} />
                    <span>{s.healthStatus}</span>
                  </span>
                </div>

                {/* Métricas Principais: Faturamento e Parcela */}
                <div className={`space-y-3 py-3 border-y ${isDarkMode ? 'border-[#222226]' : 'border-slate-100'} text-xs`}>
                  <div className="flex justify-between items-center">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Faturamento Mensal:</span>
                    <strong className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(s.benchmark.monthlyRevenue)}</strong>
                  </div>
                  <div className={`text-[10px] ${isDarkMode ? 'text-emerald-400/90' : 'text-emerald-600'} font-medium flex items-center justify-between`}>
                    <span>Mês Base:</span>
                    <span className="font-bold">{periodInfo.periodLabel} (Dashboard)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Parcela Mensal de Dívida:</span>
                    <strong className={`text-sm font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{formatCurrency(s.totalMonthlyService)}/mês</strong>
                  </div>
                </div>

                {/* Barra de Comprometimento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Comprometimento da Receita:</span>
                    <strong className={`font-black ${
                      s.cashCommitmentPercent > 20 
                        ? isDarkMode ? 'text-rose-400' : 'text-rose-600' 
                        : s.cashCommitmentPercent > 12 
                        ? isDarkMode ? 'text-amber-400' : 'text-amber-600' 
                        : isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {formatPercent(s.cashCommitmentPercent)}
                    </strong>
                  </div>

                  <div className={`w-full h-2.5 ${isDarkMode ? 'bg-[#202024]' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        s.cashCommitmentPercent > 20 
                          ? 'bg-rose-500' 
                          : s.cashCommitmentPercent > 12 
                          ? 'bg-amber-400' 
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (s.cashCommitmentPercent / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Correção do Gráfico: Rosca (Donut Chart) Limpa + Mini-Resumo com Valores em Reais */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#232328] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} space-y-6 shadow-sm`}>
        <div>
          <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
            <PieChartIcon className="w-5 h-5 text-amber-500" />
            <span>Distribuição da Dívida por Unidade</span>
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-0.5`}>
            Divisão proporcional do passivo total entre as unidades ativas, encerradas e matriz.
          </p>
        </div>

        {donutData.length === 0 ? (
          <div className={`p-8 text-center border border-dashed ${isDarkMode ? 'border-[#28282C] text-slate-500' : 'border-slate-200 text-slate-400'} rounded-2xl text-xs font-bold`}>
            Nenhuma dívida registrada no momento. O grupo está 100% livre de passivos!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Gráfico de Rosca */}
            <div className="lg:col-span-5 flex items-center justify-center relative h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Dívida']}
                    contentStyle={isDarkMode ? { backgroundColor: '#18181D', borderColor: '#2E2E35', borderRadius: '12px', color: '#fff', fontSize: '12px' } : { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centro da Rosca: Total Consolidado */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} tracking-wider`}>Total</span>
                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(storeMetrics.consolidated.totalDebt)}
                </span>
              </div>
            </div>

            {/* Mini-Resumo com Legenda e Valores em Reais */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {donutData.map((item) => {
                const total = storeMetrics.consolidated.totalDebt;
                const percent = total > 0 ? (item.value / total) * 100 : 0;

                return (
                  <div 
                    key={item.name}
                    className={`p-4 rounded-xl ${isDarkMode ? 'bg-[#18181C] border-[#26262B]' : 'bg-slate-50 border-slate-200'} border flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-3.5 h-3.5 rounded-md shrink-0" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <div>
                        <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                        <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>{formatPercent(percent)} do total</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Tabela de Passivos & Pendências (Rodapé) */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-[#232328] bg-[#141416]' : 'border-slate-200 bg-white shadow-xs'} space-y-4 shadow-sm`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${isDarkMode ? 'border-[#242428]' : 'border-slate-100'} pb-4`}>
          <div>
            <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
              <Receipt className="w-5 h-5 text-amber-500" />
              <span>Passivos & Pendências Cadastradas</span>
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium mt-0.5`}>
              Lista detalhada de tributos, fornecedores, acordos e demais obrigações.
            </p>
          </div>

          {/* Filtro Rápido de Unidades na Tabela */}
          <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl ${isDarkMode ? 'bg-[#18181C] border-[#28282D]' : 'bg-slate-100 border-slate-200'} border`}>
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'B32', label: 'B32' },
              { id: 'B28', label: 'B28' },
              { id: 'VERO', label: 'Vero' },
              { id: 'HOLDING', label: 'Holding' },
              { id: 'ENCERRADA', label: 'Encerradas' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedUnit(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedUnit === f.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela ou Empty State Elegante */}
        {filteredLiabilities.length === 0 ? (
          <div className={`py-14 px-6 text-center border border-dashed ${isDarkMode ? 'border-[#2B2B30]' : 'border-slate-200'} rounded-2xl flex flex-col items-center justify-center space-y-3`}>
            <div className={`w-12 h-12 rounded-2xl ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'} flex items-center justify-center`}>
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Nenhuma pendência financeira encontrada</h4>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-sm mx-auto mt-1`}>
                Não há passivos ou parcelamentos registrados para esta seleção. Adicione sua primeira pendência.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-500 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeira Pendência</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto thin-scrollbar pb-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-[#242428] text-slate-400' : 'border-slate-200 text-slate-500'} uppercase tracking-wider font-bold`}>
                  <th className="py-3 px-4">Loja / Origem</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Credor</th>
                  <th className="py-3 px-4 text-right">Valor Restante</th>
                  <th className="py-3 px-4 text-right">Parcela Mensal</th>
                  <th className="py-3 px-4 text-center">Dia Vencimento</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#202024]' : 'divide-slate-100'}`}>
                {filteredLiabilities.map((liab) => {
                  const unitInfo = getUnitLabel(liab.unit, liab.isClosedStore);
                  const isQuitado = liab.status === 'Quitado';

                  return (
                    <tr key={liab.id} className={`${isDarkMode ? 'hover:bg-[#18181D]' : 'hover:bg-slate-50/80'} transition-colors group`}>
                      {/* Loja / Origem */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${unitInfo.badgeBg} ${unitInfo.textBadge} ${unitInfo.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: unitInfo.color }} />
                            <span>{unitInfo.type === 'CLOSED' ? liab.unit : unitInfo.name}</span>
                          </span>
                          {liab.payerResponsibility && (unitInfo.type === 'CLOSED' || unitInfo.type === 'HOLDING') && (
                            <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                              Pagador: <strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>{formatPayerLabel(liab.payerResponsibility)}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className={`py-4 px-4 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {liab.category}
                      </td>

                      {/* Credor */}
                      <td className="py-4 px-4">
                        <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} text-xs`}>{liab.creditor}</div>
                        {liab.notes && (
                          <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} truncate max-w-xs mt-0.5`}>
                            {liab.notes}
                          </div>
                        )}
                      </td>

                      {/* Valor Restante */}
                      <td className={`py-4 px-4 text-right font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(liab.totalAmount)}
                      </td>

                      {/* Parcela Mensal */}
                      <td className={`py-4 px-4 text-right font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        <div>{formatCurrency(liab.monthlyPayment)}/mês</div>
                        {liab.installmentsRemaining && (
                          <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-normal mt-0.5`}>
                            {liab.installmentsRemaining}x restantes
                          </div>
                        )}
                      </td>

                      {/* Dia do Vencimento */}
                      <td className={`py-4 px-4 text-center text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {liab.dueDay ? `Dia ${liab.dueDay}` : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isQuitado
                            ? isDarkMode ? 'bg-slate-800/80 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
                            : liab.status === 'Em Dia'
                            ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : liab.status === 'Em Negociação'
                            ? isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {liab.status}
                        </span>
                      </td>

                      {/* Ações: Editar e Excluir */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(liab)}
                            title="Editar pendência"
                            className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'} transition-all cursor-pointer`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRequestDeleteLiability(liab.id, liab.creditor)}
                            title="Excluir pendência"
                            className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'} transition-all cursor-pointer`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Formulário: Cadastrar ou Editar Passivo */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={handleCloseModal}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-hidden"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl ${isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between border-b ${isDarkMode ? 'border-[#26262B] bg-[#17171A]' : 'border-slate-100 bg-white'} px-6 py-5 shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${isDarkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'} border flex items-center justify-center shrink-0`}>
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {editingLiabilityId ? 'Editar Passivo / Pendência' : 'Cadastrar Passivo / Dívida'}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                      Controle e governança de obrigações financeiras.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#222226]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'} transition-colors cursor-pointer`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveLiability} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6 space-y-4.5">
                  {/* 1. Origem do Passivo / Unidade Devedora */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        Origem do Passivo / Unidade Devedora
                      </label>
                      {(() => {
                        const badgeInfo = getUnitLabel(unit, isClosedStore);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeInfo.badgeBg} ${badgeInfo.textBadge} ${badgeInfo.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badgeInfo.color }} />
                            <span>
                              {badgeInfo.type === 'ACTIVE' 
                                ? 'Loja Ativa' 
                                : badgeInfo.type === 'HOLDING' 
                                ? 'Holding Central' 
                                : 'Unidade Encerrada'}
                            </span>
                          </span>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      <select
                        value={unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUnit(val);
                          const isClosed = val.includes('[ENCERRADA]') || closedStores.includes(val);
                          setIsClosedStore(isClosed);
                          if (val === 'HOLDING') {
                            setPayerResponsibility('HOLDING');
                          } else if (isClosed) {
                            setPayerResponsibility('HOLDING');
                          } else {
                            setPayerResponsibility(val);
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-bold focus:border-amber-400 focus:outline-none transition-colors cursor-pointer`}
                      >
                        <optgroup label="🟢 Lojas Ativas">
                          <option value="B32">B32 (Mossoró) - Bebelu Sanduíches</option>
                          <option value="B28">B28 (Bebelu Rio Mar) - Fortaleza</option>
                          <option value="VERO">Vero Pasta - Gastronomia Italiana</option>
                        </optgroup>

                        {closedStores.length > 0 && (
                          <optgroup label="🔴 Unidades Encerradas">
                            {closedStores.map((cs) => (
                              <option key={cs} value={cs}>
                                {cs}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        <optgroup label="🟡 Holding Central">
                          <option value="HOLDING">Grupo AZ (Dívida Institucional / Sócios / Matriz)</option>
                        </optgroup>
                      </select>

                      {/* Botão para cadastrar loja encerrada */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowAddClosedStore(!showAddClosedStore)}
                          className={`text-xs ${isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'} font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Loja Encerrada</span>
                        </button>
                        {closedStores.length > 0 && (
                          <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {closedStores.length} loja(s) cadastrada(s)
                          </span>
                        )}
                      </div>

                      {/* Chips das unidades encerradas */}
                      {closedStores.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {closedStores.map((cs) => (
                            <span
                              key={cs}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-[#141416] border-[#2B2B32] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border text-[11px]`}
                            >
                              <span>{cs}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveClosedStore(cs)}
                                className={`${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'} transition-colors cursor-pointer`}
                                title="Remover unidade"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Formulário inline para nova unidade encerrada */}
                      {showAddClosedStore && (
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-[#141416]' : 'bg-slate-50'} border border-amber-500/30 space-y-2`}>
                          <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Cadastrar Nova Unidade Encerrada:
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ex: Bebelu Shopping Iguatemi"
                              value={newClosedStoreInput}
                              onChange={(e) => setNewClosedStoreInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNewClosedStore();
                                }
                              }}
                              className={`flex-1 px-3 py-1.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-white border-slate-200 text-slate-900'} border text-xs focus:border-amber-400 focus:outline-none`}
                            />
                            <button
                              type="button"
                              onClick={handleAddNewClosedStore}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Adicionar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddClosedStore(false);
                                setNewClosedStoreInput('');
                              }}
                              className={`px-2.5 py-1.5 rounded-xl ${isDarkMode ? 'bg-[#25252A] text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-800'} text-xs transition-colors cursor-pointer`}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Campo Condicional: Quem assume a parcela? */}
                  {(isClosedStore || unit === 'HOLDING' || unit.includes('[ENCERRADA]')) && (
                    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-[#1A1A1E]' : 'bg-amber-50/40'} border border-amber-500/30 space-y-3`}>
                      <div className="flex items-center justify-between">
                        <label className={`block text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                          Quem assume a parcela mensal? (Centro de Custo Pagador)
                        </label>
                        <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                          Selecione ou digite livremente
                        </span>
                      </div>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Defina qual caixa assumirá o pagamento das parcelas desta loja:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {[
                          { id: 'HOLDING', label: 'Caixa Central da Holding', desc: 'Pago com reservas da Matriz' },
                          { id: 'RATEIO', label: 'Rateio Proporcional', desc: 'Dividido entre as 3 lojas' },
                          { id: 'B32', label: 'B32 (Mossoró)', desc: 'Loja assume o desembolso' },
                          { id: 'B28', label: 'B28 (Rio Mar)', desc: 'Loja assume o desembolso' },
                          { id: 'VERO', label: 'Vero Pasta', desc: 'Loja assume o desembolso' },
                          { id: 'CUSTOM', label: 'Outro / Personalizado', desc: 'Digitar responsável/sócio' }
                        ].map((opt) => {
                          const isSelected = 
                            opt.id === 'CUSTOM'
                              ? (isCustomPayer || !['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility))
                              : (!isCustomPayer && payerResponsibility === opt.id);

                          return (
                            <button
                              type="button"
                              key={opt.id}
                              onClick={() => {
                                if (opt.id === 'CUSTOM') {
                                  setIsCustomPayer(true);
                                  if (['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)) {
                                    setPayerResponsibility('');
                                  }
                                  setTimeout(() => {
                                    customPayerInputRef.current?.focus();
                                  }, 50);
                                } else {
                                  setIsCustomPayer(false);
                                  setPayerResponsibility(opt.id);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-xs'
                                    : 'bg-amber-100/60 border-amber-500 text-amber-950 shadow-xs'
                                  : isDarkMode
                                    ? 'bg-[#141416] border-[#2A2A30] text-slate-300 hover:text-white hover:border-slate-500'
                                    : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{opt.label}</span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                              </div>
                              <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Digitação Livre de Pagador */}
                      <div className="pt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className={`block text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {isCustomPayer || !['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)
                              ? 'Digite quem assume o pagamento:'
                              : 'Ou digite livremente outro pagador personalizado:'}
                          </label>
                          {(isCustomPayer || !['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)) && (
                            <span className={`text-[10px] ${isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-100 border-amber-200'} font-bold px-2 py-0.5 rounded-md border`}>
                              Personalizado Ativo
                            </span>
                          )}
                        </div>
                        <input
                          ref={customPayerInputRef}
                          type="text"
                          placeholder="Ex: Sócio Rennan, Fundo de Investimento, Matriz AZ..."
                          value={
                            isCustomPayer || !['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)
                              ? payerResponsibility
                              : ''
                          }
                          onChange={(e) => {
                            setIsCustomPayer(true);
                            setPayerResponsibility(e.target.value);
                          }}
                          onFocus={() => {
                            setIsCustomPayer(true);
                            if (['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)) {
                              setPayerResponsibility('');
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#141416] text-white' : 'bg-white text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-all ${
                            isCustomPayer || !['HOLDING', 'RATEIO', 'B32', 'B28', 'VERO'].includes(payerResponsibility)
                              ? 'border-amber-400 shadow-sm shadow-amber-500/10'
                              : isDarkMode ? 'border-[#2A2A30] hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Categoria do Passivo */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Categoria do Passivo
                    </label>

                    <input
                      type="text"
                      placeholder="Ex: REFIS / Simples, Rescisões, Empréstimo Sócio..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors mb-2`}
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_SUGGESTIONS.map((sug) => {
                        const isSelected = category.toLowerCase() === sug.toLowerCase();
                        return (
                          <button
                            type="button"
                            key={sug}
                            onClick={() => setCategory(sug)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                                : isDarkMode
                                  ? 'bg-[#141416] text-slate-300 border-[#2A2A30] hover:border-amber-400/50 hover:text-white'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-slate-900'
                            }`}
                          >
                            {sug}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Credor */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Credor / Beneficiário
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Receita Federal, Ambev, Acordo Trabalhista"
                      value={creditor}
                      onChange={(e) => setCreditor(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* 5. Valores e Prazos Financeiros */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Valor Total da Dívida
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(formatBRLInput(e.target.value))}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                        Parcela Mensal
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={monthlyPayment}
                        onChange={(e) => setMonthlyPayment(formatBRLInput(e.target.value))}
                        className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                        Dia do Vencimento
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ex: 10"
                        value={dueDay}
                        onChange={(e) => handleDueDayChange(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                        Parcelas Restantes
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 12"
                        value={installmentsRemaining}
                        onChange={(e) => setInstallmentsRemaining(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                      />
                    </div>
                  </div>

                  {/* Status da Dívida */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Status da Dívida
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StoreLiability['status'])}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors cursor-pointer`}
                    >
                      <option value="Em Dia">Em Dia</option>
                      <option value="Em Negociação">Em Negociação</option>
                      <option value="Atrasado">Em Atraso</option>
                      <option value="Quitado">Quitado</option>
                    </select>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Observações / Condições
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Renegociação em 12 parcelas sem incidência de juros."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors resize-none`}
                    />
                  </div>
                </div>

                {/* Rodapé / Actions */}
                <div className={`flex items-center justify-end gap-3 px-6 py-4 sm:px-7 border-t ${isDarkMode ? 'border-[#26262B] bg-[#17171A]' : 'border-slate-100 bg-white'} shrink-0`}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={`px-4 py-2.5 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#202024]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'} text-xs font-bold transition-colors cursor-pointer`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {editingLiabilityId ? 'Salvar Alterações' : 'Salvar Passivo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Modal de Confirmação de Exclusão de Passivo */}
        {liabilityToDelete && (
          <div 
            onClick={() => setLiabilityToDelete(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-md ${isDarkMode ? 'bg-[#18181C] border-[#2B2B32] text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 shadow-2xl space-y-5`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${isDarkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'} border flex items-center justify-center shrink-0`}>
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Excluir Pendência</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                    Deseja realmente remover a pendência com <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>"{liabilityToDelete.creditor}"</strong>? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLiabilityToDelete(null)}
                  className={`px-4 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'} text-xs font-bold transition-all cursor-pointer`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteLiability}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Excluir Pendência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
