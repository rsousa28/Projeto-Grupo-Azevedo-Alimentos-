// Precificação PRO: fichas técnicas ligadas a ingredientes, receitas base, despesas e embalagens.
import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Box,
  ChefHat,
  CupSoda,
  FileText,
  Layers,
  Loader2,
  Package,
  Receipt,
  Settings2,
  Sparkles,
  Wheat,
} from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { usePricingData } from '../../lib/pricing/usePricingData';
import { defaultConfig, seedVeroPasta } from '../../lib/pricing/seed';
import { PricingProvider, usePricing } from './PricingContext';
import { Btn, Panel } from './ui';
import ScrollTabs from './ScrollTabs';
import DashboardTab from './DashboardTab';
import ExpensesTab from './ExpensesTab';
import IngredientsTab from './IngredientsTab';
import PackagingTab from './PackagingTab';
import RecipesTab from './RecipesTab';
import ProductsTab from './ProductsTab';
import CombosTab from './CombosTab';
import SettingsTab from './SettingsTab';
import InvoicesTab from './InvoicesTab';

type TabId = 'dashboard' | 'despesas' | 'ingredientes' | 'embalagens' | 'notas' | 'receitas' | 'fichas' | 'bebidas' | 'combos' | 'config';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'dashboard', label: 'Visão geral', icon: BarChart3 },
  { id: 'despesas', label: 'Despesas', icon: Receipt },
  { id: 'ingredientes', label: 'Ingredientes', icon: Wheat },
  { id: 'embalagens', label: 'Embalagens', icon: Box },
  { id: 'notas', label: 'Notas fiscais', icon: FileText },
  { id: 'receitas', label: 'Receitas base', icon: ChefHat },
  { id: 'fichas', label: 'Fichas técnicas', icon: BookOpen },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda },
  { id: 'combos', label: 'Combos', icon: Layers },
  { id: 'config', label: 'Taxas e margem', icon: Settings2 },
];

const TAB_KEY = 'pricing_pro_tab';

// Dados que o módulo antigo deixava só no navegador (já substituídos pelo Firestore)
const LEGACY_PREFIXES = [
  'grupo_azevedo_technical_sheets',
  'grupo_azevedo_sub_recipes',
  'grupo_azevedo_ingredients_v1',
  'grupo_azevedo_ing_history_v1',
  'grupo_azevedo_migration_v2',
  'grupo_azevedo_backup_pre_v2',
  'grupo_azevedo_food_service',
];

function purgeLegacyStorage() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && LEGACY_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* armazenamento indisponível: nada a limpar */
  }
}

export default function PricingPro() {
  const { currentStore } = useStore();
  // A visão da holding abre a Vero Pasta, dona das fichas técnicas do grupo.
  const storeId = currentStore.id === 'admin-global' ? '3' : currentStore.id;
  const storeName = currentStore.id === 'admin-global' ? 'VERO PASTA' : currentStore.name;
  const store = usePricingData(storeId);

  return (
    <PricingProvider store={store} storeName={storeName}>
      <PricingShell storeId={storeId} />
    </PricingProvider>
  );
}

function PricingShell({ storeId }: { storeId: string }) {
  const { store, storeName } = usePricing();
  const [tab, setTabState] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY) as TabId | null;
      return saved && TABS.some((t) => t.id === saved) ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  useEffect(purgeLegacyStorage, []);
  const setTab = (t: TabId) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* preferência opcional */
    }
  };

  const counts: Partial<Record<TabId, number>> = {
    ingredientes: store.data.ingredients.length,
    embalagens: store.data.packaging.length,
    receitas: store.data.recipes.length,
    fichas: store.data.products.filter((p) => p.kind === 'product').length,
    bebidas: store.data.products.filter((p) => p.kind === 'drink').length,
    combos: store.data.combos.length,
    notas: store.invoices.filter((i) => i.status === 'pending').length,
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">{storeName} · Precificação PRO</p>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">Fichas técnicas</h1>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          Do ingrediente ao preço de venda, tudo ligado. Mudou um custo, o cardápio recalcula sozinho.
        </p>
      </header>

      <ScrollTabs
        label="Seções da precificação"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
      />

      {store.error ? (
        <Panel className="p-6 text-sm text-rose-600">Não foi possível carregar os dados desta loja: {store.error}</Panel>
      ) : store.loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-stone-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando a precificação…
        </div>
      ) : store.isEmpty ? (
        <Onboarding storeId={storeId} />
      ) : (
        <>
          {tab === 'dashboard' && <DashboardTab onNavigate={(t) => setTab(t as TabId)} />}
          {tab === 'despesas' && <ExpensesTab />}
          {tab === 'ingredientes' && <IngredientsTab />}
          {tab === 'embalagens' && <PackagingTab />}
          {tab === 'notas' && <InvoicesTab />}
          {tab === 'receitas' && <RecipesTab />}
          {tab === 'fichas' && <ProductsTab kind="product" />}
          {tab === 'bebidas' && <ProductsTab kind="drink" />}
          {tab === 'combos' && <CombosTab />}
          {tab === 'config' && <SettingsTab />}
        </>
      )}
    </div>
  );
}

function Onboarding({ storeId }: { storeId: string }) {
  const { store, run } = usePricing();
  const [busy, setBusy] = useState<'seed' | 'empty' | null>(null);

  const start = async (mode: 'seed' | 'empty') => {
    setBusy(mode);
    await run(
      () =>
        mode === 'seed'
          ? store.importAll(seedVeroPasta())
          : store.importAll({ config: defaultConfig(), ingredients: [], packaging: [], recipes: [], products: [], combos: [] }),
      mode === 'seed' ? 'Cardápio exemplo carregado. Ajuste os preços com as suas notas.' : 'Precificação criada.',
    );
    setBusy(null);
  };

  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-300">
            <Sparkles className="h-3.5 w-3.5" /> Primeira vez aqui
          </div>
          <h2 className="text-2xl font-black text-stone-900 dark:text-stone-50">Monte a precificação completa da loja</h2>
          <ol className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
            <li><b>1. Despesas:</b> aluguel, contas, equipe, equipamentos, gás e energia.</li>
            <li><b>2. Ingredientes e embalagens:</b> preço que você paga e o quanto aproveita.</li>
            <li><b>3. Receitas base:</b> molhos, massas e preparos da casa com custo por grama.</li>
            <li><b>4. Fichas técnicas:</b> o produto em etapas, com preço sugerido, tabela nutricional e ficha da cozinha.</li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Btn onClick={() => start('seed')} disabled={!!busy}>
              {busy === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              Começar com o cardápio exemplo da Vero Pasta
            </Btn>
            <Btn variant="outline" onClick={() => start('empty')} disabled={!!busy}>
              Começar vazio
            </Btn>
          </div>
          <p className="text-xs text-stone-400">Os dados ficam salvos no banco da loja {storeId} e aparecem em todos os aparelhos.</p>
        </div>
        <div className="hidden bg-gradient-to-br from-orange-500 to-red-600 p-8 text-white md:block">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-100">O que entra no preço</p>
          <ul className="mt-4 space-y-3 text-sm">
            {['Ingredientes com perda no preparo', 'Embalagens do salão e do delivery', 'Gás e energia de cada equipamento', 'Minutos de mão de obra', 'Impostos, cartão e app de delivery', 'Aluguel, contas e depreciação'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
