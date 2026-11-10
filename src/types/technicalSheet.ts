export type ChannelType = 'BALCAO' | 'IFOOD';

export type SheetCategory = 'MASSAS' | 'WRAPS' | 'LASANHAS' | 'PARMEGIANAS';

export interface IngredientItem {
  id: string;
  nome: string;
  unidade: 'g' | 'kg' | 'ml' | 'l' | 'un';
  quantidade: number;
  custoUnitario: number; // Custo por unidade padrão (ex: R$ por g, ml, un ou kg)
  custoTotal: number;    // Calculado: (quantidade * custoUnitario)
  subRecipeId?: string;  // Vínculo com a sub-receita de base
  subRecipeNome?: string;
}

export interface PackagingItem {
  id: string;
  nome: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

export interface PrepStep {
  passo: number;
  titulo?: string;
  descricao: string;
  alertaPonto?: string;
  tempoMinutos?: number;
}

export interface InflationHistoryPoint {
  mes: string;
  custoTotal: number;
  precoVenda: number;
  cmvPercent: number;
  motivoVariacao?: string;
  itemPrincipalImpactado?: string;
}

export interface TechnicalSheet {
  id: string;
  nome: string;
  canal: ChannelType;
  categoria: SheetCategory;
  descricao: string;
  ingredientes: IngredientItem[];
  embalagens: PackagingItem[];
  custoInsumos: number;
  custoEmbalagens: number;
  custoTotal: number; // custoInsumos + custoEmbalagens
  precoVenda: number;
  cmvTeoricoPercent: number; // (custoTotal / precoVenda) * 100
  taxaCanalPercent: number; // Ex: 28% iFood, 7% Balcão
  impostoSimplesPercent: number; // Ex: 5%
  margemContribuicaoReais: number;
  margemContribuicaoPercent: number;
  pesoFinalGramas: number;
  tempoPreparoMinutos: number;
  utensiliosPadrao: string[];
  passosPreparo: PrepStep[];
  observacoesCozinha?: string;
  dataCriacao?: string;
  ultimaAtualizacao: string;
  historicoInflacao?: InflationHistoryPoint[];
}

export interface SubRecipeIngredient {
  id: string;
  nome: string;
  quantidade: number;
  unidade: 'g' | 'kg' | 'ml' | 'l' | 'un';
  custoUnitario: number;
  custoTotal: number;
}

export interface SubRecipeStep {
  passo: number;
  titulo?: string;
  descricao: string;
  alertaPonto?: string;
  tempoMinutos?: number;
}

export type SubRecipeCategory = 'MOLHOS' | 'MASSAS' | 'PROTEINAS' | 'BASES';

export interface SubRecipe {
  id: string;
  nome: string;
  categoria: SubRecipeCategory;
  descricao: string;
  rendimentoLote: number; // Ex: 5000 (ml) ou 4000 (g)
  unidadeRendimento: 'g' | 'kg' | 'ml' | 'l' | 'un';
  tempoPreparoMinutos: number;
  validadeDias: number;
  temperaturaArmazenamento?: string; // Ex: "0°C a 4°C em GN fechada com etiqueta"
  ingredientes: SubRecipeIngredient[];
  custoTotalLote: number;
  custoUnitarioCalculado: number; // R$ por ml ou por g
  utensiliosPadrao: string[];
  passosPreparo: SubRecipeStep[];
  observacoes?: string;
  ultimaAtualizacao: string;
}
