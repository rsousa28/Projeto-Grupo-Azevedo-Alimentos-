import React, { useMemo, useState } from 'react';
import { ChefHat, ChevronDown, ChevronsUpDown, Plus, Timer, Trash2 } from 'lucide-react';
import { newId, nextCode, recipeCost, usagesOf } from '../../lib/pricing/engine';
import type { BaseRecipe, Unit } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { LinesEditor } from './editors';
import { Btn, Field, NumInput, Panel, SearchBox, Select, StatCard, TextInput, brl, brlUnit, cx, num } from './ui';

export default function RecipesTab() {
  const { store, ctx, run } = usePricing();
  const { recipes } = store.data;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const update = (r: BaseRecipe, patch: Partial<BaseRecipe>) => run(() => store.save('recipes', { ...r, ...patch }));

  const add = async () => {
    const id = newId('rec');
    const ok = await run(() =>
      store.save('recipes', {
        id,
        code: nextCode('', recipes.map((r) => r.code), 4),
        name: 'Nova receita base',
        unit: 'g',
        yieldQty: 1000,
        prepMinutes: 30,
        workers: 1,
        lossFactor: 1,
        lines: [],
        updatedAt: '',
      }),
    );
    if (ok) setOpen((prev) => new Set(prev).add(id));
  };

  const remove = (r: BaseRecipe) => {
    const uses = usagesOf(store.data, 'recipe', r.id);
    if (uses.length) {
      window.alert(`"${r.name}" está em uso e não pode ser excluída:\n\n• ${uses.join('\n• ')}`);
      return;
    }
    if (window.confirm(`Excluir a receita base "${r.name}"?`)) run(() => store.remove('recipes', r.id));
  };

  const laborMode = store.data.config.payrollMode;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={<ChefHat className="h-5 w-5" />} label="Receitas base" value={recipes.length} />
        <StatCard
          icon={<Timer className="h-5 w-5" />}
          label="Custo / min (média da equipe)"
          value={brlUnit(ctx.laborPerMinute)}
          tone="green"
          hint={laborMode === 'fixed' ? 'Folha está nos custos fixos: minutos não somam no custo' : 'Tempo × funcionários × custo do minuto'}
        />
      </div>

      <Panel className="p-4">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          Preparos feitos na casa (massas, molhos, recheios, empanados) que viram um ingrediente das fichas técnicas.
          O custo por g/ml/un de cada receita entra direto nos produtos que a usam.
        </p>
        <div className="flex flex-wrap gap-2">
          <SearchBox value={query} onChange={setQuery} placeholder="Buscar receita…" />
          <Btn variant="outline" onClick={() => setOpen(open.size ? new Set() : new Set(recipes.map((r) => r.id)))}>
            <ChevronsUpDown className="h-4 w-4" /> {open.size ? 'Fechar todas' : 'Abrir todas'}
          </Btn>
          <Btn variant="success" onClick={add}>
            <Plus className="h-4 w-4" /> Nova receita base
          </Btn>
        </div>
      </Panel>

      <div className="space-y-3">
        {rows.map((r) => {
          const c = recipeCost(ctx, r.id);
          const isOpen = open.has(r.id);
          const uses = usagesOf(store.data, 'recipe', r.id).length;
          return (
            <Panel key={r.id} className="overflow-hidden">
              <button type="button" onClick={() => toggle(r.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left sm:px-5">
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-stone-400 transition', isOpen ? 'rotate-180' : '')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-stone-900 dark:text-stone-100">
                    {r.name} <span className="font-mono text-xs font-normal text-stone-400">#{r.code}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    Rende {num(r.yieldQty, 2)} {r.unit} · {r.lines.length} ingredientes · {r.prepMinutes} min · usada em {uses} item(ns)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-stone-500">Custo da receita</p>
                  <p className="font-bold tabular-nums text-stone-900 dark:text-stone-100">{brl(c.total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-stone-500">Custo por {r.unit}</p>
                  <p className="text-lg font-black tabular-nums text-emerald-600">{brlUnit(c.unitCost)}</p>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 dark:border-white/5">
                  <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7 sm:px-5">
                    <Field label="Nome da receita" className="col-span-2">
                      <TextInput value={r.name} onChange={(name) => update(r, { name })} />
                    </Field>
                    <Field label="Código">
                      <TextInput value={r.code} onChange={(code) => update(r, { code })} />
                    </Field>
                    <Field label="Unidade">
                      <Select value={r.unit} onChange={(e) => update(r, { unit: e.target.value as Unit })}>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                      </Select>
                    </Field>
                    <Field label={`Rende (${r.unit})`} hint="Quanto sai pronto, depois de cozinhar. Em g/ml, já desconta a água que evapora.">
                      <NumInput value={r.yieldQty} digits={3} onChange={(yieldQty) => update(r, { yieldQty })} />
                    </Field>
                    <Field label="Tempo (min)" hint="Tempo de trabalho da equipe no preparo">
                      <NumInput value={r.prepMinutes} onChange={(prepMinutes) => update(r, { prepMinutes })} />
                    </Field>
                    <Field label="Funcionários" hint="Quantas pessoas trabalham nesse tempo">
                      <NumInput value={r.workers} digits={1} onChange={(workers) => update(r, { workers })} />
                    </Field>
                  </div>
                  <LinesEditor lines={r.lines} onChange={(lines) => update(r, { lines })} excludeRecipeId={r.id} />
                  <div className="grid gap-3 border-t border-stone-100 bg-stone-50/60 p-4 text-sm sm:grid-cols-4 sm:px-5 dark:border-white/5 dark:bg-white/[0.02]">
                    <Summary label="Ingredientes" value={brl(c.ingredients)} />
                    <Summary label="Mão de obra" value={brl(c.labor)} />
                    <Field label="Fator de perda" hint="Multiplica o custo para cobrir perdas do lote (1 = nenhuma; 1,05 = 5%)">
                      <NumInput value={r.lossFactor || 1} digits={3} onChange={(lossFactor) => update(r, { lossFactor: lossFactor || 1 })} />
                    </Field>
                    <div className="flex items-end justify-end">
                      <Btn variant="danger" size="sm" onClick={() => remove(r)}>
                        <Trash2 className="h-4 w-4" /> Excluir receita
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
        {rows.length === 0 && <Panel className="p-8 text-center text-sm text-stone-500">Nenhuma receita base encontrada.</Panel>}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <p className="mt-1 font-bold tabular-nums text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  );
}
