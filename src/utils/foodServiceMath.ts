/**
 * Motor Matemático Puro de Food Service - Grupo Azevedo
 * 
 * Regras Estritas:
 * 1. Cálculos internos em ponto flutuante de alta precisão (sem arredondamento intermediário em insumos baratos).
 * 2. Arredondamento para centavos inteiros (R$ 0,00) apenas no resultado final para exibição ou persistência em centavos.
 * 3. Formatação monetária e percentual estrita no padrão brasileiro ("R$ 12,74" e "33,7%" com vírgula).
 * 4. Nenhuma taxa fixa: parâmetros fornecidos como entrada.
 */

import { ChannelTaxRates } from '../types/foodService';

/**
 * Calcula o custo unitário por g, ml ou un em Reais decimais de alta precisão.
 * @param precoEmbalagemCentavos Preço pago na embalagem de compra em centavos (ex: 480 para R$ 4,80)
 * @param quantidadeEmbalagem Quantidade contida na embalagem na unidade de uso (ex: 1000 para 1kg em g)
 * @returns Custo em Reais por unidade de uso (ex: R$ 0,0048 por grama)
 */
export function calcularCustoUnitarioInsumo(
  precoEmbalagemCentavos: number,
  quantidadeEmbalagem: number
): number {
  if (quantidadeEmbalagem <= 0 || precoEmbalagemCentavos <= 0) return 0;
  const precoReais = precoEmbalagemCentavos / 100;
  return precoReais / quantidadeEmbalagem;
}

/**
 * Aplica o Fator de Correção (FC = Peso Bruto / Peso Líquido).
 * Para obter o peso bruto a ser comprado/custado a partir do peso líquido exigido na receita.
 */
export function aplicarFatorCorrecao(
  quantidadeLiquida: number,
  fatorCorrecao?: number
): number {
  const fc = fatorCorrecao && fatorCorrecao > 0 ? fatorCorrecao : 1.0;
  return quantidadeLiquida * fc;
}

/**
 * Calcula o custo total de uma linha de ingrediente aplicando o Fator de Correção.
 */
export function calcularCustoLinha(
  quantidadeLiquida: number,
  custoUnitarioReais: number,
  fatorCorrecao?: number
): number {
  const pesoBruto = aplicarFatorCorrecao(quantidadeLiquida, fatorCorrecao);
  return pesoBruto * custoUnitarioReais;
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$ 12,74).
 * @param valor Valor em Reais ou Centavos
 * @param isCentavos Se true, divide por 100 antes de formatar
 */
export function formatarMoedaBRL(valor: number, isCentavos = false): string {
  const numReais = isCentavos ? valor / 100 : valor;
  if (isNaN(numReais) || !isFinite(numReais)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numReais);
}

/**
 * Formata um percentual no padrão brasileiro (ex: 0.301 -> "30,1%" ou 2.0 -> "200,0%").
 * Conforme especificação: percentuais são sempre armazenados como decimal puro
 * e multiplicados por 100 apenas na formatação. Não aplica divisão heurística em runtime.
 * 
 * @param valorDecimal Valor em decimal puro (ex: 0.301 para 30,1%, 2.0 para 200,0%)
 * @param casas Quantidade de casas decimais (padrão: 1)
 */
export function formatarPercentualBRL(
  valorDecimal: number,
  casas = 1
): string {
  if (isNaN(valorDecimal) || !isFinite(valorDecimal)) return '0,0%';
  
  const base100 = valorDecimal * 100;
  return `${base100.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  })}%`;
}

/**
 * Semáforo Único de CMV do Grupo Azevedo (Fonte Única da Verdade para Todo o Sistema).
 * 
 * Regra Estrita:
 * - Verde (Ótimo): CMV <= meta
 * - Amarelo (Atenção): CMV <= meta + 3 p.p. (ex: até meta + 0.03)
 * - Vermelho (Alto): CMV > meta + 3 p.p.
 * 
 * @param cmv Valor do CMV em decimal puro (ex: 0.301 para 30,1%, 2.0 para 200,0%)
 * @param meta Meta de CMV configurada para a unidade em decimal (lida de StoreFoodServiceSettings)
 */
export interface CmvStatusResult {
  status: 'OTIMO' | 'ATENCAO' | 'ALTO';
  label: 'Ótimo' | 'Atenção' | 'Alto';
  badgeClasse: string;
  textoClasse: string;
  bgClasse: string;
  bordaClasse: string;
  descricao: string;
}

