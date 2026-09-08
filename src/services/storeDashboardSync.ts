import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StoreOnlyBinding, StoreBenchmark } from '../types/holding';
import { HoldingStorage, DEFAULT_STORE_BENCHMARKS } from './holdingStorage';
import { DREData } from '../types';

export interface PreviousMonthInfo {
  monthNum: string; // '08'
  yearNum: string;  // '2026'
  monthName: string; // 'Agosto'
  periodLabel: string; // 'Agosto/2026'
}

export const STORE_MAPPINGS: Record<StoreOnlyBinding, { storeId: string; code: StoreOnlyBinding; name: string }> = {
  B32: { storeId: '1', code: 'B32', name: 'Bebelu Mossoró' },
  B28: { storeId: '2', code: 'B28', name: 'Bebelu Rio Mar' },
  VERO: { storeId: '3', code: 'VERO', name: 'Vero Pasta' },
};

/**
 * Retorna as informações do mês passado com base na data atual
 * Exemplo: se hoje é Setembro/2026, retorna mês 08 (Agosto) de 2026
 */
export function getPreviousMonthInfo(): PreviousMonthInfo {
  const now = new Date();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthNum = String(prevDate.getMonth() + 1).padStart(2, '0');
  const yearNum = String(prevDate.getFullYear());

  const monthNames: Record<string, string> = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro'
  };

  const monthName = monthNames[monthNum] || 'Mês Anterior';

  return {
    monthNum,
    yearNum,
    monthName,
    periodLabel: `${monthName}/${yearNum}`
  };
}

/**
 * Tenta obter a DRE salva no LocalStorage para uma loja específica em um mês/ano
 */
export function getLocalStoreDRE(storeCode: StoreOnlyBinding, monthNum: string, yearNum: string): DREData | null {
  const mapping = STORE_MAPPINGS[storeCode];
  if (!mapping || typeof window === 'undefined') return null;

  const possibleKeys = [
    `g_azevedo_dre_backup_${mapping.storeId}_${yearNum}_${monthNum}`,
    `g_azevedo_dre_backup_${mapping.code}_${yearNum}_${monthNum}`,
    `g_azevedo_dre_backup_${mapping.storeId}_${yearNum}-${monthNum}`,
    `g_azevedo_dre_backup_${mapping.code}_${yearNum}-${monthNum}`
  ];

  for (const key of possibleKeys) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed.faturamento === 'number') {
          return parsed as DREData;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
}

/**
 * Busca de forma unificada os dados do mês passado para todas as lojas.
 * Prioriza dados do DRE do mês passado preenchidos no Dashboard.
 */
export function getPreviousMonthStoreMetrics(): {
  periodInfo: PreviousMonthInfo;
  stores: Record<StoreOnlyBinding, {
    monthlyRevenue: number;
    cmv: number;
    ebitda: number;
    margin: number;
    hasDashboardData: boolean;
  }>;
} {
  const period = getPreviousMonthInfo();
  const currentBenchmarks = HoldingStorage.getStoreBenchmarks();

  const codes: StoreOnlyBinding[] = ['B32', 'B28', 'VERO'];
  const storesResult: Record<StoreOnlyBinding, {
    monthlyRevenue: number;
    cmv: number;
    ebitda: number;
    margin: number;
    hasDashboardData: boolean;
  }> = {} as any;

  let hasAnyUpdate = false;
  const updatedBenchmarks = { ...currentBenchmarks };

  for (const code of codes) {
    const dre = getLocalStoreDRE(code, period.monthNum, period.yearNum);
    const existing = currentBenchmarks[code] || DEFAULT_STORE_BENCHMARKS[code];

    if (dre && dre.faturamento > 0) {
      const rev = dre.faturamento;
      const cmv = dre.cmv || dre.cmvAlvo || 0;
      const ebitda = dre.ebitda !== undefined ? dre.ebitda : (dre.netProfit || 0);
      const margin = rev > 0 ? (ebitda / rev) * 100 : 0;

      storesResult[code] = {
        monthlyRevenue: rev,
        cmv,
        ebitda,
        margin,
        hasDashboardData: true
      };

      // Atualiza o benchmark local se for diferente
      if (
        existing.monthlyRevenue !== rev ||
        existing.cmv !== cmv ||
        existing.ebitda !== ebitda
      ) {
        updatedBenchmarks[code] = {
          ...existing,
          monthlyRevenue: rev,
          cmv,
          ebitda,
          margin
        };
        hasAnyUpdate = true;
      }
    } else {
      // Se não tiver no dashboard do mês passado, usa o valor configurado
      storesResult[code] = {
        monthlyRevenue: existing.monthlyRevenue || 0,
        cmv: existing.cmv || 0,
        ebitda: existing.ebitda || 0,
        margin: existing.margin || 0,
        hasDashboardData: false
      };
    }
  }

  if (hasAnyUpdate) {
    HoldingStorage.saveStoreBenchmarks(updatedBenchmarks);
  }

  return {
    periodInfo: period,
    stores: storesResult
  };
}

