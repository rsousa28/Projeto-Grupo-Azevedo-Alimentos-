// Precificação PRO: modelo de dados ligado por ID.
// Produtos guardam só referências e quantidades; todo custo é calculado na hora
// a partir do cadastro atual (engine.ts). Mudou o preço de um ingrediente, tudo recalcula.

export type Unit = 'g' | 'ml' | 'un';

// Valores por 100 g (ou 100 ml) do ingrediente, como no rótulo / tabela TACO
export interface Nutrients {
  kcal: number;
  carb: number;
  sugarTotal: number;
  sugarAdded: number;
  protein: number;
  fatTotal: number;
  fatSat: number;
  fatTrans: number;
  fiber: number;
  sodium: number; // mg
}

export interface PricePoint {
  date: string; // ISO
  price: number;
  purchaseQty: number;
  source?: string; // ex.: "NF 12345 · Laticínios Serra"
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  unit: Unit;
  purchaseQty: number; // quantidade bruta comprada (ex: 1000 g)
  netQty: number;      // quantidade líquida aproveitada (ex: 950 g) -> fator = bruta / líquida
  price: number;       // preço pago pela quantidade bruta (R$)
  supplier?: string;
  gramsPerUnit?: number; // para unidade 'un': peso de 1 unidade, usado na nutrição
  nutrients?: Partial<Nutrients>;
  priceHistory?: PricePoint[];
  updatedAt: string;
}

export interface Packaging {
  id: string;
  code: string;
  name: string;
  packQty: number;   // unidades no pacote
  packPrice: number; // preço do pacote (R$)
  supplier?: string;
  updatedAt: string;
}

export interface RecipeLine {
  kind: 'ingredient' | 'recipe';
  refId: string;
  qty: number; // na unidade do item referenciado
}

export interface BaseRecipe {
  id: string;
  code: string;
  name: string;
  unit: Unit;
  yieldQty: number;    // rendimento final (ex: 1000 g)
  prepMinutes: number;
  workers: number;
  lossFactor: number;  // fator de perda adicional sobre o custo (1 = nenhuma)
  lines: RecipeLine[];
  notes?: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role?: string;
  salary: number;
  chargesPct: number;   // encargos sobre o salário (ex: 0.36)
  benefits: number;     // VT, VA etc. por mês (R$)
  hoursPerMonth: number;
}

export interface Equipment {
  id: string;
  name: string;
  value: number;
  lifeYears: number;
  residualValue: number;
}

export interface Expense {
  id: string;
  name: string;
  value: number; // R$ por mês
  kind: 'fixed' | 'variable';
}

export interface EnergySource {
  id: string;
  name: string;           // ex: "Fogão 4 bocas", "Forno elétrico"
  type: 'gas' | 'electric';
  cylinderPrice?: number; // gás: preço do botijão (R$)
  cylinderKg?: number;    // gás: kg do botijão (13 / 45)
  kgPerHour?: number;     // gás: consumo do equipamento em kg/h
  powerWatts?: number;    // elétrico: potência
  kwhPrice?: number;      // elétrico: tarifa R$/kWh
}

export interface EnergyLine {
  sourceId: string;
  minutes: number;   // tempo ligado no preparo
  batchUnits: number; // quantas unidades saem nesse tempo (divide o custo)
}

export interface PackLine {
  packagingId: string;
  qty: number;
}

export interface OpStep {
  id: string;
  title: string;
  text: string;
  photo?: string; // data URL comprimida
}

export interface OperationalSheet {
  utensils: string[];
  steps: OpStep[];
  assembly: string;  // ordem de montagem
  checks: string[];  // conferência final
  notes?: string;
}

export type ProductKind = 'product' | 'drink';

