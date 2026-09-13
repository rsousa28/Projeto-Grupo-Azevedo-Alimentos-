import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Coins,
  ArrowUpRight,
  Filter,
  Search,
  ChevronRight,
  BarChart3,
  X,
  FileSpreadsheet,
  Calculator,
  SlidersHorizontal,
  Info,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { InvestmentProject, ViabilityPlanilha } from '../../types/holding';
import { HoldingStorage } from '../../services/holdingStorage';
import { calculateViability, DEFAULT_VIABILITY_PARAMS } from '../../utils/viabilityCalculator';
import { ViabilityPlanilhaView } from './ViabilityPlanilhaView';
import { useStore } from '../../contexts/StoreContext';

interface HoldingInvestmentsProps {
  investments: InvestmentProject[];
  onUpdate: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val) + '%';

const INVESTMENT_TYPES = [
  'Nova Unidade Física',
  'Infraestrutura de Delivery',
  'Tecnologia Operacional',
  'Reforma & Ampliação',
  'Nova Marca / Franquia'
];

const INVESTMENT_STAGES = [
  'Em Estudo / Viabilidade',
  'Prospecção Imobiliária',
  'Obras e Reformas',
  'Implantação Piloto',
  'Concluído / Inaugurado'
];

export function HoldingInvestments({ investments, onUpdate }: HoldingInvestmentsProps) {
  const { isDarkMode } = useStore();

  // Helper to obtain complete viability analysis for any project
  const getProjectViability = (inv: InvestmentProject): ViabilityPlanilha => {
    if (inv.viability) return inv.viability;
    return calculateViability({
      monthlyRevenue: inv.projectedMonthlyRevenue,
      capex: inv.capexBudget
    });
  };

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [showAnalysisChart, setShowAnalysisChart] = useState(true);

  // Standalone Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simRevenue, setSimRevenue] = useState('75000');
  const [simCapex, setSimCapex] = useState('280000');
  const [simCmv, setSimCmv] = useState('35');
  const [simFixed, setSimFixed] = useState('35000');
  const [simMkt, setSimMkt] = useState('0');
  const [simRoy, setSimRoy] = useState('0');
  const [simCard, setSimCard] = useState('4');
  const [simCreditSales, setSimCreditSales] = useState('65');
  const [simClientDays, setSimClientDays] = useState('2');
  const [simCreditPurchases, setSimCreditPurchases] = useState('100');
  const [simSupplierDays, setSimSupplierDays] = useState('15');
  const [simStockDays, setSimStockDays] = useState('15');

  // Live calculation for Standalone Simulator
  const simViability = useMemo(() => {
    return calculateViability({
      monthlyRevenue: parseFloat(simRevenue) || 0,
      capex: parseFloat(simCapex) || 0,
      cmvPercent: parseFloat(simCmv) || 35,
      fixedExpenses: parseFloat(simFixed) || 35000,
      marketingPercent: parseFloat(simMkt) || 0,
      royaltiesPercent: parseFloat(simRoy) || 0,
      cardFeesPercent: parseFloat(simCard) || 4,
      creditSalesPercent: parseFloat(simCreditSales) || 65,
      clientTermDays: parseFloat(simClientDays) || 2,
      creditPurchasesPercent: parseFloat(simCreditPurchases) || 100,
      supplierTermDays: parseFloat(simSupplierDays) || 15,
      stockDays: parseFloat(simStockDays) || 15
    });
  }, [
    simRevenue,
    simCapex,
    simCmv,
    simFixed,
    simMkt,
    simRoy,
    simCard,
    simCreditSales,
    simClientDays,
    simCreditPurchases,
    simSupplierDays,
    simStockDays
  ]);

  // View Spreadsheet Modal for a specific project
  const [viewingPlanilhaProject, setViewingPlanilhaProject] = useState<InvestmentProject | null>(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<InvestmentProject | null>(null);
  const [formActiveTab, setFormActiveTab] = useState<'BASIC' | 'PLANILHA'>('PLANILHA');
  const [showFormPlanilhaTable, setShowFormPlanilhaTable] = useState(false);

  // Quick Contribution Modal State
  const [contributeProject, setContributeProject] = useState<InvestmentProject | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [projectName, setProjectName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const [type, setType] = useState(INVESTMENT_TYPES[0]);
  const [stage, setStage] = useState(INVESTMENT_STAGES[0]);
  const [capexBudget, setCapexBudget] = useState('280000');
  const [spentSoFar, setSpentSoFar] = useState('0');
  const [projectedMonthlyRevenue, setProjectedMonthlyRevenue] = useState('75000');
  const [projectedRoi, setProjectedRoi] = useState('35% a.a.');
  const [targetLaunch, setTargetLaunch] = useState('');
  const [responsible, setResponsible] = useState('Diretoria de Expansão');
  const [notes, setNotes] = useState('');

  // Viability spreadsheet parameters for project form
  const [cmvPercent, setCmvPercent] = useState('35');
  const [fixedExpenses, setFixedExpenses] = useState('35000');
  const [marketingPercent, setMarketingPercent] = useState('0');
  const [royaltiesPercent, setRoyaltiesPercent] = useState('0');
  const [cardFeesPercent, setCardFeesPercent] = useState('4');
  const [creditSalesPercent, setCreditSalesPercent] = useState('65');
  const [clientTermDays, setClientTermDays] = useState('2');
  const [creditPurchasesPercent, setCreditPurchasesPercent] = useState('100');
  const [supplierTermDays, setSupplierTermDays] = useState('15');
  const [stockDays, setStockDays] = useState('15');

  // Live calculation of form viability based on the spreadsheet formula
  const formViability = useMemo(() => {
    const numCapex = parseFloat(capexBudget.replace(/[^0-9.]/g, '')) || 0;
    const numRev = parseFloat(projectedMonthlyRevenue.replace(/[^0-9.]/g, '')) || 0;
    return calculateViability({
      monthlyRevenue: numRev,
      capex: numCapex,
      cmvPercent: parseFloat(cmvPercent) || 35,
      fixedExpenses: parseFloat(fixedExpenses) || 35000,
      marketingPercent: parseFloat(marketingPercent) || 0,
      royaltiesPercent: parseFloat(royaltiesPercent) || 0,
      cardFeesPercent: parseFloat(cardFeesPercent) || 4,
      creditSalesPercent: parseFloat(creditSalesPercent) || 65,
      clientTermDays: parseFloat(clientTermDays) || 2,
      creditPurchasesPercent: parseFloat(creditPurchasesPercent) || 100,
      supplierTermDays: parseFloat(supplierTermDays) || 15,
      stockDays: parseFloat(stockDays) || 15
    });
  }, [
    capexBudget,
    projectedMonthlyRevenue,
    cmvPercent,
    fixedExpenses,
    marketingPercent,
    royaltiesPercent,
    cardFeesPercent,
    creditSalesPercent,
    clientTermDays,
    creditPurchasesPercent,
    supplierTermDays,
    stockDays
  ]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingProject(null);
    setProjectName('');
    setNameError(null);
    setType(INVESTMENT_TYPES[0]);
    setStage(INVESTMENT_STAGES[0]);
    setCapexBudget('280000');
    setSpentSoFar('0');
    setProjectedMonthlyRevenue('75000');
    setCmvPercent('35');
    setFixedExpenses('35000');
    setMarketingPercent('0');
    setRoyaltiesPercent('0');
    setCardFeesPercent('4');
    setCreditSalesPercent('65');
    setClientTermDays('2');
    setCreditPurchasesPercent('100');
    setSupplierTermDays('15');
    setStockDays('15');
    setProjectedRoi('35% a.a.');
    setTargetLaunch('');
    setResponsible('Diretoria de Expansão');
    setNotes('');
    setFormActiveTab('PLANILHA');
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (inv: InvestmentProject) => {
    const viab = getProjectViability(inv);
    setEditingProject(inv);
    setProjectName(inv.projectName);
    setNameError(null);
    setType(inv.type);
    setStage(inv.stage);
    setCapexBudget(inv.capexBudget.toString());
    setSpentSoFar(inv.spentSoFar.toString());
    setProjectedMonthlyRevenue(inv.projectedMonthlyRevenue.toString());
    setCmvPercent((viab.cmvPercent ?? 35).toString());
    setFixedExpenses((viab.fixedExpenses ?? 35000).toString());
    setMarketingPercent((viab.marketingPercent ?? 0).toString());
    setRoyaltiesPercent((viab.royaltiesPercent ?? 0).toString());
    setCardFeesPercent((viab.cardFeesPercent ?? 4).toString());
    setCreditSalesPercent((viab.creditSalesPercent ?? 65).toString());
    setClientTermDays((viab.clientTermDays ?? 2).toString());
    setCreditPurchasesPercent((viab.creditPurchasesPercent ?? 100).toString());
    setSupplierTermDays((viab.supplierTermDays ?? 15).toString());
    setStockDays((viab.stockDays ?? 15).toString());
    setProjectedRoi(inv.projectedRoi);
    setTargetLaunch(inv.targetLaunch);
    setResponsible(inv.responsible);
    setNotes(inv.notes || '');
    setFormActiveTab('PLANILHA');
    setIsFormModalOpen(true);
  };

  // Save Project (Create / Update)
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setNameError('Por favor, informe o Nome do Projeto para cadastrar.');
      showToast('Por favor, informe o Nome do Projeto antes de cadastrar.');
      return;
    }
    setNameError(null);

    const parsedSpent = parseFloat(spentSoFar.replace(/[^0-9.]/g, '')) || 0;

    const projectPayload = {
      projectName: projectName.trim(),
      type,
      stage,
      capexBudget: formViability.capex,
      spentSoFar: parsedSpent,
      projectedMonthlyRevenue: formViability.monthlyRevenue,
      expectedPaybackMonths: Number(formViability.paybackMonths.toFixed(2)),
      projectedRoi: projectedRoi.trim() || '30% a.a.',
      targetLaunch: targetLaunch.trim() || 'Em definição',
      responsible: responsible.trim() || 'Diretoria de Expansão',
      notes: notes.trim(),
      viability: formViability
    };

    if (editingProject) {
      HoldingStorage.updateInvestment(editingProject.id, projectPayload);
      showToast('Projeto de investimento atualizado com sucesso!');
    } else {
      HoldingStorage.addInvestment(projectPayload);
      showToast('Projeto de investimento cadastrado com sucesso!');
    }

    setIsFormModalOpen(false);
    onUpdate();
  };

  // Transfer standalone simulator numbers into new project form
  const handleApplySimulatorToCreate = () => {
    setEditingProject(null);
    setProjectName('');
    setNameError(null);
    setType(INVESTMENT_TYPES[0]);
    setStage(INVESTMENT_STAGES[0]);
    setCapexBudget(simViability.capex.toString());
    setSpentSoFar('0');
    setProjectedMonthlyRevenue(simViability.monthlyRevenue.toString());
    setCmvPercent(simViability.cmvPercent.toString());
    setFixedExpenses(simViability.fixedExpenses.toString());
    setMarketingPercent(simViability.marketingPercent.toString());
    setRoyaltiesPercent(simViability.royaltiesPercent.toString());
    setCardFeesPercent(simViability.cardFeesPercent.toString());
    setCreditSalesPercent(simViability.creditSalesPercent.toString());
    setClientTermDays(simViability.clientTermDays.toString());
    setCreditPurchasesPercent(simViability.creditPurchasesPercent.toString());
    setSupplierTermDays(simViability.supplierTermDays.toString());
    setStockDays(simViability.stockDays.toString());
    setProjectedRoi('35% a.a.');
    setTargetLaunch('');
    setResponsible('Diretoria de Expansão');
    setNotes(`Estudo baseado na Planilha de Viabilidade. Payback: ${simViability.paybackMonths.toFixed(2)} meses. Break-Even: ${formatCurrency(simViability.breakEvenMonthly)}.`);
    setIsSimulatorOpen(false);
    setFormActiveTab('PLANILHA');
    setIsFormModalOpen(true);
  };

  // Quick Contribution Save
  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeProject) return;

    const parsedAmount = parseFloat(contributionAmount.replace(/[^0-9.]/g, '')) || 0;
    if (parsedAmount <= 0) return;

    HoldingStorage.addContribution(contributeProject.id, parsedAmount);
    setContributeProject(null);
    setContributionAmount('');
    onUpdate();
  };

  // Delete Project
  const handleDeleteProject = (id: string) => {
    HoldingStorage.deleteInvestment(id);
    setDeleteConfirmId(null);
    onUpdate();
  };

  // Filtered list
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      const matchSearch =
        searchTerm === '' ||
        inv.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === 'ALL' || inv.type === selectedType;
      const matchStage = selectedStage === 'ALL' || inv.stage === selectedStage;

      return matchSearch && matchType && matchStage;
    });
  }, [investments, searchTerm, selectedType, selectedStage]);

  // Aggregate Metrics & KPIs
  const totalCapexBudget = investments.reduce((acc, inv) => acc + inv.capexBudget, 0);
  const totalSpentSoFar = investments.reduce((acc, inv) => acc + inv.spentSoFar, 0);
  const executionPercentage = totalCapexBudget > 0 ? (totalSpentSoFar / totalCapexBudget) * 100 : 0;
  const totalProjectedRevenue = investments.reduce((acc, inv) => acc + inv.projectedMonthlyRevenue, 0);

  // Payback médio calculado rigorosamente de acordo com a planilha de viabilidade
  const averagePayback = useMemo(() => {
    if (investments.length === 0) return 0;
    const validPaybacks = investments
      .map((inv) => {
        const v = getProjectViability(inv);
        return v.paybackMonths > 0 ? v.paybackMonths : 0;
      })
      .filter((p) => p > 0);

    if (validPaybacks.length > 0) {
      const sum = validPaybacks.reduce((acc, p) => acc + p, 0);
      return Number((sum / validPaybacks.length).toFixed(1));
    }
    return 0;
  }, [investments]);

  // Chart data
  const chartData = investments.map((inv) => ({
    name: inv.projectName.length > 20 ? `${inv.projectName.slice(0, 18)}...` : inv.projectName,
    fullName: inv.projectName,
    Orcamento: inv.capexBudget,
    Aportado: inv.spentSoFar,
    ReceitaMes: inv.projectedMonthlyRevenue
  }));

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

      {/* Header with Title and Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2.5 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <Briefcase className="w-6 h-6 text-amber-500" />
            <span>Pipeline de Expansão & Novos Negócios</span>
          </h2>
          <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Planejamento de Capex, controle de aportes e modelo de viabilidade e payback da planilha oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className={`px-4 py-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
              isDarkMode
                ? 'bg-[#233519] hover:bg-[#2d4420] text-emerald-300 border-[#3b5924]'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
            title="Abrir Simulador Interativo baseado na Planilha de Viabilidade"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>Simulador de Viabilidade</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Novo Investimento</span>
          </button>
        </div>
      </div>

      {/* 4 Analytical KPI Cards of Investments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orçamento Capex Total */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-all ${
          isDarkMode
            ? 'border-[#242426] bg-[#141416] shadow-sm'
            : 'border-slate-200/90 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Orçamento Capex Total
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {formatCurrency(totalCapexBudget)}
            </div>
            <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>{investments.length} projetos em pipeline</span>
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${
            isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'
          }`}>
            <span>Investimento Planejado</span>
            <strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>Expansão AZ</strong>
          </div>
        </div>

        {/* Card 2: Total Aportado / Executado */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-all ${
          isDarkMode
            ? 'border-[#242426] bg-[#141416] shadow-sm'
            : 'border-slate-200/90 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Total Aportado até Hoje
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {formatCurrency(totalSpentSoFar)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${
                isDarkMode ? 'bg-[#202024]' : 'bg-slate-100'
              }`}>
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, executionPercentage)}%` }}
                />
              </div>
              <span className={`text-xs font-bold shrink-0 ${
                isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {formatPercent(executionPercentage)}
              </span>
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${
            isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'
          }`}>
            <span>Saldo a Desembolsar:</span>
            <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
              {formatCurrency(Math.max(0, totalCapexBudget - totalSpentSoFar))}
            </strong>
          </div>
        </div>

        {/* Card 3: Receita Mensal Projetada */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-all ${
          isDarkMode
            ? 'border-[#242426] bg-[#141416] shadow-sm'
            : 'border-slate-200/90 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Receita Nova Projetada
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {formatCurrency(totalProjectedRevenue)}
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>/mês</span>
            </div>
            <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <ArrowUpRight className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span>Incremento pós-inauguração</span>
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${
            isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'
          }`}>
            <span>Anualizado Adicional:</span>
            <strong className={isDarkMode ? 'text-blue-300' : 'text-blue-600'}>{formatCurrency(totalProjectedRevenue * 12)}</strong>
          </div>
        </div>

        {/* Card 4: Payback Médio Estimado (Calculado com base na receita projetada) */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-all ${
          isDarkMode
            ? 'border-[#242426] bg-[#141416] shadow-sm'
            : 'border-slate-200/90 bg-white shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Payback Médio Estimado
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>
              {averagePayback > 0 ? averagePayback : 0}{' '}
              <span className={`text-base font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>meses</span>
            </div>
            <div className={`flex items-center gap-1.5 mt-1 text-xs font-semibold ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <span>
                {totalProjectedRevenue > 0
                  ? averagePayback <= 18
                    ? 'Retorno acelerado de capital'
                    : averagePayback <= 30
                    ? 'Retorno sustentável de capital'
                    : 'Retorno de maturação estendida'
                  : 'Aguardando projeção de receita'}
              </span>
            </div>
          </div>
          <div className={`text-[11px] border-t pt-2 flex items-center justify-between ${
            isDarkMode ? 'text-slate-400 border-[#202022]' : 'text-slate-500 border-slate-100'
          }`}>
            <span>Viabilidade média:</span>
            <span className={
              averagePayback > 0 && averagePayback <= 24
                ? isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'
                : averagePayback > 0 && averagePayback <= 36
                ? isDarkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold'
                : isDarkMode ? 'text-slate-400 font-bold' : 'text-slate-500 font-bold'
            }>
              {averagePayback > 0
                ? averagePayback <= 18
                  ? 'Excelente'
                  : averagePayback <= 28
                  ? 'Muito Boa'
                  : averagePayback <= 36
                  ? 'Regular'
                  : 'Longo Prazo'
                : 'Aguardando receita'}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Section: Chart & Comparison */}
      <div className={`p-6 rounded-2xl border space-y-4 transition-all ${
        isDarkMode
          ? 'border-[#242426] bg-[#141416] shadow-sm'
          : 'border-slate-200/90 bg-white shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-black uppercase tracking-tight flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <BarChart3 className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Análise Comparativa: Orçamento Capex vs. Aportado por Projeto</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Acompanhe a curva de execução orçamentária de cada investimento estruturado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAnalysisChart(!showAnalysisChart)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer ${
              isDarkMode
                ? 'text-slate-400 hover:text-white bg-[#1E1E22] hover:bg-[#25252A]'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {showAnalysisChart ? 'Recolher Gráfico' : 'Expandir Gráfico'}
          </button>
        </div>

        {showAnalysisChart && (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#242426' : '#E2E8F0'} />
                <XAxis dataKey="name" stroke={isDarkMode ? '#888' : '#64748B'} tick={{ fontSize: 11 }} />
                <YAxis
                  stroke={isDarkMode ? '#888' : '#64748B'}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value)),
                    name === 'Orcamento' ? 'Orçamento Capex' : name === 'Aportado' ? 'Aportado até Hoje' : 'Receita Mensal Prevista'
                  ]}
                  contentStyle={
                    isDarkMode
                      ? { backgroundColor: '#18181B', borderColor: '#333', color: '#fff', borderRadius: '12px', fontSize: '12px' }
                      : { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
                  }
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => (value === 'Orcamento' ? 'Orçamento Capex' : value === 'Aportado' ? 'Aportado até o Momento' : 'Receita Prevista')}
                />
                <Bar dataKey="Orcamento" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Aportado" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className={`flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl border transition-all ${
        isDarkMode ? 'bg-[#141416] border-[#242426]' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-400'
          }`} />
          <input
            type="text"
            placeholder="Buscar por projeto ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
              isDarkMode
                ? 'bg-[#1C1C20] border-[#28282C] text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter by Stage */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filtrar por Etapa"
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer ${
              isDarkMode
                ? 'bg-[#1C1C20] border-[#28282C] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">Todas as Etapas</option>
            {INVESTMENT_STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Filter by Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filtrar por Tipo de Investimento"
            className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer ${
              isDarkMode
                ? 'bg-[#1C1C20] border-[#28282C] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">Todos os Tipos</option>
            {INVESTMENT_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>

          {(searchTerm !== '' || selectedType !== 'ALL' || selectedStage !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('ALL');
                setSelectedStage('ALL');
              }}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-colors cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Projects Cards Grid */}
      {filteredInvestments.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed space-y-4 ${
          isDarkMode ? 'border-[#28282C] bg-[#141416]' : 'border-slate-300 bg-slate-50/50'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
            isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
          }`}>
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Nenhum projeto encontrado</h4>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Nenhum investimento corresponde aos filtros selecionados. Cadastre seu próximo projeto de expansão.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Investimento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredInvestments.map((inv) => {
            const pct = inv.capexBudget > 0 ? (inv.spentSoFar / inv.capexBudget) * 100 : 0;
            const remaining = Math.max(0, inv.capexBudget - inv.spentSoFar);

            return (
              <div
                key={inv.id}
                className={`p-6 rounded-3xl border hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group ${
                  isDarkMode
                    ? 'border-[#242426] bg-[#141416] shadow-sm'
                    : 'border-slate-200/90 bg-white shadow-xs'
                }`}
              >
                {/* Header & Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                      isDarkMode
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {inv.type}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                      isDarkMode
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {inv.stage}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-base font-black leading-tight group-hover:text-amber-500 transition-colors ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {inv.projectName}
                    </h3>
                    <p className={`text-xs font-medium mt-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Responsável: <strong className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{inv.responsible}</strong>
                    </p>
                  </div>
                </div>

                {/* Capex Execution Progress Bar */}
                <div className={`space-y-1.5 p-3 rounded-xl border ${
                  isDarkMode ? 'bg-[#18181C] border-[#242428]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Progresso do Aporte Capex:</span>
                    <strong className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatPercent(pct)}</strong>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${
                    isDarkMode ? 'bg-[#202024]' : 'bg-slate-200'
                  }`}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className={`flex justify-between items-center text-[10px] pt-0.5 ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    <span>Aportado: {formatCurrency(inv.spentSoFar)}</span>
                    <span>Restante: {formatCurrency(remaining)}</span>
                  </div>
                </div>

                {/* Financial Summary Table Box - Baseado na Planilha de Viabilidade */}
                {(() => {
                  const viab = getProjectViability(inv);
                  return (
                    <div className={`space-y-2 p-4 rounded-2xl border text-xs ${
                      isDarkMode ? 'bg-[#1C1C20] border-[#28282C]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Orçamento Capex:</span>
                        <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(inv.capexBudget)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Faturamento Projetado:</span>
                        <strong className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(viab.monthlyRevenue)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>EBITDA Mensal:</span>
                        <span className={isDarkMode ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>
                          {formatCurrency(viab.ebitdaMonthly)}{' '}
                          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            ({formatPercent(viab.ebitdaMarginPercent)})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>NCG / Inv. Total:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {formatCurrency(viab.ncgMonthly)} / <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatCurrency(viab.totalInvestment)}</strong>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Ponto de Equilíbrio:</span>
                        <strong className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{formatCurrency(viab.breakEvenMonthly)}</strong>
                      </div>
                      <div className={`flex justify-between items-center border-t pt-2 ${
                        isDarkMode ? 'border-[#26262b]' : 'border-slate-200'
                      }`}>
                        <span className={`font-bold flex items-center gap-1 ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <Clock className="w-3 h-3 text-amber-500" />
                          Payback Estimado:
                        </span>
                        <span className={`font-black text-sm ${
                          isDarkMode ? 'text-amber-300' : 'text-amber-600'
                        }`}>
                          {viab.paybackMonths > 0
                            ? `${viab.paybackMonths.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} meses`
                            : 'Aguardando receita'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Strategic Notes if present */}
                {inv.notes && (
                  <p className={`text-[11px] italic px-3 py-2 rounded-xl border line-clamp-2 ${
                    isDarkMode ? 'text-slate-400 bg-[#161618] border-[#222226]' : 'text-slate-600 bg-slate-100/70 border-slate-200'
                  }`}>
                    &ldquo;{inv.notes}&rdquo;
                  </p>
                )}

                {/* Footer and Actions */}
                <div className={`pt-2 border-t space-y-3 ${
                  isDarkMode ? 'border-[#222]' : 'border-slate-200'
                }`}>
                  <div className={`flex items-center justify-between text-[11px] ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>Previsão de Abertura:</span>
                    <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inv.targetLaunch}</strong>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setContributeProject(inv);
                        setContributionAmount('');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-500 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Registrar aporte financeiro neste projeto"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Aportar Capital</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingPlanilhaProject(inv)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#233519] hover:bg-[#2d4420] text-emerald-300 border-[#3b5924]'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                      title="Ver Planilha de Viabilidade Completa"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(inv)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                      }`}
                      title="Editar projeto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(inv.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer"
                      title="Excluir projeto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Cadastrar / Editar Investimento */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div
            onClick={() => setIsFormModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-3xl border rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto ${
                isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${
                isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {editingProject ? 'Editar Projeto de Investimento' : 'Novo Projeto de Expansão & Capex'}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Cálculo de Payback e Receita baseado estritamente na planilha oficial de viabilidade.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-[#25252A] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-5">
                {/* Bloco Fixo no Topo: Identificação Obrigatória do Projeto */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode ? 'bg-[#1B1B1F] border-[#28282E]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold flex items-center gap-1 ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}>
                        <span>Nome do Projeto / Nova Operação</span>
                        <span className="text-amber-500">*</span>
                      </label>
                      {nameError ? (
                        <span className="text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {nameError}
                        </span>
                      ) : (
                        <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Identificador do investimento</span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Expansão Vero Pasta - Nova Loja Sul"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-medium ${
                        nameError
                          ? 'border-red-500 focus:border-red-400'
                          : isDarkMode
                          ? 'bg-[#24242A] border-[#33333C] text-white placeholder-slate-500 focus:border-amber-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Tipo de Investimento</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 cursor-pointer ${
                          isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {INVESTMENT_TYPES.map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Estágio Atual</label>
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 cursor-pointer ${
                          isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {INVESTMENT_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className={`flex items-center gap-2 p-1 rounded-xl border ${
                  isDarkMode ? 'bg-[#131315] border-[#242428]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setFormActiveTab('PLANILHA')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formActiveTab === 'PLANILHA'
                        ? isDarkMode
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                          : 'bg-white text-emerald-800 border border-slate-200 shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-[#1c1c20]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>1. Planilha de Viabilidade (Payback & Receita)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormActiveTab('BASIC')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formActiveTab === 'BASIC'
                        ? isDarkMode
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                          : 'bg-white text-amber-800 border border-slate-200 shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-[#1c1c20]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Briefcase className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>2. Dados Gerais & Cronograma</span>
                  </button>
                </div>

                {/* TAB 1: Planilha de Viabilidade */}
                {formActiveTab === 'PLANILHA' && (
                  <div className="space-y-4">
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      isDarkMode ? 'bg-[#1b2b17] border-[#2e4726] text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <FileSpreadsheet className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <p className="leading-relaxed">
                        <strong>Metodologia da Planilha Oficial:</strong> O Payback em meses é calculado considerando Faturamento, Margem Bruta, CMV (35%), Despesas Fixas, Despesas Variáveis (Taxas Cartão/Pix 4%), e a Necessidade de Capital de Giro (NCG).
                      </p>
                    </div>

                    {/* Bloco 1: Faturamento & Capex */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-[#1B1B1F] border-[#28282E]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center justify-between ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>
                          <span>Faturamento Mensal Projetado (R$)</span>
                          <span className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>* Base da Receita</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          placeholder="Ex: 75000"
                          value={projectedMonthlyRevenue}
                          onChange={(e) => setProjectedMonthlyRevenue(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-bold ${
                            isDarkMode
                              ? 'bg-[#24242A] border-[#33333C] text-white placeholder-slate-500 focus:border-emerald-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center justify-between ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-700'
                        }`}>
                          <span>Capex (Bens de Capital p/ 12 meses)</span>
                          <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>* Base do Payback</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          placeholder="Ex: 280000"
                          value={capexBudget}
                          onChange={(e) => setCapexBudget(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors font-bold ${
                            isDarkMode
                              ? 'bg-[#24242A] border-[#33333C] text-white placeholder-slate-500 focus:border-amber-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Bloco 2: Custos e Despesas Fixas */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-[#1B1B1F] border-[#28282E]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          CMV / Compras de Mercadorias (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="35"
                            value={cmvPercent}
                            onChange={(e) => setCmvPercent(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 pr-8 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <span className={`absolute right-3 top-2.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>%</span>
                        </div>
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Premissa: CMV = Reposição de Estoque (padrão 35%)</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Despesas Fixas Mensais Adicionadas (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="35000"
                          value={fixedExpenses}
                          onChange={(e) => setFixedExpenses(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                            isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Invariável ao volume (padrão R$ 35.000)</p>
                      </div>
                    </div>

                    {/* Bloco 3: Despesas Variáveis */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-[#1B1B1F] border-[#28282E]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider block ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          Despesas Variáveis (% do Faturamento)
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold flex items-center justify-between ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <span>Taxas de Cartão e Pix</span>
                          <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Padrão 4%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={cardFeesPercent}
                            onChange={(e) => setCardFeesPercent(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 pr-8 font-bold ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <span className={`absolute right-3 top-2.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>%</span>
                        </div>
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Incidência sobre as transações de cartão de crédito, débito e Pix.
                        </p>
                      </div>
                    </div>

                    {/* Bloco 4: Prazos e Capital de Giro (NCG) */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-[#1B1B1F] border-[#28282E]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-xs font-bold uppercase tracking-wider block ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Capital de Giro & Prazos Médios (NCG)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Venda a Prazo (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creditSalesPercent}
                            onChange={(e) => setCreditSalesPercent(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Prazo Clientes (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={clientTermDays}
                            onChange={(e) => setClientTermDays(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compra a Prazo (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creditPurchasesPercent}
                            onChange={(e) => setCreditPurchasesPercent(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Prazo Fornecedor (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={supplierTermDays}
                            onChange={(e) => setSupplierTermDays(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estoque (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={stockDays}
                            onChange={(e) => setStockDays(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                              isDarkMode ? 'bg-[#24242A] border-[#33333C] text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resultado Imediato da Planilha */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode ? 'bg-[#141d13] border-[#2d4d24]' : 'bg-emerald-50/70 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                        }`}>
                          Resultado Calculado pela Planilha
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFormPlanilhaTable(!showFormPlanilhaTable)}
                          className={`text-[11px] font-bold underline cursor-pointer ${
                            isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-800'
                          }`}
                        >
                          {showFormPlanilhaTable ? 'Ocultar Planilha Visual' : 'Expandir Tabela Completa'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className={`p-3 rounded-xl border ${
                          isDarkMode ? 'bg-[#1a2818] border-[#315328]' : 'bg-white border-emerald-200 shadow-xs'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>EBITDA Mensal</span>
                          <strong className={`text-sm font-black ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {formatCurrency(formViability.ebitdaMonthly)}
                          </strong>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600 font-semibold'}`}>
                            Margem: {formatPercent(formViability.ebitdaMarginPercent)}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isDarkMode ? 'bg-[#1a2818] border-[#315328]' : 'bg-white border-emerald-200 shadow-xs'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Investimento Total</span>
                          <strong className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatCurrency(formViability.totalInvestment)}
                          </strong>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Capex + NCG ({formatCurrency(formViability.ncgMonthly)})
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isDarkMode ? 'bg-[#1a2818] border-[#315328]' : 'bg-white border-emerald-200 shadow-xs'
                        }`}>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ponto de Equilíbrio</span>
                          <strong className={`text-sm font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                            {formatCurrency(formViability.breakEvenMonthly)}
                          </strong>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Faturamento Mínimo</span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isDarkMode ? 'bg-[#282010] border-[#54411d]' : 'bg-amber-50 border-amber-200 shadow-xs'
                        }`}>
                          <span className={`text-[10px] block font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Payback em Meses</span>
                          <strong className={`text-base font-black ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                            {formViability.paybackMonths > 0
                              ? `${formViability.paybackMonths.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
                              : '0 m'}
                          </strong>
                          <span className={`text-[10px] block ${isDarkMode ? 'text-amber-400/80' : 'text-amber-700/80 font-medium'}`}>
                            {formViability.paybackMonths > 0
                              ? `~ ${(formViability.paybackMonths / 12).toFixed(1)} anos`
                              : 'Sem retorno'}
                          </span>
                        </div>
                      </div>

                      {showFormPlanilhaTable && (
                        <div className={`pt-2 border-t ${isDarkMode ? 'border-[#2e4726]' : 'border-emerald-200'}`}>
                          <ViabilityPlanilhaView viability={formViability} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Dados Gerais & Cronograma */}
                {formActiveTab === 'BASIC' && (
                  <div className="space-y-4">
                    {/* Aportado até o Momento e ROI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Aportado até o Momento (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Ex: 50000"
                          value={spentSoFar}
                          onChange={(e) => setSpentSoFar(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                            isDarkMode
                              ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>ROI Estimado Anualizado</label>
                        <input
                          type="text"
                          placeholder="Ex: 35% a.a."
                          value={projectedRoi}
                          onChange={(e) => setProjectedRoi(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                            isDarkMode
                              ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Previsão de Abertura e Responsável */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Previsão de Abertura / Entrega</label>
                        <input
                          type="text"
                          placeholder="Ex: Dezembro / 2026"
                          value={targetLaunch}
                          onChange={(e) => setTargetLaunch(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                            isDarkMode
                              ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Responsável / Diretoria</label>
                        <input
                          type="text"
                          placeholder="Ex: Diretoria de Expansão"
                          value={responsible}
                          onChange={(e) => setResponsible(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                            isDarkMode
                              ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Observações Estratégicas */}
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Observações Estratégicas</label>
                      <textarea
                        rows={2}
                        placeholder="Pontos de atenção, localização, parceiros envolvidos ou cronograma da obra..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`w-full px-4 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none ${
                          isDarkMode
                            ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className={`flex items-center justify-between gap-3 pt-3 border-t ${
                  isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
                }`}>
                  <div className="text-[11px]">
                    {formActiveTab === 'PLANILHA' ? (
                      <button
                        type="button"
                        onClick={() => setFormActiveTab('BASIC')}
                        className={`font-bold underline cursor-pointer ${
                          isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                        }`}
                      >
                        Próximo: Dados Gerais &rarr;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFormActiveTab('PLANILHA')}
                        className={`font-bold underline cursor-pointer ${
                          isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        &larr; Voltar à Planilha de Viabilidade
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      {editingProject ? 'Salvar Alterações' : 'Cadastrar Investimento'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Aporte de Capital Rápido */}
      <AnimatePresence>
        {contributeProject && (
          <div
            onClick={() => setContributeProject(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 ${
                isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black uppercase tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Registrar Aporte de Capital
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {contributeProject.projectName}
                  </p>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                isDarkMode ? 'bg-[#1F1F24] border-[#2B2B30]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Orçamento Capex Total:</span>
                  <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{formatCurrency(contributeProject.capexBudget)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Já aportado:</span>
                  <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{formatCurrency(contributeProject.spentSoFar)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Saldo Restante:</span>
                  <strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>
                    {formatCurrency(Math.max(0, contributeProject.capexBudget - contributeProject.spentSoFar))}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleSaveContribution} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Valor do Novo Aporte (R$) <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    autoFocus
                    placeholder="Ex: 25000"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-emerald-500 transition-colors ${
                      isDarkMode
                        ? 'bg-[#202024] border-[#2C2C32] text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setContributeProject(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Confirmar Aporte
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Visualizar Planilha Completa do Projeto */}
      <AnimatePresence>
        {viewingPlanilhaProject && (
          <div
            onClick={() => setViewingPlanilhaProject(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-4xl border rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[90vh] overflow-y-auto ${
                isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${
                isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}>
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {viewingPlanilhaProject.projectName}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isDarkMode
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {viewingPlanilhaProject.type}
                      </span>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Demonstrativo de Viabilidade Econômica, Capital de Giro e Payback Oficial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPlanilhaProject(null)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-[#25252A] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabela da Planilha */}
              <ViabilityPlanilhaView viability={getProjectViability(viewingPlanilhaProject)} />

              <div className={`flex items-center justify-between pt-3 border-t ${
                isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
              }`}>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Responsável: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{viewingPlanilhaProject.responsible}</strong>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const proj = viewingPlanilhaProject;
                      setViewingPlanilhaProject(null);
                      handleOpenEdit(proj);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isDarkMode
                        ? 'bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300'
                        : 'bg-amber-100 hover:bg-amber-500 hover:text-slate-950 text-amber-900'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Parâmetros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingPlanilhaProject(null)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#24242A] hover:bg-[#303038] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Simulador Interativo Standalone da Planilha */}
      <AnimatePresence>
        {isSimulatorOpen && (
          <div
            onClick={() => setIsSimulatorOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-5xl border rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto ${
                isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${
                isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}>
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      <span>Simulador Interativo de Viabilidade Econômica</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        isDarkMode
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        Modelo Oficial
                      </span>
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ajuste faturamento, CMV, despesas e prazos para simular instantaneamente o Payback e o Ponto de Equilíbrio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-[#25252A] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid 2 Colunas: Parâmetros na esquerda, Tabela na direita */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Inputs de Simulação */}
                <div className="lg:col-span-4 space-y-4">
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? 'bg-[#1A1A1E] border-[#2A2A32]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500 block">
                      Parâmetros da Simulação
                    </span>

                    <div className="space-y-1">
                      <label className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Faturamento Mensal (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={simRevenue}
                        onChange={(e) => setSimRevenue(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-emerald-500 font-bold ${
                          isDarkMode
                            ? 'bg-[#24242A] border-[#33333C] text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Capex Total 12m (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={simCapex}
                        onChange={(e) => setSimCapex(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-amber-500 font-bold ${
                          isDarkMode
                            ? 'bg-[#24242A] border-[#33333C] text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>CMV / Compras (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={simCmv}
                          onChange={(e) => setSimCmv(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                            isDarkMode
                              ? 'bg-[#24242A] border-[#33333C] text-white'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Despesas Fixas (R$)</label>
                        <input
                          type="number"
                          min="0"
                          value={simFixed}
                          onChange={(e) => setSimFixed(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                            isDarkMode
                              ? 'bg-[#24242A] border-[#33333C] text-white'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div className={`pt-2 border-t space-y-2 ${isDarkMode ? 'border-[#26262c]' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          Despesas Variáveis (% Faturamento)
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <label className={`text-[10px] font-semibold flex items-center justify-between ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <span>Taxas Cartão e Pix (%)</span>
                          <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Padrão 4%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={simCard}
                            onChange={(e) => setSimCard(e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs pr-6 font-bold ${
                              isDarkMode
                                ? 'bg-[#24242A] border-[#33333C] text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <span className={`absolute right-2 top-1.5 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>%</span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-2 border-t space-y-2 ${isDarkMode ? 'border-[#26262c]' : 'border-slate-200'}`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Prazos Médios (Dias)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Clientes</label>
                          <input
                            type="number"
                            value={simClientDays}
                            onChange={(e) => setSimClientDays(e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? 'bg-[#24242A] border-[#33333C] text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fornecedor</label>
                          <input
                            type="number"
                            value={simSupplierDays}
                            onChange={(e) => setSimSupplierDays(e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? 'bg-[#24242A] border-[#33333C] text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estoque</label>
                          <input
                            type="number"
                            value={simStockDays}
                            onChange={(e) => setSimStockDays(e.target.value)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                              isDarkMode
                                ? 'bg-[#24242A] border-[#33333C] text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Resultado da Simulação */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-[#141e12] border-[#2d4d24]' : 'bg-emerald-50/70 border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>EBITDA Mensal:</span>
                      <strong className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {formatCurrency(simViability.ebitdaMonthly)} ({formatPercent(simViability.ebitdaMarginPercent)})
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Ponto de Equilíbrio:</span>
                      <strong className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{formatCurrency(simViability.breakEvenMonthly)}</strong>
                    </div>
                    <div className={`flex justify-between items-center text-xs border-t pt-2 ${
                      isDarkMode ? 'border-[#2d4d24]' : 'border-emerald-200'
                    }`}>
                      <span className={`font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>Payback Estimado:</span>
                      <strong className={`text-sm font-black ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        {simViability.paybackMonths.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} meses
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tabela Visual da Planilha */}
                <div className="lg:col-span-8 space-y-3">
                  <ViabilityPlanilhaView viability={simViability} />
                </div>
              </div>

              {/* Ações do Simulador */}
              <div className={`flex items-center justify-between pt-3 border-t ${
                isDarkMode ? 'border-[#26262B]' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setSimRevenue('75000');
                    setSimCapex('280000');
                    setSimCmv('35');
                    setSimFixed('35000');
                    setSimMkt('0');
                    setSimRoy('0');
                    setSimCard('4');
                    setSimCreditSales('65');
                    setSimClientDays('2');
                    setSimCreditPurchases('100');
                    setSimSupplierDays('15');
                    setSimStockDays('15');
                  }}
                  className={`text-xs underline cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Restaurar Valores Padrão da Planilha
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-[#24242A] hover:bg-[#303038] text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleApplySimulatorToCreate}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Aplicar no Cadastro de Novo Investimento</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirmId && (
          <div
            onClick={() => setDeleteConfirmId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 ${
                isDarkMode ? 'bg-[#17171A] border-[#2B2B30] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Excluir Investimento</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Tem certeza que deseja remover este projeto do pipeline executivo?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(deleteConfirmId)}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
