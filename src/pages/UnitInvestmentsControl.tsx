import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Download,
  Filter,
  Layers,
  TrendingUp,
  Scale,
  DollarSign,
  Search,
  Trash2,
  Edit3,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Coins,
  RefreshCw,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Check
} from 'lucide-react';

/**
 * Modelo de Dados de Lançamento de Investimentos & Aportes por Unidade
 */
export interface LancamentoInvestimento {
  id: string | number;
  unidade: string;
  status_unidade: 'Em Operação' | 'Fechada';
  natureza_gasto: 'Pré-Operacional' | 'Investimento' | 'Lucro / Prejuízo';
  historico: string;
  quem_pagou: string;
  valor: number;
  data: string; // Formato DD/MM/YYYY
  mes_ano: string; // Ex: "dez-2025"
}

// Chave para persistência segura no LocalStorage
const LOCAL_STORAGE_KEY = 'grupo_azevedo_investimentos_unidades_v1';

// Dados Mock Iniciais detalhados para o Grupo Azevedo
const INITIAL_MOCK_DATA: LancamentoInvestimento[] = [
  {
    id: 'inv-001',
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Implantação de Sistema PDV e Servidor em Nuvem',
    quem_pagou: 'Pagos Pela B28',
    valor: 8500.0,
    data: '15/10/2025',
    mes_ano: 'out-2025',
  },
  {
    id: 'inv-002',
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Investimento',
    historico: 'Reforma Civil, Elétrica Trifásica e Pintura Técnica',
    quem_pagou: 'Holding Azevedo',
    valor: 38450.0,
    data: '20/11/2025',
    mes_ano: 'nov-2025',
  },
  {
    id: 'inv-003',
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Investimento',
    historico: 'Aquisição de Coifas Industriais e Fritadeiras de Alta Performance',
    quem_pagou: 'Holding Azevedo',
    valor: 62000.0,
    data: '05/12/2025',
    mes_ano: 'dez-2025',
  },
  {
    id: 'inv-004',
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Treinamento de Equipe Operacional e Diárias de Consultoria',
    quem_pagou: 'Pagos Pela B28',
    valor: 4200.0,
    data: '12/12/2025',
    mes_ano: 'dez-2025',
  },
  {
    id: 'inv-005',
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Lucro / Prejuízo',
    historico: 'Aporte para Cobertura de Déficit Operacional de Rampa (Mês 1)',
    quem_pagou: 'Holding Azevedo',
    valor: -14800.0,
    data: '08/01/2026',
    mes_ano: 'jan-2026',
  },
  {
    id: 'inv-006',
    unidade: 'Unidade B32 - Mossoró',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Investimento',
    historico: 'Adequação de Fachada Comercial e Letreiro Luminoso LED',
    quem_pagou: 'Holding Azevedo',
    valor: 16800.0,
    data: '14/09/2025',
    mes_ano: 'set-2025',
  },
  {
    id: 'inv-007',
    unidade: 'Unidade B32 - Mossoró',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Marcenaria de Balcão e Montagem de Salão',
    quem_pagou: 'Holding Azevedo',
    valor: 12300.0,
    data: '28/09/2025',
    mes_ano: 'set-2025',
  },
  {
    id: 'inv-008',
    unidade: 'Unidade B32 - Mossoró',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Investimento',
    historico: 'Aporte Direto de Capital de Giro Inicial da Operação',
    quem_pagou: 'Conta Master Grupo AZ',
    valor: 25000.0,
    data: '02/10/2025',
    mes_ano: 'out-2025',
  },
  {
    id: 'inv-009',
    unidade: 'Unidade B32 - Mossoró',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Lucro / Prejuízo',
    historico: 'Cobertura de Saldo Negativo de Caixa Pós-Carnaval',
    quem_pagou: 'Holding Azevedo',
    valor: -6200.0,
    data: '15/02/2026',
    mes_ano: 'fev-2026',
  },
  {
    id: 'inv-010',
    unidade: 'Unidade Centro',
    status_unidade: 'Fechada',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Desmobilização, Frete de Retirada de Ativos e Rescisões',
    quem_pagou: 'Holding Azevedo',
    valor: 22500.0,
    data: '18/06/2025',
    mes_ano: 'jun-2025',
  },
  {
    id: 'inv-011',
    unidade: 'Unidade Centro',
    status_unidade: 'Fechada',
    natureza_gasto: 'Lucro / Prejuízo',
    historico: 'Quitação Acordada de Passivo Locatício e IPTU Residual',
    quem_pagou: 'Conta Master Grupo AZ',
    valor: -18900.0,
    data: '30/07/2025',
    mes_ano: 'jul-2025',
  },
  {
    id: 'inv-012',
    unidade: 'Vero Pasta',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Projeto Arquitetônico, Manual de Marca e Vigilância Sanitária',
    quem_pagou: 'Holding Azevedo',
    valor: 9800.0,
    data: '05/01/2026',
    mes_ano: 'jan-2026',
  },
  {
    id: 'inv-013',
    unidade: 'Vero Pasta',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Investimento',
    historico: 'Masseira Industrial Italiana e Fornos de Convecção',
    quem_pagou: 'Sócio Administrador',
    valor: 44500.0,
    data: '22/01/2026',
    mes_ano: 'jan-2026',
  },
  {
    id: 'inv-014',
    unidade: 'Vero Pasta',
    status_unidade: 'Em Operação',
    natureza_gasto: 'Pré-Operacional',
    historico: 'Campanha de Tráfego Pago & Coquetel de Inauguração para Imprensa',
    quem_pagou: 'Holding Azevedo',
    valor: 6500.0,
    data: '10/02/2026',
    mes_ano: 'fev-2026',
  },
  {
    id: 'inv-015',
    unidade: 'Unidade Aldeota',
    status_unidade: 'Fechada',
    natureza_gasto: 'Lucro / Prejuízo',
    historico: 'Prejuízo Operacional Acumulado Assumido na Desativação',
    quem_pagou: 'Holding Azevedo',
    valor: -29400.0,
    data: '15/04/2025',
    mes_ano: 'abr-2025',
  },
];

