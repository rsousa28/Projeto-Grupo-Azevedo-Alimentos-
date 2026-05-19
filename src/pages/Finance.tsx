import React, { useState, useEffect } from 'react';
import { 
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Info,
  ArrowRight,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronDown,
  AlertCircle,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Check,
  MessagesSquare,
  X,
  Send,
  Lightbulb,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useStore } from '../contexts/StoreContext';
import DataEntrySection from '../components/DataEntrySection';
import { chatWithConsultant } from '../services/geminiService';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Finance() {
  const { isDarkMode, dreTimeline, brandColors, currentStore, topProducts, loadDREPeriod, loadCMVPeriod, deletePeriodData, yearlyHistory } = useStore();
  const [selectedMonth, setSelectedMonth] = useState('05'); // Maio as default
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showEntry, setShowEntry] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleResetPeriod = async () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      setTimeout(() => setShowConfirmReset(false), 3000);
      return;
    }
    
    setIsDeleting(true);
    setShowConfirmReset(false);
    try {
      await deletePeriodData(selectedMonth, selectedYear);
      
      // We don't need to reload immediately as deletePeriodData already filters the local state
      // but we wait a bit and sync just to be safe with the cloud
      await new Promise(resolve => setTimeout(resolve, 800));
      await loadDREPeriod(selectedMonth, selectedYear);
      await loadCMVPeriod(selectedMonth, selectedYear);
      
      alert('Dados do período zerados com sucesso.');
    } catch (error) {
      console.error('Erro ao zerar dados:', error);
      alert('Erro ao zerar dados. Verifique sua conexão.');
    } finally {
      setIsDeleting(false);
    }
  };
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Como posso ajudar a otimizar sua margem este mês? Pergunte sobre qualquer conta da DRE e etc.' }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Auto-load data when period changes
  useEffect(() => {
    loadDREPeriod(selectedMonth, selectedYear);
    
    // Pre-load previous years for comparison to ensure chart is populated
    const prevYear1 = (parseInt(selectedYear) - 1).toString();
    const prevYear2 = (parseInt(selectedYear) - 2).toString();
    loadDREPeriod(selectedMonth, prevYear1);
    loadDREPeriod(selectedMonth, prevYear2);
    
    loadCMVPeriod(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, currentStore.id]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['receita', 'deducoes', 'cmv', 'despesas_var', 'despesas_fixas_5', 'despesas_fixas_6', 'despesas_fixas_7', 'despesas_fixas_8', 'despesas_fixas_9', 'financeiro']);

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label;
  
  const currentMonthData = dreTimeline.find(d => 
    d.month === currentMonthLabel && (d.year === selectedYear || (!d.year && selectedYear === '2026'))
  ) || {
    month: currentMonthLabel || 'Não Iniciado',
    faturamento: 0,
    receitaBalcao: 0,
    receitaDelivery: 0,
    receitaIfood: 0,
    receitaWedo: 0,
    taxes: 0,
    cmv: 0,
    payroll: 0,
    royalties: 0,
    rent: 0,
    marketing: 0,
    operational: 0,
    ebitda: 0,
    netProfit: 0,
    quantidadePedidos: 0
  };

  const selectedPeriod = `${currentMonthLabel} ${selectedYear}`;
  
  // For comparison, let's find previous month
  const prevMonthVal = parseInt(selectedMonth) - 1;
  const prevMonthStr = prevMonthVal < 1 ? '12' : prevMonthVal.toString().padStart(2, '0');
  const prevYearStr = prevMonthVal < 1 ? (parseInt(selectedYear) - 1).toString() : selectedYear;
  const prevMonthLabel = months.find(m => m.value === prevMonthStr)?.label;
  
  const prevMonthData = dreTimeline.find(d => 
    d.month === prevMonthLabel && (d.year === prevYearStr || (!d.year && prevYearStr === '2026'))
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const dreGroups = [
    {
      id: 'receita',
      label: '1. RECEITA BRUTA',
      isTotal: false,
      items: [
        { label: 'Venda Balção', valor: currentMonthData.receitaBalcao || 0 },
        { label: 'Venda Delivery', valor: currentMonthData.receitaDelivery || 0 },
      ],
      total: currentMonthData.faturamento
    },
    {
      id: 'deducoes',
      label: '2. DEDUÇÕES DA RECEITA',
      isTotal: false,
      items: [
        { label: 'DARF/SIMPLES', valor: -(currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes) },
      ],
      total: -(currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes)
    },
    {
      id: 'cmv',
      label: '3. CUSTOS VARIÁVEIS DAS MERCADORIAS',
      isTotal: false,
      items: [
        { label: 'CMV - Balcão', valor: -(currentMonthData.details?.cmvDetailed?.balcao || (currentMonthData.cmv * 0.4)) },
        { label: 'CMV - Delivery', valor: -(currentMonthData.details?.cmvDetailed?.delivery || (currentMonthData.cmv * 0.6)) },
      ],
      total: -currentMonthData.cmv
    },
    {
      id: 'despesas_variaveis',
      label: '4. DESPESAS VARIÁVEIS',
      isTotal: false,
      items: [
        { label: 'Taxas de Cartão de Créditos e Débitos', valor: -(currentMonthData.details?.despesasVariaveis?.taxaCartao || 0) },
        { label: 'Taxa Motoqueiro', valor: -(currentMonthData.details?.despesasVariaveis?.taxaMotoqueiro || 0) },
        { label: 'Taxa Ifood', valor: -(currentMonthData.details?.despesasVariaveis?.taxaIfood || 0) },
        { label: 'Frete Compras', valor: -(currentMonthData.details?.despesasVariaveis?.freteCompras || 0) },
        { label: 'Fundo de Marketing - Franquia', valor: -(currentMonthData.details?.despesasVariaveis?.fundoMarketing || 0) },
        { label: 'Royaltis - Franquia', valor: -(currentMonthData.details?.despesasVariaveis?.royalties || 0) },
        { label: 'Taxa Bancaria + Juros', valor: -(currentMonthData.details?.despesasVariaveis?.taxaBancariaJuros || 0) },
        { label: 'Taxas PIX', valor: -(currentMonthData.details?.despesasVariaveis?.taxaPix || 0) },
        { label: 'Bonificações ou Comissões para Colaboradores', valor: -(currentMonthData.details?.despesasVariaveis?.bonificacoes || 0) },
        { label: 'Descontos Concedidos para Clientes - Cortesia', valor: -(currentMonthData.details?.despesasVariaveis?.descontos || 0) },
        { label: 'GRI - Secretaria de Estado da Tributação', valor: -(currentMonthData.details?.despesasVariaveis?.griSecretaria || 0) },
        { label: 'Despesas Ifood', valor: -(currentMonthData.details?.despesasVariaveis?.despesasIfood || 0) },
      ],
      total: -(currentMonthData.despesasVariaveis || 0)
    },
    {
      id: 'margem_contribuicao',
      label: '(=) MARGEM DE CONTRIBUIÇÃO',
      isTotal: true,
      total: currentMonthData.faturamento - (currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes) - currentMonthData.cmv - (currentMonthData.despesasVariaveis || 0),
      highlight: true,
      color: currentStore.brand === 'BEBELU' ? 'text-amber-600' : 'text-blue-600'
    },
    {
      id: 'despesas_fixas_5',
      label: 'DESPESAS COM COLABORADORES E ENCARGOS',
      isTotal: false,
      items: [
        { label: 'Salários', valor: -(currentMonthData.details?.colaboradores?.salarios || 0) },
        { label: 'Pro Labore', valor: -(currentMonthData.details?.colaboradores?.proLabore || 0) },
        { label: 'Avulso', valor: -(currentMonthData.details?.colaboradores?.avulso || 0) },
        { label: 'Diárias', valor: -(currentMonthData.details?.colaboradores?.diarias || 0) },
        { label: 'Premiação', valor: -(currentMonthData.details?.colaboradores?.premiacao || 0) },
        { label: 'Gratificações', valor: -(currentMonthData.details?.colaboradores?.gratificacoes || 0) },
        { label: '13o. salário', valor: -(currentMonthData.details?.colaboradores?.decimoTerceiro || 0) },
        { label: 'Férias', valor: -(currentMonthData.details?.colaboradores?.ferias || 0) },
        { label: 'INSS', valor: -(currentMonthData.details?.colaboradores?.INSS || 0) },
        { label: 'FGTS', valor: -(currentMonthData.details?.colaboradores?.FGTS || 0) },
        { label: 'Verbas rescisórias', valor: -(currentMonthData.details?.colaboradores?.rescisorias || 0) },
        { label: 'Cortesia', valor: -(currentMonthData.details?.colaboradores?.cortesia || 0) },
        { label: 'Vale transporte', valor: -(currentMonthData.details?.colaboradores?.valeTransp || 0) },
        { label: 'Vale Alimentação', valor: -(currentMonthData.details?.colaboradores?.valeAlim || 0) },
        { label: 'Alimentação', valor: -(currentMonthData.details?.colaboradores?.alimentacao || 0) },
        { label: 'POS', valor: -(currentMonthData.details?.colaboradores?.pos || 0) },
        { label: 'Atestado / Exame', valor: -(currentMonthData.details?.colaboradores?.atestadoExame || 0) },
        { label: 'Uniformes / EPI', valor: -(currentMonthData.details?.colaboradores?.uniformesEPI || 0) },
        { label: 'Outros Benefícios ou Encargos', valor: -(currentMonthData.details?.colaboradores?.outrosBeneficios || 0) },
      ],
      total: -currentMonthData.payroll
    },
    {
      id: 'despesas_fixas_6',
      label: 'DESPESAS COM FUNCIONAMENTO',
      isTotal: false,
      items: [
        { label: 'Aluguel', valor: -(currentMonthData.details?.funcionamento?.aluguel || 0) },
        { label: 'Condominio', valor: -(currentMonthData.details?.funcionamento?.condominio || 0) },
        { label: 'Energia Camara Fria', valor: -(currentMonthData.details?.funcionamento?.energiaCâmaraFria || 0) },
        { label: 'IPTU', valor: -(currentMonthData.details?.funcionamento?.iptu || 0) },
        { label: 'Energia Elétrica', valor: -(currentMonthData.details?.funcionamento?.energiaEletrica || 0) },
        { label: 'Água', valor: -(currentMonthData.details?.funcionamento?.agua || 0) },
        { label: 'Ar Condicionado', valor: -(currentMonthData.details?.funcionamento?.arCondicionado || 0) },
        { label: 'Internet + Telefonia', valor: -(currentMonthData.details?.funcionamento?.internetTelefonia || 0) },
      ],
      total: -Object.values(currentMonthData.details?.funcionamento || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    },
    {
      id: 'despesas_fixas_7',
      label: 'DESPESAS COM MANUTENÇÃO',
      isTotal: false,
      items: [
        { label: 'Escritórios', valor: -(currentMonthData.details?.manutencao?.escritorios || 0) },
        { label: 'Locação de Máq. e Equipamentos', valor: -(currentMonthData.details?.manutencao?.locacaoMaq || 0) },
        { label: 'Manutenção de sistemas', valor: -(currentMonthData.details?.manutencao?.manutencaoSist || 0) },
        { label: 'Manutenção de equipamentos e reforma', valor: -(currentMonthData.details?.manutencao?.manutencaoEquip || 0) },
        { label: 'Outros Gastos com manutenção', valor: -(currentMonthData.details?.manutencao?.outrosManutencao || 0) },
      ],
      total: -Object.values(currentMonthData.details?.manutencao || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    },
    {
      id: 'despesas_fixas_8',
      label: 'DESPESAS COMERCIAIS',
      isTotal: false,
      items: [
        { label: 'Aplicativo', valor: -(currentMonthData.details?.comerciais?.aplicativo || 0) },
        { label: 'Marketing', valor: -(currentMonthData.details?.comerciais?.marketing || 0) },
        { label: 'Frete', valor: -(currentMonthData.details?.comerciais?.frete || 0) },
      ],
      total: -Object.values(currentMonthData.details?.comerciais || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    },
    {
      id: 'despesas_fixas_9',
      label: 'DESPESAS ADMINISTRATIVAS',
      isTotal: false,
      items: [
        { label: 'Sindicato', valor: -(currentMonthData.details?.administrativas?.sindicato || 0) },
        { label: 'Limpeza', valor: -(currentMonthData.details?.administrativas?.limpeza || 0) },
        { label: 'Taxa Call Center', valor: -(currentMonthData.details?.administrativas?.taxaCallCenter || 0) },
        { label: 'Sistema BERP', valor: -(currentMonthData.details?.administrativas?.sistemaBERP || 0) },
        { label: 'Consultoria', valor: -(currentMonthData.details?.administrativas?.consultoria || 0) },
        { label: 'Contabilidade', valor: -(currentMonthData.details?.administrativas?.contabilidade || 0) },
        { label: 'Premiação', valor: -(currentMonthData.details?.administrativas?.premiacao || 0) },
        { label: 'Dedetização', valor: -(currentMonthData.details?.administrativas?.dedetizacao || 0) },
        { label: 'Certificado', valor: -(currentMonthData.details?.administrativas?.certificado || 0) },
        { label: 'Fretes e Carretos Diversos', valor: -(currentMonthData.details?.administrativas?.fretesDiversos || 0) },
        { label: 'Utencilios', valor: -(currentMonthData.details?.administrativas?.utensilios || 0) },
        { label: 'Material de consumo', valor: -(currentMonthData.details?.administrativas?.materialConsumo || 0) },
        { label: 'Material de escritorio', valor: -(currentMonthData.details?.administrativas?.materialEscritorio || 0) },
        { label: 'Material de limpeza', valor: -(currentMonthData.details?.administrativas?.materialLimpeza || 0) },
        { label: 'Combustiveis', valor: -(currentMonthData.details?.administrativas?.combustiveis || 0) },
        { label: 'Retirado P Rony Ximenes', valor: -(currentMonthData.details?.administrativas?.ronyXimenes || 0) },
        { label: 'Seguros / Segurança', valor: -(currentMonthData.details?.administrativas?.seguros || 0) },
        { label: 'Taxa de Alvara', valor: -(currentMonthData.details?.administrativas?.taxaAlvara || 0) },
        { label: 'Despesas Operacionais', valor: -(currentMonthData.details?.administrativas?.despesasOperacionales || 0) },
        { label: 'Despesas Gerais', valor: -(currentMonthData.details?.administrativas?.despesasGerais || 0) },
      ],
      total: -currentMonthData.operational
    },
    {
      id: 'resultado_operacional_financeiro',
      label: '(=) EBITDA - RESULTADO OPERACIONAL',
      isTotal: true,
      total: currentMonthData.ebitda,
      color: currentStore.brand === 'BEBELU' ? 'text-amber-600' : 'text-indigo-600'
    },
    {
      id: 'apuracao_financeira',
      label: '10. APURAÇÃO DO RESULTADO FINANCEIRO',
      isTotal: false,
      items: [
        { label: 'Taxas Ifood', valor: -(currentMonthData.details?.resultadoFinanceiro?.taxasIfood || 0) },
        { label: 'Tarifas Bancárias', valor: -(currentMonthData.details?.resultadoFinanceiro?.tarifasBancarias || 0) },
        { label: 'Juros Recebidos', valor: currentMonthData.details?.resultadoFinanceiro?.jurosRecebidos || 0 },
      ],
      total: -(currentMonthData.resultadoFinanceiro || 0)
    },
    {
      id: 'resultado_liquido',
      label: '(=) RESULTADO LÍQUIDO FINANCEIRO',
      isTotal: true,
      total: currentMonthData.netProfit,
      highlight: true,
      color: 'text-green-600',
      border: true
    }
  ];

  const faturamentoVal = currentMonthData.faturamento || 0;
  const mc = currentMonthData.faturamento - (currentMonthData.details?.deducoes?.darfSimples || currentMonthData.taxes) - currentMonthData.cmv - (currentMonthData.despesasVariaveis || 0);
  const mcPercent = faturamentoVal > 0 ? mc / faturamentoVal : 0;
  
  const fixedExpenses = (currentMonthData.payroll || 0) + 
    Object.values(currentMonthData.details?.funcionamento || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0) +
    Object.values(currentMonthData.details?.manutencao || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0) +
    Object.values(currentMonthData.details?.comerciais || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0) +
    (currentMonthData.operational || 0);

  const pontoEquilibrio = mcPercent > 0 ? fixedExpenses / mcPercent : 0;
  const ticketMedio = currentMonthData.quantidadePedidos > 0 ? currentMonthData.faturamento / currentMonthData.quantidadePedidos : 0;

  const marginBruta = faturamentoVal > 0 ? ((currentMonthData.faturamento - currentMonthData.cmv) / faturamentoVal) * 100 : 0;
  const lucratividade = faturamentoVal > 0 ? (currentMonthData.netProfit / faturamentoVal) * 100 : 0;
  const cmvPercent = faturamentoVal > 0 ? (currentMonthData.cmv / faturamentoVal) * 100 : 0;
  const payrollPercent = faturamentoVal > 0 ? (currentMonthData.payroll / faturamentoVal) * 100 : 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = `DRE - ${currentStore.name} - ${currentMonthLabel} ${selectedYear}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = dreGroups.flatMap(group => {
      const rows = [];
      // Group header
      rows.push([
        { content: group.label, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: `${((Math.abs(group.total) / faturamentoVal) * 100).toFixed(1)}%`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } },
        { content: formatCurrency(group.total), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }
      ]);
      
      // Items
      if (group.items) {
        group.items.forEach(item => {
          rows.push([
            `  ${item.label}`,
            { content: `${((Math.abs(item.valor) / faturamentoVal) * 100).toFixed(1)}%`, styles: { halign: 'right' } },
            { content: formatCurrency(item.valor), styles: { halign: 'right' } }
          ]);
        });
      }
      return rows;
    });

    autoTable(doc, {
      startY: 40,
      head: [['Descrição', 'AV %', 'Valor']],
      body: tableData as any,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' }
      }
    });

    doc.save(`DRE_${currentStore.name.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Dynamic Insights
  const getInsights = () => {
    const insights = [];
    
    if (cmvPercent > 35) {
      insights.push({
        title: 'CMV Elevado',
        desc: `Seu CMV está em ${cmvPercent.toFixed(1)}%. O ideal é abaixo de 32%. Verifique desperdícios e negocie insumos.`,
        icon: <AlertCircle className="w-5 h-5 text-red-700" />,
        color: 'bg-red-700/10'
      });
    } else if (cmvPercent > 0) {
      insights.push({
        title: 'CMV Saudável',
        desc: `Parabéns! Sua margem bruta está protegida com CMV de ${cmvPercent.toFixed(1)}%.`,
        icon: <Check className="w-5 h-5 text-green-500" />,
        color: 'bg-green-500/10'
      });
    }

    if (payrollPercent > 22) {
      insights.push({
        title: 'Ajuste de Escala',
        desc: `Sua folha (${payrollPercent.toFixed(1)}%) ultrapassa o teto de 20%. Avalie a produtividade por colaborador.`,
        icon: <Briefcase className="w-5 h-5 text-amber-500" />,
        color: 'bg-amber-500/10'
      });
    }

    if (lucratividade < 10 && faturamentoVal > 0) {
      insights.push({
        title: 'Margem de Lucro Baixa',
        desc: `Lucratividade de ${lucratividade.toFixed(1)}% está abaixo da média de 15% do setor.`,
        icon: <TrendingUp className="w-5 h-5 text-red-700" />,
        color: 'bg-red-700/10'
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: 'Tudo em Ordem',
        desc: 'Suas métricas principais estão dentro da normalidade para este período.',
        icon: <Lightbulb className="w-5 h-5 text-indigo-500" />,
        color: 'bg-indigo-500/10'
      });
    }

    return insights;
  };

  const currentInsights = getInsights();

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      // History should alternate between user and model, usually starting with user.
      // If our first message is from the model (the welcome message), we might want to skip it for the API
      // if it's the very first exchange.
      const history = chatMessages
        .filter((_, i) => i > 0 || chatMessages[i].role === 'user') // Simplified: if first is model, skip it for API history
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const dreContext = {
        month: currentMonthLabel,
        year: selectedYear,
        summary: {
          faturamento: currentMonthData.faturamento,
          ebitda: currentMonthData.ebitda,
          netProfit: currentMonthData.netProfit,
          mc: mc,
          mcPercent: (mcPercent * 100).toFixed(1) + '%',
          lucratividade: lucratividade.toFixed(1) + '%'
        },
        groups: dreGroups.map(g => ({
          label: g.label,
          total: g.total,
          items: g.items?.map(i => ({ label: i.label, valor: i.valor }))
        }))
      };

      const response = await chatWithConsultant(userMessage, dreContext, history);
      setChatMessages(prev => [...prev, { role: 'model', text: response || 'Desculpe, tive um erro ao processar sua solicitação.' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar-se ao consultor. Verifique sua chave de API.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Dynamic yearly data for the current month comparison
  const yearNum = parseInt(selectedYear);
  const yearsToCompare = [
    (yearNum - 2).toString(),
    (yearNum - 1).toString(),
    selectedYear
  ];

  const yearlyComparisonData = yearsToCompare.map((y, idx) => {
    // Attempt to find data for this specific year and month in the timeline
    const timelineData = dreTimeline.find(p => 
      String(p.month).trim().toLowerCase() === String(currentMonthLabel).trim().toLowerCase() && 
      String(p.year || '2026').trim() === String(y).trim()
    );
    
    // Logic: if it's the selected year, use current data. 
    // Otherwise, try timeline data, then fallback to yearlyHistory (manual entries).
    const faturamento = y === selectedYear 
      ? currentMonthData.faturamento 
      : (timelineData ? timelineData.faturamento : (yearlyHistory[y] || 0));

    const colors = ['#94a3b8', '#6366f1', '#4f46e5'];
    
    return {
      year: y,
      faturamento,
      color: colors[idx]
    };
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-bold italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {showEntry ? 'Lançamentos DRE' : `DRE Inteligente`}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium lowercase">
              {showEntry ? 'Preencha os dados financeiros da unidade' : 'Demonstrativo de Resultados do Exercício Detalhado'}
            </p>
            {!showEntry && (
              <div className="flex items-center gap-1 bg-black px-2 py-1 rounded-2xl ml-2">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-white"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value} className="bg-[#1E1E1E] text-white font-bold">{m.label}</option>
                  ))}
                </select>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-white"
                >
                  {['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map(year => (
                    <option key={year} value={year} className="bg-[#1E1E1E] text-white font-bold">{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowEntry(!showEntry)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFB800] hover:bg-black text-black hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#FFB800]/20"
          >
            {showEntry ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                Voltar à DRE
              </>
            ) : (
              <>
                Lançamentos DRE
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          {!showEntry && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 p-1.5 rounded-2xl">
              <button 
                onClick={handleExportPDF}
                className={`p-2 rounded-xl border transition-all active:scale-95 ${isDarkMode ? 'bg-[#333] border-[#444] text-white' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showEntry ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-end">
            <button
              onClick={handleResetPeriod}
              disabled={isDeleting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                showConfirmReset 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Zerando Dados...
                </>
              ) : showConfirmReset ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Clique denovo para Confirmar
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Zerar Informações do Período
                </>
              )}
            </button>
          </div>
          <DataEntrySection 
            isEmbedded={true} 
            mode="finance" 
            initialMonth={selectedMonth}
            initialYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Margem Bruta', value: `${marginBruta.toFixed(1)}%`, trend: '+2.1%', color: 'text-indigo-600' },
            { label: 'Lucratividade', value: `${lucratividade.toFixed(1)}%`, trend: '+0.8%', color: 'text-green-500' },
            { label: 'Ponto Equilíbrio', value: pontoEquilibrio > 0 ? formatCurrency(pontoEquilibrio) : '---', trend: pontoEquilibrio > 0 ? (pontoEquilibrio > (currentMonthData.faturamento || 0) ? 'Crítico' : 'Saudável') : 'MC Negativa', color: 'text-amber-500' },
            { label: 'Ticket Médio', value: formatCurrency(ticketMedio), trend: ticketMedio > 0 ? (ticketMedio > 60 ? 'Alto' : 'Normal') : '---', color: 'text-blue-500' },
          ].map((stat) => (
           <div key={stat.label} className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
             <div className="flex items-center justify-between">
               <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
               <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                 {stat.trend}
               </div>
             </div>
           </div>
         ))}
      </div>

      {/* Comparativo Anual do Mês Chart */}
      <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`font-black uppercase tracking-tighter italic text-xl flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              <TrendingUp className="w-5 h-5" style={{ color: brandColors.primary }} /> Comparativo Anual do Mês
            </h3>
            <p className="text-[10px] text-slate-500 font-medium italic">Faturamento de {currentMonthLabel} em {yearsToCompare.join(', ')}</p>
          </div>
          <div className="flex gap-4">
             {yearlyComparisonData.map(item => (
               <div key={item.year} className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                 <span className="text-[10px] font-bold text-slate-400 uppercase">{item.year}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyComparisonData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#333" : "#f0f0f0"} />
              <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#888', fontSize: 11, fontWeight: 800}} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#888', fontSize: 11, fontWeight: 800}}
                tickFormatter={(val) => `R$ ${val/1000}k`}
              />
              <Tooltip 
                cursor={{fill: isDarkMode ? '#ffffff05' : '#00000005'}}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                formatter={(val: number) => [formatCurrency(val), 'Faturamento']}
              />
              <Bar dataKey="faturamento" radius={[12, 12, 0, 0]}>
                {yearlyComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main DRE Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
             <div className={`px-8 py-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50/50 border-slate-100'}`}>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Estrutura de Resultados</span>
               <div className="flex gap-12">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">AV %</span>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Valor Nominal</span>
               </div>
             </div>

             <div className="p-4 space-y-2 overflow-x-auto">
                <div className="min-w-[600px] space-y-2">
                   {dreGroups.map((group) => (
                  <div key={group.id} className="space-y-1">
                    {/* Group Header */}
                    <div 
                      onClick={() => !group.isTotal && toggleGroup(group.id)}
                      className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all cursor-pointer ${
                        group.isTotal 
                          ? (isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-indigo-50/50 border border-indigo-100/50')
                          : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                      } ${group.border ? 'border-2 border-green-500/30 shadow-lg shadow-green-500/10' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {!group.isTotal && (
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroups.includes(group.id) ? '' : '-rotate-90'}`} />
                        )}
                        <span className={`text-xs font-black italic tracking-tighter ${group.isTotal ? (group.color || (isDarkMode ? 'dark:text-white' : 'text-black')) : (isDarkMode ? 'text-slate-500' : 'text-slate-800')}`}>
                          {group.label}
                        </span>
                      </div>
                      <div className="flex gap-10 items-center">
                         <span className={`text-[10px] font-bold w-10 text-right ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                           {((Math.abs(group.total) / currentMonthData.faturamento) * 100).toFixed(1)}%
                         </span>
                         <span className={`text-sm font-black w-32 text-right ${group.isTotal ? (group.color || (isDarkMode ? 'dark:text-white' : 'text-black')) : (isDarkMode ? 'text-slate-300' : 'text-black')}`}>
                           {formatCurrency(group.total)}
                         </span>
                      </div>
                    </div>

                    {/* Group Items */}
                    <AnimatePresence>
                      {expandedGroups.includes(group.id) && !group.isTotal && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1 px-4"
                        >
                          {group.items && group.items.map(item => (
                            <div key={item.label} className="flex items-center justify-between px-8 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <span className={`text-[11px] font-medium italic lowercase ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>{item.label}</span>
                              <div className="flex gap-10">
                                 <span className={`text-[9px] font-bold w-10 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                   {((Math.abs(item.valor) / currentMonthData.faturamento) * 100).toFixed(1)}%
                                 </span>
                                 <span className={`text-[11px] font-bold w-32 text-right ${item.valor < 0 ? 'text-red-400' : (isDarkMode ? 'text-slate-400' : 'text-slate-800')}`}>
                                   {formatCurrency(item.valor)}
                                 </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                </div>
             </div>
          </div>

          {/* Ranking de Lucratividade Section */}
          <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className={`font-black uppercase tracking-tighter italic text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>Top Lucratividade</h3>
                <p className={`text-[10px] font-medium italic ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>Baseado nas Fichas Técnicas importadas</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {topProducts.length > 0 ? [...topProducts]
                 .sort((a, b) => b.margin - a.margin)
                 .slice(0, 3)
                 .map((item, i) => (
                 <div key={item.id} className={`p-5 rounded-3xl border transition-all hover:scale-105 cursor-pointer ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-8 h-8 rounded-full ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-indigo-500' : 'bg-blue-500'} flex items-center justify-center text-[10px] font-black text-white`}>#{i+1}</div>
                      <span className="text-[10px] font-black text-green-500">{item.margin}% mrg</span>
                    </div>
                    <div className={`text-xs font-black uppercase tracking-tighter mb-1 break-words whitespace-normal leading-tight ${isDarkMode ? 'text-[#FFB800]' : 'text-slate-900'}`}>{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold italic">{formatCurrency(item.faturamento * (item.margin/100) / (item.quantidadeVendas || 1))} lucro liq.</div>
                 </div>
               )) : (
                 <div className="col-span-3 py-10 text-center text-slate-400 text-xs italic">
                   Nenhum produto cadastrado para análise de lucratividade.
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
           <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic ${isDarkMode ? 'text-slate-400' : 'text-black'}`}>Eficiência Operacional</h4>
              <div className="space-y-6">
                 {currentInsights.map((insight, idx) => (
                   <div key={idx} className="flex gap-4">
                     <div className={`p-2 rounded-xl ${insight.color}`}>
                       {insight.icon}
                     </div>
                     <div>
                       <div className={`text-xs font-black mb-1 uppercase tracking-tighter ${isDarkMode ? 'dark:text-white' : 'text-black'}`}>{insight.title}</div>
                       <p className={`text-[10px] italic leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-black'}`}>{insight.desc}</p>
                     </div>
                   </div>
                 ))}
              </div>

              <div 
                onClick={handleExportPDF}
                className={`mt-10 p-5 rounded-3xl border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${
                isDarkMode ? 'bg-black/20 border-white/5 hover:bg-[#E63946]' : 'bg-slate-50 border-slate-100 hover:bg-[#0066FF]'
              }`}>
                 <div className="flex items-center gap-3">
                   <FileText className="w-5 h-5 text-amber-500 transition-colors" />
                   <span className={`text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors ${isDarkMode ? 'dark:text-white' : 'text-slate-900'}`}>Exportar DRE PDF</span>
                 </div>
                 <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </div>
           </div>

           <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/20' : 'bg-white border-slate-200'}`}>
              <div className={`flex items-center gap-3 mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                <Zap className={`w-5 h-5 fill-current ${currentStore.brand === 'BEBELU' && !isDarkMode ? 'text-amber-500' : ''}`} />
                <span className="text-xs font-black uppercase tracking-[0.2em] italic">Chat com Consultor IA</span>
              </div>
              <p className={`${isDarkMode ? 'text-white/60' : 'text-black'} text-[10px] leading-relaxed mb-6`}>
                Como posso ajudar a otimizar sua margem este mês? Pergunte sobre qualquer conta da DRE.
              </p>
              <button 
                onClick={() => setShowChat(true)}
                className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all ${isDarkMode ? 'bg-white text-slate-900' : 'bg-black text-white'}`}
                style={currentStore.brand === 'BEBELU' && isDarkMode ? { color: '#000', backgroundColor: '#FFCB05' } : {}}
              >
                Chat com Consultor IA
              </button>
           </div>
        </div>
      </div>
      </>
      )}
      {/* AI Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl h-[80vh] flex flex-col rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100'}`}
            >
              {/* Chat Header */}
              <div className={`px-8 py-6 border-b flex items-center justify-between ${isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <MessagesSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-black dark:text-white uppercase tracking-tighter italic text-lg leading-tight">Consultor IA Financeiro</h3>
                    <p className="text-[10px] text-slate-500 font-bold italic tracking-wider">Gestão & Otimização de Margem</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-10">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-2">
                      <Zap className="w-8 h-8 text-indigo-500" />
                    </div>
                    <p className="text-sm font-black dark:text-white uppercase italic tracking-tighter">Olá! Como posso te ajudar hoje?</p>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                      Tenho acesso aos seus dados de {currentMonthLabel} {selectedYear}. Pergunte sobre sua margem, despesas ou como aumentar seu lucro.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-3xl p-5 text-sm ${
                      msg.role === 'user' 
                        ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-black text-white rounded-tr-none')
                        : (isDarkMode ? 'bg-black/40 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-800 rounded-tl-none')
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className={`rounded-3xl p-5 ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-slate-100'}`}>
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className={`p-6 border-t ${isDarkMode ? 'bg-black/20 border-[#333]' : 'bg-slate-50 border-slate-100'}`}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative"
                >
                  <input 
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Pergunte sobre sua DRE..."
                    className={`w-full bg-white dark:bg-[#1E1E1E] border ${isDarkMode ? 'border-[#333] text-white' : 'border-slate-200'} rounded-2xl py-4 pl-6 pr-14 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                  />
                  <button 
                    type="submit"
                    disabled={!currentMessage.trim() || isChatLoading}
                    className="absolute right-2 top-2 p-3 bg-[#FFB800] hover:bg-black text-black hover:text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#FFB800] disabled:hover:text-black"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