export function getCmvStatus(cmv: number, meta: number): CmvStatusResult {
  const limiteAmarelo = meta + 0.03; // meta + 3 pontos percentuais

  if (cmv <= meta) {
    return {
      status: 'OTIMO',
      label: 'Ótimo',
      badgeClasse: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      textoClasse: 'text-emerald-600',
      bgClasse: 'bg-emerald-50',
      bordaClasse: 'border-emerald-300',
      descricao: `Meta atingida (≤ ${formatarPercentualBRL(meta, 0)})`
    };
  }

  if (cmv <= limiteAmarelo) {
    return {
      status: 'ATENCAO',
      label: 'Atenção',
      badgeClasse: 'bg-amber-100 text-amber-800 border-amber-200',
      textoClasse: 'text-amber-600',
      bgClasse: 'bg-amber-50',
      bordaClasse: 'border-amber-300',
      descricao: `Atenção: até +3 p.p. da meta (${formatarPercentualBRL(cmv, 1)})`
    };
  }

  return {
    status: 'ALTO',
    label: 'Alto',
    badgeClasse: 'bg-rose-100 text-rose-800 border-rose-200',
    textoClasse: 'text-rose-600',
    bgClasse: 'bg-rose-50',
    bordaClasse: 'border-rose-300',
    descricao: `Crítico: acima de ${formatarPercentualBRL(limiteAmarelo, 0)} (${formatarPercentualBRL(cmv, 1)})`
  };
}

/**
 * Formata custo por unidade de uso no padrão Food Service:
 * Exibe o principal em R$/kg ou R$/L (ex: "R$ 14,00/L" ou "R$ 28,00/kg")
 * e secundário por g/ml com vírgula e até 4 casas decimais (ex: "R$ 0,0140/ml").
 */
export function formatarCustoUnidadeUso(
  custoPorGouMl: number,
  unidade: string
): { principal: string; secundario: string; textoCompleto: string } {
  const u = unidade.toLowerCase().trim();

  if (u === 'ml' || u === 'l' || u === 'litro' || u === 'litros') {
    const custoPorLitro = custoPorGouMl * 1000;
    const custoMl = custoPorGouMl.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    const principal = `${formatarMoedaBRL(custoPorLitro)}/L`;
    const secundario = `R$ ${custoMl}/ml`;
    return {
      principal,
      secundario,
      textoCompleto: `${principal} (${secundario})`
    };
  }

  if (u === 'g' || u === 'kg' || u === 'quilo' || u === 'quilos') {
    const custoPorKg = custoPorGouMl * 1000;
    const custoG = custoPorGouMl.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    const principal = `${formatarMoedaBRL(custoPorKg)}/kg`;
    const secundario = `R$ ${custoG}/g`;
    return {
      principal,
      secundario,
      textoCompleto: `${principal} (${secundario})`
    };
  }

  // Unidade inteira (un, pct, cx)
  const principal = `${formatarMoedaBRL(custoPorGouMl)}/${u}`;
  return {
    principal,
    secundario: '',
    textoCompleto: principal
  };
}

/**
 * Formata fator numérico (ex: FC ou IC) com vírgula brasileira (ex: 1.22 -> "1,22").
 */
