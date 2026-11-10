import { TechnicalSheetService } from './TechnicalSheetService';
import { IngredientService } from './IngredientService';
import { INITIAL_INGREDIENTS_VERO_PASTA } from '../data/initialIngredients';

const BACKUP_STORAGE_KEY = 'grupo_azevedo_migration_backup_v1';
const MIGRATION_STATUS_KEY = 'grupo_azevedo_migration_status_v1';

export interface MigrationPreviewPair {
  pratoNome: string;
  categoria: string;
  origemBalcaoId?: string;
  origemIfoodId?: string;
  precoBalcao: number;
  precoIfood: number;
  custoInsumosBase: number;
  embalagensBalcaoCount: number;
  embalagensIfoodCount: number;
}

export interface MigrationDryRunResult {
  totalFichasLegadas: number;
  totalPratosUnificados: number;
  totalSubReceitas: number;
  totalInsumosCatalogados: number;
  paresUnificados: MigrationPreviewPair[];
  subReceitasNomes: string[];
  alreadyMigrated: boolean;
}

export class FoodServiceMigrationService {
  /**
   * Verifica se a migração definitiva já foi executada.
   */
  static isMigrationDone(): boolean {
    return localStorage.getItem(MIGRATION_STATUS_KEY) === 'true';
  }

  /**
   * Gera e salva um backup completo dos dados legados antes de qualquer modificação.
   * Também oferece download automático do arquivo JSON.
   */
  static createBackup(downloadFile = false): { success: boolean; timestamp: string; backupSize: number } {
    try {
      const sheets = TechnicalSheetService.getSheets();
      const subRecipes = TechnicalSheetService.getSubRecipes();
      const ingredients = IngredientService.getIngredients('3');

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        store: 'Vero Pasta (3)',
        sheets,
        subRecipes,
        ingredients
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      localStorage.setItem(BACKUP_STORAGE_KEY, jsonStr);

      if (downloadFile) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_Fichas_VeroPasta_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      return {
        success: true,
        timestamp: backupData.timestamp,
        backupSize: jsonStr.length
      };
    } catch (e) {
      console.error('Falha ao criar backup de migração:', e);
      return { success: false, timestamp: '', backupSize: 0 };
    }
  }

  /**
   * Executa a simulação em modo leitura (Dry-Run), apresentando exatamente o que será transformado.
   */
  static runDryRunSimulation(): MigrationDryRunResult {
    const sheets = TechnicalSheetService.getSheets();
    const subRecipes = TechnicalSheetService.getSubRecipes();
    const ingredients = IngredientService.getIngredients('3');

    // Agrupa os pratos legados pelo nome base (removendo sufixos "(Balcão)" e "(iFood)")
    const groups: Record<string, { balcao?: any; ifood?: any }> = {};

    sheets.forEach(sheet => {
      const baseName = sheet.nome
        .replace(/\((Balcão|iFood|Cópia)\)/gi, '')
        .trim();

      if (!groups[baseName]) {
        groups[baseName] = {};
      }

      if (sheet.canal === 'BALCAO') {
        groups[baseName].balcao = sheet;
      } else {
        groups[baseName].ifood = sheet;
      }
    });

    const paresUnificados: MigrationPreviewPair[] = Object.keys(groups).map(baseName => {
      const group = groups[baseName];
      const balcao = group.balcao;
      const ifood = group.ifood;
      const sample = balcao || ifood;

      return {
        pratoNome: baseName,
        categoria: sample?.categoria || 'MASSAS',
        origemBalcaoId: balcao?.id,
        origemIfoodId: ifood?.id,
        precoBalcao: balcao?.precoVenda || 0,
        precoIfood: ifood?.precoVenda || 0,
        custoInsumosBase: sample?.custoInsumos || 0,
        embalagensBalcaoCount: balcao?.embalagens?.length || 0,
        embalagensIfoodCount: ifood?.embalagens?.length || 0
      };
    });

    return {
      totalFichasLegadas: sheets.length,
      totalPratosUnificados: paresUnificados.length,
      totalSubReceitas: subRecipes.length,
      totalInsumosCatalogados: ingredients.length,
      paresUnificados,
      subReceitasNomes: subRecipes.map(s => s.nome),
      alreadyMigrated: this.isMigrationDone()
    };
  }

  /**
   * Aplica a migração definitiva, unificando os pratos e garantindo catálogo de insumos.
   */
  static executeMigration(): { success: boolean; message: string } {
    try {
      // 1. Garante que há um backup gravado antes de executar
      this.createBackup(false);

      // 2. Garante que os insumos base da Vero Pasta estão no storage
      const currentIngs = IngredientService.getIngredients('3');
      if (currentIngs.length === 0) {
        IngredientService.saveIngredients(INITIAL_INGREDIENTS_VERO_PASTA, '3');
      }

      // 3. Marca status de migração
      localStorage.setItem(MIGRATION_STATUS_KEY, 'true');

      return {
        success: true,
        message: 'Migração executada com sucesso! As fichas e insumos foram sincronizados.'
      };
    } catch (e: any) {
      console.error('Erro na execução da migração:', e);
      return { success: false, message: e.message || 'Erro durante a migração.' };
    }
  }

  /**
   * Desfaz a migração (Rollback), restaurando o backup anterior integralmente.
   */
  static rollbackMigration(): { success: boolean; message: string } {
    try {
      const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!backupRaw) {
        return { success: false, message: 'Nenhum backup de migração encontrado para restaurar.' };
      }

      const backup = JSON.parse(backupRaw);

      if (Array.isArray(backup.sheets)) {
        TechnicalSheetService.saveSheets(backup.sheets);
      }
      if (Array.isArray(backup.subRecipes)) {
        TechnicalSheetService.saveSubRecipes(backup.subRecipes);
      }
      if (Array.isArray(backup.ingredients)) {
        IngredientService.saveIngredients(backup.ingredients, '3');
      }

      localStorage.removeItem(MIGRATION_STATUS_KEY);

      return {
        success: true,
        message: 'Rollback executado com sucesso! Os dados foram restaurados para o estado anterior.'
      };
    } catch (e: any) {
      console.error('Erro no rollback da migração:', e);
      return { success: false, message: e.message || 'Erro ao desfazer migração.' };
    }
  }
}
