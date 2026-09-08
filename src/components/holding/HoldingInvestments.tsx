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
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-amber-400" />
            <span>Pipeline de Expansão & Novos Negócios</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Planejamento de Capex, controle de aportes e modelo de viabilidade e payback da planilha oficial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="px-4 py-3 rounded-xl bg-[#233519] hover:bg-[#2d4420] text-emerald-300 border border-[#3b5924] font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
            title="Abrir Simulador Interativo baseado na Planilha de Viabilidade"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
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
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Orçamento Capex Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalCapexBudget)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-semibold">
              <span>{investments.length} projetos em pipeline</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Investimento Planejado</span>
            <strong className="text-amber-400">Expansão AZ</strong>
          </div>
        </div>

        {/* Card 2: Total Aportado / Executado */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Aportado até Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalSpentSoFar)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-2 bg-[#202024] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, executionPercentage)}%` }}
                />
              </div>
              <span className="text-xs text-emerald-400 font-bold shrink-0">
                {formatPercent(executionPercentage)}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Saldo a Desembolsar:</span>
            <strong className="text-slate-300">
              {formatCurrency(Math.max(0, totalCapexBudget - totalSpentSoFar))}
            </strong>
          </div>
        </div>

        {/* Card 3: Receita Mensal Projetada */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Receita Nova Projetada
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight">
              {formatCurrency(totalProjectedRevenue)}
              <span className="text-sm font-semibold text-slate-400">/mês</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Incremento pós-inauguração</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Anualizado Adicional:</span>
            <strong className="text-blue-300">{formatCurrency(totalProjectedRevenue * 12)}</strong>
          </div>
        </div>

        {/* Card 4: Payback Médio Estimado (Calculado com base na receita projetada) */}
        <div className="p-5 rounded-2xl border border-[#242426] bg-[#141416] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Payback Médio Estimado
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300 tracking-tight">
              {averagePayback > 0 ? averagePayback : 0}{' '}
              <span className="text-base font-bold text-slate-400">meses</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
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
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Viabilidade média:</span>
            <span className={
              averagePayback > 0 && averagePayback <= 24
                ? 'text-emerald-400 font-bold'
                : averagePayback > 0 && averagePayback <= 36
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 font-bold'
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
      <div className="p-6 rounded-2xl border border-[#242426] bg-[#141416] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Análise Comparativa: Orçamento Capex vs. Aportado por Projeto</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhe a curva de execução orçamentária de cada investimento estruturado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAnalysisChart(!showAnalysisChart)}
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#1E1E22] hover:bg-[#25252A] transition-colors self-start sm:self-auto cursor-pointer"
          >
            {showAnalysisChart ? 'Recolher Gráfico' : 'Expandir Gráfico'}
          </button>
        </div>

        {showAnalysisChart && (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242426" />
                <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#888"
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value)),
                    name === 'Orcamento' ? 'Orçamento Capex' : name === 'Aportado' ? 'Aportado até Hoje' : 'Receita Mensal Prevista'
                  ]}
                  contentStyle={{ backgroundColor: '#18181B', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }}
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
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-[#141416] border border-[#242426]">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por projeto ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1C1C20] border border-[#28282C] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter by Stage */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filtrar por Etapa"
            className="px-3 py-2 rounded-xl bg-[#1C1C20] border border-[#28282C] text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-[#1C1C20] border border-[#28282C] text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
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
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Projects Cards Grid */}
      {filteredInvestments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-[#28282C] bg-[#141416] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Nenhum projeto encontrado</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
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
                className="p-6 rounded-3xl border border-[#242426] bg-[#141416] hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm space-y-4 group"
              >
                {/* Header & Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
                      {inv.type}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                      {inv.stage}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white leading-tight group-hover:text-amber-400 transition-colors">
                      {inv.projectName}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Responsável: <strong className="text-slate-300">{inv.responsible}</strong>
                    </p>
                  </div>
                </div>

                {/* Capex Execution Progress Bar */}
                <div className="space-y-1.5 p-3 rounded-xl bg-[#18181C] border border-[#242428]">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Progresso do Aporte Capex:</span>
                    <strong className="text-emerald-400 font-bold">{formatPercent(pct)}</strong>
                  </div>
                  <div className="h-2 w-full bg-[#202024] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                    <span>Aportado: {formatCurrency(inv.spentSoFar)}</span>
                    <span>Restante: {formatCurrency(remaining)}</span>
                  </div>
                </div>

                {/* Financial Summary Table Box - Baseado na Planilha de Viabilidade */}
                {(() => {
                  const viab = getProjectViability(inv);
                  return (
                    <div className="space-y-2 p-4 rounded-2xl bg-[#1C1C20] border border-[#28282C] text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Orçamento Capex:</span>
                        <strong className="text-white font-bold">{formatCurrency(inv.capexBudget)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Faturamento Projetado:</span>
                        <strong className="text-emerald-400 font-bold">{formatCurrency(viab.monthlyRevenue)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">EBITDA Mensal:</span>
                        <span className="text-slate-200 font-semibold">
                          {formatCurrency(viab.ebitdaMonthly)}{' '}
                          <span className="text-[10px] text-emerald-400 font-bold">
                            ({formatPercent(viab.ebitdaMarginPercent)})
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">NCG / Inv. Total:</span>
                        <span className="text-slate-300 font-medium">
                          {formatCurrency(viab.ncgMonthly)} / <strong className="text-white">{formatCurrency(viab.totalInvestment)}</strong>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Ponto de Equilíbrio:</span>
                        <strong className="text-blue-300 font-semibold">{formatCurrency(viab.breakEvenMonthly)}</strong>
                      </div>
                      <div className="flex justify-between items-center border-t border-[#26262b] pt-2">
                        <span className="text-slate-300 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Payback Estimado:
                        </span>
                        <span className="text-amber-300 font-black text-sm">
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
                  <p className="text-[11px] text-slate-400 italic bg-[#161618] px-3 py-2 rounded-xl border border-[#222226] line-clamp-2">
                    &ldquo;{inv.notes}&rdquo;
                  </p>
                )}

                {/* Footer and Actions */}
                <div className="pt-2 border-t border-[#222] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Previsão de Abertura:</span>
                    <strong className="text-white font-bold">{inv.targetLaunch}</strong>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setContributeProject(inv);
                        setContributionAmount('');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Registrar aporte financeiro neste projeto"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Aportar Capital</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingPlanilhaProject(inv)}
                      className="p-2 rounded-xl bg-[#233519] hover:bg-[#2d4420] text-emerald-300 border border-[#3b5924] transition-all cursor-pointer"
                      title="Ver Planilha de Viabilidade Completa"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(inv)}
                      className="p-2 rounded-xl bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Editar projeto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(inv.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-3xl bg-[#17171A] border border-[#2B2B30] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-white my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#26262B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      {editingProject ? 'Editar Projeto de Investimento' : 'Novo Projeto de Expansão & Capex'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo de Payback e Receita baseado estritamente na planilha oficial de viabilidade.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-[#25252A] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-5">
                {/* Bloco Fixo no Topo: Identificação Obrigatória do Projeto */}
                <div className="p-4 rounded-2xl bg-[#1B1B1F] border border-[#28282E] space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <span>Nome do Projeto / Nova Operação</span>
                        <span className="text-amber-400">*</span>
                      </label>
                      {nameError ? (
                        <span className="text-xs font-bold text-red-400 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {nameError}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Identificador do investimento</span>
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
                      className={`w-full px-4 py-2.5 rounded-xl bg-[#24242A] border text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-medium ${
                        nameError ? 'border-red-500 focus:border-red-400' : 'border-[#33333C] focus:border-amber-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Tipo de Investimento</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {INVESTMENT_TYPES.map((tp) => (
                          <option key={tp} value={tp}>
                            {tp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Estágio Atual</label>
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
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
                <div className="flex items-center gap-2 p-1 rounded-xl bg-[#131315] border border-[#242428]">
                  <button
                    type="button"
                    onClick={() => setFormActiveTab('PLANILHA')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formActiveTab === 'PLANILHA'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#1c1c20]'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>1. Planilha de Viabilidade (Payback & Receita)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormActiveTab('BASIC')}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      formActiveTab === 'BASIC'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#1c1c20]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span>2. Dados Gerais & Cronograma</span>
                  </button>
                </div>

                {/* TAB 1: Planilha de Viabilidade */}
                {formActiveTab === 'PLANILHA' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-[#1b2b17] border border-[#2e4726] text-xs text-emerald-200 flex items-start gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Metodologia da Planilha Oficial:</strong> O Payback em meses é calculado considerando Faturamento, Margem Bruta, CMV (35%), Despesas Fixas, Despesas Variáveis (Taxas Cartão/Pix 4%), e a Necessidade de Capital de Giro (NCG).
                      </p>
                    </div>

                    {/* Bloco 1: Faturamento & Capex */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#1B1B1F] border border-[#28282E]">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Faturamento Mensal Projetado (R$)</span>
                          <span className="text-emerald-400 font-bold">* Base da Receita</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          placeholder="Ex: 75000"
                          value={projectedMonthlyRevenue}
                          onChange={(e) => setProjectedMonthlyRevenue(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>Capex (Bens de Capital p/ 12 meses)</span>
                          <span className="text-amber-400 font-bold">* Base do Payback</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          placeholder="Ex: 280000"
                          value={capexBudget}
                          onChange={(e) => setCapexBudget(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-bold"
                        />
                      </div>
                    </div>

                    {/* Bloco 2: Custos e Despesas Fixas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#1B1B1F] border border-[#28282E]">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
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
                            className="w-full px-4 py-2.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500 pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Premissa: CMV = Reposição de Estoque (padrão 35%)</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Despesas Fixas Mensais Adicionadas (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="35000"
                          value={fixedExpenses}
                          onChange={(e) => setFixedExpenses(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <p className="text-[10px] text-slate-400">Invariável ao volume (padrão R$ 35.000)</p>
                      </div>
                    </div>

                    {/* Bloco 3: Despesas Variáveis */}
                    <div className="p-4 rounded-2xl bg-[#1B1B1F] border border-[#28282E] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Despesas Variáveis (% do Faturamento)
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                          <span>Taxas de Cartão e Pix</span>
                          <span className="text-amber-400 font-bold">Padrão 4%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={cardFeesPercent}
                            onChange={(e) => setCardFeesPercent(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500 pr-8 font-bold"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Incidência sobre as transações de cartão de crédito, débito e Pix.
                        </p>
                      </div>
                    </div>

                    {/* Bloco 4: Prazos e Capital de Giro (NCG) */}
                    <div className="p-4 rounded-2xl bg-[#1B1B1F] border border-[#28282E] space-y-3">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Capital de Giro & Prazos Médios (NCG)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Venda a Prazo (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creditSalesPercent}
                            onChange={(e) => setCreditSalesPercent(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Prazo Clientes (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={clientTermDays}
                            onChange={(e) => setClientTermDays(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Compra a Prazo (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={creditPurchasesPercent}
                            onChange={(e) => setCreditPurchasesPercent(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Prazo Fornecedor (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={supplierTermDays}
                            onChange={(e) => setSupplierTermDays(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Estoque (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={stockDays}
                            onChange={(e) => setStockDays(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resultado Imediato da Planilha */}
                    <div className="p-4 rounded-2xl bg-[#141d13] border border-[#2d4d24] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Resultado Calculado pela Planilha
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFormPlanilhaTable(!showFormPlanilhaTable)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                        >
                          {showFormPlanilhaTable ? 'Ocultar Planilha Visual' : 'Expandir Tabela Completa'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#1a2818] border border-[#315328]">
                          <span className="text-[10px] text-slate-400 block">EBITDA Mensal</span>
                          <strong className="text-emerald-300 text-sm font-black">
                            {formatCurrency(formViability.ebitdaMonthly)}
                          </strong>
                          <span className="text-[10px] text-emerald-400 block">
                            Margem: {formatPercent(formViability.ebitdaMarginPercent)}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#1a2818] border border-[#315328]">
                          <span className="text-[10px] text-slate-400 block">Investimento Total</span>
                          <strong className="text-white text-sm font-black">
                            {formatCurrency(formViability.totalInvestment)}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            Capex + NCG ({formatCurrency(formViability.ncgMonthly)})
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#1a2818] border border-[#315328]">
                          <span className="text-[10px] text-slate-400 block">Ponto de Equilíbrio</span>
                          <strong className="text-blue-300 text-sm font-black">
                            {formatCurrency(formViability.breakEvenMonthly)}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">Faturamento Mínimo</span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#282010] border border-[#54411d]">
                          <span className="text-[10px] text-amber-400 block font-bold">Payback em Meses</span>
                          <strong className="text-amber-300 text-base font-black">
                            {formViability.paybackMonths > 0
                              ? `${formViability.paybackMonths.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
                              : '0 m'}
                          </strong>
                          <span className="text-[10px] text-amber-400/80 block">
                            {formViability.paybackMonths > 0
                              ? `~ ${(formViability.paybackMonths / 12).toFixed(1)} anos`
                              : 'Sem retorno'}
                          </span>
                        </div>
                      </div>

                      {showFormPlanilhaTable && (
                        <div className="pt-2 border-t border-[#2e4726]">
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
                        <label className="text-xs font-bold text-slate-300">Aportado até o Momento (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Ex: 50000"
                          value={spentSoFar}
                          onChange={(e) => setSpentSoFar(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">ROI Estimado Anualizado</label>
                        <input
                          type="text"
                          placeholder="Ex: 35% a.a."
                          value={projectedRoi}
                          onChange={(e) => setProjectedRoi(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Previsão de Abertura e Responsável */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Previsão de Abertura / Entrega</label>
                        <input
                          type="text"
                          placeholder="Ex: Dezembro / 2026"
                          value={targetLaunch}
                          onChange={(e) => setTargetLaunch(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Responsável / Diretoria</label>
                        <input
                          type="text"
                          placeholder="Ex: Diretoria de Expansão"
                          value={responsible}
                          onChange={(e) => setResponsible(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Observações Estratégicas */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Observações Estratégicas</label>
                      <textarea
                        rows={2}
                        placeholder="Pontos de atenção, localização, parceiros envolvidos ou cronograma da obra..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#26262B]">
                  <div className="text-[11px] text-slate-400">
                    {formActiveTab === 'PLANILHA' ? (
                      <button
                        type="button"
                        onClick={() => setFormActiveTab('BASIC')}
                        className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                      >
                        Próximo: Dados Gerais &rarr;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFormActiveTab('PLANILHA')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                      >
                        &larr; Voltar à Planilha de Viabilidade
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-[#17171A] border border-[#2B2B30] rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Registrar Aporte de Capital
                  </h3>
                  <p className="text-xs text-slate-400">
                    {contributeProject.projectName}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1F1F24] border border-[#2B2B30] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Orçamento Capex Total:</span>
                  <strong className="text-white">{formatCurrency(contributeProject.capexBudget)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Já aportado:</span>
                  <strong className="text-emerald-400">{formatCurrency(contributeProject.spentSoFar)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Saldo Restante:</span>
                  <strong className="text-amber-400">
                    {formatCurrency(Math.max(0, contributeProject.capexBudget - contributeProject.spentSoFar))}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleSaveContribution} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Valor do Novo Aporte (R$) <span className="text-amber-400">*</span>
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
                    className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setContributeProject(null)}
                    className="px-4 py-2 rounded-xl bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-4xl bg-[#17171A] border border-[#2B2B30] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-white my-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#26262B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        {viewingPlanilhaProject.projectName}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {viewingPlanilhaProject.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Demonstrativo de Viabilidade Econômica, Capital de Giro e Payback Oficial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPlanilhaProject(null)}
                  className="p-2 rounded-xl hover:bg-[#25252A] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabela da Planilha */}
              <ViabilityPlanilhaView viability={getProjectViability(viewingPlanilhaProject)} />

              <div className="flex items-center justify-between pt-3 border-t border-[#26262B]">
                <div className="text-xs text-slate-400">
                  Responsável: <strong className="text-slate-200">{viewingPlanilhaProject.responsible}</strong>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const proj = viewingPlanilhaProject;
                      setViewingPlanilhaProject(null);
                      handleOpenEdit(proj);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Parâmetros</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingPlanilhaProject(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#24242A] hover:bg-[#303038] text-white text-xs font-bold transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-5xl bg-[#17171A] border border-[#2B2B30] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-white my-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#26262B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <span>Simulador Interativo de Viabilidade Econômica</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        Modelo Oficial
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ajuste faturamento, CMV, despesas e prazos para simular instantaneamente o Payback e o Ponto de Equilíbrio.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-2 rounded-xl hover:bg-[#25252A] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid 2 Colunas: Parâmetros na esquerda, Tabela na direita */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Inputs de Simulação */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-[#1A1A1E] border border-[#2A2A32] space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                      Parâmetros da Simulação
                    </span>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Faturamento Mensal (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={simRevenue}
                        onChange={(e) => setSimRevenue(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Capex Total 12m (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={simCapex}
                        onChange={(e) => setSimCapex(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">CMV / Compras (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={simCmv}
                          onChange={(e) => setSimCmv(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Despesas Fixas (R$)</label>
                        <input
                          type="number"
                          min="0"
                          value={simFixed}
                          onChange={(e) => setSimFixed(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#24242A] border border-[#33333C] text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#26262c] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Despesas Variáveis (% Faturamento)
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-slate-300 font-semibold flex items-center justify-between">
                          <span>Taxas Cartão e Pix (%)</span>
                          <span className="text-amber-400 font-bold">Padrão 4%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={simCard}
                            onChange={(e) => setSimCard(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#24242A] border border-[#33333C] text-xs text-white pr-6 font-bold"
                          />
                          <span className="absolute right-2 top-1.5 text-[11px] text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#26262c] space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Prazos Médios (Dias)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-400">Clientes</label>
                          <input
                            type="number"
                            value={simClientDays}
                            onChange={(e) => setSimClientDays(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#24242A] border border-[#33333C] text-xs text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-400">Fornecedor</label>
                          <input
                            type="number"
                            value={simSupplierDays}
                            onChange={(e) => setSimSupplierDays(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#24242A] border border-[#33333C] text-xs text-white"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-slate-400">Estoque</label>
                          <input
                            type="number"
                            value={simStockDays}
                            onChange={(e) => setSimStockDays(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#24242A] border border-[#33333C] text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Resultado da Simulação */}
                  <div className="p-4 rounded-2xl bg-[#141e12] border border-[#2d4d24] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">EBITDA Mensal:</span>
                      <strong className="text-emerald-400 font-bold">
                        {formatCurrency(simViability.ebitdaMonthly)} ({formatPercent(simViability.ebitdaMarginPercent)})
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Ponto de Equilíbrio:</span>
                      <strong className="text-blue-300 font-bold">{formatCurrency(simViability.breakEvenMonthly)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-[#2d4d24] pt-2">
                      <span className="text-amber-400 font-bold">Payback Estimado:</span>
                      <strong className="text-amber-300 text-sm font-black">
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
              <div className="flex items-center justify-between pt-3 border-t border-[#26262B]">
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
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Restaurar Valores Padrão da Planilha
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#24242A] hover:bg-[#303038] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-sm bg-[#17171A] border border-[#2B2B30] rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Excluir Investimento</h3>
                  <p className="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Tem certeza que deseja remover este projeto do pipeline executivo?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl bg-[#222226] hover:bg-[#2A2A30] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
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
