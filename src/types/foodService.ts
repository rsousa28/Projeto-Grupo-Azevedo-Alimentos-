export type UnitOfMeasure = 'g' | 'kg' | 'ml' | 'l' | 'un';

export type IngredientCategory = 
  | 'PROTEINAS' 
  | 'MASSAS' 
  | 'MOLHOS' 
  | 'HORTIFRUTI' 
  | 'LATICINIOS' 
  | 'EMBALAGENS' 
  | 'DESCARTAVEIS' 
  | 'TEMPEROS'
  | 'OUTROS';

export type AllergenType = 
  | 'GLUTEN' 
  | 'LACTOSE' 
  | 'OVOS' 
  | 'SOJA' 
  | 'OLEAGINOSAS' 
  | 'PEIXES' 
  | 'CRUSTACEOS';

export interface IngredientPriceHistoryEntry {
  id: string;
  data: string; // YYYY-MM-DD
  precoEmbalagemCompraCentavos: number;
  quantidadeEmbalagemCompra: number;
  unidadeUso: UnitOfMeasure;
  fornecedor?: string;
  motivo?: string;
  responsavel?: string;
}

export interface IngredientMaster {
  id: string;
  storeId: string; // '3' = Vero Pasta
  nome: string;
  categoria: IngredientCategory;
  fornecedorPadrao?: string;
  
  // Compra vs Unidade de Uso (Precisão Estrita)
  unidadeCompraNome: string; // Ex: "Saco 1kg", "Caixa 5kg", "Garrafa 900ml", "Fardo c/ 100un"
  precoEmbalagemCompraCentavos: number; // Armazenado em centavos inteiros (ex: 480 centavos = R$ 4,80)
  quantidadeEmbalagemCompra: number; // Quantidade de unidades de uso na embalagem (ex: 1000g, 900ml, 100un)
  unidadeUso: UnitOfMeasure; // 'g' | 'ml' | 'un'
  dataUltimaCompra: string;
  
  // Fatores Técnicos
  fatorCorrecao: number; // FC = Peso Bruto / Peso Líquido (ex: 1.15 = 15% perda na limpeza)
  indiceCoccao: number; // IC = Peso Cozido / Peso Cru (ex: 2.20 = dobra no cozimento)
  
  // Alérgenos e Segurança Alimentar
  alergenos: AllergenType[];
  
  ativo: boolean;
  observacoes?: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Sub-Receitas & Fichas Técnicas Normalizadas
// -------------------------------------------------------------

export interface SubRecipeItemRef {
  tipo: 'INSUMO' | 'SUB_RECEITA';
  itemId: string;
  unidade: UnitOfMeasure;
  quantidadeLiquida: number;
  fatorCorrecaoOverride?: number;
}

export interface SubRecipe {
  id: string;
  storeId: string;
  nome: string;
  categoria: 'MOLHOS' | 'MASSAS' | 'PROTEINAS' | 'BASES';
  descricao?: string;
  
  itens: SubRecipeItemRef[];
  rendimentoLoteTotal: number; // Rendimento total produzido por lote (ex: 4000 g ou ml)
  unidadeRendimento: UnitOfMeasure;
  
  tempoPreparoMinutos: number;
  validadeDias: number;
  temperaturaArmazenamento: string;
  utensiliosPadrao: string[];
  passosPreparo: Array<{
    passo: number;
    titulo?: string;
    descricao: string;
    alertaPonto?: string;
    tempoMinutos?: number;
  }>;
  updatedAt: string;
}

export type SalesChannel = 'BALCAO' | 'IFOOD' | 'WHATSAPP_DELIVERY';

export interface ChannelTaxRates {
  comissaoMarketplace: number; // Ex: 0.27 (27%)
  taxaPagamentoOnline: number; // Ex: 0.032 (3,2%)
  impostoSimples: number; // Ex: 0.055 (5,5%)
  coparticipacaoPromocao: number; // Ex: 0.02 (2%)
}

export interface DishItemRef {
  tipo: 'INSUMO' | 'SUB_RECEITA';
  itemId: string;
  unidade: UnitOfMeasure;
  quantidadeLiquida: number;
  fatorCorrecaoOverride?: number; // Para itens crus colocados diretamente no prato
}

export interface DishPackagingItemRef {
  insumoId: string; // Referência a um insumo do tipo EMBALAGENS/DESCARTAVEIS
  quantidade: number;
}

export interface DishChannelConfig {
  ativo: boolean;
  precoVendaCentavos: number; // Preço praticado no canal em centavos inteiros
  embalagens: DishPackagingItemRef[];
  taxasOverride?: Partial<ChannelTaxRates>; // Opcional
}

export interface DishTechnicalSheet {
  id: string;
  storeId: string;
  codigoPrato?: string;
  nome: string;
  categoria: 'MASSAS' | 'WRAPS' | 'LASANHAS' | 'PARMEGIANAS' | 'SOBREMESAS' | 'OUTROS';
  
  // Itens da receita pura (sem custos duplicados)
  itens: DishItemRef[];
  
  // Configuração por Canal (Balcão, iFood)
  canais: Partial<Record<SalesChannel, DishChannelConfig>>;
  
  versao: number;
  dataUltimaRevisaoPrecos: string;
  updatedAt: string;
}

export interface DishKitchenPOP {
  id: string; // Mesmo ID do prato
  storeId: string;
  nomePrato: string;
  categoria: string;
  fotoEmpratamentoUrl?: string;
  pesoFinalGramas: number;
  tempoPreparoMinutos: number;
  ingredientesOperacionais: Array<{
    nome: string;
    quantidadeLiquida: number;
    unidade: UnitOfMeasure;
    observacaoPreparo?: string;
  }>;
  alergenos: AllergenType[];
  utensilios: string[];
  passosPreparo: Array<{
    passo: number;
    titulo?: string;
    descricao: string;
    alertaPonto?: string;
    tempoMinutos?: number;
  }>;
  dicasMontagem?: string;
  updatedAt: string;
}

export interface StoreFoodServiceSettings {
  storeId: string;
  metaCmvPercent: number; // Ex: 0.30 (30%)
  alertaDesatualizadoDias: number; // Ex: 30 dias
  taxaRateioDespesasFixasPercent: number; // Ex: 0.18 (18%)
  margemLucroDesejadaPercent: number; // Ex: 0.15 (15%)
  canaisDefault: {
    BALCAO: ChannelTaxRates;
    IFOOD: ChannelTaxRates;
    WHATSAPP_DELIVERY?: ChannelTaxRates;
  };
}
