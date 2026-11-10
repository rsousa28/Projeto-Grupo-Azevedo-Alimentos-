import { TechnicalSheet, ChannelType, SubRecipe, PackagingItem } from '../types/technicalSheet';
import { INITIAL_TECHNICAL_SHEETS } from '../data/initialTechnicalSheets';
import { INITIAL_SUB_RECIPES } from '../data/initialSubRecipes';

const STORAGE_KEY_SHEETS = 'grupo_azevedo_technical_sheets_v2';
const STORAGE_KEY_SUB_RECIPES = 'grupo_azevedo_sub_recipes_v2';

export class TechnicalSheetService {
  // ==========================================
  // ==========================================
  // FICHAS TÉCNICAS (DISHES) & MIGRAÇÃO ÚNICA
  // ==========================================
  private static MIGRATION_FLAG_KEY = 'grupo_azevedo_migration_v2_decimal_done';
  private static BACKUP_KEY = 'grupo_azevedo_backup_pre_v2_migration';

  /**
   * Executa uma migração única de dados legados sem heurísticas em tempo de execução.
   * Cria backup preventivo e recalcula o CMV real (custoTotal / precoVenda) de forma exata.
   */
  static runOneTimeLegacyMigration(dryRun = false): { success: boolean; migratedCount: number; backupKey?: string } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SHEETS);
      if (!stored) {
        if (!dryRun) localStorage.setItem(this.MIGRATION_FLAG_KEY, 'true');
        return { success: true, migratedCount: 0 };
      }

      const parsed: TechnicalSheet[] = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        if (!dryRun) localStorage.setItem(this.MIGRATION_FLAG_KEY, 'true');
        return { success: true, migratedCount: 0 };
      }

      // Cria backup seguro
      if (!dryRun) {
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify({
          timestamp: new Date().toISOString(),
          sheets: parsed
        }));
      }

      // Migra com recálculo matemático exato baseado em custo e preço real
      const migrated = parsed.map(sheet => this.recalculateMetrics(sheet));

      if (!dryRun) {
        this.saveSheets(migrated);
        localStorage.setItem(this.MIGRATION_FLAG_KEY, 'true');
      }

      return {
        success: true,
        migratedCount: migrated.length,
        backupKey: this.BACKUP_KEY
      };
    } catch (e) {
      console.error('Falha na migração única de percentuais:', e);
      return { success: false, migratedCount: 0 };
    }
  }

  static getSheets(): TechnicalSheet[] {
    try {
      // Executa a migração única de forma transparente se ainda não foi executada
      if (typeof window !== 'undefined' && !localStorage.getItem(this.MIGRATION_FLAG_KEY)) {
        this.runOneTimeLegacyMigration(false);
      }

      const stored = localStorage.getItem(STORAGE_KEY_SHEETS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar fichas técnicas do localStorage:', e);
    }
    
    // Salva o padrão inicial no localStorage
    this.saveSheets(INITIAL_TECHNICAL_SHEETS);
    return INITIAL_TECHNICAL_SHEETS;
  }

  static saveSheets(sheets: TechnicalSheet[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_SHEETS, JSON.stringify(sheets));
    } catch (e) {
      console.error('Erro ao salvar fichas técnicas no localStorage:', e);
    }
  }

  static getSheetById(id: string): TechnicalSheet | undefined {
    const sheets = this.getSheets();
    return sheets.find(s => s.id === id);
  }

  static saveSheet(sheet: TechnicalSheet): TechnicalSheet[] {
    const sheets = this.getSheets();
    const index = sheets.findIndex(s => s.id === sheet.id);

    // Recalcular métricas de segurança
    const calculatedSheet = this.recalculateMetrics(sheet);

    let updatedSheets: TechnicalSheet[];
    if (index >= 0) {
      updatedSheets = [...sheets];
      updatedSheets[index] = calculatedSheet;
    } else {
      updatedSheets = [calculatedSheet, ...sheets];
    }

    this.saveSheets(updatedSheets);
    return updatedSheets;
  }

  static deleteSheet(id: string): TechnicalSheet[] {
    const sheets = this.getSheets();
    const updated = sheets.filter(s => s.id !== id);
    this.saveSheets(updated);
    return updated;
  }

  /**
   * Duplica a ficha técnica alternando entre canais (Balcão vs iFood)
   * com troca automática inteligente de embalagens e taxas de comissão!
   */
  static duplicateSheet(id: string, targetCanal?: ChannelType): TechnicalSheet[] {
    const sheets = this.getSheets();
    const original = sheets.find(s => s.id === id);
    if (!original) return sheets;

    const newCanal = targetCanal || (original.canal === 'IFOOD' ? 'BALCAO' : 'IFOOD');
    const isNewChannel = newCanal !== original.canal;

    // Embalagens automáticas de acordo com o canal de destino
    let adaptedPackaging: PackagingItem[] = [...original.embalagens];
    let newPrice = original.precoVenda;

    if (isNewChannel) {
      if (newCanal === 'IFOOD') {
        // Balcão -> iFood: Aumenta preço para cobrir comissão e troca embalagem para delivery térmico + kraft + lacre
        if (original.categoria === 'MASSAS') {
          adaptedPackaging = [
            { id: `emb-ifood-${Date.now()}-1`, nome: 'Pote Térmico p/ Massas 500ml', quantidade: 1, custoUnitario: 1.86, custoTotal: 1.86 },
            { id: `emb-ifood-${Date.now()}-2`, nome: 'Saco Kraft Delivery Reforçado', quantidade: 1, custoUnitario: 0.60, custoTotal: 0.60 },
            { id: `emb-ifood-${Date.now()}-3`, nome: 'Lacre de Segurança Adesivo', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
            { id: `emb-ifood-${Date.now()}-4`, nome: 'Guardanapo Sachê Delivery', quantidade: 1, custoUnitario: 0.05, custoTotal: 0.05 },
          ];
        } else if (original.categoria === 'WRAPS') {
          adaptedPackaging = [
            { id: `emb-ifood-${Date.now()}-1`, nome: 'Envelope Térmico Barreira de Gordura', quantidade: 1, custoUnitario: 0.75, custoTotal: 0.75 },
            { id: `emb-ifood-${Date.now()}-2`, nome: 'Saco Kraft Delivery Médio', quantidade: 1, custoUnitario: 0.60, custoTotal: 0.60 },
            { id: `emb-ifood-${Date.now()}-3`, nome: 'Lacre de Segurança Adesivo', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
            { id: `emb-ifood-${Date.now()}-4`, nome: 'Ketchup Sachê Premium 7g', quantidade: 2, custoUnitario: 0.27, custoTotal: 0.54 },
            { id: `emb-ifood-${Date.now()}-5`, nome: 'Guardanapo Sachê Reforçado', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
          ];
        } else {
          adaptedPackaging = [
            { id: `emb-ifood-${Date.now()}-1`, nome: 'Marmita Forno de Alumínio c/ Tampa 650g', quantidade: 1, custoUnitario: 1.90, custoTotal: 1.90 },
            { id: `emb-ifood-${Date.now()}-2`, nome: 'Saco Kraft Reforçado c/ Fundo Largo', quantidade: 1, custoUnitario: 0.85, custoTotal: 0.85 },
            { id: `emb-ifood-${Date.now()}-3`, nome: 'Lacre de Segurança inviolável', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
            { id: `emb-ifood-${Date.now()}-4`, nome: 'Kit Talher Reforçado c/ Guardanapo', quantidade: 1, custoUnitario: 0.45, custoTotal: 0.45 },
          ];
        }
        // Markup sugerido de +20% para equilibrar comissão iFood de 28%
        newPrice = Number((original.precoVenda * 1.20).toFixed(2));
      } else {
        // iFood -> Balcão: Troca embalagens caras por papel bandeja + sachê
        adaptedPackaging = [
          { id: `emb-balcao-${Date.now()}-1`, nome: 'Papel Bandeja Prato Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
          { id: `emb-balcao-${Date.now()}-2`, nome: 'Guardanapo Sachê (2 folhas)', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
          { id: `emb-balcao-${Date.now()}-3`, nome: 'Sachê Queijo ou Molho Especial', quantidade: 1, custoUnitario: 0.35, custoTotal: 0.35 },
        ];
        // Preço de balcão mais competitivo (-15%)
        newPrice = Number((original.precoVenda * 0.85).toFixed(2));
      }
    }

    const duplicated: TechnicalSheet = {
      ...original,
      id: `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: isNewChannel 
        ? `${original.nome.replace(/\((Balcão|iFood|Cópia)\)/gi, '').trim()} (${newCanal === 'IFOOD' ? 'iFood' : 'Balcão'})`
        : `${original.nome} (Cópia)`,
      canal: newCanal,
      embalagens: adaptedPackaging,
      precoVenda: newPrice,
      taxaCanalPercent: newCanal === 'IFOOD' ? 28 : 7,
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };

    const recalculated = this.recalculateMetrics(duplicated);
    const updatedSheets = [recalculated, ...sheets];
    this.saveSheets(updatedSheets);
    return updatedSheets;
  }

  static applyBatchPriceUpdates(updates: { id: string; novoPreco: number; novaTaxaCanal?: number }[]): TechnicalSheet[] {
    const sheets = this.getSheets();
    const updated = sheets.map(sheet => {
      const match = updates.find(u => u.id === sheet.id);
      if (!match) return sheet;

      const modified: TechnicalSheet = {
        ...sheet,
        precoVenda: match.novoPreco,
        taxaCanalPercent: match.novaTaxaCanal !== undefined ? match.novaTaxaCanal : sheet.taxaCanalPercent
      };
      return this.recalculateMetrics(modified);
    });

    this.saveSheets(updated);
    return updated;
  }

  static resetToDefault(): TechnicalSheet[] {
    this.saveSheets(INITIAL_TECHNICAL_SHEETS);
    this.saveSubRecipes(INITIAL_SUB_RECIPES);
    return INITIAL_TECHNICAL_SHEETS;
  }

  static recalculateMetrics(sheet: TechnicalSheet): TechnicalSheet {
    const custoInsumos = Number(
      sheet.ingredientes.reduce((sum, item) => sum + (Number(item.custoTotal) || 0), 0).toFixed(2)
    );
    const custoEmbalagens = Number(
      sheet.embalagens.reduce((sum, item) => sum + (Number(item.custoTotal) || 0), 0).toFixed(2)
    );
    const custoTotal = Number((custoInsumos + custoEmbalagens).toFixed(2));
    const precoVenda = Number(sheet.precoVenda) || 0;

    // Taxas e impostos armazenados estritamente como decimal puro (ex: 0.28 e 0.05)
    const taxaCanalDecimal = Number(sheet.taxaCanalPercent) || 0;
    const impostoDecimal = Number(sheet.impostoSimplesPercent) || 0;

    // CMV Teórico armazenado estritamente como decimal (ex: 0.3006 para 30,1%)
    const cmvTeoricoPercent = precoVenda > 0 
      ? Number((custoTotal / precoVenda).toFixed(4)) 
      : 0;

    const taxaCanal = precoVenda * taxaCanalDecimal;
    const imposto = precoVenda * impostoDecimal;
    const margemContribuicaoReais = Number((precoVenda - taxaCanal - imposto - custoTotal).toFixed(2));
    
    // Margem armazenada estritamente como decimal (ex: 0.369 para 36,9%)
    const margemContribuicaoPercent = precoVenda > 0 
      ? Number((margemContribuicaoReais / precoVenda).toFixed(4)) 
      : 0;

    return {
      ...sheet,
      custoInsumos,
      custoEmbalagens,
      custoTotal,
      cmvTeoricoPercent,
      taxaCanalPercent: taxaCanalDecimal,
      impostoSimplesPercent: impostoDecimal,
      margemContribuicaoReais,
      margemContribuicaoPercent,
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };
  }

  // ==========================================
  // SUB-RECEITAS / PRODUÇÃO DE COZINHA (BASES)
  // ==========================================
  static getSubRecipes(): SubRecipe[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUB_RECIPES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar sub-receitas do localStorage:', e);
    }
    this.saveSubRecipes(INITIAL_SUB_RECIPES);
    return INITIAL_SUB_RECIPES;
  }

  static saveSubRecipes(subRecipes: SubRecipe[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_SUB_RECIPES, JSON.stringify(subRecipes));
    } catch (e) {
      console.error('Erro ao salvar sub-receitas no localStorage:', e);
    }
  }

  /**
   * Salva a sub-receita e CASCATA o novo custo unitário (R$/ml ou R$/g)
   * em tempo real para TODAS as fichas técnicas de pratos vinculadas!
   */
  static saveSubRecipe(subRecipe: SubRecipe): { subRecipes: SubRecipe[]; updatedSheets: TechnicalSheet[] } {
    // 1. Recalcula o custo da batelada e o custo unitário (R$/ml ou R$/g)
    const custoTotalLote = Number(
      subRecipe.ingredientes.reduce((sum, item) => sum + (Number(item.custoTotal) || 0), 0).toFixed(2)
    );
    const rendimento = Number(subRecipe.rendimentoLote) || 1;
    const custoUnitarioCalculado = Number((custoTotalLote / rendimento).toFixed(6));

    const finalSubRecipe: SubRecipe = {
      ...subRecipe,
      custoTotalLote,
      custoUnitarioCalculado,
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };

    // 2. Atualiza a lista de sub-receitas
    const currentSubs = this.getSubRecipes();
    const index = currentSubs.findIndex(s => s.id === finalSubRecipe.id);
    let updatedSubs: SubRecipe[];
    if (index >= 0) {
      updatedSubs = [...currentSubs];
      updatedSubs[index] = finalSubRecipe;
    } else {
      updatedSubs = [finalSubRecipe, ...currentSubs];
    }
    this.saveSubRecipes(updatedSubs);

    // 3. EFEITO CASCATA: Atualiza todos os pratos que usam esta sub-receita
    const currentSheets = this.getSheets();
    let hasCascadeChanges = false;

    const updatedSheets = currentSheets.map(sheet => {
      let dishChanged = false;
      const newIngredients = sheet.ingredientes.map(ing => {
        // Verifica vínculo por ID ou correspondência de nome
        const isLinked = ing.subRecipeId === finalSubRecipe.id || 
          (ing.nome.toLowerCase().includes(finalSubRecipe.nome.toLowerCase().slice(0, 12)));

        if (isLinked) {
          dishChanged = true;
          hasCascadeChanges = true;
          const newUnitCost = custoUnitarioCalculado;
          const newTotalCost = Number((ing.quantidade * newUnitCost).toFixed(2));

          return {
            ...ing,
            subRecipeId: finalSubRecipe.id,
            subRecipeNome: finalSubRecipe.nome,
            custoUnitario: newUnitCost,
            custoTotal: newTotalCost
          };
        }
        return ing;
      });

      if (dishChanged) {
        return this.recalculateMetrics({
          ...sheet,
          ingredientes: newIngredients
        });
      }
      return sheet;
    });

    if (hasCascadeChanges) {
      this.saveSheets(updatedSheets);
    }

    return { subRecipes: updatedSubs, updatedSheets };
  }

  static deleteSubRecipe(id: string): SubRecipe[] {
    const currentSubs = this.getSubRecipes();
    const updated = currentSubs.filter(s => s.id !== id);
    this.saveSubRecipes(updated);
    return updated;
  }
}
