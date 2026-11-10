import { StoreFoodServiceSettings } from '../types/foodService';

const SETTINGS_KEY_PREFIX = 'grupo_azevedo_food_service_settings_v1';

export const DEFAULT_FOOD_SERVICE_SETTINGS: Record<string, StoreFoodServiceSettings> = {
  // Unidade 3: Vero Pasta
  '3': {
    storeId: '3',
    metaCmvPercent: 0.32, // 32,0%
    alertaDesatualizadoDias: 15, // 15 dias para alerta
    taxaRateioDespesasFixasPercent: 0.18, // 18%
    margemLucroDesejadaPercent: 0.15, // 15%
    canaisDefault: {
      BALCAO: {
        comissaoMarketplace: 0.0,
        taxaPagamentoOnline: 0.032,
        impostoSimples: 0.05,
        coparticipacaoPromocao: 0.0
      },
      IFOOD: {
        comissaoMarketplace: 0.23,
        taxaPagamentoOnline: 0.032,
        impostoSimples: 0.05,
        coparticipacaoPromocao: 0.02
      }
    }
  }
};

export class FoodServiceSettingsService {
  private static getKey(storeId = '3'): string {
    return `${SETTINGS_KEY_PREFIX}_${storeId}`;
  }

  /**
   * Obtém as configurações operacionais da unidade (meta de CMV, prazo de desatualização, etc.).
   */
  static getSettings(storeId = '3'): StoreFoodServiceSettings {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.getKey(storeId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.metaCmvPercent === 'number') {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações de Food Service:', e);
    }

    const fallback = DEFAULT_FOOD_SERVICE_SETTINGS[storeId] || {
      storeId,
      metaCmvPercent: 0.32,
      alertaDesatualizadoDias: 15,
      taxaRateioDespesasFixasPercent: 0.18,
      margemLucroDesejadaPercent: 0.15,
      canaisDefault: {
        BALCAO: { comissaoMarketplace: 0, taxaPagamentoOnline: 0.032, impostoSimples: 0.05, coparticipacaoPromocao: 0 },
        IFOOD: { comissaoMarketplace: 0.23, taxaPagamentoOnline: 0.032, impostoSimples: 0.05, coparticipacaoPromocao: 0.02 }
      }
    };

    this.saveSettings(fallback);
    return fallback;
  }

  /**
   * Salva as configurações operacionais da unidade.
   */
  static saveSettings(settings: StoreFoodServiceSettings): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getKey(settings.storeId), JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('food_service_settings_updated', { detail: settings }));
      }
    } catch (e) {
      console.error('Erro ao salvar configurações de Food Service:', e);
    }
  }
}