/**
 * Função utilitária de formatação em Moeda Brasileira (R$)
 */
const formatBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

/**
 * Converte data YYYY-MM-DD para DD/MM/YYYY e mes-ano
 */
function parseDateDetails(isoDate: string): { dataStr: string; mesAno: string } {
  if (!isoDate) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return {
      dataStr: `${d}/${m}/${y}`,
      mesAno: `${months[now.getMonth()]}-${y}`,
    };
  }

  const [y, m, d] = isoDate.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthIdx = parseInt(m, 10) - 1;
  const mesAno = `${months[monthIdx] || 'mes'}-${y}`;
  return {
    dataStr: `${d}/${m}/${y}`,
    mesAno,
  };
}

/**
 * Componente Principal: Controle de Investimentos - Unidades
 * Pronto para uso como página ou aba no Next.js / Vite / React SPA
 */
export default function UnitInvestmentsControl() {
  // Estado principal dos lançamentos
  const [lancamentos, setLancamentos] = useState<LancamentoInvestimento[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignora erro de JSON e usa mock padrão
    }
    return INITIAL_MOCK_DATA;
  });

  // Salva no LocalStorage sempre que alterar
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lancamentos));
    } catch {
      // fallback silencioso
    }
  }, [lancamentos]);

  // Filtros
  const [filtroUnidade, setFiltroUnidade] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroNatureza, setFiltroNatureza] = useState<string>('TODAS');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const itensPorPagina = 8;

  // Estados dos Modais
  const [modalNovoAberto, setModalNovoAberto] = useState<boolean>(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<LancamentoInvestimento | null>(null);
  const [toastMessage, setToastMessage] = useState<{ tipo: 'success' | 'info'; texto: string } | null>(null);

  // Form State para Novo/Editar Lançamento
  const [formData, setFormData] = useState({
    unidade: 'Unidade B28',
    status_unidade: 'Em Operação' as 'Em Operação' | 'Fechada',
    natureza_gasto: 'Investimento' as 'Pré-Operacional' | 'Investimento' | 'Lucro / Prejuízo',
    historico: '',
    quem_pagou: 'Holding Azevedo',
    valor: '',
    dataIso: new Date().toISOString().split('T')[0],
  });

  // Mostra toast de notificação suave
  const mostrarToast = (texto: string, tipo: 'success' | 'info' = 'success') => {
    setToastMessage({ texto, tipo });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Unidades únicas existentes para preencher os selects
  const listaUnidades = useMemo(() => {
    const unidadesSet = new Set<string>();
    lancamentos.forEach((l) => unidadesSet.add(l.unidade));
    return Array.from(unidadesSet).sort();
  }, [lancamentos]);

  // Cálculos dos KPIs (Cards de Resumo no topo)
  const kpis = useMemo(() => {
    let totalPreOperacional = 0;
    let totalInvestimentoCapex = 0;
    let lucroPrejuizoAssumido = 0;
    let totalGeralAportado = 0;

    lancamentos.forEach((item) => {
      totalGeralAportado += item.valor;

      if (item.natureza_gasto === 'Pré-Operacional') {
        totalPreOperacional += item.valor;
      } else if (item.natureza_gasto === 'Investimento') {
        totalInvestimentoCapex += item.valor;
      } else if (item.natureza_gasto === 'Lucro / Prejuízo') {
        lucroPrejuizoAssumido += item.valor;
      }
    });

    return {
      totalPreOperacional,
      totalInvestimentoCapex,
      lucroPrejuizoAssumido,
      totalGeralAportado,
      quantidadeTotal: lancamentos.length,
    };
  }, [lancamentos]);

  // Lançamentos Filtrados
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      // Filtro de Unidade
      if (filtroUnidade !== 'TODAS' && item.unidade !== filtroUnidade) {
        return false;
      }

      // Filtro de Status da Unidade
      if (filtroStatus !== 'TODOS' && item.status_unidade !== filtroStatus) {
        return false;
      }

      // Filtro de Natureza
      if (filtroNatureza !== 'TODAS' && item.natureza_gasto !== filtroNatureza) {
        return false;
      }

      // Termo de busca livre (Histórico, Quem pagou ou Unidade)
      if (termoBusca.trim() !== '') {
        const query = termoBusca.toLowerCase().trim();
        const noHistorico = item.historico.toLowerCase().includes(query);
        const noQuemPagou = item.quem_pagou.toLowerCase().includes(query);
        const naUnidade = item.unidade.toLowerCase().includes(query);
        if (!noHistorico && !noQuemPagou && !naUnidade) {
          return false;
        }
      }

      return true;
    });
  }, [lancamentos, filtroUnidade, filtroStatus, filtroNatureza, termoBusca]);

  // Resetar página quando os filtros mudam
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroUnidade, filtroStatus, filtroNatureza, termoBusca]);

  // Dados paginados para a tabela
  const totalPaginas = Math.max(1, Math.ceil(lancamentosFiltrados.length / itensPorPagina));
  const lancamentosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return lancamentosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [lancamentosFiltrados, paginaAtual]);

  // Limpar todos os filtros
  const handleLimparFiltros = () => {
    setFiltroUnidade('TODAS');
    setFiltroStatus('TODOS');
    setFiltroNatureza('TODAS');
    setTermoBusca('');
  };

  // Abrir modal de criação
  const handleAbrirCriacao = () => {
    setItemEmEdicao(null);
    setFormData({
      unidade: 'Unidade B28',
      status_unidade: 'Em Operação',
      natureza_gasto: 'Investimento',
      historico: '',
      quem_pagou: 'Holding Azevedo',
      valor: '',
      dataIso: new Date().toISOString().split('T')[0],
    });
    setModalNovoAberto(true);
  };

  // Abrir modal para editar
  const handleAbrirEdicao = (item: LancamentoInvestimento) => {
    setItemEmEdicao(item);

    // Tenta reverter a data DD/MM/YYYY para YYYY-MM-DD
    let iso = new Date().toISOString().split('T')[0];
    if (item.data && item.data.includes('/')) {
      const parts = item.data.split('/');
      if (parts.length === 3) {
        iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    setFormData({
      unidade: item.unidade,
      status_unidade: item.status_unidade,
      natureza_gasto: item.natureza_gasto,
      historico: item.historico,
      quem_pagou: item.quem_pagou,
      valor: String(item.valor),
      dataIso: iso,
    });
    setModalNovoAberto(true);
  };

  // Salvar novo lançamento ou edição
  const handleSalvarLancamento = (e: React.FormEvent) => {
    e.preventDefault();

    const valorNumerico = parseFloat(formData.valor.replace(',', '.'));
    if (isNaN(valorNumerico)) {
      mostrarToast('Por favor, informe um valor monetário válido.', 'info');
      return;
    }

    if (!formData.historico.trim()) {
      mostrarToast('Por favor, preencha o histórico do lançamento.', 'info');
      return;
    }

    const { dataStr, mesAno } = parseDateDetails(formData.dataIso);

    if (itemEmEdicao) {
      // Atualizar existente
      setLancamentos((prev) =>
        prev.map((item) =>
          item.id === itemEmEdicao.id
            ? {
                ...item,
                unidade: formData.unidade.trim(),
                status_unidade: formData.status_unidade,
                natureza_gasto: formData.natureza_gasto,
                historico: formData.historico.trim(),
                quem_pagou: formData.quem_pagou.trim(),
                valor: valorNumerico,
                data: dataStr,
                mes_ano: mesAno,
              }
            : item
        )
      );
      mostrarToast('Lançamento atualizado com sucesso!');
    } else {
      // Criar novo
      const novo: LancamentoInvestimento = {
        id: `inv-${Date.now()}`,
        unidade: formData.unidade.trim(),
        status_unidade: formData.status_unidade,
        natureza_gasto: formData.natureza_gasto,
        historico: formData.historico.trim(),
        quem_pagou: formData.quem_pagou.trim(),
        valor: valorNumerico,
        data: dataStr,
        mes_ano: mesAno,
      };

      setLancamentos((prev) => [novo, ...prev]);
      mostrarToast('Novo lançamento adicionado com sucesso!');
    }

    setModalNovoAberto(false);
  };

  // Excluir lançamento
  const handleExcluir = (id: string | number) => {
    if (window.confirm('Tem certeza de que deseja remover este lançamento?')) {
      setLancamentos((prev) => prev.filter((item) => item.id !== id));
      mostrarToast('Lançamento removido.');
    }
  };

  // Exportar Relatório em CSV compatível com Excel (UTF-8 com BOM)
  const handleExportarRelatorio = () => {
    if (lancamentosFiltrados.length === 0) {
      mostrarToast('Nenhum dado encontrado para exportação.', 'info');
      return;
    }

    const colunas = [
      'ID',
      'Natureza do Gasto',
      'Histórico',
      'Unidade',
      'Status da Unidade',
      'Quem Pagou',
      'Data',
      'Mês/Ano',
      'Valor (R$)',
    ];

    const linhas = lancamentosFiltrados.map((item) => [
      `"${item.id}"`,
      `"${item.natureza_gasto}"`,
      `"${item.historico.replace(/"/g, '""')}"`,
      `"${item.unidade}"`,
      `"${item.status_unidade}"`,
      `"${item.quem_pagou.replace(/"/g, '""')}"`,
      `"${item.data}"`,
      `"${item.mes_ano}"`,
      `"${item.valor.toFixed(2).replace('.', ',')}"`,
    ]);

    const conteudoCSV = '\uFEFF' + [colunas.join(';'), ...linhas.map((l) => l.join(';'))].join('\r\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `investimentos_unidades_grupo_azevedo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast(`Exportados ${lancamentosFiltrados.length} lançamentos com sucesso!`);
  };

  // Restaura dados mock padrão se a lista for esvaziada
  const handleRestaurarPadrao = () => {
    if (window.confirm('Deseja recarregar os dados padrão de demonstração?')) {
      setLancamentos(INITIAL_MOCK_DATA);
      mostrarToast('Dados padrão restaurados com sucesso!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-12">
      {/* Toast Flutuante de Feedback */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border border-gray-200 bg-white text-gray-800 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toastMessage.tipo === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <span>{toastMessage.texto}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 1. HEADER DA PÁGINA */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-orange-100 text-orange-800 border border-orange-200">
                <Coins className="w-3.5 h-3.5 text-orange-600" />
                Holding Financeira • Grupo Azevedo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1.5">
              Investimentos & Aportes por Unidade
            </h1>
            <p className="text-sm text-gray-500 font-normal mt-1">
              Gestão detalhada de gastos pré-operacionais, capex e resultados operacionais assumidos.
            </p>
          </div>

          {/* Botões de Ação do Header */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleExportarRelatorio}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold text-sm shadow-xs transition-all active:scale-95 cursor-pointer bg-white"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>EXPORTAR RELATÓRIO</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirCriacao}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ NOVO LANÇAMENTO</span>
            </button>
          </div>
        </header>

        {/* 2. CARDS DE RESUMO (KPIs - NO TOPO) */}
        <section aria-label="Indicadores Chave de Investimentos">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Total Pré-Operacional */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Pré-Operacional
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {formatBRL(kpis.totalPreOperacional)}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Gastos antes da abertura e implantação
                </p>
              </div>
            </div>

            {/* Card 2: Total Investimento/Capex */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Investimento/Capex
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {formatBRL(kpis.totalInvestimentoCapex)}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Aportes diretos em obras, máquinas e ativos
                </p>
              </div>
            </div>

            {/* Card 3: Lucro / Prejuízo Assumido */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Lucro / Prejuízo Assumido
                </span>
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    kpis.lucroPrejuizoAssumido < 0
                      ? 'bg-red-50 border-red-100 text-red-600'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}
                >
                  <Scale className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div
                  className={`text-2xl font-extrabold tracking-tight ${
                    kpis.lucroPrejuizoAssumido < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatBRL(kpis.lucroPrejuizoAssumido)}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Coberturas de caixas negativos e passivos
                </p>
              </div>
            </div>

            {/* Card 4: Total Geral Aportado */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ring-1 ring-orange-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Geral Aportado
                </span>
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-orange-600 tracking-tight">
                  {formatBRL(kpis.totalGeralAportado)}
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500 font-medium">
                  <span>Soma líquida de aportes</span>
                  <span className="font-semibold text-gray-700">{lancamentos.length} lançamentos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. FILTROS E CONTROLES (ACIMA DA TABELA) */}
        <section className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
              <Filter className="w-4 h-4 text-orange-500" />
              <span>Filtros Avançados de Pesquisa</span>
            </div>

            {(filtroUnidade !== 'TODAS' ||
              filtroStatus !== 'TODOS' ||
              filtroNatureza !== 'TODAS' ||
              termoBusca !== '') && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar todos os filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro 1: Unidade */}
            <div>
              <label htmlFor="filtro-unidade" className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Unidade
              </label>
              <select
                id="filtro-unidade"
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="TODAS">Todas as Unidades</option>
                {listaUnidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 2: Status da Unidade */}
            <div>
              <label htmlFor="filtro-status" className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Status da Unidade
              </label>
              <select
                id="filtro-status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="Em Operação">Em Operação</option>
                <option value="Fechada">Fechada</option>
              </select>
            </div>

            {/* Filtro 3: Natureza */}
            <div>
              <label htmlFor="filtro-natureza" className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Natureza do Gasto
              </label>
              <select
                id="filtro-natureza"
                value={filtroNatureza}
                onChange={(e) => setFiltroNatureza(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="TODAS">Todas as Naturezas</option>
                <option value="Pré-Operacional">Pré-Operacional</option>
                <option value="Investimento">Investimento</option>
                <option value="Lucro / Prejuízo">Lucro / Prejuízo</option>
              </select>
            </div>

            {/* Filtro 4: Busca por Histórico / Quem Pagou */}
            <div>
              <label htmlFor="termo-busca" className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Buscar por Histórico / Origem
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="termo-busca"
                  type="text"
                  placeholder="Ex: Sistema, Mão de Obra..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-9 pr-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. TABELA DE LANÇAMENTOS (MAIN CONTENT) */}
        <section className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Registros de Lançamentos
              </h2>
              <p className="text-xs text-gray-500">
                Exibindo {lancamentosFiltrados.length} de {lancamentos.length} aportes cadastrados
              </p>
            </div>

            {lancamentos.length === 0 && (
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Lançamentos Padrão</span>
              </button>
            )}
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 border-b border-gray-200 uppercase text-xs font-semibold tracking-wider">
                  <th scope="col" className="px-6 py-3.5">Natureza do Gasto</th>
                  <th scope="col" className="px-6 py-3.5">Histórico</th>
                  <th scope="col" className="px-6 py-3.5">Unidade</th>
                  <th scope="col" className="px-6 py-3.5">Quem Pagou</th>
                  <th scope="col" className="px-6 py-3.5">Data (Mês/Ano)</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Valor</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {lancamentosPaginados.length > 0 ? (
                  lancamentosPaginados.map((item) => {
                    const isPrejuizoNegativo = item.natureza_gasto === 'Lucro / Prejuízo' && item.valor < 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/80 transition-colors group"
                      >
                        {/* Natureza do Gasto com Badge Colorida */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.natureza_gasto === 'Pré-Operacional' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Pré-Operacional
                            </span>
                          )}
                          {item.natureza_gasto === 'Investimento' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Investimento
                            </span>
                          )}
                          {item.natureza_gasto === 'Lucro / Prejuízo' && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                item.valor < 0
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.valor < 0 ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                              ></span>
                              Lucro / Prejuízo
                            </span>
                          )}
                        </td>

                        {/* Histórico */}
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs md:max-w-sm truncate" title={item.historico}>
                          {item.historico}
                        </td>

                        {/* Unidade + Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.unidade}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.status_unidade === 'Em Operação'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {item.status_unidade}
                            </span>
                          </div>
                        </td>

                        {/* Quem Pagou */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {item.quem_pagou}
                          </span>
                        </td>

                        {/* Data (Mês/Ano) */}
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{item.data}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal">
                              {item.mes_ano}
                            </span>
                          </div>
                        </td>

                        {/* Valor: Negrito; Em vermelho se Lucro/Prejuízo for negativo */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`font-bold text-base ${
                              isPrejuizoNegativo ? 'text-red-600 font-extrabold' : 'text-gray-900'
                            }`}
                          >
                            {formatBRL(item.valor)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicao(item)}
                              title="Editar Lançamento"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluir(item.id)}
                              title="Excluir Lançamento"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                      <div className="max-w-xs mx-auto space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="font-bold text-gray-700">Nenhum lançamento encontrado</p>
                        <p className="text-xs text-gray-500">
                          Nenhum registro corresponde aos filtros selecionados. Tente ajustar a busca ou limpe os filtros.
                        </p>
                        <button
                          type="button"
                          onClick={handleLimparFiltros}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-semibold cursor-pointer"
                        >
                          Redefinir Filtros
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé com Paginação Simples */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600 font-medium">
            <div>
              Mostrando{' '}
              <span className="font-bold text-gray-900">
                {lancamentosFiltrados.length === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1}
              </span>{' '}
              a{' '}
              <span className="font-bold text-gray-900">
                {Math.min(paginaAtual * itensPorPagina, lancamentosFiltrados.length)}
              </span>{' '}
              de <span className="font-bold text-gray-900">{lancamentosFiltrados.length}</span> resultados
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                disabled={paginaAtual <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <span className="px-2 font-bold text-gray-800">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MODAL: + NOVO LANÇAMENTO / EDITAR */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {itemEmEdicao ? 'Editar Lançamento' : 'Novo Lançamento de Investimento'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Gestão de aportes por unidade do Grupo Azevedo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvarLancamento} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Unidade */}
                <div>
                  <label htmlFor="modal-unidade" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Unidade *
                  </label>
                  <input
                    id="modal-unidade"
                    type="text"
                    required
                    list="lista-sugestoes-unidades"
                    placeholder="Ex: Unidade B28"
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <datalist id="lista-sugestoes-unidades">
                    <option value="Unidade B28" />
                    <option value="Unidade B32 - Mossoró" />
                    <option value="Vero Pasta" />
                    <option value="Unidade Centro" />
                    <option value="Unidade Aldeota" />
                  </datalist>
                </div>

                {/* Status da Unidade */}
                <div>
                  <label htmlFor="modal-status" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Status da Unidade *
                  </label>
                  <select
                    id="modal-status"
                    value={formData.status_unidade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status_unidade: e.target.value as 'Em Operação' | 'Fechada',
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Em Operação">Em Operação</option>
                    <option value="Fechada">Fechada</option>
                  </select>
                </div>
              </div>

              {/* Natureza do Gasto */}
              <div>
                <label htmlFor="modal-natureza" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Natureza do Gasto *
                </label>
                <select
                  id="modal-natureza"
                  value={formData.natureza_gasto}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      natureza_gasto: e.target.value as 'Pré-Operacional' | 'Investimento' | 'Lucro / Prejuízo',
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                >
                  <option value="Pré-Operacional">Pré-Operacional (Gastos antes da abertura)</option>
                  <option value="Investimento">Investimento (Capex, obras, maquinário, expansão)</option>
                  <option value="Lucro / Prejuízo">Lucro / Prejuízo (Cobertura de resultados/déficits)</option>
                </select>
              </div>

              {/* Histórico */}
              <div>
                <label htmlFor="modal-historico" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Histórico / Descrição *
                </label>
                <input
                  id="modal-historico"
                  type="text"
                  required
                  placeholder="Ex: Implantação Sistema, Diária, Mão de Obra..."
                  value={formData.historico}
                  onChange={(e) => setFormData({ ...formData, historico: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quem Pagou */}
                <div>
                  <label htmlFor="modal-quem-pagou" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Quem Pagou *
                  </label>
                  <input
                    id="modal-quem-pagou"
                    type="text"
                    required
                    placeholder="Ex: Pagos Pela B28, Holding..."
                    value={formData.quem_pagou}
                    onChange={(e) => setFormData({ ...formData, quem_pagou: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Data */}
                <div>
                  <label htmlFor="modal-data" className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Data do Aporte *
                  </label>
                  <input
                    id="modal-data"
                    type="date"
                    required
                    value={formData.dataIso}
                    onChange={(e) => setFormData({ ...formData, dataIso: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Valor (R$) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="modal-valor" className="block text-xs font-bold text-gray-700 uppercase">
                    Valor (R$) *
                  </label>
                  {formData.natureza_gasto === 'Lucro / Prejuízo' && (
                    <span className="text-[11px] text-gray-500 italic">
                      Use valor negativo (-) para prejuízos cobertos
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    id="modal-valor"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-3.5 py-2.5 text-base text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  {itemEmEdicao ? 'Salvar Alterações' : 'Adicionar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