export interface Product {
  id: string;
  code: string;
  kind: ProductKind;
  name: string;
  category: string;
  photo?: string;
  lines: RecipeLine[];
  packaging: PackLine[];
  deliveryPackaging?: PackLine[]; // embalagens extras só no delivery
  energy: EnergyLine[];
  laborMinutes: number;
  laborWorkers: number;
  extraCost: number;        // taxas / extras por unidade (R$)
  salePrice: number;        // preço no salão / balcão
  deliveryPrice?: number;   // preço no app de delivery (opcional)
  targetMarginPct?: number; // sobrescreve a margem padrão
  monthlySales: number;     // unidades vendidas por mês (dashboard e ponto de equilíbrio)
  portionGrams?: number;    // porção do rótulo; padrão = peso total
  portionLabel?: string;    // ex: "1 unidade", "1 fatia"
  liquid?: boolean;         // rótulo em ml e limites de líquido
  ops?: OperationalSheet;
  version: number;
  updatedAt: string;
}

export interface ComboItem {
  productId: string;
  qty: number;
}

export interface Combo {
  id: string;
  code: string;
  name: string;
  photo?: string;
  items: ComboItem[];
  packaging: PackLine[];
  salePrice: number;
  deliveryPrice?: number;
  monthlySales: number;
  updatedAt: string;
}

export interface PricingConfig {
  cnpj?: string;             // CNPJ da loja (confere o destinatário das notas)
  taxPct: number;            // imposto sobre venda (Simples)
  cardFeePct: number;        // taxa média de cartão no salão
  deliveryFeePct: number;    // comissão do app de delivery
  deliveryCardFeePct: number;// taxa de pagamento online no app
  targetMarginPct: number;   // lucro líquido desejado
  cmvTargetPct: number;      // meta de CMV (alerta)
  revenueEstimate: number;   // faturamento mensal estimado (0 = usa vendas cadastradas)
  payrollMode: 'unit' | 'fixed'; // 'unit': mão de obra entra por minuto no produto; 'fixed': folha vai para custos fixos
  expenses: Expense[];
  employees: Employee[];
  equipment: Equipment[];
  energy: EnergySource[];
  categories: string[];
  updatedAt: string;
}

export interface PricingData {
  config: PricingConfig;
  ingredients: Ingredient[];
  packaging: Packaging[];
  recipes: BaseRecipe[];
  products: Product[];
  combos: Combo[];
}

// ---------------------------------------------------------------
// Notas fiscais de entrada (NF-e) e vínculo item do fornecedor -> cadastro
// ---------------------------------------------------------------

export type InvoiceTarget = 'ingredient' | 'packaging' | 'ignore';

export interface InvoiceItem {
  index: number;       // nItem
  code: string;        // cProd (código do produto no fornecedor)
  ean?: string;        // cEAN
  description: string; // xProd
  ncm?: string;
  unit: string;        // uCom (KG, UN, CX...)
  qty: number;         // qCom
  unitPrice: number;   // vUnCom
  total: number;       // vProd
  discount: number;    // vDesc
  // Conferência (preenchido ao revisar a nota)
  target?: InvoiceTarget;
  refId?: string;      // ingrediente ou embalagem vinculada
  factor?: number;     // quantas unidades do cadastro (g, ml, un) vêm em 1 unidade da nota
  apply?: boolean;     // atualizar o preço deste item ao autorizar
}

export interface Invoice {
  id: string;          // chave de acesso (44 dígitos)
  number: string;
  series: string;
  issuedAt: string;    // ISO
  supplierCnpj: string;
  supplierName: string;
  recipientCnpj: string;
  recipientName?: string;
  total: number;
  items: InvoiceItem[];
  status: 'pending' | 'applied' | 'dismissed';
  source: 'xml' | 'sefaz';
  appliedAt?: string;
  appliedBy?: string;
  appliedCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Memória dos vínculos: o mesmo produto do mesmo fornecedor é reconhecido sozinho nas próximas notas. */
export interface SupplierItemMap {
  id: string;          // `${supplierCnpj}_${code}`
  supplierCnpj: string;
  code: string;
  description: string;
  target: InvoiceTarget;
  refId?: string;
  factor: number;
  updatedAt: string;
}
