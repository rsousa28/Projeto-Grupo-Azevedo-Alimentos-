# Módulo Fichas Técnicas & Custos Enterprise – Grupo Azevedo (Vero Pasta)
*Plano Arquitetural & de Implementação Revisado (v2)*

Evolução arquitetural completa do módulo de **Fichas Técnicas & Custos** para o Grupo Azevedo (unidade Vero Pasta e demais unidades do grupo), transformando a estrutura atual em um sistema corporativo de engenharia de cardápio e custos para Food Service.

---

## Revisão das Decisões Críticas Solicitadas

> [!IMPORTANT]
> **Ajustes e refinamentos incorporados na versão 2 do plano:**
> 1. **Precisão Numérica de Alta Escala (Zero Distorção em Insumos Baratos)**: Preço da embalagem de compra armazenado em centavos inteiros (`precoEmbalagemCompraCentavos`) acompanhado da quantidade da embalagem (`quantidadeEmbalagemCompra`). O custo unitário por $g$, $ml$ ou $un$ é **calculado em tempo de execução com precisão decimal estrita** (6 casas decimais) e **arredondado para centavos apenas no resultado financeiro final exibido** ao usuário. Testes unitários cobrem farinha, sal refinado e óleo vegetal.
> 2. **Normalização Radical (Zero Custos Redundantes em Banco)**: Sub-receitas e pratos armazenam estritamente referências relacionais (`itemId`, `tipo`, `quantidadeLiquida`, `unidade`, `fatorCorrecao`). Custos, CMV, deduções e margens são sempre derivados na leitura pelo motor matemático. O vínculo reverso de pratos (`pratosVinculados`) é resolvido por consulta em memória. Snapshots com valores congelados residem unicamente em subcoleções de `historicoVersoes`.
> 3. **Taxas Parametrizadas com Fonte Única**: As taxas fiscais e comissões pertencem à configuração da unidade (`StoreFoodServiceSettings`). O prato armazena apenas preço de venda, embalagens e um `taxasOverride` opcional. Todos os percentuais são padronizados como **decimais puros** (ex: `0.27` para 27%, `0.055` para Simples Nacional).
> 4. **Segurança do Modo Cozinha (Split Collection + Firestore Rules)**: Separação arquitetural entre dados financeiros (`dishes/{dishId}`) e dados operacionais de preparo (`dishes_kitchen_pop/{dishId}`). Regras de segurança no Firestore bloqueiam leitura de campos financeiros pelo perfil `KITCHEN`.
> 5. **Migração Segura com Dry-Run e Rollback (Fase 1)**: Backup automático em JSON, tela de simulação prévia (*Dry-Run*) demonstrando a unificação dos 4 pratos reais (excluindo os 4 cards duplicados de iFood) e conversão das 5 sub-receitas com reversão com 1 clique (*Rollback*).
> 6. **Diagnóstico do Módulo Caixa & Solução de Vendas**: O módulo de Caixa atual registra apenas totais financeiros por forma de pagamento (não salva pratos individuais). A solução arquitetada para o CMV ponderado e Matriz Kasavana & Smith (Fase 5) é o **Importador de Relatório de Itens Vendidos do iFood/PDV (CSV/Excel)** aliado a um painel de conferência de volume vendido por período.
> 7. **Subcoleções e Robustez de Markup**: `historicoPrecos` e `historicoVersoes` alocados em subcoleções (prevenindo o limite de 1 MB do Firestore). O Markup Divisor possui trava matemática explícita quando a soma das deduções e margem desejada atinge ou supera 100% ($\text{divisor} \le 0$).

---

## 1. Diagnóstico do Módulo Caixa & Estratégia de Dados de Venda

### Análise da Situação Atual
A inspeção detalhada do código-fonte (`src/pages/CashClosing.tsx` e `src/types.ts`) revelou que:
- O **Fechamento de Caixa diário (`CashClosingForm`)** consolida valores financeiros agregados por meio de pagamento (`delivery`, `creditCard`, `debitCard`, `refeicao`, `pix`, `totem`, `dinheiro`, `sangria`).
- **Não há registro de quais pratos ou itens específicos do cardápio foram vendidos** em cada turno.
- No `StoreContext.tsx` e `DataEntry.tsx`, existe a entidade `ProductPerformance` (`topProducts`), mas ela é inserida manualmente de forma pontual no fechamento mensal do CMV.

