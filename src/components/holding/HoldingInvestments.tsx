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
  X
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
import { InvestmentProject } from '../../types/holding';
import { HoldingStorage } from '../../services/holdingStorage';

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
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [showAnalysisChart, setShowAnalysisChart] = useState(true);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<InvestmentProject | null>(null);

  // Quick Contribution Modal State
  const [contributeProject, setContributeProject] = useState<InvestmentProject | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [projectName, setProjectName] = useState('');
  const [type, setType] = useState(INVESTMENT_TYPES[0]);
  const [stage, setStage] = useState(INVESTMENT_STAGES[0]);
  const [capexBudget, setCapexBudget] = useState('');
  const [spentSoFar, setSpentSoFar] = useState('');
  const [projectedMonthlyRevenue, setProjectedMonthlyRevenue] = useState('');
  const [expectedPaybackMonths, setExpectedPaybackMonths] = useState('');
  const [projectedRoi, setProjectedRoi] = useState('35% a.a.');
  const [targetLaunch, setTargetLaunch] = useState('');
  const [responsible, setResponsible] = useState('Diretoria de Expansão');
  const [notes, setNotes] = useState('');

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingProject(null);
    setProjectName('');
    setType(INVESTMENT_TYPES[0]);
    setStage(INVESTMENT_STAGES[0]);
    setCapexBudget('');
    setSpentSoFar('0');
    setProjectedMonthlyRevenue('');
    setExpectedPaybackMonths('18');
    setProjectedRoi('35% a.a.');
    setTargetLaunch('');
    setResponsible('Diretoria de Expansão');
    setNotes('');
    setIsFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (inv: InvestmentProject) => {
    setEditingProject(inv);
    setProjectName(inv.projectName);
    setType(inv.type);
    setStage(inv.stage);
    setCapexBudget(inv.capexBudget.toString());
    setSpentSoFar(inv.spentSoFar.toString());
    setProjectedMonthlyRevenue(inv.projectedMonthlyRevenue.toString());
    setExpectedPaybackMonths(inv.expectedPaybackMonths.toString());
    setProjectedRoi(inv.projectedRoi);
    setTargetLaunch(inv.targetLaunch);
    setResponsible(inv.responsible);
    setNotes(inv.notes || '');
    setIsFormModalOpen(true);
  };

  // Save Project (Create / Update)
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const parsedCapex = parseFloat(capexBudget.replace(/[^0-9.]/g, '')) || 0;
    const parsedSpent = parseFloat(spentSoFar.replace(/[^0-9.]/g, '')) || 0;
    const parsedRevenue = parseFloat(projectedMonthlyRevenue.replace(/[^0-9.]/g, '')) || 0;
    const parsedPayback = parseInt(expectedPaybackMonths.replace(/[^0-9]/g, ''), 10) || 12;

    if (editingProject) {
      HoldingStorage.updateInvestment(editingProject.id, {
        projectName: projectName.trim(),
        type,
        stage,
        capexBudget: parsedCapex,
        spentSoFar: parsedSpent,
        projectedMonthlyRevenue: parsedRevenue,
        expectedPaybackMonths: parsedPayback,
        projectedRoi: projectedRoi.trim() || '30% a.a.',
        targetLaunch: targetLaunch.trim() || 'Em definição',
        responsible: responsible.trim() || 'Diretoria de Expansão',
        notes: notes.trim()
      });
    } else {
      HoldingStorage.addInvestment({
        projectName: projectName.trim(),
        type,
        stage,
        capexBudget: parsedCapex,
        spentSoFar: parsedSpent,
        projectedMonthlyRevenue: parsedRevenue,
        expectedPaybackMonths: parsedPayback,
        projectedRoi: projectedRoi.trim() || '30% a.a.',
        targetLaunch: targetLaunch.trim() || 'Em definição',
        responsible: responsible.trim() || 'Diretoria de Expansão',
        notes: notes.trim()
      });
    }

    setIsFormModalOpen(false);
    onUpdate();
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
  const averagePayback =
    investments.length > 0
      ? Math.round(investments.reduce((acc, inv) => acc + inv.expectedPaybackMonths, 0) / investments.length)
      : 0;

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
      {/* Header with Title and Single Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-amber-400" />
            <span>Pipeline de Expansão & Novos Negócios</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Planejamento de Capex, controle de aportes em obras e projeções de retorno para expansão do Grupo AZ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar Novo Investimento</span>
        </button>
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

        {/* Card 4: Payback Médio Ponderado */}
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
              {averagePayback}{' '}
              <span className="text-base font-bold text-slate-400">meses</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-300 font-semibold">
              <span>Retorno acelerado de capital</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-[#202022] pt-2 flex items-center justify-between">
            <span>Viabilidade média:</span>
            <span className="text-emerald-400 font-bold">Excelente</span>
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

                {/* Financial Summary Table Box */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#1C1C20] border border-[#28282C] text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Orçamento Capex:</span>
                    <strong className="text-white font-bold">{formatCurrency(inv.capexBudget)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Aportado até o momento:</span>
                    <strong className="text-amber-400 font-bold">{formatCurrency(inv.spentSoFar)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Receita Mensal Projetada:</span>
                    <strong className="text-emerald-400 font-black">{formatCurrency(inv.projectedMonthlyRevenue)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payback Estimado:</span>
                    <span className="text-slate-200 font-semibold">{inv.expectedPaybackMonths} meses</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">ROI Projetado:</span>
                    <strong className="text-amber-300 font-bold">{inv.projectedRoi}</strong>
                  </div>
                </div>

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-2xl bg-[#17171A] border border-[#2B2B30] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white my-8"
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
                      Cadastre os parâmetros financeiros, orçamentários e retorno esperado.
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

              <form onSubmit={handleSaveProject} className="space-y-4">
                {/* Nome do Projeto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nome do Projeto / Nova Operação <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Expansão Vero Pasta - Loja 02 (Sul)"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Tipo e Estágio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Tipo de Investimento</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {INVESTMENT_TYPES.map((tp) => (
                        <option key={tp} value={tp}>
                          {tp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Etapa Atual</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {INVESTMENT_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Orçamento Capex e Aportado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Orçamento Capex Total (R$) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="Ex: 350000"
                      value={capexBudget}
                      onChange={(e) => setCapexBudget(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

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
                </div>

                {/* Receita Projetada e Payback */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Receita Mensal Projetada (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Ex: 140000"
                      value={projectedMonthlyRevenue}
                      onChange={(e) => setProjectedMonthlyRevenue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Payback Estimado (meses)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 16"
                      value={expectedPaybackMonths}
                      onChange={(e) => setExpectedPaybackMonths(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#2C2C32] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">ROI Estimado</label>
                    <input
                      type="text"
                      placeholder="Ex: 38% a.a."
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

                {/* Notas / Observações */}
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

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#26262B]">
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

      {/* MODAL: Confirmação de Exclusão */}
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
