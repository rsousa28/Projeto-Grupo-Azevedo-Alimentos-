import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  DollarSign,
  PieChart,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Search,
  ExternalLink,
  Layers,
  Store,
  FileSpreadsheet,
  Receipt,
  Users,
  Building,
  Wrench,
  ShoppingBag,
  Briefcase,
  HelpCircle,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DREData } from "../types";

interface MonthDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthValue: string; // e.g. "01", "07"
  monthLabel: string; // e.g. "Janeiro", "Julho"
  year: string; // e.g. "2025"
  data?: DREData | null;
  storeName: string;
  isDarkMode: boolean;
  isBebelu: boolean;
  isBebeluRioMar: boolean;
  onSelectMonth: (monthValue: string, monthLabel: string) => void;
  onOpenVerticalDRE?: (monthValue: string, year: string) => void;
}

const monthsList = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

export default function MonthDetailModal({
  isOpen,
  onClose,
  monthValue,
  monthLabel,
  year,
  data,
  storeName,
  isDarkMode,
  isBebelu,
  isBebeluRioMar,
  onSelectMonth,
  onOpenVerticalDRE,
}: MonthDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyWithValue, setOnlyWithValue] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "receita",
    "deducoes",
    "cmv",
    "despesas_variaveis",
    "colaboradores",
    "funcionamento",
    "ebitda",
  ]);

  // Month navigation
  const currentIndex = monthsList.findIndex((m) => m.value === monthValue);
  const prevMonth = currentIndex > 0 ? monthsList[currentIndex - 1] : null;
  const nextMonth = currentIndex < monthsList.length - 1 ? monthsList[currentIndex + 1] : null;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedSections([
      "receita",
      "deducoes",
      "cmv",
      "despesas_variaveis",
      "colaboradores",
      "funcionamento",
      "manutencao",
      "comerciais",
      "administrativas",
      "financeiro",
      "nao_operacionais",
      "ebitda",
    ]);
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  // Safe data extraction
  const d: any = data || {
    faturamento: 0,
    taxes: 0,
    cmv: 0,
    payroll: 0,
    operational: 0,
    ebitda: 0,
    netProfit: 0,
    details: {},
  };

  const faturamento = d.faturamento || 0;
  const details = d.details || {};

  // Deduções
  const darf = details.deducoes?.darfSimples || d.taxes || 0;
  const taxasCambio = details.deducoes?.taxasCambio || 0;
  const totalDeducoes = darf + taxasCambio;
  const receitaLiquida = faturamento - totalDeducoes;

  // CMV
  const totalCmv = d.cmv || 0;
  const cmvBalcao = details.cmvDetailed?.balcao || totalCmv * 0.4;
  const cmvDelivery = details.cmvDetailed?.delivery || totalCmv * 0.6;

  // Despesas Variáveis
  const taxaIfood = (details.despesasVariaveis?.taxaIfood || 0) + (details.despesasVariaveis?.despesasIfood || 0);
  const taxaCartao = (details.despesasVariaveis?.taxaCartao || 0) + (details.despesasVariaveis?.taxaPix || 0);
  const taxaMotoqueiro = (details.despesasVariaveis?.taxaMotoqueiro || 0) + (details.despesasVariaveis?.freteCompras || 0);
  const fundoMarketing = details.despesasVariaveis?.fundoMarketing || details.despesasVariaveis?.fundoPromo || 0;
  const royalties = details.despesasVariaveis?.royalties || d.royalties || 0;
  const taxaBancariaJuros = details.despesasVariaveis?.taxaBancariaJuros || 0;
  const bonificacoes = details.despesasVariaveis?.bonificacoes || 0;
  const descontos = details.despesasVariaveis?.descontos || 0;
  const totalDespesasVar = d.despesasVariaveis || (taxaIfood + taxaCartao + taxaMotoqueiro + fundoMarketing + royalties + taxaBancariaJuros + bonificacoes + descontos);

  // Margem de Contribuição
  const margemContribuicao = receitaLiquida - totalCmv - totalDespesasVar;

  // Pessoal / CMO
  const totalPayroll = d.payroll || 0;
  const colaboradores = details.colaboradores || {};

  // Funcionamento
  const funcionamento = details.funcionamento || {};
  const totalFuncionamento = (Object.values(funcionamento) as any[]).reduce((a, b) => a + (Number(b) || 0), 0) || d.rent || 0;

  // Manutenção
  const manutencao = details.manutencao || {};
  const totalManutencao = (Object.values(manutencao) as any[]).reduce((a, b) => a + (Number(b) || 0), 0);

  // Comerciais
  const comerciais = details.comerciais || {};
  const totalComerciais = (Object.values(comerciais) as any[]).reduce((a, b) => a + (Number(b) || 0), 0) || d.marketing || 0;

  // Administrativas
  const administrativas = details.administrativas || {};
  const totalAdministrativas = (Object.values(administrativas) as any[]).reduce((a, b) => a + (Number(b) || 0), 0) || (d.operational ? d.operational * 0.3 : 0);

  // EBITDA & Lucro Líquido
  const ebitda = d.ebitda !== undefined ? d.ebitda : margemContribuicao - totalPayroll - totalFuncionamento - totalManutencao - totalComerciais - totalAdministrativas;
  const netProfit = d.netProfit !== undefined ? d.netProfit : ebitda;

  // Prime Cost
  const primeCost = totalCmv + totalPayroll;
  const primeCostPercent = faturamento > 0 ? (primeCost / faturamento) * 100 : 0;
  const cmvPercent = faturamento > 0 ? (totalCmv / faturamento) * 100 : 0;
  const payrollPercent = faturamento > 0 ? (totalPayroll / faturamento) * 100 : 0;
  const ebitdaMargin = faturamento > 0 ? (ebitda / faturamento) * 100 : 0;

  // All structured account groups
  const accountGroups = [
    {
      id: "receita",
      title: "1. RECEITA BRUTA OPERACIONAL",
      subtitle: "Vendas por canal de atendimento",
      icon: DollarSign,
      iconColor: "text-emerald-500",
      total: faturamento,
      isTotal: false,
      items: [
        { label: "Venda Balcão / Loja Física", value: d.receitaBalcao || 0 },
        { label: "Venda Delivery (Canais & Apps)", value: d.receitaDelivery || (d.receitaIfood ? (d.receitaIfood + (d.receitaWedo || 0)) : 0) },
        { label: "Receita iFood", value: d.receitaIfood || 0 },
        { label: "Receita Wedo / Cardápio Digital", value: d.receitaWedo || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "deducoes",
      title: "2. DEDUÇÕES DA RECEITA",
      subtitle: "Tributos, taxas de cancelamento e descontos fiscais",
      icon: Receipt,
      iconColor: "text-rose-500",
      total: totalDeducoes,
      isTotal: false,
      items: [
        { label: "DARF / Simples Nacional", value: darf },
        { label: "Taxas de Câmbio / Cancelamentos", value: taxasCambio },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "receita_liquida",
      title: "3. (=) RECEITA OPERACIONAL LÍQUIDA",
      subtitle: "Receita bruta deduzida de tributos diretos",
      icon: TrendingUp,
      iconColor: "text-blue-500",
      total: receitaLiquida,
      isTotal: true,
      items: [],
    },
    {
      id: "cmv",
      title: "4. CUSTOS VARIÁVEIS / CMV",
      subtitle: "Custo com mercadorias, insumos e embalagens",
      icon: ShoppingBag,
      iconColor: "text-amber-500",
      total: totalCmv,
      isTotal: false,
      items: [
        { label: "CMV - Balcão (Insumos & Alimentos)", value: cmvBalcao },
        { label: "CMV - Delivery (Insumos & Embalagens)", value: cmvDelivery },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "despesas_variaveis",
      title: "5. DESPESAS VARIÁVEIS (CANAIS & TAXAS)",
      subtitle: "Comissões de delivery, taxas de cartão e logística",
      icon: Layers,
      iconColor: "text-orange-500",
      total: totalDespesasVar,
      isTotal: false,
      items: [
        { label: "Comissões iFood & Plataformas", value: taxaIfood },
        { label: "Taxas de Cartão & Adquirência / Pix", value: taxaCartao },
        { label: "Logística & Entregadores (Taxa Motoqueiro)", value: taxaMotoqueiro },
        { label: "Fundo de Marketing / Promoção da Rede", value: fundoMarketing },
        { label: "Royalties da Franquia", value: royalties },
        { label: "Taxas Bancárias & Juros Operacionais", value: taxaBancariaJuros },
        { label: "Bonificações / Comissões", value: bonificacoes },
        { label: "Descontos Concedidos a Clientes", value: descontos },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "colaboradores",
      title: "6. DESPESAS COM PESSOAL (CMO)",
      subtitle: "Salários, encargos trabalhistas, benefícios e pró-labore",
      icon: Users,
      iconColor: "text-purple-500",
      total: totalPayroll,
      isTotal: false,
      items: [
        { label: "Salários Base", value: colaboradores.salarios || 0 },
        { label: "Pró-Labore dos Sócios", value: colaboradores.proLabore || 0 },
        { label: "INSS", value: colaboradores.INSS || 0 },
        { label: "FGTS", value: colaboradores.FGTS || 0 },
        { label: "13º Salário", value: colaboradores.decimoTerceiro || 0 },
        { label: "Férias + 1/3 Constitucional", value: colaboradores.ferias || 0 },
        { label: "Vale Transporte", value: colaboradores.valeTransp || 0 },
        { label: "Vale Alimentação", value: colaboradores.valeAlim || 0 },
        { label: "Alimentação Interna", value: colaboradores.alimentacao || 0 },
        { label: "Diárias e Horas Extras", value: colaboradores.diarias || 0 },
        { label: "Trabalho Avulso / Freelancers", value: colaboradores.avulso || 0 },
        { label: "Premiações e Bonificações de Equipe", value: colaboradores.premiacao || 0 },
        { label: "Gratificações", value: colaboradores.gratificacoes || 0 },
        { label: "Verbas Rescisórias", value: colaboradores.rescisorias || 0 },
        { label: "Uniformes e EPIs", value: colaboradores.uniformesEPI || 0 },
        { label: "Exames Médicos / Atestados (ASO)", value: colaboradores.atestadoExame || 0 },
        { label: "Outros Encargos e Benefícios", value: colaboradores.outros || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "funcionamento",
      title: "7. CUSTOS DE FUNCIONAMENTO (OCUPAÇÃO)",
      subtitle: "Aluguel, condomínio, utilidades e despesas da estrutura",
      icon: Building,
      iconColor: "text-indigo-500",
      total: totalFuncionamento,
      isTotal: false,
      items: [
        { label: "Aluguel da Loja / Ponto Comercial", value: funcionamento.aluguel || 0 },
        { label: "Condomínio / Encargos do Imóvel", value: funcionamento.condominio || 0 },
        { label: "Energia Elétrica", value: funcionamento.energiaEletrica || 0 },
        { label: "Água e Esgoto", value: funcionamento.agua || 0 },
        { label: isBebeluRioMar ? "Fundo Promocional Rio Mar" : "Energia Câmara Fria", value: funcionamento.energiaCâmaraFria || 0 },
        { label: "Ar Condicionado e Climatização", value: funcionamento.arCondicionado || 0 },
        { label: "Internet, Link Dedicado e Telefonia", value: funcionamento.internetTelefonia || 0 },
        { label: "IPTU / Taxas Municipais", value: funcionamento.iptu || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "manutencao",
      title: "8. MANUTENÇÃO & CONSERVAÇÃO",
      subtitle: "Reparos de maquinário, sistemas e estrutura física",
      icon: Wrench,
      iconColor: "text-cyan-500",
      total: totalManutencao,
      isTotal: false,
      items: [
        { label: "Manutenção de Equipamentos de Cozinha", value: manutencao.manutencaoEquip || 0 },
        { label: "Manutenção de Sistemas e TI", value: manutencao.manutencaoSist || 0 },
        { label: "Locação de Máquinas / Equipamentos", value: manutencao.locacaoMaq || 0 },
        { label: "Despesas de Escritório Técnico", value: manutencao.escritorios || 0 },
        { label: "Outras Manutenções", value: manutencao.outros || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "comerciais",
      title: "9. DESPESAS COMERCIAIS & MARKETING",
      subtitle: "Campanhas publicitárias locais, tráfego e promoções",
      icon: Briefcase,
      iconColor: "text-pink-500",
      total: totalComerciais,
      isTotal: false,
      items: [
        { label: "Marketing Local / Mídias Sociais / Tráfego", value: comerciais.marketing || 0 },
        { label: "Aplicativos & Plataformas Promocionais", value: comerciais.aplicativo || 0 },
        { label: "Fretes Comerciais e Despachos", value: comerciais.frete || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "administrativas",
      title: "10. DESPESAS ADMINISTRATIVAS & GERAIS",
      subtitle: "Contabilidade, softwares de gestão e suprimentos",
      icon: FileSpreadsheet,
      iconColor: "text-slate-500",
      total: totalAdministrativas,
      isTotal: false,
      items: [
        { label: "Honorários Contábeis", value: administrativas.contabilidade || 0 },
        { label: "Sistemas / ERP (BERP e Licenças)", value: administrativas.sistemaBERP || 0 },
        { label: "Taxa Call Center / Atendimento", value: administrativas.taxaCallCenter || 0 },
        { label: "Consultorias Especializadas", value: administrativas.consultoria || 0 },
        { label: "Material de Consumo e Operacional", value: administrativas.materialConsumo || 0 },
        { label: "Material de Escritório e Impressões", value: administrativas.materialEscritorio || 0 },
        { label: "Material de Limpeza e Higiene", value: administrativas.materialLimpeza || 0 },
        { label: "Dedetização e Controle de Pragas", value: administrativas.dedetizacao || 0 },
        { label: "Certificado Digital e Licenças", value: administrativas.certificado || 0 },
        { label: "Combustíveis / Transportes", value: administrativas.combustiveis || 0 },
        { label: "Seguros Prediais e Operacionais", value: administrativas.seguros || 0 },
        { label: "Despesas Diversas / Administrativas", value: administrativas.fretesDiversos || 0 },
      ].filter(i => i.value > 0 || !onlyWithValue),
    },
    {
      id: "ebitda",
      title: "11. (=) EBITDA - RESULTADO OPERACIONAL",
      subtitle: "Geração de caixa genuína da operação antes de juros e depreciação",
      icon: DollarSign,
      iconColor: ebitda >= 0 ? "text-emerald-500" : "text-rose-500",
      total: ebitda,
      isTotal: true,
      items: [],
    },
  ];

  // Filtering by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return accountGroups;
    const term = searchTerm.toLowerCase();

    return accountGroups
      .map((g) => {
        const matchesGroup = g.title.toLowerCase().includes(term) || g.subtitle.toLowerCase().includes(term);
        const filteredItems = g.items.filter((item) => item.label.toLowerCase().includes(term));
        if (matchesGroup || filteredItems.length > 0) {
          return {
            ...g,
            items: matchesGroup ? g.items : filteredItems,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof accountGroups;
  }, [accountGroups, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode
            ? "bg-[#16161A] border-[#2E2E36] text-slate-100 shadow-black/80"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        }`}
      >
        {/* HEADER */}
        <div
          className={`px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 ${
            isDarkMode ? "bg-[#1E1E24] border-[#2E2E36]" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isBebelu
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              }`}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Raio-X Específico
                </span>
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {storeName}
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mt-0.5">
                <span>{monthLabel} de {year}</span>
                {faturamento > 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    Realizado Ativo
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 font-bold">
                    Sem Lançamentos
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Month Stepper & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Stepper */}
            <div
              className={`flex items-center rounded-xl border p-1 ${
                isDarkMode ? "bg-black/30 border-[#2E2E36]" : "bg-white border-slate-200"
              }`}
            >
              <button
                type="button"
                disabled={!prevMonth}
                onClick={() => prevMonth && onSelectMonth(prevMonth.value, prevMonth.label)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                title={prevMonth ? `Ir para ${prevMonth.label}` : "Início do ano"}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{prevMonth?.label.substring(0, 3)}</span>
              </button>

              <select
                value={monthValue}
                onChange={(e) => {
                  const m = monthsList.find((item) => item.value === e.target.value);
                  if (m) onSelectMonth(m.value, m.label);
                }}
                className={`text-xs font-black px-2.5 py-1 bg-transparent border-none cursor-pointer focus:outline-none ${
                  isDarkMode ? "text-amber-400" : "text-amber-600"
                }`}
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value} className={isDarkMode ? "bg-zinc-900 text-white" : "bg-white text-slate-900"}>
                    {m.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!nextMonth}
                onClick={() => nextMonth && onSelectMonth(nextMonth.value, nextMonth.label)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                title={nextMonth ? `Ir para ${nextMonth.label}` : "Fim do ano"}
              >
                <span className="hidden md:inline">{nextMonth?.label.substring(0, 3)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Switch to Vertical Month View */}
            {onOpenVerticalDRE && (
              <button
                type="button"
                onClick={() => {
                  onOpenVerticalDRE(monthValue, year);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Abrir no demonstrativo vertical completo com Análise Vertical"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver DRE Vertical</span>
              </button>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 select-none scrollbar-thin">
          {/* TOP EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Faturamento */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isDarkMode ? "bg-[#1E1E24] border-[#2A2A33]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                Faturamento Bruto
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-100">
                {formatCurrency(faturamento)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Balcão: {formatCurrency(d.receitaBalcao || 0)}</span>
              </div>
            </div>

            {/* Card 2: Deduções */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isDarkMode ? "bg-[#1E1E24] border-[#2A2A33]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                Deduções / Impostos
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-rose-400">
                {formatCurrency(totalDeducoes)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {faturamento > 0 ? `${((totalDeducoes / faturamento) * 100).toFixed(1)}% da receita` : "—"}
              </div>
            </div>

            {/* Card 3: CMV */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isDarkMode ? "bg-[#1E1E24] border-[#2A2A33]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                CMV Insumos
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-400">
                {formatCurrency(totalCmv)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {faturamento > 0 ? `${cmvPercent.toFixed(1)}% (Alvo: ≤35%)` : "—"}
              </div>
            </div>

            {/* Card 4: Pessoal (CMO) */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isDarkMode ? "bg-[#1E1E24] border-[#2A2A33]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                Pessoal (CMO)
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-purple-400">
                {formatCurrency(totalPayroll)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {faturamento > 0 ? `${payrollPercent.toFixed(1)}% (Alvo: ≤22%)` : "—"}
              </div>
            </div>

            {/* Card 5: Prime Cost */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                primeCostPercent > 60
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tight block mb-1">
                ★ Prime Cost (CMV+CMO)
              </span>
              <div className="text-base sm:text-lg font-black font-mono">
                {formatCurrency(primeCost)}
              </div>
              <div className="text-[10px] font-bold mt-1">
                {faturamento > 0 ? `${primeCostPercent.toFixed(1)}% (Meta: <60%)` : "—"}
              </div>
            </div>

            {/* Card 6: EBITDA */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                ebitda >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tight block mb-1">
                EBITDA Operacional
              </span>
              <div className="text-base sm:text-lg font-black font-mono">
                {formatCurrency(ebitda)}
              </div>
              <div className="text-[10px] font-bold mt-1">
                {faturamento > 0 ? `${ebitdaMargin.toFixed(1)}% de margem` : "—"}
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDarkMode ? "bg-[#1A1A20] border-[#2A2A33]" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conta (ex: aluguel, ifood, salários)..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                  isDarkMode
                    ? "bg-[#222228] border-[#33333E] text-white placeholder-slate-500"
                    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithValue}
                  onChange={(e) => setOnlyWithValue(e.target.checked)}
                  className="rounded border-slate-600 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>Ocultar contas zeradas</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-700 hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white"
                >
                  Expandir Todos
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-700 hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white"
                >
                  Recolher
                </button>
              </div>
            </div>
          </div>

          {/* DETAILED ACCOUNTS LIST */}
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isExpanded = expandedSections.includes(group.id);
              const GroupIcon = group.icon;
              const avPercent = faturamento > 0 ? (Math.abs(group.total) / faturamento) * 100 : 0;

              return (
                <div
                  key={group.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    group.isTotal
                      ? isDarkMode
                        ? "bg-[#1E1E26] border-amber-500/30 shadow-md"
                        : "bg-amber-50/40 border-amber-300 shadow-xs"
                      : isDarkMode
                        ? "bg-[#1A1A20] border-[#2A2A33]"
                        : "bg-white border-slate-200"
                  }`}
                >
                  {/* Category Header */}
                  <div
                    onClick={() => toggleSection(group.id)}
                    className={`px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                      isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isDarkMode ? "bg-black/30" : "bg-slate-100"
                        } ${group.iconColor}`}
                      >
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                          <span>{group.title}</span>
                          {group.items.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-500/20 text-slate-400 font-bold">
                              {group.items.length} subcontas
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {group.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Subtotal & AV% */}
                      <div className="text-right">
                        <div
                          className={`text-sm font-black font-mono ${
                            group.isTotal
                              ? group.total >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                              : isDarkMode
                                ? "text-slate-200"
                                : "text-slate-800"
                          }`}
                        >
                          {formatCurrency(group.total)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {faturamento > 0 ? `${avPercent.toFixed(1)}% AV` : "—"}
                        </div>
                      </div>

                      {group.items.length > 0 && (
                        <div className="text-slate-400 p-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-items list */}
                  {isExpanded && group.items.length > 0 && (
                    <div
                      className={`border-t divide-y ${
                        isDarkMode
                          ? "bg-black/20 border-[#2A2A33] divide-[#24242C]"
                          : "bg-slate-50/50 border-slate-100 divide-slate-100"
                      }`}
                    >
                      {group.items.map((item, idx) => {
                        const itemAv = faturamento > 0 ? (item.value / faturamento) * 100 : 0;
                        return (
                          <div
                            key={idx}
                            className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                              <span className="font-semibold text-slate-300">
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Mini progress bar relative to group */}
                              <div className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-700/40 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      group.total > 0 ? (item.value / group.total) * 100 : 0
                                    )}%`,
                                  }}
                                />
                              </div>

                              <div className="text-right min-w-[90px]">
                                <span className="font-mono font-bold text-slate-200">
                                  {formatCurrency(item.value)}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {itemAv.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isDarkMode ? "bg-[#1E1E24] border-[#2E2E36]" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>
              Mostrando dados consolidados para o mês de <strong className="text-slate-200">{monthLabel} / {year}</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-white/5 transition-colors cursor-pointer text-slate-300"
            >
              Fechar
            </button>
            {onOpenVerticalDRE && (
              <button
                type="button"
                onClick={() => {
                  onOpenVerticalDRE(monthValue, year);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <span>Abrir DRE Vertical</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
