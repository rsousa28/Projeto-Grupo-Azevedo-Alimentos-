import { IngredientMaster, IngredientPriceHistoryEntry } from '../types/foodService';
import { INITIAL_INGREDIENTS_VERO_PASTA } from '../data/initialIngredients';
import { calcularCustoUnitarioInsumo } from '../utils/foodServiceMath';
import * as XLSX from 'xlsx';

const STORAGE_KEY_PREFIX = 'grupo_azevedo_ingredients_v1';
const HISTORY_KEY_PREFIX = 'grupo_azevedo_ing_history_v1';

export interface ImpactAnalysis {
  hasPriceChange: boolean;
  deltaPercent: number;
  oldPriceCentavos: number;
  newPriceCentavos: number;
  affectedSubRecipesCount: number;
  affectedDishesCount: number;
  affectedDishesNames: string[];
}

export class IngredientService {
  private static getStorageKey(storeId = '3'): string {
    return `${STORAGE_KEY_PREFIX}_${storeId}`;
  }

  private static getHistoryKey(ingredientId: string): string {
    return `${HISTORY_KEY_PREFIX}_${ingredientId}`;
  }

  /**
   * Obtém a lista de insumos da unidade atual.
   */
  static getIngredients(storeId = '3'): IngredientMaster[] {
    try {
      const key = this.getStorageKey(storeId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar insumos do localStorage:', e);
    }

    // Inicialização padrão para a unidade Vero Pasta ('3')
    const defaults = INITIAL_INGREDIENTS_VERO_PASTA.map(ing => ({ ...ing, storeId }));
    this.saveIngredients(defaults, storeId);
    return defaults;
  }

  /**
   * Salva a lista completa de insumos.
   */
  static saveIngredients(ingredients: IngredientMaster[], storeId = '3'): void {
    try {
      const key = this.getStorageKey(storeId);
      localStorage.setItem(key, JSON.stringify(ingredients));
    } catch (e) {
      console.error('Erro ao salvar insumos no localStorage:', e);
    }
  }

  /**
   * Salva ou edita um insumo específico e registra histórico caso o preço mude.
   */
  static saveIngredient(
    ingredient: IngredientMaster,
    storeId = '3',
    responsavel = 'Gestor'
  ): { updatedList: IngredientMaster[]; impact: ImpactAnalysis } {
    const list = this.getIngredients(storeId);
    const existingIndex = list.findIndex(i => i.id === ingredient.id);

    let impact: ImpactAnalysis = {
      hasPriceChange: false,
      deltaPercent: 0,
      oldPriceCentavos: ingredient.precoEmbalagemCompraCentavos,
      newPriceCentavos: ingredient.precoEmbalagemCompraCentavos,
      affectedSubRecipesCount: 0,
      affectedDishesCount: 0,
      affectedDishesNames: []
    };

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      if (existing.precoEmbalagemCompraCentavos !== ingredient.precoEmbalagemCompraCentavos) {
        const oldUnitCost = calcularCustoUnitarioInsumo(existing.precoEmbalagemCompraCentavos, existing.quantidadeEmbalagemCompra);
        const newUnitCost = calcularCustoUnitarioInsumo(ingredient.precoEmbalagemCompraCentavos, ingredient.quantidadeEmbalagemCompra);
        const delta = oldUnitCost > 0 ? ((newUnitCost - oldUnitCost) / oldUnitCost) * 100 : 0;

        impact = {
          hasPriceChange: true,
          deltaPercent: Number(delta.toFixed(1)),
          oldPriceCentavos: existing.precoEmbalagemCompraCentavos,
          newPriceCentavos: ingredient.precoEmbalagemCompraCentavos,
          ...this.calculateAffectedRecipes(ingredient.id, storeId)
        };

        // Adiciona registro no histórico de preços
        this.addPriceHistory(ingredient.id, {
          id: `hist-${Date.now()}`,
          data: ingredient.dataUltimaCompra || new Date().toISOString().split('T')[0],
          precoEmbalagemCompraCentavos: ingredient.precoEmbalagemCompraCentavos,
          quantidadeEmbalagemCompra: ingredient.quantidadeEmbalagemCompra,
          unidadeUso: ingredient.unidadeUso,
          fornecedor: ingredient.fornecedorPadrao,
          motivo: `Ajuste de preço (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`,
          responsavel
        });
      }
      list[existingIndex] = { ...ingredient, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...ingredient, updatedAt: new Date().toISOString() });
      this.addPriceHistory(ingredient.id, {
        id: `hist-${Date.now()}`,
        data: ingredient.dataUltimaCompra || new Date().toISOString().split('T')[0],
        precoEmbalagemCompraCentavos: ingredient.precoEmbalagemCompraCentavos,
        quantidadeEmbalagemCompra: ingredient.quantidadeEmbalagemCompra,
        unidadeUso: ingredient.unidadeUso,
        fornecedor: ingredient.fornecedorPadrao,
        motivo: 'Cadastro inicial do insumo',
        responsavel
      });
    }

