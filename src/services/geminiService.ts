import { Type } from "@google/genai";

export interface ExtractedProduct {
  name: string;
  quantidadeVendas: number;
  faturamento: number;
  margin: number;
  cmv: number;
  price?: number;
}

export interface ExtractedInsumo {
  name: string;
  unit: string;
  price: number;
  supplier: string;
}

async function callAIApi(contents: any, model: string = "gemini-1.5-flash", config: any = {}) {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      contents,
      config,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate AI content");
  }

  return response.json();
}

export async function extractDataFromCSV(csvContent: string, type: 'products' | 'inventory') {
  const systemInstruction = type === 'products' 
    ? `Você é um especialista em análise de vendas e controladoria de restaurantes brasileiros (Pizzarias e Fast-Food). 
       Sua tarefa é extrair dados reais de relatórios de venda.
       
       CAMPOS OBRIGATÓRIOS:
       1. name: Nome completo do produto (NÃO ABREVIBE).
       2. quantidadeVendas: Quantidade total vendida (inteiro ou decimal).
       3. faturamento: Valor total bruto das vendas deste produto (monetário).
       4. cmv: CUSTO UNITÁRIO REAL (valor monetário de quanto custou para produzir 1 unidade). 
          - Se o relatório trouxer "Custo Total", divida pela quantidade. 
          - Se trouxer "CMV %", multiplique o Preço Unitário (Faturamento/Qtd) por essa porcentagem.
       5. margin: MARGEM DE CONTRIBUIÇÃO EM PORCENTAGEM (Profit Margin). 
          - Se o relatório trouxer "CMV %" de 30%, a margem é 70%.
          - Margem % = ((Preço Unitário - Custo Unitário) / Preço Unitário) * 100.

       REGRAS CRÍTICAS DE VALORES:
       - Formato Brasileiro: Interprete '1.200,50' como 1200.5 e '31,25' como 31.25.
       - NÃO confunda CMV % (Custo) com Margem % (Lucro). 
       - Se o relatório diz "CMV 31,25%", isso é o CUSTO. Calcule o 'cmv' unitário e coloque a 'margin' como 68,75%.
       - Retorne apenas o JSON Array válido.`
    : `Você é um especialista em custos de insumos e controladoria de restaurantes brasileiros. 
       Sua tarefa é extrair a lista de insumos/ingredientes de um relatório de compras ou estoque.

       CAMPOS OBRIGATÓRIOS:
       1. name: Nome do insumo (ex: 'CARNE MOIDA', 'OLEO DE SOJA').
       2. unit: Unidade de medida (ex: 'KG', 'UN', 'LT', 'PCT').
       3. price: PREÇO UNITÁRIO DE COMPRA (valor monetário de 1 unidade). 
          - Se o relatório trouxer "Preço Total", divida pela quantidade comprada.
       4. supplier: Nome do fornecedor (se disponível, senão use 'Geral').

       REGRAS CRÍTICAS DE VALORES:
       - Formato Brasileiro: '1.200,50' é 1200.5. '687,99' é 687.99.
       - NÃO multiplique os valores por 1000. 
       - Se o valor for '687,99', o JSON deve conter 687.99.
       - Retorne apenas o JSON Array válido.`

  const responseSchema = type === 'products' ? {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        quantidadeVendas: { type: Type.NUMBER },
        faturamento: { type: Type.NUMBER },
        margin: { type: Type.NUMBER },
        cmv: { type: Type.NUMBER },
      },
      required: ["name", "quantidadeVendas", "faturamento", "margin", "cmv"]
    }
  } : {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        unit: { type: Type.STRING },
        price: { type: Type.NUMBER },
        supplier: { type: Type.STRING },
      },
      required: ["name", "unit", "price", "supplier"]
    }
  };

  try {
    const result = await callAIApi(csvContent, "gemini-1.5-flash", {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
    });

    return JSON.parse(result.text || "[]");
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}

