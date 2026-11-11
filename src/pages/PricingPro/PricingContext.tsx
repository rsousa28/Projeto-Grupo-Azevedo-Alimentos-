import React, { createContext, useContext, useMemo } from 'react';
import { buildContext, overheadPct, type PricingContext as EngineContext } from '../../lib/pricing/engine';
import type { PricingStore } from '../../lib/pricing/usePricingData';
import { useToast } from '../../contexts/ToastContext';

interface PricingUI {
  store: PricingStore;
  ctx: EngineContext;
  overhead: number;
  storeName: string;
  /** Executa uma gravação e mostra o erro em toast, sem travar a tela. */
  run: (action: () => Promise<unknown>, okMessage?: string) => Promise<boolean>;
}

const Ctx = createContext<PricingUI | null>(null);

export function PricingProvider({ store, storeName, children }: { store: PricingStore; storeName: string; children: React.ReactNode }) {
  const toast = useToast();
  const ctx = useMemo(() => buildContext(store.data), [store.data]);
  const overhead = useMemo(() => overheadPct(store.data), [store.data]);

  const run = async (action: () => Promise<unknown>, okMessage?: string) => {
    try {
      await action();
      if (okMessage) toast.success(okMessage);
      return true;
    } catch (err: any) {
      console.error('[Precificação] Falha ao gravar:', err);
      toast.error(err?.code === 'permission-denied' ? 'Sem permissão para alterar esta loja.' : 'Não foi possível salvar. Tente de novo.');
      return false;
    }
  };

  return <Ctx.Provider value={{ store, ctx, overhead, storeName, run }}>{children}</Ctx.Provider>;
}

export function usePricing(): PricingUI {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePricing fora do PricingProvider');
  return v;
}