### Solução Proposta para a Fase 5 (CMV Ponderado & Engenharia de Cardápio)
Para viabilizar a **Matriz Kasavana & Smith** e o **CMV Médio Ponderado**, implementaremos na **Fase 5**:
1. **Importador Universal de Vendas (CSV/XLSX)**:
   - Suporte nativo ao arquivo padrão exportado pelo **Portal do Parceiro iFood** (*"Relatório de Vendas por Item / Desempenho de Cardápio"*).
   - Suporte a arquivo CSV simples de PDV de Balcão: `Código/Nome do Prato; Quantidade Vendida; Faturamento Bruto`.
   - Mapeamento inteligente por nome/código vinculando diretamente à Ficha Técnica Unificada.
2. **Matriz de Vendas por Período**:
   - Uma interface rápida onde o gestor pode visualizar, editar ou importar os volumes de venda de cada prato por canal (Balcão vs iFood) para o mês selecionado.
   - O sistema calcula automaticamente:
     $$\text{CMV Médio Ponderado} = \frac{\sum (\text{Custo Direto do Prato} \times \text{Quantidade Vendida})}{\sum (\text{Preço de Venda do Prato} \times \text{Quantidade Vendida})}$$

---

## 2. Experiência do Usuário & Navegação

### Ordem Oficial das Abas do Módulo:
1. `Aba 1: Insumos` (Matérias-primas, fornecedores, FC/IC, conversões e histórico de preços).
2. `Aba 2: Sub-Receitas` (Bases culinárias, rendimento por lote/porção, etiquetas de validade e anti-ciclo).
3. `Aba 3: Fichas Técnicas` (1 card por prato com visão unificada Balcão/iFood, 3 itens mais caros e POP).
4. `Aba 4: Precificação & Simulador DRE` (Markup divisor com travas, rateio DRE, ponto de equilíbrio e sensibilidade).
5. `Aba 5: Engenharia de Cardápio & Painel` (Matriz Kasavana & Smith, Curva ABC e rankings).

### Formatação PT-BR Rigorosa:
- **Valores Monetários**: `R$ 12,74` (vírgula decimal, ponto de milhar).
- **Percentuais**: `33,7%` (vírgula decimal, 1 casa de precisão).
- **Pesos e Volumes**: `450 g`, `1,250 kg`, `200 ml`, `5,000 L`.
- **Badges de CMV vs Meta da Unidade (ex: 30,0%)**:
  - **Verde**: $\text{CMV} \le \text{Meta}$ (Saudável).
  - **Amarelo**: $\text{Meta} < \text{CMV} \le \text{Meta} + 0,03$ (Atenção / Limítrofe).
  - **Vermelho**: $\text{CMV} > \text{Meta} + 0,03$ (Crítico / Fora da Meta).

---

## 3. Arquitetura de Dados & Tipagem TypeScript

```
┌────────────────────────────────────────────────────────────────────────┐
│               PAINEL INTEGRADO - GRUPO AZEVEDO (VERO PASTA)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
        ┌─────────────────────────┐   ┌──────────────────────────┐
        │ StoreFoodServiceSettings│   │  AuthContext / Permissões │
        │ (Taxas iFood, Balcão,   │   │  (ADMIN, MANAGER,         │
        │  Simples, DRE, Meta CMV)│   │   KITCHEN - Modo Cozinha)│
        └────────────┬────────────┘   └─────────────┬────────────┘
                     │                              │
                     └──────────────┬───────────────┘
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │             Motor Matemático Food Service                │
       │     (src/utils/foodServiceMath.ts - Funções Puras)       │
       │  • Alta precisão decimal em insumos baratos              │
       │  • Trava de Markup Divisor (soma deduções < 1.0)         │
       │  • CMV ponderado e fator de correção integrado           │
       └────────────────────────────┬─────────────────────────────┘
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │   TechnicalSheetService (Persistência Firestore + Cache)  │
       └──────────────┬────────────────────────────┬──────────────┘
                      │                            │
         ┌────────────┴─────────────┐ ┌────────────┴─────────────┐
         ▼                          ▼ ▼                          ▼
  ┌──────────────┐          ┌──────────────┐             ┌──────────────┐
  │ INGREDIENTS  │          │ SUB-RECIPES  │             │ DISHES (Fin) │
  │ (Embalagem,  │◀─────────┤ (Refs, Rend, │◀────────────┤ (Refs, Canais│
  │  Qtd, FC/IC) │          │  Anti-Ciclo) │             │  Preços/Emb) │
  └──────┬───────┘          └──────────────┘             └──────┬───────┘
         │                                                      │
         ▼ (Subcoleção)                                         ▼ (Subcoleção & Split)
  ┌──────────────┐                                       ┌──────────────┐
  │price_history │                                       │dishes_kitchen│
  │  (Subcol)    │                                       │_pop (Split)  │
  └──────────────┘                                       └──────────────┘
```

