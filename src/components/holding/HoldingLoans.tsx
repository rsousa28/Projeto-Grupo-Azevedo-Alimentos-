import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  Plus, 
  DollarSign, 
  Calendar, 
  Percent, 
  CheckCircle2, 
  X, 
  Building2, 
  Trash2, 
  Filter, 
  ArrowUpRight,
  TrendingDown,
  Clock,
  HelpCircle,
  CreditCard,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { BankLoan, UnitBinding } from '../../types/holding';
import { HoldingStorage, UNIT_LABELS } from '../../services/holdingStorage';
import { useStore } from '../../contexts/StoreContext';

interface HoldingLoansProps {
  loans: BankLoan[];
  onUpdate: () => void;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

export const HoldingLoans: React.FC<HoldingLoansProps> = ({ loans, onUpdate }) => {
  const { isDarkMode } = useStore();
  const [selectedFilter, setSelectedFilter] = useState<UnitBinding | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<{ id: string; bank: string } | null>(null);

  // Form State
  const [bank, setBank] = useState('');
  const [modality, setModality] = useState('Capital de Giro');
  const [principal, setPrincipal] = useState('');
  const [installmentsTotal, setInstallmentsTotal] = useState('36');
  const [installmentsPaid, setInstallmentsPaid] = useState('0');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [rate, setRate] = useState('CDI + 2.8% a.a.');
  const [dueDate, setDueDate] = useState('2026-10-15');
  const [unit, setUnit] = useState<UnitBinding>('B32');
  const [notes, setNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered loans
  const filteredLoans = useMemo(() => {
    if (selectedFilter === 'ALL') return loans;
    return loans.filter(l => l.unit === selectedFilter);
  }, [loans, selectedFilter]);

  // Overall KPIs
  const totalPrincipal = useMemo(() => 
    loans.reduce((acc, l) => acc + l.principal, 0), [loans]);
  
  const totalBalance = useMemo(() => 
    loans.reduce((acc, l) => acc + l.currentBalance, 0), [loans]);
  
  const totalMonthlyCost = useMemo(() => 
    loans.filter(l => l.status !== 'Liquidado').reduce((acc, l) => acc + l.monthlyPayment, 0), [loans]);

  // Custo Médio de Juros Calculado Dinamicamente por saldo devedor
  const averageInterestRateInfo = useMemo(() => {
    const activeLoans = loans.filter(l => l.status !== 'Liquidado' && l.currentBalance > 0);
    if (activeLoans.length === 0) {
      return {
        display: '0,0% a.a.',
        subtitle: 'Nenhum contrato ativo cadastrado',
        indexers: 'Sem contratos ativos'
      };
    }

    let totalCdiSpreadWeighted = 0;
    let totalCdiBalance = 0;
    let totalFixedRateWeighted = 0;
    let totalFixedBalance = 0;
    const indexerSet = new Set<string>();

    activeLoans.forEach(loan => {
      const balance = loan.currentBalance;
      const rateStr = loan.rate || '';

      const cdiMatch = rateStr.match(/cdi\s*\+?\s*([0-9.,]+)%?/i);
      if (cdiMatch) {
        indexerSet.add('CDI');
        const spread = parseFloat(cdiMatch[1].replace(',', '.')) || 0;
        totalCdiSpreadWeighted += spread * balance;
        totalCdiBalance += balance;
      } else {
        const numMatch = rateStr.match(/([0-9.,]+)%?/);
        if (numMatch) {
          let val = parseFloat(numMatch[1].replace(',', '.')) || 0;
          if (rateStr.toLowerCase().includes('a.m') || (!rateStr.toLowerCase().includes('a.a') && val < 6)) {
            val = val * 12;
            indexerSet.add('Pré (a.m.)');
          } else {
            indexerSet.add('Pré (a.a.)');
          }
          totalFixedRateWeighted += val * balance;
          totalFixedBalance += balance;
        } else if (loan.principal > 0 && loan.installmentsTotal > 0 && loan.monthlyPayment > 0) {
          const totalPaidEstim = loan.monthlyPayment * loan.installmentsTotal;
          const totalInterest = Math.max(0, totalPaidEstim - loan.principal);
          const years = Math.max(0.5, loan.installmentsTotal / 12);
          const approxAnnualRate = (totalInterest / loan.principal / years) * 100;
          totalFixedRateWeighted += approxAnnualRate * balance;
          totalFixedBalance += balance;
          indexerSet.add('CET Implícito');
        }
      }
    });

    if (totalCdiBalance > 0 && totalCdiBalance >= totalFixedBalance) {
      const avgSpread = totalCdiSpreadWeighted / totalCdiBalance;
      return {
        display: `CDI + ${avgSpread.toFixed(2)}% a.a.`,
        subtitle: `Ponderado por ${formatCurrency(totalCdiBalance)} em saldo`,
        indexers: Array.from(indexerSet).join(', ') || 'CDI'
      };
    } else if (totalFixedBalance > 0) {
      const avgRate = totalFixedRateWeighted / totalFixedBalance;
      const monthlyEquivalent = avgRate / 12;
      return {
        display: `${avgRate.toFixed(2)}% a.a.`,
        subtitle: `Equivalente a ${monthlyEquivalent.toFixed(2)}% a.m. (ponderado)`,
        indexers: Array.from(indexerSet).join(', ') || 'Taxa Fixa'
      };
    } else {
      return {
        display: 'CDI + 2.8% a.a.',
        subtitle: 'Taxa ponderada ativa',
        indexers: 'CDI'
      };
    }
  }, [loans]);

  // Progress of global amortization
  const globalAmortizedPercent = totalPrincipal > 0 
    ? ((totalPrincipal - totalBalance) / totalPrincipal) * 100 
    : 0;

  // Handle Create Loan
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const principalNum = parseFloat(principal.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    const monthlyNum = parseFloat(monthlyPayment.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    const totalInst = parseInt(installmentsTotal, 10) || 1;
    const paidInst = parseInt(installmentsPaid, 10) || 0;

    if (!bank.trim()) {
      showToast('Informe o nome do Banco ou Instituição.');
      return;
    }

    if (principalNum <= 0) {
      showToast('Informe um valor financiado válido.');
      return;
    }

    const ratioPaid = paidInst / totalInst;
    const initialBalance = Math.max(0, Math.round(principalNum * (1 - ratioPaid)));

    HoldingStorage.addLoan({
      bank: bank.trim(),
      modality: modality.trim(),
      principal: principalNum,
      currentBalance: initialBalance,
      installmentsTotal: totalInst,
      installmentsPaid: paidInst,
      monthlyPayment: monthlyNum > 0 ? monthlyNum : Math.round(principalNum / totalInst),
      rate: rate.trim(),
      dueDate,
      unit,
      status: paidInst >= totalInst ? 'Liquidado' : 'Em Dia',
      notes: notes.trim()
    });

    setIsModalOpen(false);
    // Reset Form
    setBank('');
    setPrincipal('');
    setMonthlyPayment('');
    setInstallmentsPaid('0');
    setNotes('');
    onUpdate();
    showToast('Contrato de empréstimo cadastrado com sucesso!');
  };

  // Pay single installment
  const handlePayInstallment = (loan: BankLoan) => {
    if (loan.status === 'Liquidado') {
      showToast('Este contrato já foi 100% quitado!');
      return;
    }
    HoldingStorage.payInstallment(loan.id);
    onUpdate();
    showToast(`Parcela paga com sucesso! Saldo devedor do contrato ${loan.bank} atualizado.`);
  };

  // Delete loan
  const handleRequestDeleteLoan = (loanId: string, bankName: string) => {
    setLoanToDelete({ id: loanId, bank: bankName });
  };

  const handleConfirmDeleteLoan = () => {
    if (!loanToDelete) return;
    HoldingStorage.deleteLoan(loanToDelete.id);
    onUpdate();
    showToast(`Contrato com ${loanToDelete.bank} excluído com sucesso.`);
    setLoanToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header with Title and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Landmark className="w-6 h-6 text-amber-400" />
            <span>Empréstimos Bancários & Financiamentos</span>
          </h2>
          <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Gestão ativa de contratos de crédito, saldo devedor, cronograma de parcelas e vínculo por unidade.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo Contrato de Empréstimo</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tomado */}
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Tomado
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(totalPrincipal)}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Valor financiado original
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
            <span>{loans.length} contratos ativos</span>
            <span className="text-emerald-500 font-bold">{formatPercent(globalAmortizedPercent)} amortizado</span>
          </div>
        </div>

        {/* Card 2: Saldo Devedor Atual */}
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Saldo Devedor Atual
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Passivo bancário remanescente
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
            <span>Amortização restante</span>
            <span className="text-amber-500 font-bold">{formatCurrency(totalPrincipal - totalBalance)} pagos</span>
          </div>
        </div>

        {/* Card 3: Custo Mensal das Parcelas */}
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Custo Mensal
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {formatCurrency(totalMonthlyCost)}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Serviço mensal consolidado
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
            <span>Compromisso bancário</span>
            <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Vencimentos mensais</span>
          </div>
        </div>

        {/* Card 4: Custo Médio de Juros */}
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Custo Médio de Juros
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {averageInterestRateInfo.display}
            </div>
            <div className={`text-xs font-medium mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} title={averageInterestRateInfo.subtitle}>
              {averageInterestRateInfo.subtitle}
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'}`}>
            <span>Indexadores:</span>
            <span className={`font-semibold truncate max-w-[140px] text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={averageInterestRateInfo.indexers}>
              {averageInterestRateInfo.indexers}
            </span>
          </div>
        </div>
      </div>

      {/* Unit Filter Tabs */}
      <div className={`flex flex-wrap items-center gap-2 border-b ${isDarkMode ? 'border-[#242426]' : 'border-slate-200'} pb-3`}>
        <span className={`text-xs font-bold uppercase tracking-wider mr-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          <Filter className="w-3.5 h-3.5" />
          Filtrar por Unidade:
        </span>

        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : isDarkMode
                ? 'bg-[#18181C] text-slate-400 hover:text-white border border-[#26262B]'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs hover:bg-slate-50'
          }`}
        >
          Todas as Unidades ({loans.length})
        </button>

        {(['B32', 'B28', 'VERO', 'HOLDING'] as UnitBinding[]).map((uKey) => {
          const info = UNIT_LABELS[uKey];
          const count = loans.filter(l => l.unit === uKey).length;
          const isSelected = selectedFilter === uKey;

          return (
            <button
              key={uKey}
              onClick={() => setSelectedFilter(uKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? isDarkMode
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'bg-slate-900 text-white shadow-md'
                  : isDarkMode
                    ? 'bg-[#18181C] text-slate-400 hover:text-white border border-[#26262B]'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${info.badgeBg.replace('/15', '')}`} style={{ backgroundColor: info.color }} />
              <span>{info.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Contracts Table */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${isDarkMode ? 'border-[#242426] bg-[#141416]' : 'border-slate-200/90 bg-white shadow-xs'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Tabela de Acompanhamento dos Contratos
            </h3>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Acompanhe o pagamento de parcelas, o saldo restante e amortize em tempo real.
            </p>
          </div>
          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Exibindo <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredLoans.length}</strong> contrato(s)
          </span>
        </div>

        {filteredLoans.length === 0 ? (
          <div className={`p-12 text-center border border-dashed rounded-2xl space-y-3 ${isDarkMode ? 'border-[#28282C]' : 'border-slate-200 bg-slate-50/50'}`}>
            <Landmark className={`w-10 h-10 mx-auto ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nenhum contrato cadastrado para este filtro.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-500 font-bold text-xs hover:bg-amber-500/25 transition-all cursor-pointer"
            >
              Cadastrar Empréstimo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto thin-scrollbar pb-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-[#242426] text-slate-400' : 'border-slate-200 text-slate-500 bg-slate-50/70'} uppercase tracking-wider font-bold`}>
                  <th className="py-3 px-4">Banco / Linha</th>
                  <th className="py-3 px-4">Unidade Vinculada</th>
                  <th className="py-3 px-4 text-right">Parcela Mensal</th>
                  <th className="py-3 px-4 text-center">Próx. Vencimento</th>
                  <th className="py-3 px-4 text-right">Saldo Devedor</th>
                  <th className="py-3 px-4">Amortização</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#202024]' : 'divide-slate-100'}`}>
                {filteredLoans.map((loan) => {
                  const unitInfo = UNIT_LABELS[loan.unit];
                  const amortizedPercent = (loan.installmentsPaid / loan.installmentsTotal) * 100;
                  const isFinished = loan.status === 'Liquidado' || loan.installmentsPaid >= loan.installmentsTotal;

                  return (
                    <tr key={loan.id} className={`${isDarkMode ? 'hover:bg-[#18181B]' : 'hover:bg-slate-50/80'} transition-colors group`}>
                      {/* Banco / Linha */}
                      <td className="py-3.5 px-4">
                        <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{loan.bank}</div>
                        <div className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-0.5">
                          <span>{loan.modality}</span>
                          <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{loan.rate}</span>
                        </div>
                        {loan.notes && (
                          <div className={`text-[10px] truncate max-w-xs mt-0.5 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {loan.notes}
                          </div>
                        )}
                      </td>

                      {/* Unidade Vinculada Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${unitInfo.badgeBg} ${unitInfo.textBadge} ${unitInfo.border}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: unitInfo.color }} />
                          <span>{unitInfo.name}</span>
                        </span>
                      </td>

                      {/* Parcela Mensal */}
                      <td className="py-3.5 px-4 text-right font-black text-sm text-amber-500">
                        {formatCurrency(loan.monthlyPayment)}
                      </td>

                      {/* Próx. Vencimento */}
                      <td className={`py-3.5 px-4 text-center font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span>{loan.dueDate}</span>
                        </div>
                      </td>

                      {/* Saldo Devedor */}
                      <td className="py-3.5 px-4 text-right">
                        <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(loan.currentBalance)}
                        </div>
                        <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Original: {formatCurrency(loan.principal)}
                        </div>
                      </td>

                      {/* Barra de Progresso de Amortização */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {loan.installmentsPaid} / {loan.installmentsTotal} parcelas
                          </span>
                          <span className={`font-black ${isFinished ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {formatPercent(amortizedPercent)}
                          </span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#26262B]' : 'bg-slate-100'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFinished ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, amortizedPercent)}%` }}
                          />
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handlePayInstallment(loan)}
                            disabled={isFinished}
                            title="Registrar pagamento da próxima parcela e amortizar saldo"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isFinished
                                ? isDarkMode ? 'bg-[#222] text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isDarkMode
                                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 shadow-2xs'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pagar Parcela</span>
                          </button>

                          <button
                            onClick={() => handleRequestDeleteLoan(loan.id, loan.bank)}
                            title="Excluir contrato"
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' 
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal / Formulário de Cadastro (+ Novo Contrato) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl ${isDarkMode ? 'bg-[#141416] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between border-b ${isDarkMode ? 'border-[#242428]' : 'border-slate-100'} pb-4`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' : 'bg-amber-100 border border-amber-300 text-amber-800'}`}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Novo Contrato de Empréstimo
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                      Cadastre uma nova operação de crédito ou linha de financiamento.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#222]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateLoan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome do Banco */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Banco / Instituição Financeira *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Santander, Bradesco, Banco do Brasil"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Linha / Tipo */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Linha / Tipo de Financiamento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Capital de Giro, Pronampe, Finame"
                      value={modality}
                      onChange={(e) => setModality(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>
                </div>

                {/* Vínculo da Unidade (Campo Chave) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-500 mb-1.5 flex items-center justify-between">
                    <span>Vínculo da Unidade (Quem responde pelo pagamento?) *</span>
                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-normal`}>Impacta nos indicadores de endividamento</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['B32', 'B28', 'VERO', 'HOLDING'] as UnitBinding[]).map((uKey) => {
                      const info = UNIT_LABELS[uKey];
                      const isSelected = unit === uKey;

                      return (
                        <button
                          type="button"
                          key={uKey}
                          onClick={() => setUnit(uKey)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            isSelected
                              ? isDarkMode
                                ? 'border-amber-400 bg-amber-500/15 text-white shadow-md'
                                : 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                              : isDarkMode
                                ? 'border-[#26262B] bg-[#1A1A1E] text-slate-400 hover:text-white hover:border-[#35353D]'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black">{info.tag}</span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                          </div>
                          <span className="text-[11px] font-semibold truncate">{info.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Valor Total Financiado */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Valor Total Financiado (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="1000"
                      placeholder="Ex: 300000"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Taxa de Juros */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Taxa de Juros (a.m. ou a.a.) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CDI + 2.8% a.a. ou 1.45% a.m."
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quantidade de Parcelas Total */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Total de Parcelas *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={installmentsTotal}
                      onChange={(e) => setInstallmentsTotal(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Parcelas já Pagas */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Parcelas já Pagas
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={installmentsTotal}
                      value={installmentsPaid}
                      onChange={(e) => setInstallmentsPaid(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Valor da Parcela Mensal */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Parcela Mensal (R$) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Ex: 8900"
                      value={monthlyPayment}
                      onChange={(e) => setMonthlyPayment(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Data / Dia de Vencimento */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Data / Próximo Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white [color-scheme:light]'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>

                  {/* Observações / Destinação */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                      Destinação / Observações
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Reforma da cozinha, compra de fritadeira"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl ${isDarkMode ? 'bg-[#1C1C20] border-[#2B2B32] text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white'} border text-xs font-medium focus:border-amber-400 focus:outline-none transition-colors`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-[#242428]' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#202024]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    Salvar Contrato
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Modal de Confirmação de Exclusão de Empréstimo */}
        {loanToDelete && (
          <div 
            onClick={() => setLoanToDelete(null)}
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'}`}>
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Excluir Contrato</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                    Deseja realmente remover o contrato com <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>"{loanToDelete.bank}"</strong>? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLoanToDelete(null)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteLoan}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Excluir Contrato
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
