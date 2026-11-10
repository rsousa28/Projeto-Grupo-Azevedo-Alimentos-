export interface NfeProductMapping {
  fornecedorIdentificador: string; // CNPJ ou Nome do fornecedor
  cProd: string; // Código do produto na NF-e do fornecedor
  xProdOriginal: string; // Descrição na nota
  insumoId: string; // ID do insumo vinculado no Grupo Azevedo
  fatorConversaoEmbalagem: number; // Quantas unidades de consumo do insumo existem em 1 unidade comercial (ex: CX de 12kg = 12000g)
  uComOriginal: string; // Unidade na NF (ex: CX, KG, UN, FARDO)
  updatedAt: string;
}

const NFE_MAPPINGS_KEY_PREFIX = 'grupo_azevedo_nfe_mappings_v1';

export class NfeMappingService {
  private static getKey(storeId = '3'): string {
    return `${NFE_MAPPINGS_KEY_PREFIX}_${storeId}`;
  }

  private static getCompositeKey(fornecedor: string, cProd: string): string {
    const fClean = fornecedor.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cClean = cProd.toLowerCase().trim();
    return `${fClean}::${cClean}`;
  }

  static getMappings(storeId = '3'): Record<string, NfeProductMapping> {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.getKey(storeId));
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Erro ao carregar mapeamentos de NF-e:', e);
    }
    return {};
  }

  static findMapping(fornecedor: string, cProd: string, storeId = '3'): NfeProductMapping | undefined {
    const mappings = this.getMappings(storeId);
    const key = this.getCompositeKey(fornecedor, cProd);
    return mappings[key];
  }

  static saveMapping(mapping: NfeProductMapping, storeId = '3'): void {
    try {
      const mappings = this.getMappings(storeId);
      const key = this.getCompositeKey(mapping.fornecedorIdentificador, mapping.cProd);
      mappings[key] = {
        ...mapping,
        updatedAt: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getKey(storeId), JSON.stringify(mappings));
      }
    } catch (e) {
      console.error('Erro ao salvar mapeamento de NF-e:', e);
    }
  }

  static saveBatchMappings(list: NfeProductMapping[], storeId = '3'): void {
    try {
      const mappings = this.getMappings(storeId);
      list.forEach(item => {
        const key = this.getCompositeKey(item.fornecedorIdentificador, item.cProd);
        mappings[key] = {
          ...item,
          updatedAt: new Date().toISOString()
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.getKey(storeId), JSON.stringify(mappings));
      }
    } catch (e) {
      console.error('Erro ao salvar lote de mapeamentos de NF-e:', e);
    }
  }
}