### 3.1. Insumo Mestre (`IngredientMaster`)
```typescript
export type UnitOfMeasure = 'g' | 'kg' | 'ml' | 'l' | 'un';

export interface IngredientMaster {
  id: string;
  storeId: string;
  nome: string;
  categoria: 'PROTEINAS' | 'MASSAS' | 'MOLHOS' | 'HORTIFRUTI' | 'LATICINIOS' | 'EMBALAGENS' | 'DESCARTAVEIS' | 'OUTROS';
  fornecedorPadrao?: string;
  
  // Compra vs Uso (Precisão Estrita)
  unidadeCompraNome: string; // Ex: "Saco 25kg", "Caixa 5kg", "Garrafa 900ml", "Pacote 1kg"
  precoEmbalagemCompraCentavos: number; // Ex: 4800 (R$ 48,00 por pacote de 1kg)
  quantidadeEmbalagemCompra: number; // Ex: 1000 (g) -> custo = 4800 / 1000 = 4,8 centavos/g
  unidadeUso: UnitOfMeasure; // 'g' | 'ml' | 'un'
  dataUltimaCompra: string;
  
  // Fatores Técnicos
  fatorCorrecao: number; // FC = Peso Bruto / Peso Líquido (ex: 1.15)
  indiceCoccao: number; // IC = Peso Cozido / Peso Cru (ex: 2.20)
  
  // Alérgenos
  alergenos: Array<'GLUTEN' | 'LACTOSE' | 'OVOS' | 'SOJA' | 'OLEAGINOSAS' | 'PEIXES' | 'CRUSTACEOS'>;
  ativo: boolean;
  updatedAt: string;
}

// Subcoleção: ingredients/{ingredientId}/price_history/{historyId}
export interface IngredientPriceHistoryEntry {
  id: string;
  data: string;
  precoEmbalagemCompraCentavos: number;
  quantidadeEmbalagemCompra: number;
  fornecedor?: string;
  motivo?: string;
  responsavel: string;
}
```

### 3.2. Sub-Receita Normalizada (`SubRecipe`)
```typescript
export interface SubRecipeItemRef {
  tipo: 'INSUMO' | 'SUB_RECEITA';
  itemId: string; // ID do insumo ou da sub-receita base
  unidade: UnitOfMeasure;
  quantidadeLiquida: number; // Quantidade de uso
  fatorCorrecaoOverride?: number; // Opcional, herda do insumo por padrão
}

export interface SubRecipe {
  id: string;
  storeId: string;
  nome: string;
  categoria: 'MOLHOS' | 'MASSAS' | 'PROTEINAS' | 'BASES';
  descricao?: string;
  
  // Apenas referências de itens (sem custos gravados no doc principal)
  itens: SubRecipeItemRef[];
  rendimentoLoteTotal: number; // Peso ou volume final do lote pronto (ex: 4500 g)
  unidadeRendimento: UnitOfMeasure;
  
  // Operacional Cozinha
  tempoPreparoMinutos: number;
  validadeDias: number;
  temperaturaArmazenamento: string;
  utensiliosPadrao: string[];
  passosPreparo: Array<{ passo: number; descricao: string; alertaPonto?: string; tempoMinutos?: number }>;
  updatedAt: string;
}
```