/**
 * Carrega também assincronamente do Firestore para o mês anterior caso o usuário
 * tenha preenchido em outro navegador e ainda não esteja no LocalStorage
 */
export async function syncPreviousMonthFromFirestore(): Promise<boolean> {
  const period = getPreviousMonthInfo();
  const periodId = `${period.yearNum}-${period.monthNum}`;
  let updatedAny = false;

  const codes: StoreOnlyBinding[] = ['B32', 'B28', 'VERO'];
  for (const code of codes) {
    const mapping = STORE_MAPPINGS[code];
    try {
      const docRef = doc(db, 'stores', mapping.storeId, 'dre_periods', periodId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as DREData;
        if (data && data.faturamento > 0) {
          // Salva no backup local
          localStorage.setItem(`g_azevedo_dre_backup_${mapping.storeId}_${period.yearNum}_${period.monthNum}`, JSON.stringify(data));
          HoldingStorage.updateStoreBenchmark(code, {
            monthlyRevenue: data.faturamento,
            cmv: data.cmv || data.cmvAlvo || 0,
            ebitda: data.ebitda !== undefined ? data.ebitda : (data.netProfit || 0),
            margin: data.faturamento > 0 ? ((data.ebitda || 0) / data.faturamento) * 100 : 0
          });
          updatedAny = true;
        }
      }
    } catch (e) {
      console.warn(`Erro ao sincronizar loja ${code} do Firestore:`, e);
    }
  }

  return updatedAny;
}

/**
 * Notifica a Holding quando o usuário salva uma DRE no Dashboard de qualquer loja
 */
export function syncStoreDREToHolding(storeIdOrCode: string, month: string, year: string, dreData: DREData) {
  const period = getPreviousMonthInfo();
  // Se for o mês anterior sendo preenchido, ou mesmo o mês vigente
  let targetCode: StoreOnlyBinding | null = null;
  if (storeIdOrCode === '1' || storeIdOrCode === 'B32') targetCode = 'B32';
  if (storeIdOrCode === '2' || storeIdOrCode === 'B28') targetCode = 'B28';
  if (storeIdOrCode === '3' || storeIdOrCode === 'VERO') targetCode = 'VERO';

  if (!targetCode) return;

  // Atualiza no HoldingStorage se for do período anterior ou mais recente
  const rev = dreData.faturamento || 0;
  const cmv = dreData.cmv || dreData.cmvAlvo || 0;
  const ebitda = dreData.ebitda !== undefined ? dreData.ebitda : (dreData.netProfit || 0);
  const margin = rev > 0 ? (ebitda / rev) * 100 : 0;

  HoldingStorage.updateStoreBenchmark(targetCode, {
    monthlyRevenue: rev,
    cmv,
    ebitda,
    margin
  });
}
