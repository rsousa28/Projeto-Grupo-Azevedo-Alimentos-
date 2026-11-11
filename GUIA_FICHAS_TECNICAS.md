# Fichas técnicas · Precificação PRO

Nova aba **Fichas Técnicas** (Vero Pasta e qualquer outra loja). Ela substitui o módulo antigo, que continua
acessível pelo link **"Abrir módulo antigo"** no topo da página (`/fichas-tecnicas/legado`).

## 1. Análise do sistema de referência (Ficha Técnica PRO / Acelera Gastro)

| Tela da referência | O que faz | Como ficou aqui |
|---|---|---|
| Visão geral | Produtos, preço médio, custos fixos, ponto de equilíbrio, lucro médio por unidade, maiores margens, análise do produto, faturamento × custos fixos, maiores custos | Tudo isso, mais alertas clicáveis e **engenharia de cardápio** (Estrela, Burro de carga, Quebra-cabeça, Cão) |
| Despesas | Fixas e variáveis, equipamentos e depreciação, funcionários, embalagens, gás e energia | Igual. Embalagens ganharam aba própria. Você escolhe se a folha entra **por minuto** nas fichas ou **como custo fixo**, para não cobrar a equipe duas vezes |
| Ingredientes | Quantidade bruta e líquida, preço, fator de correção, custo por unidade, filtro "sem preço" | Igual, mais **histórico de preços**, filtro "sem dados do rótulo", contador de uso e **aviso de impacto**: ao mudar um preço, mostra quais pratos mudaram de custo e quais perderam a margem |
| Receitas base | Custo por grama com rendimento, tempo e funcionários | Igual, mais receita dentro de receita (ex.: ragu usa o molho de tomate) com proteção contra ciclo e fator de perda |
| Fichas técnicas | Etapas: Ingredientes → Embalagem → Gás e luz → Mão de obra → Precificar → Tabela nutricional | As 6 etapas, com foto, códigos P01…, troca rápida entre produtos e salvamento automático |
| Precificar | Preço sugerido com a margem desejada | **Dois canais**: salão e delivery (comissão do app + pagamento online), DRE por unidade, botão "usar sugerido" (arredonda para ,90) e simulador de 5% a 30% de margem |
| Tabela nutricional | Calculada pelos ingredientes, padrão Anvisa, PNG para o rótulo, memória de cálculo | Igual (RDC 429/2020 e IN 75/2020, %VD de 2.000 kcal), mais a **lupa "ALTO EM"** (açúcar adicionado, gordura saturada, sódio) e aviso de ingredientes sem dados |
| Ficha operacional | Ingredientes com porção, utensílios, passo a passo com foto, ordem de montagem, conferência final, para imprimir | Igual, editável, com fotos por etapa e impressão em A4 (ou salvar em PDF) |
| Bebidas e Combos | Itens de revenda e combos | Bebidas usam a mesma ficha (etapas reduzidas). Combos mostram o desconto sobre os itens avulsos e se a margem continua de pé |

## 2. O que mudou na arquitetura (por que é melhor que o módulo antigo)

- **Tudo ligado por ID.** O módulo antigo copiava o custo de cada ingrediente para dentro da ficha e ligava sub-receitas
  por parte do nome. Agora a ficha guarda só *qual item* e *quanto*: o custo é calculado na hora. Mudou o preço do
  patinho, o ragu, a lasanha e o spaghetti à bolonhesa recalculam juntos.
- **Firestore em vez de localStorage.** O módulo antigo guardava os dados só no navegador de quem cadastrou. Agora fica em
  `stores/{loja}/pricing_*`, sincronizado em tempo real entre aparelhos e protegido pelas regras atuais (só quem tem
  acesso à loja).
- **Motor de cálculo testado.** As contas estão em `src/lib/pricing/engine.ts`, sem tela, com 16 testes automáticos
  (`npx vitest run tests/pricingEngine.test.ts`). Eles conferem os números da referência (ex.: blend a R$ 49,30 e R$ 0,0493/g).

### Fórmulas

- Custo por g/ml/un do ingrediente = preço ÷ quantidade líquida. Fator de correção = bruta ÷ líquida.
- Receita base = (ingredientes + minutos × funcionários × custo do minuto) × fator de perda ÷ rendimento.
- Custo do produto = ingredientes + embalagens + gás/energia + mão de obra + taxas/extras.
- Estrutura do mês = despesas fixas + variáveis + depreciação (+ folha, se configurada como custo fixo).
  Ela vira um percentual do faturamento (estimado ou pelas vendas cadastradas).
- Preço sugerido = custo ÷ (1 − impostos e taxas do canal − estrutura do mês − margem desejada).
- Lucro = preço − custo − impostos e taxas − parte da estrutura. "Margem alcançada" = lucro % ≥ margem desejada.
- Ponto de equilíbrio = estrutura do mês ÷ margem de contribuição média (ponderada pelas vendas).

## 3. Como começar

1. Abra **Fichas Técnicas** na Vero Pasta. Na primeira vez, escolha **"Começar com o cardápio exemplo da Vero Pasta"**
   (26 ingredientes, 8 embalagens, 5 receitas base, 6 pratos, 2 bebidas, 1 combo) ou **"Começar vazio"**.
2. **Taxas e margem:** alíquota do Simples, taxa média do cartão, comissão do iFood, margem desejada e meta de CMV.
3. **Despesas:** troque os valores exemplo pelos reais (aluguel, contas, equipe, equipamentos, gás e energia).
4. **Ingredientes e embalagens:** coloque o preço das notas. Os preços do exemplo são só referência.
5. Revise cada ficha, coloque a foto e as **vendas por mês** (alimentam a visão geral e a engenharia de cardápio).

Os insumos que alguém já cadastrou no módulo antigo podem ser trazidos em **Taxas e margem → Importar insumos do módulo
antigo** (funciona no aparelho onde foram cadastrados). **Exportar tudo para Excel** gera a planilha de produtos,
ingredientes e receitas.

## 4. Arquivos

- `src/lib/pricing/` → `types.ts` (modelo), `engine.ts` (cálculos), `seed.ts` (cardápio exemplo), `usePricingData.ts` (Firestore)
- `src/pages/PricingPro/` → uma tela por aba, `ProductEditor.tsx` (wizard), `NutritionPanel.tsx` + `labelImage.ts` (rótulo),
  `OperationalSheetModal.tsx` (ficha da cozinha)
- `tests/pricingEngine.test.ts`

## 5. Limites conhecidos

- A tabela nutricional depende dos dados do rótulo de cada ingrediente (ícone da maçã). Para rótulo de produto embalado,
  valide com um nutricionista.
- As fotos são reduzidas e guardadas no próprio documento (cerca de 60–100 KB cada), o que serve bem para cardápios de
  algumas dezenas de pratos.