export async function chatWithConsultant(message: string, dreContext: any, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  const systemInstruction = `
    Você é um consultor financeiro sênior especializado em gestão de restaurantes e redes de Food Service. 
    Seu objetivo é ajudar o dono do restaurante a otimizar suas margens, entender sua DRE e tomar decisões baseadas em dados.
    
    Contexto Atual do Negócio:
    ${JSON.stringify(dreContext, null, 2)}
    
    Diretrizes:
    1. Seja direto, técnico mas acessível, e focado em resultados (lucratividade).
    2. Sempre que mencionar um valor, use o formato R$ 0,00.
    3. Se o lucro estiver baixo, sugira ações específicas (negociar com fornecedores, revisar fichas técnicas, reduzir desperdício, etc).
    4. Analise os principais grupos: Receita, CMV (atente-se para margens baixas), Despesas Variáveis e Fixas.
    5. Se perguntarem algo fora do contexto financeiro de restaurante, gentilmente redirecione para a gestão do negócio.
    6. Use seu conhecimento preditivo para sugerir o que pode acontecer no próximo mês se as tendências atuais continuarem.
  `;

  try {
    // Note: History management is handled by the server proxy if we send the full history
    const combinedContents = [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ];

    const result = await callAIApi(combinedContents, "gemini-1.5-flash", {
      systemInstruction,
    });

    return result.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}

export interface PredictiveInsight {
  title: string;
  description: string;
  impact: 'Positivo' | 'Negativo' | 'Oportunidade';
  category: string;
  recommendation: string;
}

export async function generatePredictiveInsights(context: any): Promise<PredictiveInsight[]> {
  const systemInstruction = `
    Você é um analista de dados e inteligência artificial para restaurantes.
    Com base nos dados fornecidos da unidade, gere 3 insights preditivos e estratégicos.
    
    Dados do Negócio:
    ${JSON.stringify(context, null, 2)}
    
    O retorno deve ser ESTRITAMENTE um JSON no formato de Array de objetos com:
    {
      "title": "Título curto",
      "description": "Descrição detalhada do que os dados dizem",
      "impact": "Positivo" | "Negativo" | "Oportunidade",
      "category": "CMV" | "Vendas" | "Operação" | "Financeiro",
      "recommendation": "O que o dono deve fazer hoje"
    }
  `;

  try {
    const result = await callAIApi("Gere meus insights preditivos do mês.", "gemini-1.5-flash", {
      systemInstruction,
      responseMimeType: "application/json",
    });

    return JSON.parse(result.text || "[]");
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return [];
  }
}

export async function analyzeMenuEngineering(negativeMarginProducts: any[]) {
  if (negativeMarginProducts.length === 0) return "Nenhum produto com margem negativa para analisar.";
  
  const prompt = `Como um consultor de engenharia de cardápio, analise estes produtos que estão com margem negativa (prejuízo) na minha operação Bebelu/4Estylos (fast-food/pizzaria):
  
  ${negativeMarginProducts.map(p => `- ${p.name}: CMV R$${p.cmv}, Preço Médio R$${((p.faturamento || 0) / (p.quantidadeVendas || 1)).toFixed(2)}, Margem ${p.margin}%`).join('\n')}
  
  Para cada produto, dê uma recomendação estratégica ultra-curta (máximo 15 palavras por item) sobre o que fazer (ex: revisar gramatura, trocar insumo, descontinuar). Foque em ações práticas. Responda em Português.`;

  try {
    const result = await callAIApi(prompt, "gemini-1.5-flash");
    return result.text;
  } catch (error) {
    console.error("Erro na análise IA:", error);
    return "Não foi possível gerar a análise no momento.";
  }
}

export interface DailyQuote {
  quote: string;
  author: string;
  explanation: string;
}

export async function generateDailyQuote(): Promise<DailyQuote> {
  const systemInstruction = `
    Você é um mentor sênior de governança corporativa de elite e pensador de liderança (como Simon Sinek, Jim Collins, Falconi ou Peter Drucker).
    Sua missão é gerar uma única frase inspiradora, profunda, profissional e corporativa, focada em alto desempenho, excelência operacional, dados e gestão eficiente no ramo de alimentação e negócios de sucesso.
    A frase deve inspirar franqueados, diretores, investidores e gerentes a buscarem o padrão máximo.
    Insira também uma explicação super curta (máximo 12 palavras) de como materializar esse conselho hoje.
    Responda obrigatoriamente em Português do Brasil.

    Você deve retornar estritamente um JSON no seguinte formato:
    {
      "quote": "A frase inspiradora corporativa aqui",
      "author": "Nome do autor renomado ou a sua identidade como Conselheiro do Grupo Azevedo",
      "explanation": "Ação prática imediata de aplicação."
    }
  `;

  try {
    const result = await callAIApi("Gere uma frase de alto impacto e governança corporativa para hoje.", "gemini-3.5-flash", {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          author: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["quote", "author", "explanation"]
      } as any
    });

    const parsed = JSON.parse(result.text || "{}");
    return {
      quote: parsed.quote || "A consistência impecável na execução de pequenos processos diários constrói o império de amanhã.",
      author: parsed.author || "Conselho Executivo de Governança",
      explanation: parsed.explanation || "Rever relatórios operacionais hoje e padronizar procedimentos."
    };
  } catch (error) {
    console.error("Gemini Quote Generation Error:", error);
    return {
      quote: "Excelente não é o que fazemos às vezes, mas o que fazemos repetidamente todos os dias até virar padrão.",
      author: "Aristóteles",
      explanation: "A disciplina operacional diária é o segredo do sucesso das grandes marcas."
    };
  }
}