### 3.3. Ficha Técnica Unificada do Prato (`DishTechnicalSheet`)
```typescript
export interface DishItemRef {
  tipo: 'INSUMO' | 'SUB_RECEITA';
  itemId: string;
  unidade: UnitOfMeasure;
  quantidadeLiquida: number;
  fatorCorrecaoOverride?: number; // Para itens crus adicionados direto no prato (ex: legumes, carnes)
}

export interface DishPackagingItemRef {
  insumoId: string; // ID de insumo da categoria EMBALAGENS/DESCARTAVEIS
  quantidade: number;
}

export type SalesChannel = 'BALCAO' | 'IFOOD' | 'WHATSAPP_DELIVERY';

export interface ChannelTaxRates {
  comissaoMarketplace: number; // Ex: 0.27 (27%)
  taxaPagamentoOnline: number; // Ex: 0.032 (3,2%)
  impostoSimples: number; // Ex: 0.055 (5,5%)
  coparticipacaoPromocao: number; // Ex: 0.02 (2%)
}

export interface DishChannelConfig {
  ativo: boolean;
  precoVendaCentavos: number; // Preço praticado no canal
  embalagens: DishPackagingItemRef[]; // Embalagens específicas deste canal
  taxasOverride?: Partial<ChannelTaxRates>; // Opcional: taxas específicas para este prato
}

export interface DishTechnicalSheet {
  id: string;
  storeId: string;
  codigoPrato?: string;
  nome: string;
  categoria: 'MASSAS' | 'WRAPS' | 'LASANHAS' | 'PARMEGIANAS' | 'SOBREMESAS';
  
  // Composição Pura (Apenas referências, sem custos estáticos)
  itens: DishItemRef[];
  
  // Matriz de Canais (Balcão, iFood, etc.)
  canais: Partial<Record<SalesChannel, DishChannelConfig>>;
  
  versao: number;
  dataUltimaRevisaoPrecos: string;
  updatedAt: string;
}

// Subcoleção: dishes/{dishId}/version_history/{versionId}
export interface DishVersionHistoryEntry {
  id: string;
  versao: number;
  data: string;
  usuario: string;
  resumoAlteracoes: string;
  snapshotCustoTotalCentavos: number;
  snapshotPrecoVendaBalcaoCentavos: number;
  snapshotPrecoVendaIfoodCentavos: number;
}
```

### 3.4. Split Collection para Segurança da Cozinha (`DishKitchenPOP`)
Documento independente em coleção isolada: `stores/{storeId}/dishes_kitchen_pop/{dishId}`:
```typescript
export interface DishKitchenPOP {
  id: string; // Mesmo ID do prato
  storeId: string;
  nomePrato: string;
  categoria: string;
  fotoEmpratamentoUrl?: string;
  pesoFinalGramas: number;
  tempoPreparoMinutos: number;
  
  // Ingredientes operacionais (SEM NENHUM VALOR DE CUSTO OU R$)
  ingredientesOperacionais: Array<{
    nome: string;
    quantidadeLiquida: number;
    unidade: UnitOfMeasure;
    observacaoPreparo?: string;
  }>;
  
  alergenos: string[];
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
```

### 3.5. Configurações Financeiras da Unidade (`StoreFoodServiceSettings`)
Documento: `stores/{storeId}/food_service_settings/config`:
```typescript
export interface StoreFoodServiceSettings {
  storeId: string;
  metaCmvPercent: number; // Ex: 0.30 (30,0%)
  alertaDesatualizadoDias: number; // Ex: 30 dias
  taxaRateioDespesasFixasPercent: number; // Ex: 0.18 (18% calculado da DRE)
  margemLucroDesejadaPercent: number; // Ex: 0.15 (15% lucro líquido desejado)
  
  // Taxas padrão de exemplo por canal (totalmente editáveis no painel)
  canaisDefault: {
    BALCAO: ChannelTaxRates; // comissao: 0.0, pagamento: 0.02, imposto: 0.055, promocao: 0.0
    IFOOD: ChannelTaxRates;  // comissao: 0.27, pagamento: 0.032, imposto: 0.055, promocao: 0.02
    WHATSAPP_DELIVERY?: ChannelTaxRates;
  };
}
```

