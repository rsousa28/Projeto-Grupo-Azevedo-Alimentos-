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

async function callAIApi(contents: any, model: string = "gemini-3-flash-preview", config: any = {}) {
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
    ? "Você é um especialista em análise de vendas de restaurantes. Extraia os produtos, faturamento total por produto, quantidade vendida, cmv unitário (custo por item) e margem de lucro estimada dele (em porcentagem) do texto CSV/relatório fornecido. Se o CMV não estiver explícito, calcule-o baseado na margem e faturamento."
    : "Você é um especialista em custos de insumos de restaurantes. Extraia os insumos, unidade de medida, preço unitário de compra e o fornecedor do texto CSV/relatório fornecido.";

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
    const result = await callAIApi(csvContent, "gemini-3-flash-preview", {
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

    const result = await callAIApi(combinedContents, "gemini-3-flash-preview", {
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
    const result = await callAIApi("Gere meus insights preditivos do mês.", "gemini-3-flash-preview", {
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
    const result = await callAIApi(prompt, "gemini-3-flash-preview");
    return result.text;
  } catch (error) {
    console.error("Erro na análise IA:", error);
    return "Não foi possível gerar a análise no momento.";
  }
}
