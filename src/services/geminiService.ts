import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: csvContent,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}
