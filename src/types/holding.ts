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
