import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CupSoda,
  DollarSign,
  LayoutGrid,
  List,
  PieChart,
  Plus,
  ShoppingCart,
  Tag,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { newId, nextCode, productMetrics } from '../../lib/pricing/engine';
import type { Product, ProductKind } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import ProductEditor from './ProductEditor';
import { Badge, Btn, EmptyState, Panel, SearchBox, Segmented, Select, StatCard, TableWrap, brl, cx, pct, td, th } from './ui';

export function emptyProduct(kind: ProductKind, codes: string[], category: string): Product {
  return {
    id: newId('prod'),
    code: nextCode(kind === 'drink' ? 'B' : 'P', codes.filter((c) => c.startsWith(kind === 'drink' ? 'B' : 'P'))),
    kind,
    name: kind === 'drink' ? 'Nova bebida' : 'Novo produto',
    category,
    lines: [],
    packaging: [],
    deliveryPackaging: [],
    energy: [],
    laborMinutes: 0,
    laborWorkers: kind === 'drink' ? 0 : 1,
    extraCost: 0,
    salePrice: 0,
    monthlySales: 0,
    portionLabel: kind === 'drink' ? '1 unidade' : '1 prato',
    ...(kind === 'drink' ? { liquid: true } : {}),
    version: 1,
    updatedAt: '',
  };
}

export function ProductThumb({ product, className }: { product: Product; className?: string }) {
  return product.photo ? (
    <img src={product.photo} alt={product.name} className={cx('object-cover', className)} />
  ) : (
    <div className={cx('flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 text-orange-400 dark:from-orange-500/20 dark:to-transparent', className)}>
      {product.kind === 'drink' ? <CupSoda className="h-1/3 w-1/3" /> : <UtensilsCrossed className="h-1/3 w-1/3" />}
    </div>
  );
}

type Sort = 'code' | 'margem' | 'lucro' | 'cmv' | 'nome';