export function formatarFatorBRL(fator: number, casas = 2): string {
  if (isNaN(fator) || !isFinite(fator)) return '1,00';
  return fator.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

/**
 * Formata data no formato brasileiro estrito (dd/mm/aaaa).
 */
export function formatarDataBRL(dataStr?: string | Date): string {
  if (!dataStr) return '--/--/----';
  try {
    if (typeof dataStr === 'string' && dataStr.includes('/')) {
      return dataStr; // Já formatada
    }
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return String(dataStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(dataStr);
  }
}

/**
 * Modelo de Mix de Meios de Pagamento do Balcão com cálculo de taxa média ponderada.
 */
export interface MeioPagamentoMix {
  id: string;
  nome: string;
  participacaoPercent: number; // Decimal (ex: 0.35 para 35%)
  taxaOperadoraPercent: number; // Decimal (ex: 0.0099 para 0,99%)
}

export const MIX_PAGAMENTOS_BALCAO_PADRAO: MeioPagamentoMix[] = [
  { id: 'pix', nome: 'Pix Instantâneo', participacaoPercent: 0.35, taxaOperadoraPercent: 0.0099 }, // 35% mix @ 0,99%
  { id: 'dinheiro', nome: 'Dinheiro Físico', participacaoPercent: 0.15, taxaOperadoraPercent: 0.00 }, // 15% mix @ 0%
  { id: 'debito', nome: 'Cartão de Débito', participacaoPercent: 0.25, taxaOperadoraPercent: 0.0149 }, // 25% mix @ 1,49%
  { id: 'credito', nome: 'Cartão de Crédito à Vista', participacaoPercent: 0.20, taxaOperadoraPercent: 0.0319 }, // 20% mix @ 3,19%
  { id: 'voucher', nome: 'Voucher Alimentação / VR', participacaoPercent: 0.05, taxaOperadoraPercent: 0.0650 }, // 5% mix @ 6,50%
];

/**
 * Calcula a taxa média ponderada do mix de pagamentos do balcão em decimal.
 */
export function calcularTaxaMediaPonderadaBalcao(mix: MeioPagamentoMix[]): number {
  const somaParticipacao = mix.reduce((sum, item) => sum + item.participacaoPercent, 0);
  if (somaParticipacao <= 0) return 0.025; // Fallback 2,5%

  const taxaPonderada = mix.reduce((sum, item) => {
    return sum + (item.participacaoPercent * item.taxaOperadoraPercent);
  }, 0) / somaParticipacao;

  return Number(taxaPonderada.toFixed(4));
}

/**
 * Parâmetros de entrada para o cálculo de Markup Divisor.
 */
export interface MarkupDivisorInput {
  custoDiretoCentavos: number;
  taxasDeducoesPercent: number; // Ex: 0.357 (35,7% somando comissão + taxa pagamento + simples)
  despesasFixasRateadasPercent: number; // Ex: 0.18 (18%)
  lucroDesejadoPercent: number; // Ex: 0.15 (15%)
}

export interface MarkupDivisorResult {
  precoSugeridoCentavos: number | null;
  divisor: number;
  valido: boolean;
  mensagemAlerta?: string;
}

/**
 * Calcula o Preço Sugerido utilizando a fórmula clássica de Markup Divisor:
 * Preço = Custo Direto / (1 - (Deduções + Despesas Fixas + Lucro Desejado))
 * Bloqueia e emite alerta amigável quando o divisor é <= 0.
 */
export function calcularPrecoSugeridoMarkup(input: MarkupDivisorInput): MarkupDivisorResult {
  const somaDeducoesEMargem = 
    input.taxasDeducoesPercent + 
    input.despesasFixasRateadasPercent + 
    input.lucroDesejadoPercent;
  
  const divisor = 1.0 - somaDeducoesEMargem;

  // Divisor menor ou igual a 1% é considerado inviável (ou perda matemática)
  if (divisor <= 0.01) {
    const somaFormatada = (somaDeducoesEMargem * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return {
      precoSugeridoCentavos: null,
      divisor,
      valido: false,
      mensagemAlerta: `A soma das deduções, custos fixos e margem desejada atinge ${somaFormatada}% (≥ 100%), impossibilitando o cálculo de markup divisor viável.`
    };
  }

  const precoSugeridoReais = (input.custoDiretoCentavos / 100) / divisor;
  return {
    precoSugeridoCentavos: Math.round(precoSugeridoReais * 100),
    divisor,
    valido: true
  };
}

/**
 * Calcula todas as métricas financeiras de um canal específico (CMV, Deduções, Margem).
 */
export function calcularMetricasCanal(
  custoDiretoCentavos: number,
  precoVendaCentavos: number,
  taxas: ChannelTaxRates
) {
  if (precoVendaCentavos <= 0) {
    return {
      cmvPercent: 0,
      deducoesCentavos: 0,
      margemCentavos: 0,
      margemPercent: 0
    };
  }

  const taxaTotal = 
    (taxas.comissaoMarketplace || 0) + 
    (taxas.taxaPagamentoOnline || 0) + 
    (taxas.impostoSimples || 0) + 
    (taxas.coparticipacaoPromocao || 0);

  const deducoesCentavos = Math.round(precoVendaCentavos * taxaTotal);
  const margemCentavos = precoVendaCentavos - custoDiretoCentavos - deducoesCentavos;
  const cmvPercent = custoDiretoCentavos / precoVendaCentavos;
  const margemPercent = margemCentavos / precoVendaCentavos;

  return {
    cmvPercent, // Decimal (ex: 0.312)
    deducoesCentavos, // Centavos inteiros
    margemCentavos, // Centavos inteiros
    margemPercent // Decimal (ex: 0.358)
  };
}

/**
 * Calcula o Ponto de Equilíbrio (Break-Even Point) da unidade.
 * @param despesasFixasCentavos Custo fixo mensal da unidade vindo da DRE
 * @param margemContribuicaoPonderadaPercent Margem de contribuição média ponderada em decimal (ex: 0.42)
 * @param ticketMedioCentavos Ticket médio por prato/pedido em centavos
 */
export function calcularPontoEquilibrio(
  despesasFixasCentavos: number,
  margemContribuicaoPonderadaPercent: number,
  ticketMedioCentavos: number
) {
  if (margemContribuicaoPonderadaPercent <= 0 || ticketMedioCentavos <= 0) {
    return {
      faturamentoMinimoCentavos: 0,
      pratosPorDia: 0,
      pratosPorMes: 0
    };
  }

  const faturamentoMinimoCentavos = Math.round(despesasFixasCentavos / margemContribuicaoPonderadaPercent);
  const pratosPorMes = Math.round(faturamentoMinimoCentavos / ticketMedioCentavos);
  const pratosPorDia = Math.ceil(pratosPorMes / 30);

  return {
    faturamentoMinimoCentavos,
    pratosPorDia,
    pratosPorMes
  };
}
