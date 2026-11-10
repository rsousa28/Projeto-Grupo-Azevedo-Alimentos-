import {
  calcularCustoUnitarioInsumo,
  aplicarFatorCorrecao,
  calcularCustoLinha,
  formatarMoedaBRL,
  formatarPercentualBRL,
  calcularPrecoSugeridoMarkup,
  calcularMetricasCanal,
  calcularPontoEquilibrio,
  getCmvStatus,
  formatarCustoUnidadeUso,
  formatarFatorBRL,
  formatarDataBRL
} from './foodServiceMath';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

export function runFoodServiceMathTests() {
  console.log('🧪 Iniciando testes unitários do Motor Matemático Food Service...');

  // 1. Insumos Baratos por Grama (Farinha, Sal, Óleo)
  // Farinha de Trigo: R$ 4,80 por 1kg (1000g) = R$ 0,0048 / g (0,48 centavos/g)
  const custoFarinha = calcularCustoUnitarioInsumo(480, 1000);
  assert(Math.abs(custoFarinha - 0.0048) < 0.0000001, 'Custo da farinha de trigo deve ser 0.0048 R$/g');

  // Sal Refinado: R$ 2,50 por 1kg (1000g) = R$ 0,0025 / g (0,25 centavos/g)
  const custoSal = calcularCustoUnitarioInsumo(250, 1000);
  assert(Math.abs(custoSal - 0.0025) < 0.0000001, 'Custo do sal refinado deve ser 0.0025 R$/g');

  // Óleo de Soja: R$ 7,50 por garrafa de 900ml = R$ 0,008333... / ml
  const custoOleo = calcularCustoUnitarioInsumo(750, 900);
  assert(Math.abs(custoOleo - (7.5 / 900)) < 0.0000001, 'Custo do óleo deve ter alta precisão sem arredondar para centavos');

  // 2. Fator de Correção
  // Peito de Frango cru com 15% de perda (limpeza de gordura/pele) -> FC = 1.15
  // Receita precisa de 100g líquido -> Peso Bruto necessário = 115g
  const pesoBrutoFrango = aplicarFatorCorrecao(100, 1.15);
  assert(Math.abs(pesoBrutoFrango - 115) < 0.0001, 'Peso bruto de frango deve ser 115g para 100g líquido');

  // Custo de linha com FC:
  // Frango comprado a R$ 22,00/kg (2200 centavos / 1000g = R$ 0.022/g). 100g líquido com FC 1.15 = 115g * 0.022 = R$ 2,53
  const custoFrangoUnitario = calcularCustoUnitarioInsumo(2200, 1000);
  const custoLinhaFrango = calcularCustoLinha(100, custoFrangoUnitario, 1.15);
  assert(Math.abs(custoLinhaFrango - 2.53) < 0.001, `Custo de linha do frango deve ser R$ 2,53 (obtido: ${custoLinhaFrango})`);

  // 3. Formatação Padrão Brasileiro
  const fmtMoeda = formatarMoedaBRL(12.74);
  assert(fmtMoeda.includes('12,74'), `Formatação de moeda deve conter '12,74' com vírgula. Obtido: ${fmtMoeda}`);

  const fmtPercent = formatarPercentualBRL(0.337);
  assert(fmtPercent === '33,7%', `Formatação de percentual deve ser '33,7%'. Obtido: ${fmtPercent}`);

  // 4. Markup Divisor - Cenário Normal
  // Custo Direto: R$ 11,20 (1120 centavos)
  // Deduções canal iFood: 27% + 3.2% + 5.5% = 35.7% (0.357)
  // Despesas Fixas: 18% (0.18)
  // Margem Lucro Desejada: 15% (0.15)
  // Soma = 0.687 -> Divisor = 1 - 0.687 = 0.313
  // Preço Sugerido = 11.20 / 0.313 = R$ 35,78 (3578 centavos)
  const markupNormal = calcularPrecoSugeridoMarkup({
    custoDiretoCentavos: 1120,
    taxasDeducoesPercent: 0.357,
    despesasFixasRateadasPercent: 0.18,
    lucroDesejadoPercent: 0.15
  });
  assert(markupNormal.valido === true, 'Markup com divisor positivo deve ser válido');
  assert(markupNormal.precoSugeridoCentavos !== null, 'Preço sugerido não pode ser nulo');
  assert(Math.abs((markupNormal.precoSugeridoCentavos || 0) - 3578) <= 2, 'Preço sugerido deve ser aproximadamente 3578 centavos');

  // 5. Markup Divisor - Trava de Inviabilidade (soma >= 100%)
  const markupInvalido = calcularPrecoSugeridoMarkup({
    custoDiretoCentavos: 1120,
    taxasDeducoesPercent: 0.50,
    despesasFixasRateadasPercent: 0.35,
    lucroDesejadoPercent: 0.20 // 50% + 35% + 20% = 105% (soma > 100%)
  });
  assert(markupInvalido.valido === false, 'Markup com soma >= 100% deve ser bloqueado');
  assert(markupInvalido.precoSugeridoCentavos === null, 'Preço sugerido inválido deve ser nulo');

  // 6. Métricas por Canal
  const metricas = calcularMetricasCanal(1120, 3590, {
    comissaoMarketplace: 0.27,
    taxaPagamentoOnline: 0.032,
    impostoSimples: 0.055,
    coparticipacaoPromocao: 0.0
  });
  assert(metricas.cmvPercent > 0.30 && metricas.cmvPercent < 0.32, 'CMV deve ficar em torno de 31,2%');
  assert(metricas.margemCentavos > 0, 'Margem em centavos deve ser positiva');

  // 7. Ponto de Equilíbrio
  // Despesas Fixas: R$ 25.000,00 (2.500.000 centavos)
  // Margem Média: 40% (0.40)
  // Faturamento Mínimo = R$ 62.500,00 (6.250.000 centavos)
  // Ticket Médio: R$ 35,00 (3500 centavos)
  // Pratos/mês = 1786 pratos -> Pratos/dia = 60 pratos
  const pe = calcularPontoEquilibrio(2500000, 0.40, 3500);
  assert(pe.faturamentoMinimoCentavos === 6250000, 'Faturamento mínimo do ponto de equilíbrio deve ser R$ 62.500,00');
  assert(pe.pratosPorDia === 60, 'Quantidade de pratos por dia no ponto de equilíbrio deve ser 60');

  // 8. Teste Específico Requisito Crítico 1: Custo 9,89 / Preço 32,90 => "30,1%"
  const custoPrato = 9.89;
  const precoPrato = 32.90;
  const cmvCalculadoDecimal = custoPrato / precoPrato; // 0.3006079...
  const percentFormatado = formatarPercentualBRL(cmvCalculadoDecimal, 1);
  assert(percentFormatado === '30,1%', `Custo 9,89 / Preço 32,90 deve formatar para '30,1%'. Obtido: ${percentFormatado}`);

  // Teste Crítico: Prato com CMV > 100% (Custo R$ 10,00 / Preço R$ 5,00 => 200,0% em vermelho)
  // Garante que o motor não divide por 100 erroneamente valores maiores que 1.0!
  const custoPrejuizo = 10.00;
  const precoPrejuizo = 5.00;
  const cmvPrejuizo = custoPrejuizo / precoPrejuizo; // 2.0 (200%)
  const percentPrejuizoFmt = formatarPercentualBRL(cmvPrejuizo, 1);
  assert(percentPrejuizoFmt === '200,0%', `Custo R$ 10,00 / Preço R$ 5,00 deve formatar para '200,0%'. Obtido: ${percentPrejuizoFmt}`);

  const statusPrejuizo = getCmvStatus(cmvPrejuizo, 0.32);
  assert(statusPrejuizo.status === 'ALTO', 'CMV de 200,0% deve ser ALTO (vermelho)');
  assert(statusPrejuizo.textoClasse.includes('text-rose') || statusPrejuizo.badgeClasse.includes('rose'), 'CMV de 200,0% deve ter classe de cor vermelha (rose)');

  // 9. Teste do Semáforo Único de CMV (getCmvStatus)
  const statusOtimo = getCmvStatus(0.301, 0.32); // 30,1% <= 32% meta
  assert(statusOtimo.status === 'OTIMO', '30,1% com meta 32% deve ser OTIMO (verde)');
  assert(statusOtimo.label === 'Ótimo', 'Label deve ser Ótimo');

  const statusAtencao = getCmvStatus(0.335, 0.32); // 33,5% <= 35% (meta + 3 p.p.)
  assert(statusAtencao.status === 'ATENCAO', '33,5% com meta 32% deve ser ATENCAO (amarelo)');
  assert(statusAtencao.label === 'Atenção', 'Label deve ser Atenção');

  const statusAlto = getCmvStatus(0.360, 0.32); // 36,0% > 35%
  assert(statusAlto.status === 'ALTO', '36,0% com meta 32% deve ser ALTO (vermelho)');
  assert(statusAlto.label === 'Alto', 'Label deve ser Alto');

  // 10. Teste de Custo por Unidade de Uso (Bechamel: R$ 0,014/ml -> R$ 14,00/L)
  const custoBechamel = 0.014;
  const fmtBechamel = formatarCustoUnidadeUso(custoBechamel, 'ml');
  assert(fmtBechamel.principal.includes('14,00') && fmtBechamel.principal.includes('/L'), `Bechamel deve exibir principal em R$/L. Obtido: ${fmtBechamel.principal}`);
  assert(fmtBechamel.secundario.includes('0,014'), `Bechamel deve exibir secundário por ml com vírgula. Obtido: ${fmtBechamel.secundario}`);

  console.log('✅ Todos os testes do motor matemático passaram com 100% de sucesso!');
}

// Auto-execução ao rodar diretamente via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runFoodServiceMathTests();
}