export default function ProductsTab({ kind }: { kind: ProductKind }) {
  const { store, ctx, overhead, run } = usePricing();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'grade' | 'lista'>('grade');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [sort, setSort] = useState<Sort>('code');

  const items = store.data.products.filter((p) => p.kind === kind);
  const metrics = useMemo(() => new Map(items.map((p) => [p.id, productMetrics(ctx, p, 'salao', overhead)])), [items, ctx, overhead]);
  const priced = items.filter((p) => metrics.get(p.id)!.hasPrice);
  const avg = (f: (id: string) => number) => (priced.length ? priced.reduce((s, p) => s + f(p.id), 0) / priced.length : 0);
  const totalRevenue = priced.reduce((s, p) => s + p.salePrice, 0);
  const globalCmv = totalRevenue > 0 ? priced.reduce((s, p) => s + metrics.get(p.id)!.cost.ingredients + metrics.get(p.id)!.cost.packaging, 0) / totalRevenue : 0;
  const below = priced.filter((p) => !metrics.get(p.id)!.marginReached).length;

  const categories = Array.from(new Set(items.map((p) => p.category).filter(Boolean)));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (category && p.category !== category) return false;
      if (onlyBelow && metrics.get(p.id)!.marginReached) return false;
      return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    });
    const m = (p: Product) => metrics.get(p.id)!;
    const sorters: Record<Sort, (a: Product, b: Product) => number> = {
      code: (a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }),
      nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      margem: (a, b) => m(b).profitPct - m(a).profitPct,
      lucro: (a, b) => m(b).profit - m(a).profit,
      cmv: (a, b) => m(b).cmvPct - m(a).cmvPct,
    };
    return [...list].sort(sorters[sort]);
  }, [items, query, category, onlyBelow, sort, metrics]);

  const create = async () => {
    const p = emptyProduct(kind, store.data.products.map((x) => x.code), kind === 'drink' ? 'Bebidas' : store.data.config.categories[0] || 'Pratos');
    if (await run(() => store.save('products', p))) setSelectedId(p.id);
  };

  const selected = items.find((p) => p.id === selectedId);
  if (selected) {
    return <ProductEditor product={selected} siblings={items} onSelect={setSelectedId} onBack={() => setSelectedId(null)} onCreate={create} />;
  }

  const label = kind === 'drink' ? 'bebida' : 'produto';

  return (
    <div className="space-y-5">
      <Panel className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
          {kind === 'drink' ? <CupSoda className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-50">{kind === 'drink' ? 'Bebidas' : 'Produtos'}</h2>
          <p className="text-sm text-stone-500">
            {kind === 'drink'
              ? 'Bebidas e itens de revenda: custo de compra, embalagem e preço.'
              : 'Visualize e gerencie a precificação dos seus produtos. Clique em um para abrir a ficha técnica.'}
          </p>
        </div>
        <Btn onClick={create}>
          <Plus className="h-4 w-4" /> Nov{kind === 'drink' ? 'a bebida' : 'o produto'}
        </Btn>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} label={`${kind === 'drink' ? 'Bebidas' : 'Produtos'} cadastrados`} value={items.length} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Preço médio" value={brl(avg((id) => metrics.get(id)!.price))} tone="amber" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Lucro médio" value={brl(avg((id) => metrics.get(id)!.profit))} tone="green" hint={below ? `${below} com margem não alcançada` : 'Todos na margem'} />
        <StatCard
          icon={<PieChart className="h-5 w-5" />}
          label="CMV global"
          value={pct(globalCmv)}
          tone={globalCmv > store.data.config.cmvTargetPct ? 'red' : 'green'}
          hint={`Meta: até ${pct(store.data.config.cmvTargetPct, 0)}`}
        />
      </div>

      <Panel className="flex flex-wrap items-center gap-3 p-3">
        <SearchBox value={query} onChange={setQuery} placeholder={`Buscar ${label}…`} />
        {categories.length > 1 && (
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto">
          <option value="code">Ordem: código</option>
          <option value="nome">Ordem: nome</option>
          <option value="margem">Maior margem</option>
          <option value="lucro">Maior lucro</option>
          <option value="cmv">Maior CMV</option>
        </Select>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300">
          <input type="checkbox" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} className="accent-orange-500" />
          Só margem não alcançada
        </label>
        <Segmented<"grade" | "lista">
          value={view}
          onChange={setView}
          options={[
            { value: 'grade', label: <><LayoutGrid className="h-4 w-4" /> Grade</> },
            { value: 'lista', label: <><List className="h-4 w-4" /> Lista</> },
          ]}
        />
      </Panel>

      {items.length === 0 ? (
        <Panel>
          <EmptyState
            icon={kind === 'drink' ? <CupSoda className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
            title={`Nenhum${kind === 'drink' ? 'a bebida' : ' produto'} ainda`}
            text="Cadastre os ingredientes primeiro e depois monte o produto em etapas."
            action={<Btn onClick={create}><Plus className="h-4 w-4" /> Criar agora</Btn>}
          />
        </Panel>
      ) : view === 'grade' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => {
            const m = metrics.get(p.id)!;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-white/10 dark:bg-[#171513]"
              >
                <div className="relative">
                  <ProductThumb product={p} className="aspect-[4/3] w-full" />
                  <span className="absolute left-3 top-3 rounded-md bg-orange-600 px-2 py-0.5 text-xs font-black text-white shadow">{p.code}</span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="line-clamp-2 min-h-[2.5rem] font-bold leading-tight text-stone-900 dark:text-stone-100">{p.name}</p>
                    <div className="mt-1.5">
                      {!m.hasPrice ? (
                        <Badge tone="amber">Sem preço de venda</Badge>
                      ) : m.marginReached ? (
                        <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Margem alcançada</Badge>
                      ) : (
                        <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Margem não alcançada</Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-white/5">
                    <p className="flex items-center gap-1 text-xs text-stone-500"><Tag className="h-3 w-3" /> Preço de venda</p>
                    <p className="text-2xl font-black tabular-nums text-stone-900 dark:text-stone-50">{brl(m.price)}</p>
                  </div>
                  <dl className="space-y-1.5 text-sm">
                    <Row label="Lucro" value={brl(m.profit)} tone={m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                    <Row label="Margem de lucro" value={pct(m.profitPct)} />
                    <Row label="Custo total" value={brl(m.cost.total)} />
                    <Row label="CMV" value={pct(m.cmvPct)} tone={m.cmvPct > store.data.config.cmvTargetPct ? 'text-rose-600' : undefined} />
                  </dl>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Panel>
          <TableWrap>
            <table className="w-full min-w-[860px]">
              <thead className="bg-stone-50 dark:bg-white/5">
                <tr>
                  <th className={th}>Cód</th>
                  <th className={th}>Produto</th>
                  <th className={`${th} text-right`}>Custo total</th>
                  <th className={`${th} text-right`}>Preço</th>
                  <th className={`${th} text-right`}>Sugerido</th>
                  <th className={`${th} text-right`}>Lucro</th>
                  <th className={`${th} text-right`}>Margem</th>
                  <th className={`${th} text-right`}>CMV</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                {rows.map((p) => {
                  const m = metrics.get(p.id)!;
                  return (
                    <tr key={p.id} onClick={() => setSelectedId(p.id)} className="cursor-pointer hover:bg-orange-50/50 dark:hover:bg-white/[0.03]">
                      <td className={`${td} font-mono text-xs`}>{p.code}</td>
                      <td className={`${td} font-semibold`}>
                        <div className="flex items-center gap-2">
                          <ProductThumb product={p} className="h-9 w-9 shrink-0 rounded-lg" />
                          {p.name}
                        </div>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{brl(m.cost.total)}</td>
                      <td className={`${td} text-right font-bold tabular-nums`}>{brl(m.price)}</td>
                      <td className={`${td} text-right tabular-nums text-stone-500`}>{m.suggested ? brl(m.suggested) : '—'}</td>
                      <td className={`${td} text-right tabular-nums ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{brl(m.profit)}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(m.profitPct)}</td>
                      <td className={`${td} text-right tabular-nums`}>{pct(m.cmvPct)}</td>
                      <td className={td}>
                        {!m.hasPrice ? <Badge tone="amber">Sem preço</Badge> : m.marginReached ? <Badge tone="green">OK</Badge> : <Badge tone="red">Abaixo</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-stone-100 pb-1.5 last:border-0 dark:border-white/5">
      <dt className="text-stone-500">{label}</dt>
      <dd className={cx('font-bold tabular-nums', tone || 'text-stone-900 dark:text-stone-100')}>{value}</dd>
    </div>
  );
}