---

## 4. Motor Matemático Puro (`src/utils/foodServiceMath.ts`)

Todas as operações de cálculo residem em funções puras com tolerância zero para arredondamento prévio e proteção contra divisões por zero ou markups inválidos:

```typescript
// 1. Custo Unitário de Insumo com Alta Precisão (R$ por g/ml/un)
export function calcularCustoUnitarioInsumo(
  precoEmbalagemCentavos: number,
  quantidadeEmbalagem: number
): number {
  if (quantidadeEmbalagem <= 0) return 0;
  // Retorna custo em Reais por unidade (ex: 4800 centavos / 1000g = 4,8 centavos = R$ 0,048/g)
  return (precoEmbalagemCentavos / 100) / quantidadeEmbalagem;
}

// 2. Fator de Correção (Peso Bruto necessário)
export function aplicarFatorCorrecao(quantidadeLiquida: number, fatorCorrecao = 1.0): number {
  const fc = fatorCorrecao > 0 ? fatorCorrecao : 1.0;
  return quantidadeLiquida * fc;
}

// 3. Preço Sugerido por Markup Divisor (com trava de segurança)
export interface MarkupDivisorInput {
  custoDiretoCentavos: number;
  taxasDeducoesPercent: number; // Ex: 0.357 (35,7% somando comissão + imposto + cartão)
  despesasFixasRateadasPercent: number; // Ex: 0.18 (18%)
  lucroDesejadoPercent: number; // Ex: 0.15 (15%)
}

export interface MarkupDivisorResult {
  precoSugeridoCentavos: number | null;
  divisor: number;
  valido: boolean;
  mensagemAlerta?: string;
}

export function calcularPrecoSugeridoMarkup(input: MarkupDivisorInput): MarkupDivisorResult {
  const somaDeducoesEMargem = 
    input.taxasDeducoesPercent + 
    input.despesasFixasRateadasPercent + 
    input.lucroDesejadoPercent;
  
  const divisor = 1.0 - somaDeducoesEMargem;
  
  if (divisor <= 0.01) {
    return {
      precoSugeridoCentavos: null,
      divisor,
      valido: false,
      mensagemAlerta: `A soma das deduções do canal (${(input.taxasDeducoesPercent * 100).toFixed(1)}%), despesas fixas (${(input.despesasFixasRateadasPercent * 100).toFixed(1)}%) e lucro desejado (${(input.lucroDesejadoPercent * 100).toFixed(1)}%) totaliza ${(somaDeducoesEMargem * 100).toFixed(1)}% (≥ 100%). Impossível aplicar Markup Divisor sem prejuízo.`
    };
  }

  const precoSugeridoReais = (input.custoDiretoCentavos / 100) / divisor;
  return {
    precoSugeridoCentavos: Math.round(precoSugeridoReais * 100),
    divisor,
    valido: true
  };
}

// 4. Detalhamento de Margem de Contribuição por Canal
export function calcularMetricasCanal(
  custoDiretoCentavos: number,
  precoVendaCentavos: number,
  taxas: ChannelTaxRates
) {
  if (precoVendaCentavos <= 0) {
    return { cmvPercent: 0, deducoesCentavos: 0, margemCentavos: 0, margemPercent: 0 };
  }

  const taxaTotal = 
    taxas.comissaoMarketplace + 
    taxas.taxaPagamentoOnline + 
    taxas.impostoSimples + 
    taxas.coparticipacaoPromocao;
    
  const deducoesCentavos = Math.round(precoVendaCentavos * taxaTotal);
  const margemCentavos = precoVendaCentavos - custoDiretoCentavos - deducoesCentavos;
  const cmvPercent = (custoDiretoCentavos / precoVendaCentavos);
  const margemPercent = (margemCentavos / precoVendaCentavos);

  return {
    cmvPercent, // Decimal (ex: 0.312)
    deducoesCentavos,
    margemCentavos,
    margemPercent // Decimal (ex: 0.358)
  };
}

// 5. Ponto de Equilíbrio (Break-Even)
export function calcularPontoEquilibrio(
  despesasFixasCentavos: number,
  margemContribuicaoPonderadaPercent: number,
  ticketMedioCentavos: number
) {
  if (margemContribuicaoPonderadaPercent <= 0 || ticketMedioCentavos <= 0) {
    return { faturamentoMinimoCentavos: 0, pratosPorDia: 0 };
  }
  const faturamentoMinimoReais = (despesasFixasCentavos / 100) / margemContribuicaoPonderadaPercent;
  const faturamentoMinimoCentavos = Math.round(faturamentoMinimoReais * 100);
  const totalPratosMes = (faturamentoMinimoCentavos / ticketMedioCentavos);
  const pratosPorDia = Math.ceil(totalPratosMes / 30);

  return { faturamentoMinimoCentavos, pratosPorDia };
}
```

