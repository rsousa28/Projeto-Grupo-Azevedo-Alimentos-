import React, { useState } from 'react';
import { ChevronDown, Layers, Plus, Trash2 } from 'lucide-react';
import { comboMetrics, newId, nextCode, productCost } from '../../lib/pricing/engine';
import type { Combo, ComboItem } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { PackLinesEditor } from './editors';
import { charmPrice } from './ProductEditor';
import { Badge, Btn, EmptyState, Field, NumInput, Panel, PanelHeader, Select, TableWrap, TextInput, brl, cx, pct, td, th } from './ui';

export default function CombosTab() {
  const { store, ctx, overhead, run } = usePricing();
  const { combos, products } = store.data;
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (c: Combo, patch: Partial<Combo>) => run(() => store.save('combos', { ...c, ...patch }));

  const add = async () => {
    const c: Combo = {
      id: newId('combo'),
      code: nextCode('C', combos.map((x) => x.code)),
      name: 'Novo combo',
      items: products.slice(0, 1).map((p) => ({ productId: p.id, qty: 1 })),
      packaging: [],
      salePrice: 0,
      monthlySales: 0,
      updatedAt: '',
    };
    if (await run(() => store.save('combos', c))) setOpenId(c.id);
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader
          icon={<Layers className="h-5 w-5" />}
          title="Combos, kits e promoções"
          subtitle="Junte produtos e bebidas, veja o desconto em relação aos itens avulsos e se a margem continua de pé."
          actions={
            <Btn onClick={add} disabled={products.length === 0}>
              <Plus className="h-4 w-4" /> Novo combo
            </Btn>
          }
        />
        {combos.length === 0 && (
          <EmptyState icon={<Layers className="h-6 w-6" />} title="Nenhum combo ainda" text="Crie produtos e bebidas primeiro e depois monte os combos." />
        )}
      </Panel>

      {combos.map((c) => {
        const m = comboMetrics(ctx, c, overhead);
        const open = openId === c.id;
        const setItem = (idx: number, patch: Partial<ComboItem>) => update(c, { items: c.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
        return (
          <Panel key={c.id} className="overflow-hidden">
            <button type="button" onClick={() => setOpenId(open ? null : c.id)} className="flex w-full flex-wrap items-center gap-4 px-4 py-3.5 text-left sm:px-5">
              <ChevronDown className={cx('h-4 w-4 text-stone-400 transition', open && 'rotate-180')} />
              <span className="rounded-md bg-orange-600 px-2 py-0.5 text-xs font-black text-white">{c.code}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-stone-900 dark:text-stone-100">{c.name}</p>
                <p className="text-xs text-stone-500">
                  {c.items.length} itens · avulsos {brl(m.itemsListPrice)} · desconto {pct(m.discountPct)}
                </p>
              </div>
              <Metric label="Preço" value={brl(m.price)} />
              <Metric label="Custo" value={brl(m.cost)} />
              <Metric label="Lucro" value={brl(m.profit)} tone={m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
              {m.price > 0 ? m.marginReached ? <Badge tone="green">Margem alcançada</Badge> : <Badge tone="red">Margem não alcançada</Badge> : <Badge tone="amber">Sem preço</Badge>}
            </button>
            {open && (
              <div className="border-t border-stone-100 dark:border-white/5">
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:px-5">
                  <Field label="Nome do combo" className="col-span-2">
                    <TextInput value={c.name} onChange={(name) => update(c, { name })} />
                  </Field>
                  <Field label="Preço no salão">
                    <NumInput mode="money" value={c.salePrice} onChange={(salePrice) => update(c, { salePrice })} />
                  </Field>
                  <Field label="Vendas por mês">
                    <NumInput value={c.monthlySales} onChange={(monthlySales) => update(c, { monthlySales })} />
                  </Field>
                </div>
                <TableWrap>
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-stone-50 dark:bg-white/5">
                      <tr>
                        <th className={th}>Item</th>
                        <th className={th}>Qtd.</th>
                        <th className={`${th} text-right`}>Custo</th>
                        <th className={`${th} text-right`}>Preço avulso</th>
                        <th className={th} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                      {c.items.map((it, idx) => {
                        const p = ctx.products.get(it.productId);
                        return (
                          <tr key={idx}>
                            <td className={td}>
                              <Select value={it.productId} onChange={(e) => setItem(idx, { productId: e.target.value })}>
                                {!p && <option value={it.productId}>Produto excluído</option>}
                                {products.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.code} · {x.name}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className={`${td} w-24`}><NumInput value={it.qty} onChange={(qty) => setItem(idx, { qty })} /></td>
                            <td className={`${td} w-28 text-right tabular-nums`}>{p ? brl(productCost(ctx, p).total * it.qty) : '—'}</td>
                            <td className={`${td} w-28 text-right tabular-nums`}>{p ? brl(p.salePrice * it.qty) : '—'}</td>
                            <td className={`${td} w-10`}>
                              <button type="button" onClick={() => update(c, { items: c.items.filter((_, i) => i !== idx) })} className="rounded-lg p-1.5 text-stone-400 hover:text-rose-600" aria-label="Remover item">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrap>
                <div className="px-4 py-3 sm:px-5">
                  <Btn variant="success" size="sm" onClick={() => update(c, { items: [...c.items, { productId: products[0].id, qty: 1 }] })}>
                    <Plus className="h-4 w-4" /> Item
                  </Btn>
                </div>
                <div className="border-t border-stone-100 dark:border-white/5">
                  <PackLinesEditor title="Embalagens extras do combo" lines={c.packaging} onChange={(packaging) => update(c, { packaging })} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-4 py-3 text-sm sm:px-5 dark:border-white/5 dark:bg-white/[0.02]">
                  <span>
                    Margem {pct(m.profitPct)} · sugerido {m.suggested ? brl(charmPrice(m.suggested)) : '—'}
                  </span>
                  <div className="flex gap-2">
                    {m.suggested && (
                      <Btn variant="outline" size="sm" onClick={() => update(c, { salePrice: charmPrice(m.suggested!) })}>
                        Usar preço sugerido
                      </Btn>
                    )}
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={() => window.confirm(`Excluir o combo "${c.name}"?`) && run(() => store.remove('combos', c.id))}
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className={cx('font-bold tabular-nums', tone || 'text-stone-900 dark:text-stone-100')}>{value}</p>
    </div>
  );
}
