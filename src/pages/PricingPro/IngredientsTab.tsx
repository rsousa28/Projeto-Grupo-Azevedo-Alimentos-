import React, { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Apple, History, Plus, Trash2, TrendingUp, Wheat, X } from 'lucide-react';
import {
  BUY_UNITS,
  NUTRIENT_KEYS,
  NUTRIENT_LABELS,
  buyUnitOf,
  correctionFactor,
  ingredientBuyUnitCost,
  ingredientPriceImpact,
  ingredientUnitCost,
  newId,
  nextCode,
  usagesOf,
  type PriceImpact,
} from '../../lib/pricing/engine';
import type { BuyUnit, Ingredient, Nutrients } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import {
  Badge,
  Btn,
  Field,
  Modal,
  NumInput,
  Panel,
  SearchBox,
  Segmented,
  Select,
  StatCard,
  TableWrap,
  TextInput,
  brl,
  brlUnit,
  num,
  pct,
  td,
  th,
} from './ui';

type Filter = 'todos' | 'sem-preco' | 'sem-nutricao';

const hasNutrition = (i: Ingredient) => !!i.nutrients && NUTRIENT_KEYS.some((k) => (i.nutrients?.[k] || 0) > 0);

export default function IngredientsTab() {
  const { store, run } = usePricing();
  const { ingredients } = store.data;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [nutritionFor, setNutritionFor] = useState<Ingredient | null>(null);
  const [historyFor, setHistoryFor] = useState<Ingredient | null>(null);
  const [impact, setImpact] = useState<{ name: string; delta: number; items: PriceImpact[] } | null>(null);

  const withoutPrice = ingredients.filter((i) => !(i.price > 0));
  const withoutNutrition = ingredients.filter((i) => !hasNutrition(i));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ingredients.filter((i) => {
      if (filter === 'sem-preco' && i.price > 0) return false;
      if (filter === 'sem-nutricao' && hasNutrition(i)) return false;
      return !q || i.name.toLowerCase().includes(q) || i.code.includes(q) || (i.supplier || '').toLowerCase().includes(q);
    });
  }, [ingredients, query, filter]);

  const usageCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of ingredients) m.set(i.id, usagesOf(store.data, 'ingredient', i.id).length);
    return m;
  }, [ingredients, store.data]);

  const update = async (ing: Ingredient, patch: Partial<Ingredient>) => {
    const next: Ingredient = { ...ing, ...patch };
    const priceChanged = patch.price !== undefined || patch.purchaseQty !== undefined || patch.netQty !== undefined;
    if (priceChanged && ing.price > 0) {
      const before = ingredientUnitCost(ing);
      const after = ingredientUnitCost(next);
      const items = ingredientPriceImpact(store.data, next);
      if (items.length > 0) setImpact({ name: next.name, delta: before > 0 ? after / before - 1 : 0, items });
    }
    if (patch.price !== undefined || patch.purchaseQty !== undefined) {
      next.priceHistory = [...(ing.priceHistory || []), { date: new Date().toISOString(), price: next.price, purchaseQty: next.purchaseQty }].slice(-30);
    }
    await run(() => store.save('ingredients', next));
  };

  const add = () =>
    run(() =>
      store.save('ingredients', {
        id: newId('ing'),
        code: nextCode('', ingredients.map((i) => i.code), 4),
        name: 'Novo ingrediente',
        unit: 'g',
        buyUnit: 'kg',
        purchaseQty: 1000,
        netQty: 1000,
        price: 0,
        updatedAt: '',
      }),
    );

  // Trocar kg por g só muda como aparece (1 kg = 1000 g). Trocar de grandeza (kg -> L ou un) mantém o número digitado.
  const changeBuyUnit = (ing: Ingredient, buyUnit: BuyUnit) => {
    const from = BUY_UNITS[buyUnitOf(ing)];
    const to = BUY_UNITS[buyUnit];
    if (to.base === ing.unit) return update(ing, { buyUnit });
    const scale = to.factor / from.factor;
    return update(ing, { buyUnit, unit: to.base, purchaseQty: ing.purchaseQty * scale, netQty: ing.netQty * scale });
  };

  const remove = (ing: Ingredient) => {
    const uses = usagesOf(store.data, 'ingredient', ing.id);
    if (uses.length) {
      window.alert(`"${ing.name}" está em uso e não pode ser excluído:\n\n• ${uses.join('\n• ')}`);
      return;
    }
    if (window.confirm(`Excluir o ingrediente "${ing.name}"?`)) run(() => store.remove('ingredients', ing.id));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Wheat className="h-5 w-5" />} label="Ingredientes cadastrados" value={ingredients.length} />
        <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Sem preço" value={withoutPrice.length} tone={withoutPrice.length ? 'red' : 'green'} hint={withoutPrice.length ? 'Produtos com esses itens ficam com custo errado' : 'Tudo com preço'} />
        <StatCard icon={<Apple className="h-5 w-5" />} label="Sem dados do rótulo" value={withoutNutrition.length} tone={withoutNutrition.length ? 'amber' : 'green'} hint="Necessários para a tabela nutricional" />
      </div>

      {impact && (
        <Panel className="border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {impact.name}: custo {impact.delta >= 0 ? 'subiu' : 'caiu'} {pct(Math.abs(impact.delta))}. {impact.items.length} produto(s) recalculados.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-stone-700 dark:text-stone-300">
                  {impact.items.slice(0, 8).map((i) => (
                    <li key={i.productId} className="flex flex-wrap items-center gap-2">
                      <b>{i.name}</b>
                      <span className="tabular-nums">custo {brl(i.costBefore)} → {brl(i.costAfter)}</span>
                      <span className="tabular-nums">lucro {pct(i.profitPctBefore)} → {pct(i.profitPctAfter)}</span>
                      {i.losesTarget && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> margem não alcançada</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button type="button" onClick={() => setImpact(null)} className="rounded-lg p-1 text-stone-500 hover:bg-amber-100" aria-label="Fechar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 p-4 dark:border-white/5">
          <SearchBox value={query} onChange={setQuery} placeholder="Pesquisar ingrediente ou fornecedor…" />
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos', label: `Todos (${ingredients.length})` },
              { value: 'sem-preco', label: `Sem preço (${withoutPrice.length})` },
              { value: 'sem-nutricao', label: `Sem rótulo (${withoutNutrition.length})` },
            ]}
          />
          <Btn variant="success" onClick={add}>
            <Plus className="h-4 w-4" /> Novo ingrediente
          </Btn>
        </div>
        <TableWrap>
          <table className="w-full min-w-[1250px]">
            <thead className="bg-stone-50 dark:bg-white/5">
              <tr>
                <th className={th}>Cód</th>
                <th className={th}>Nome</th>
                <th className={th} title="Unidade em que você compra">Comprado em</th>
                <th className={th} title="Quantidade que você compra">Qtd. bruta</th>
                <th className={th} title="Quantidade aproveitada depois de limpar">Qtd. líquida</th>
                <th className={th} title="Preço pago pela quantidade bruta">Preço</th>
                <th className={th} title="Bruta ÷ líquida">Fator</th>
                <th className={`${th} text-right`} title="Custo do que é aproveitado, na unidade de compra">Custo real</th>
                <th className={th}>Fornecedor</th>
                <th className={th}>Uso</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {rows.map((i) => {
                const factor = correctionFactor(i);
                const bu = buyUnitOf(i);
                const k = BUY_UNITS[bu].factor;
                return (
                  <tr key={i.id} className="hover:bg-orange-50/40 dark:hover:bg-white/[0.02]">
                    <td className={`${td} w-16 font-mono text-xs text-stone-500`}>{i.code}</td>
                    <td className={`${td} min-w-[220px]`}><TextInput value={i.name} onChange={(name) => update(i, { name })} /></td>
                    <td className={`${td} min-w-[96px]`}>
                      <Select value={bu} onChange={(e) => changeBuyUnit(i, e.target.value as BuyUnit)} aria-label={`Unidade de compra de ${i.name}`}>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </Select>
                    </td>
                    <td className={`${td} min-w-[100px]`}><NumInput value={i.purchaseQty / k} digits={3} onChange={(v) => update(i, { purchaseQty: v * k })} /></td>
                    <td className={`${td} min-w-[100px]`}><NumInput value={i.netQty / k} digits={3} onChange={(v) => update(i, { netQty: v * k })} /></td>
                    <td className={`${td} min-w-[130px]`}><NumInput mode="money" value={i.price} onChange={(price) => update(i, { price })} /></td>
                    <td className={`${td} w-16 font-bold tabular-nums ${factor > 1.001 ? 'text-orange-600' : 'text-stone-500'}`}>{num(factor, 2)}</td>
                    <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums text-orange-600`}>
                      {i.price > 0 ? (
                        <span title={`${brlUnit(ingredientUnitCost(i))} por ${i.unit}`}>{`${k > 1 ? brl(ingredientBuyUnitCost(i)) : brlUnit(ingredientBuyUnitCost(i))}/${bu}`}</span>
                      ) : (
                        <Badge tone="red">sem preço</Badge>
                      )}
                    </td>
                    <td className={`${td} min-w-[170px]`}><TextInput value={i.supplier || ''} placeholder="—" onChange={(supplier) => update(i, { supplier })} /></td>
                    <td className={`${td} w-16 text-center text-xs text-stone-500`}>{usageCount.get(i.id) || 0}</td>
                    <td className={`${td} w-28`}>
                      <div className="flex items-center justify-end gap-0.5">
                        <IconAction label="Dados do rótulo" onClick={() => setNutritionFor(i)} active={hasNutrition(i)}>
                          <Apple className="h-4 w-4" />
                        </IconAction>
                        <IconAction label="Histórico de preços" onClick={() => setHistoryFor(i)}>
                          <History className="h-4 w-4" />
                        </IconAction>
                        <IconAction label="Excluir" onClick={() => remove(i)} danger>
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-500">Nenhum ingrediente encontrado.</p>}
        <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
          Exemplo: comprou 1.000 g de carne e sobraram 950 g limpos → fator 1,05 e cada grama custa 5% a mais. Mudou o preço, todas as receitas e fichas recalculam.
        </p>
      </Panel>

      {nutritionFor && (
        <NutritionModal ingredient={nutritionFor} onClose={() => setNutritionFor(null)} onSave={(patch) => update(nutritionFor, patch).then(() => setNutritionFor(null))} />
      )}
      {historyFor && <HistoryModal ingredient={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function IconAction({ label, onClick, children, danger, active }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition ${
        danger
          ? 'text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10'
          : active
            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
            : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function NutritionModal({ ingredient, onClose, onSave }: { ingredient: Ingredient; onClose: () => void; onSave: (p: Partial<Ingredient>) => void }) {
  const [values, setValues] = useState<Partial<Nutrients>>(ingredient.nutrients || {});
  const [gramsPerUnit, setGramsPerUnit] = useState(ingredient.gramsPerUnit || 0);
  const base = ingredient.unit === 'ml' ? '100 ml' : '100 g';
  return (
    <Modal
      open
      onClose={onClose}
      title={`Dados do rótulo · ${ingredient.name}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave({ nutrients: values, ...(ingredient.unit === 'un' ? { gramsPerUnit } : {}) })}>Salvar</Btn>
        </>
      }
    >
      <p className="mb-4 text-xs text-stone-500">
        Copie da embalagem ou da Tabela TACO, sempre por <b>{base}</b>. A tabela nutricional dos produtos é calculada a partir daqui.
      </p>
      {ingredient.unit === 'un' && (
        <Field label="Peso de 1 unidade (g)" hint="Necessário para converter unidades em gramas" className="mb-4">
          <NumInput value={gramsPerUnit} onChange={setGramsPerUnit} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        {NUTRIENT_KEYS.map((k) => (
          <Field key={k} label={NUTRIENT_LABELS[k]}>
            <NumInput value={values[k] || 0} onChange={(v) => setValues((prev) => ({ ...prev, [k]: v }))} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

function HistoryModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const history = [...(ingredient.priceHistory || [])].reverse();
  return (
    <Modal open onClose={onClose} title={`Histórico de preços · ${ingredient.name}`}>
      {history.length === 0 ? (
        <p className="text-sm text-stone-500">Ainda não há mudanças de preço registradas.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Preço</th>
              <th className={th}>Quantidade</th>
              <th className={`${th} text-right`}>Variação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {history.map((h, idx) => {
              const prev = history[idx + 1];
              const unitNow = h.purchaseQty > 0 ? h.price / h.purchaseQty : 0;
              const unitPrev = prev && prev.purchaseQty > 0 ? prev.price / prev.purchaseQty : 0;
              const delta = unitPrev > 0 ? unitNow / unitPrev - 1 : 0;
              return (
                <tr key={`${h.date}-${idx}`}>
                  <td className={td}>{new Date(h.date).toLocaleDateString('pt-BR')}</td>
                  <td className={`${td} tabular-nums`}>{brl(h.price)}</td>
                  <td className={`${td} tabular-nums`}>{num(h.purchaseQty, 3)} {ingredient.unit}</td>
                  <td className={`${td} text-right tabular-nums ${delta > 0 ? 'text-rose-600' : delta < 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {prev ? `${delta > 0 ? '+' : ''}${pct(delta)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