    this.saveIngredients(list, storeId);
    return { updatedList: list, impact };
  }

  /**
   * Exclui um insumo.
   */
  static deleteIngredient(id: string, storeId = '3'): IngredientMaster[] {
    const list = this.getIngredients(storeId).filter(i => i.id !== id);
    this.saveIngredients(list, storeId);
    return list;
  }

  /**
   * Obtém o histórico de preços de um insumo.
   */
  static getPriceHistory(ingredientId: string): IngredientPriceHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.getHistoryKey(ingredientId));
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  }

  /**
   * Registra uma nova alteração de preço no histórico.
   */
  static addPriceHistory(ingredientId: string, entry: IngredientPriceHistoryEntry): void {
    try {
      const history = this.getPriceHistory(ingredientId);
      history.unshift(entry);
      // Mantém os últimos 50 registros por insumo
      localStorage.setItem(this.getHistoryKey(ingredientId), JSON.stringify(history.slice(0, 50)));
    } catch (_) {}
  }

  /**
   * Identifica quais sub-receitas e pratos utilizam o insumo para medir o impacto em cascata.
   */
  private static calculateAffectedRecipes(ingredientId: string, storeId: string) {
    let affectedSubRecipesCount = 0;
    let affectedDishesCount = 0;
    const affectedDishesNames: string[] = [];

    try {
      // 1. Verifica sub-receitas legadas ou novas no storage
      const subRecipesStored = localStorage.getItem('grupo_azevedo_sub_recipes_v2');
      if (subRecipesStored) {
        const subRecipes: any[] = JSON.parse(subRecipesStored);
        subRecipes.forEach(sub => {
          if (sub.ingredientes?.some((ing: any) => ing.id === ingredientId || ing.nome?.toLowerCase().includes(ingredientId.toLowerCase()))) {
            affectedSubRecipesCount++;
          }
        });
      }

      // 2. Verifica pratos no storage
      const sheetsStored = localStorage.getItem('grupo_azevedo_technical_sheets_v2');
      if (sheetsStored) {
        const sheets: any[] = JSON.parse(sheetsStored);
        sheets.forEach(sheet => {
          const usesDirectly = sheet.ingredientes?.some((ing: any) => ing.id === ingredientId || ing.nome?.toLowerCase().includes(ingredientId.toLowerCase()));
          const usesInPackaging = sheet.embalagens?.some((emb: any) => emb.id === ingredientId || emb.nome?.toLowerCase().includes(ingredientId.toLowerCase()));
          if (usesDirectly || usesInPackaging) {
            affectedDishesCount++;
            if (!affectedDishesNames.includes(sheet.nome)) {
              affectedDishesNames.push(sheet.nome);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao calcular impacto de receitas afetadas:', e);
    }

    return {
      affectedSubRecipesCount,
      affectedDishesCount,
      affectedDishesNames
    };
  }

  /**
   * Exporta a base de insumos para arquivo Excel (XLSX).
   */
  static exportToExcel(ingredients: IngredientMaster[], unitName = 'Vero Pasta'): void {
    const rows = ingredients.map(ing => {
      const custoUnitario = calcularCustoUnitarioInsumo(ing.precoEmbalagemCompraCentavos, ing.quantidadeEmbalagemCompra);
      return {
        'Código/ID': ing.id,
        'Nome do Insumo': ing.nome,
        'Categoria': ing.categoria,
        'Fornecedor Padrão': ing.fornecedorPadrao || '',
        'Embalagem de Compra': ing.unidadeCompraNome,
        'Preço Compra (R$)': (ing.precoEmbalagemCompraCentavos / 100).toFixed(2),
        'Qtd na Embalagem': ing.quantidadeEmbalagemCompra,
        'Unidade de Uso': ing.unidadeUso,
        'Custo por Unidade de Uso (R$)': custoUnitario.toFixed(6),
        'Fator de Correção (FC)': ing.fatorCorrecao,
        'Índice de Cocção (IC)': ing.indiceCoccao,
        'Alérgenos': ing.alergenos.join(', ') || 'Nenhum',
        'Data Última Compra': ing.dataUltimaCompra,
        'Ativo': ing.ativo ? 'SIM' : 'NÃO',
        'Observações': ing.observacoes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Insumos');
    XLSX.writeFile(workbook, `Insumos_${unitName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Importa insumos a partir de planilha Excel ou CSV.
   */
  static importFromData(
    dataRows: any[],
    storeId = '3'
  ): { imported: number; updated: number; errors: string[] } {
    const currentList = this.getIngredients(storeId);
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    dataRows.forEach((row, index) => {
      const nome = row['Nome do Insumo'] || row['nome'] || row['Nome'];
      if (!nome || typeof nome !== 'string') {
        errors.push(`Linha ${index + 2}: Nome do insumo não informado.`);
        return;
      }

      const precoReais = parseFloat(row['Preço Compra (R$)'] || row['preco'] || row['precoEmbalagemCompraCentavos'] || '0');
      const qtdEmbalagem = parseFloat(row['Qtd na Embalagem'] || row['quantidade'] || row['quantidadeEmbalagemCompra'] || '1000');
      const unidadeUso = (row['Unidade de Uso'] || row['unidadeUso'] || 'g').toLowerCase().trim();

      if (isNaN(precoReais) || precoReais <= 0) {
        errors.push(`Linha ${index + 2} (${nome}): Preço inválido.`);
        return;
      }
      if (isNaN(qtdEmbalagem) || qtdEmbalagem <= 0) {
        errors.push(`Linha ${index + 2} (${nome}): Quantidade da embalagem inválida.`);
        return;
      }

      const existingIndex = currentList.findIndex(i => i.nome.trim().toLowerCase() === nome.trim().toLowerCase());
      const precoCentavos = Math.round(precoReais * 100);

      const parsedIng: IngredientMaster = {
        id: existingIndex >= 0 ? currentList[existingIndex].id : `ing-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        nome: nome.trim(),
        categoria: (row['Categoria'] || row['categoria'] || 'OUTROS').toUpperCase(),
        fornecedorPadrao: row['Fornecedor Padrão'] || row['fornecedor'] || '',
        unidadeCompraNome: row['Embalagem de Compra'] || row['unidadeCompraNome'] || `${qtdEmbalagem}${unidadeUso}`,
        precoEmbalagemCompraCentavos: precoCentavos,
        quantidadeEmbalagemCompra: qtdEmbalagem,
        unidadeUso: (['g', 'kg', 'ml', 'l', 'un'].includes(unidadeUso) ? unidadeUso : 'g') as any,
        dataUltimaCompra: row['Data Última Compra'] || new Date().toISOString().split('T')[0],
        fatorCorrecao: parseFloat(row['Fator de Correção (FC)'] || row['fatorCorrecao'] || '1.0') || 1.0,
        indiceCoccao: parseFloat(row['Índice de Cocção (IC)'] || row['indiceCoccao'] || '1.0') || 1.0,
        alergenos: row['Alérgenos'] ? String(row['Alérgenos']).split(',').map(s => s.trim().toUpperCase() as any) : [],
        ativo: true,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        currentList[existingIndex] = parsedIng;
        updated++;
      } else {
        currentList.push(parsedIng);
        imported++;
      }
    });

    this.saveIngredients(currentList, storeId);
    return { imported, updated, errors };
  }
}