---

## 5. Regras de Segurança do Firestore (`firestore.rules`)

As permissões do Modo Cozinha serão antecipadas e protegidas via ABAC:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funções de Perfil
    function isSignedIn() { return request.auth != null; }
    function getUserRole() { 
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; 
    }
    function isManagerOrAdmin() {
      return isSignedIn() && (
        getUserRole() == 'ADMIN' || 
        getUserRole() == 'MANAGER' || 
        getUserRole() == 'MANAGER_VERO_PASTA'
      );
    }

    // 1. Insumos e Sub-Receitas (Contêm custos - apenas Gestores)
    match /stores/{storeId}/ingredients/{ingredientId} {
      allow read, write: if isManagerOrAdmin();
      match /price_history/{historyId} {
        allow read, write: if isManagerOrAdmin();
      }
    }
    match /stores/{storeId}/sub_recipes/{subRecipeId} {
      allow read, write: if isManagerOrAdmin();
    }

    // 2. Fichas Técnicas Financeiras (dishes) - APENAS Gestores e Admin
    match /stores/{storeId}/dishes/{dishId} {
      allow read, write: if isManagerOrAdmin();
      match /version_history/{versionId} {
        allow read, write: if isManagerOrAdmin();
      }
    }

    // 3. Modo Cozinha (POP) - Leitura liberada para funcionários da cozinha autenticados
    match /stores/{storeId}/dishes_kitchen_pop/{dishId} {
      allow read: if isSignedIn();
      allow write: if isManagerOrAdmin();
    }

    // 4. Parâmetros Fiscais e Comissões
    match /stores/{storeId}/food_service_settings/{docId} {
      allow read, write: if isManagerOrAdmin();
    }
  }
}
```

---

## 6. Roteiro de Execução em Fases

### **FASE 1 — Cadastro Mestre de Insumos & Migração Segura**
1. **Script de Migração com Modo Simulação (Dry-Run)**:
   - Exporta backup JSON integral de segurança dos dados atuais (`grupo_azevedo_technical_sheets_v2` e `sub_recipes_v2`).
   - Painel interativo de *Dry-Run*: exibe tabela comparativa mostrando como os 8 pratos atuais serão unificados nos 4 pratos reais (Spaghetti c/ Frango, Lasanha de Frango, Wrap de Frango e Parmegiana), mapeando as embalagens de balcão e iFood nos respectivos canais, além de converter as 5 sub-receitas.
   - Botão de execução definitiva e botão de **Desfazer (Rollback)**.
2. **Nova Aba 1: Insumos**:
   - Tabela corporativa com busca instantânea, filtros por categoria (Proteínas, Massas, Laticínios, Embalagens...), ordenação e indicadores de variação.
   - Modal de Insumo com:
     - Preço da embalagem de compra (centavos) + quantidade da embalagem para cálculo unitário com alta precisão (sem arredondamento intermediário).
     - Fator de Correção (FC) e Índice de Cocção (IC).
     - Alérgenos padronizados.
     - Histórico de compras em subcoleção (`price_history`).
   - Importação e Exportação CSV/Excel.
   - Testes unitários para insumos de baixo custo por grama (farinha, sal, óleo).

### **FASE 2 — Sub-Receitas & Produção de Cozinha**
1. Composição exclusivamente relacional por IDs de insumos e sub-receitas.
2. **Detector de Referência Circular**: algoritmo recursivo que impede que sub-receita A utilize sub-receita B se B direta ou indiretamente depende de A.
3. Rendimento do lote (peso/volume final pronto), custo do lote e custo por porção/kg calculados dinamicamente na leitura.
4. **Gerador de Etiquetas de Produção**: visualização e impressão térmica/padrão para colar nos recipientes GN (Nome, Lote, Data de Fabricação, Validade, Conservação e Responsável).
5. Tabela de "Onde é Usada" calculada por consulta reversa em memória.

### **FASE 3 — Ficha Técnica Unificada & Modo Cozinha (POP) com Split Collection**
1. Ficha Técnica Unificada (1 card por prato):
   - Elimina os cards duplicados.
   - Mostra no card as métricas dos canais ativos (Balcão e iFood).
   - Destaque automático dos 3 insumos de maior impacto no custo (% Pareto).
   - Fator de correção também aplicado a insumos crus diretos do prato (peso bruto = líquido × FC).
   - Alérgenos consolidados automaticamente a partir dos insumos vinculados.
2. **Modo Cozinha (POP)**:
   - Persistência separada em `dishes_kitchen_pop/{dishId}` sem custos.
   - Aplicação e teste das Firestore Security Rules para bloqueio do perfil KITCHEN.
   - Visualização em tela cheia otimizada para tablets na bancada.
   - Geração de PDF limpo para impressão/plastificação na praça (com foto do empratamento, gramaturas exatas, utensílios de medição e passo a passo cronológico).
3. Alerta de "Ficha Desatualizada" (> 30 dias sem revisão de preços).

### **FASE 4 — Precificação & Margem por Canal (Simulador DRE)**
1. Cálculo do **Preço Sugerido por Markup Divisor**:
   - Com travas e alertas quando $(\text{deduções} + \text{despesas fixas rateadas} + \text{lucro desejado}) \ge 100\%$.
   - Rateio de despesas fixas integrado aos dados reais do mês da DRE da Vero Pasta no `StoreContext`.
2. Indicador visual "Abaixo do Ideal" no cardápio quando o preço praticado estiver abaixo da recomendação.
3. Simulador interativo "e se" com slider de preço em tempo real e botão de **Arredondamento Psicológico** (R$ 29,90, R$ 34,90).
4. Cálculo do Ponto de Equilíbrio operacional da unidade (R$ faturamento mínimo e pratos diários necessários).

### **FASE 5 — Engenharia de Cardápio (Kasavana & Smith) & Importador de Vendas**
1. **Importador Universal de Vendas (CSV/XLSX)**:
   - Leitura de relatório do Portal do Parceiro iFood e vendas de PDV.
   - Apuração do volume de vendas por prato e por canal.
2. **Cálculo do CMV Médio Ponderado** vs CMV Médio Simples com indicação visual clara de ambos no topo da página.
3. **Matriz Kasavana & Smith 2x2**:
   - *Estrela (Star)*: Alta Popularidade + Alta Margem.
   - *Burro de Carga (Plowhorse)*: Alta Popularidade + Baixa Margem.
   - *Quebra-Cabeça (Puzzle)*: Baixa Popularidade + Alta Margem.
   - *Cão (Dog)*: Baixa Popularidade + Baixa Margem.
   - Recomendações estratégicas de ação para cada quadrante.
4. Curva ABC de faturamento e de margem de contribuição.
5. Exportação em PDF do Cardápio Gerencial com Custos e Balanço de Engenharia (exclusivo Admin/CEO).

---

## 7. Procedimentos de Validação e Teste

1. **Testes Unitários Automatizados (`src/utils/foodServiceMath.test.ts`)**:
   - Cálculo de precisão em insumos de centavos fracionados (sal a R$ 2,50/kg, farinha a R$ 4,80/kg, azeite a R$ 46,00/L).
   - Bloqueio de markup divisor com soma de deduções $\ge 100\%$.
   - Fator de correção e índice de cocção.
   - Ponto de equilíbrio com margens ponderadas.
2. **Validação da Migração**:
   - Comparação dos totais e CMV antes e após a unificação dos 4 pratos da Vero Pasta.
   - Teste do botão de Rollback para restauração instantânea do backup.
3. **Validação de Permissões**:
   - Teste de login com perfil de Cozinha garantindo que nenhuma requisição ou componente exiba dados financeiros.
