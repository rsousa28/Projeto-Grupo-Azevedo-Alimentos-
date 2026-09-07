export type UnitBinding = 'B32' | 'B28' | 'VERO' | 'HOLDING';

export interface BankLoan {
  id: string;
  bank: string; // Ex: Santander, Bradesco, Banco do Brasil, Itaú, CEF
  modality: string; // Ex: Capital de Giro, Pronampe, Finame, Aquisição de Máquinas
  principal: number; // Valor Total Financiado
  currentBalance: number; // Saldo Devedor Atual
  installmentsTotal: number; // Quantidade Total de Parcelas
  installmentsPaid: number; // Quantidade de Parcelas Pagas
  monthlyPayment: number; // Valor da Parcela Mensal
  rate: string; // Taxa de Juros (a.m. ou a.a.)
  dueDate: string; // Data ou dia de Vencimento
  unit: UnitBinding; // Loja que responde pelo pagamento
  status: 'Em Dia' | 'Atrasado' | 'Liquidado';
  createdAt: string;
  notes?: string;
}

export type LiabilityCategory = string;

export type StoreOnlyBinding = 'B32' | 'B28' | 'VERO';

export type PayerResponsibility = 'HOLDING' | 'RATEIO' | 'B32' | 'B28' | 'VERO' | string;

export interface StoreLiability {
  id: string;
  unit: string; // 'B32' | 'B28' | 'VERO' | 'HOLDING' | Loja encerrada
  unitName?: string;
  isClosedStore?: boolean;
  payerResponsibility?: PayerResponsibility; // Quem assume a parcela mensal
  category: string; // Input livre ou categoria sugerida
  creditor: string; // Ex: Receita Federal, Ambev, Acordo Trabalhista
  totalAmount: number; // Valor Total do Passivo
  monthlyPayment: number; // Parcela Mensal
  installmentsRemaining?: number;
  status: 'Em Dia' | 'Atrasado' | 'Em Negociação' | 'Quitado';
  dueDate?: string;
  dueDay?: number; // Dia de vencimento (1 a 31)
  createdAt: string;
  notes?: string;
}

export interface StoreBenchmark {
  id: string;
  code: StoreOnlyBinding;
  name: string;
  brand: string;
  location: string;
  monthlyRevenue: number;
  ebitda: number;
  cmv: number;
  margin: number;
  operationalStatus: string;
}

export interface ViabilityPlanilha {
  // Parâmetros de Entrada
  monthlyRevenue: number; // Faturamento mensal (ex: 75000)
  cmvPercent: number; // CMV % (ex: 35)
  fixedExpenses: number; // Despesas Fixas mensais adicionadas (ex: 35000)
  marketingPercent: number; // Despesas variáveis com Fundo de Marketing % (ex: 1)
  royaltiesPercent: number; // Despesas variáveis com Royalties % (ex: 3)
  cardFeesPercent: number; // Despesas variáveis com Taxas de cartão e pix % (ex: 4)
  creditSalesPercent: number; // Peso da venda a prazo nas vendas totais % (ex: 65)
  clientTermDays: number; // Prazo médio clientes em dias (ex: 2)
  creditPurchasesPercent: number; // Peso das compras a prazo nas vendas totais % (ex: 100)
  supplierTermDays: number; // Prazo médio do fornecedor em dias (ex: 15)
  stockDays: number; // Estoque em dias (ex: 15)
  capex: number; // Capex (bens de capital) para 12 meses (ex: 280000)

  // Indicadores Calculados
  monthlyPurchases: number; // Compras mensais (Premissa: CMV = Reposição de Estoque) (ex: 26250)
  grossProfit: number; // Lucro bruto total mensal adicionado mensal (ex: 48750)
  grossMarginPercent: number; // Margem bruta% (ex: 65)
  marketingExpense: number; // Despesas variáveis com Fundo de Marketing (ex: 750)
  royaltiesExpense: number; // Despesas variáveis com Royalties (ex: 2250)
  cardFeesExpense: number; // Despesas variáveis com Taxas de cartão e pix (ex: 3000)
  ebitdaMonthly: number; // EBITDA mensal adicionado (ex: 7750)
  ebitdaMarginPercent: number; // Margem EBITDA% (ex: 10.33)
  receivablesInvestment: number; // Investimento em Contas a Receber mensal (ex: 3217.50)
  supplierFinancing: number; // Financiamento de Fornecedores mensal (ex: 13125)
  stockInvestment: number; // Investimento em Estoque mensal (ex: 13125)
  ncgMonthly: number; // Necessidade de Capital de Giro (NCG) mensal (ex: 3217.50)
  totalInvestment: number; // Investimento (CAPEX + NCG x 12 meses) (ex: 283217.50)
  paybackMonths: number; // Payback em Meses (ex: 36.54)
  breakEvenMonthly: number; // PONTO DE EQUILÍBRIO (ex: 53846.15)
}

export interface InvestmentProject {
  id: string;
  projectName: string;
  type: string; // Ex: 'Nova Unidade Física', 'Infraestrutura de Delivery', 'Tecnologia Operacional', 'Reforma & Ampliação'
  stage: string; // Ex: 'Em Estudo / Viabilidade', 'Prospecção Imobiliária', 'Obras e Reformas', 'Implantação Piloto', 'Concluído / Inaugurado'
  capexBudget: number; // Orçamento Total Capex
  spentSoFar: number; // Aportado até o momento
  projectedMonthlyRevenue: number; // Receita Mensal Projetada
  expectedPaybackMonths: number; // Payback Estimado (meses)
  projectedRoi: string; // Ex: '34% a.a.'
  targetLaunch: string; // Previsão de Inauguração / Conclusão
  responsible: string; // Responsável / Diretoria
  notes?: string;
  createdAt: string;
  viability?: ViabilityPlanilha; // Planilha completa de viabilidade financeira
}
