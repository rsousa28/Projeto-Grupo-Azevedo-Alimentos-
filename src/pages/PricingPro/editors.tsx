// Editores de linhas reaproveitados em receitas base, fichas técnicas e combos.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { energyLineCost, lineCost, lineUnitCost, packagingUnitCost } from '../../lib/pricing/engine';
import type { EnergyLine, PackLine, RecipeLine } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { Btn, NumInput, Select, TableWrap, brl, brlUnit, td, th } from './ui';

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Remover linha">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** Ingredientes e receitas base de uma receita ou produto. */
export function LinesEditor({
  lines,
  onChange,
  excludeRecipeId,
  emptyText = 'Nenhum ingrediente adicionado.',
}: {
  lines: RecipeLine[];
  onChange: (lines: RecipeLine[]) => void;
  excludeRecipeId?: string;
  emptyText?: string;
}) {
  const { store, ctx } = usePricing();
  const { ingredients, recipes } = store.data;
  const selectable = recipes.filter((r) => r.id !== excludeRecipeId);

  const unitOf = (l: RecipeLine) =>
    l.kind === 'ingredient' ? ctx.ingredients.get(l.refId)?.unit || 'g' : ctx.recipes.get(l.refId)?.unit || 'g';

  const set = (idx: number, patch: Partial<RecipeLine>) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const add = () => {
    const first = ingredients[0];
    if (!first) return;
    onChange([...lines, { kind: 'ingredient', refId: first.id, qty: 0 }]);
  };

  const total = lines.reduce((s, l) => s + lineCost(ctx, l), 0);

  return (
    <div>
      <TableWrap>
        <table className="w-full min-w-[720px]">
          <thead className="bg-stone-50 dark:bg-white/5">
            <tr>
              <th className={th}>Ingrediente / receita base</th>
              <th className={th}>Qtd.</th>
              <th className={th}>Unid.</th>
              <th className={`${th} text-right`}>Custo por un.</th>
              <th className={`${th} text-right`}>Subtotal</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {lines.map((l, idx) => {
              const missing = l.kind === 'ingredient' ? !ctx.ingredients.has(l.refId) : !ctx.recipes.has(l.refId);
              return (
                <tr key={idx}>
                  <td className={`${td} min-w-[260px]`}>
                    <Select
                      value={`${l.kind}:${l.refId}`}
                      onChange={(e) => {
                        const [kind, refId] = e.target.value.split(':') as [RecipeLine['kind'], string];
                        set(idx, { kind, refId });
                      }}
                      className={missing ? 'border-rose-400' : ''}
                    >
                      {missing && <option value={`${l.kind}:${l.refId}`}>Item excluído — escolha outro</option>}
                      <optgroup label="Ingredientes">
                        {ingredients.map((i) => (
                          <option key={i.id} value={`ingredient:${i.id}`}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                      {selectable.length > 0 && (
                        <optgroup label="Receitas base">
                          {selectable.map((r) => (
                            <option key={r.id} value={`recipe:${r.id}`}>
                              ★ {r.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </Select>
                  </td>
                  <td className={`${td} min-w-[100px]`}>
                    <NumInput value={l.qty} digits={3} onChange={(qty) => set(idx, { qty })} aria-label="Quantidade" />
                  </td>
                  <td className={`${td} w-14 text-stone-500`}>{unitOf(l)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums text-stone-500`}>{brlUnit(lineUnitCost(ctx, l))}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums text-orange-600`}>{brl(lineCost(ctx, l))}</td>
                  <td className={`${td} w-10`}>
                    <RemoveBtn onClick={() => onChange(lines.filter((_, i) => i !== idx))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      {lines.length === 0 && <p className="px-4 py-5 text-sm text-stone-500">{emptyText}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Btn variant="success" size="sm" onClick={add} disabled={ingredients.length === 0}>
          <Plus className="h-4 w-4" /> Ingrediente
        </Btn>
        <span className="text-sm font-bold text-stone-600 dark:text-stone-300">
          Total: <span className="tabular-nums text-orange-600">{brl(total)}</span>
        </span>
      </div>
    </div>
  );
}

export function PackLinesEditor({ lines, onChange, title }: { lines: PackLine[]; onChange: (l: PackLine[]) => void; title?: string }) {
  const { store, ctx } = usePricing();
  const { packaging } = store.data;
  const set = (idx: number, patch: Partial<PackLine>) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const cost = (l: PackLine) => {
    const p = ctx.packaging.get(l.packagingId);
    return p ? packagingUnitCost(p) * l.qty : 0;
  };
  return (
    <div>
      {title && <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-stone-500">{title}</p>}
      <TableWrap>
        <table className="w-full min-w-[520px]">
          <thead className="bg-stone-50 dark:bg-white/5">
            <tr>
              <th className={th}>Embalagem</th>
              <th className={th}>Qtd.</th>
              <th className={`${th} text-right`}>Valor unit.</th>
              <th className={`${th} text-right`}>Subtotal</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {lines.map((l, idx) => {
              const p = ctx.packaging.get(l.packagingId);
              return (
                <tr key={idx}>
                  <td className={td}>
                    <Select value={l.packagingId} onChange={(e) => set(idx, { packagingId: e.target.value })}>
                      {!p && <option value={l.packagingId}>Embalagem excluída — escolha outra</option>}
                      {packaging.map((pk) => (
                        <option key={pk.id} value={pk.id}>
                          {pk.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className={`${td} w-24`}><NumInput value={l.qty} onChange={(qty) => set(idx, { qty })} /></td>
                  <td className={`${td} w-28 text-right tabular-nums text-stone-500`}>{p ? brlUnit(packagingUnitCost(p)) : '—'}</td>
                  <td className={`${td} w-28 text-right font-bold tabular-nums text-orange-600`}>{brl(cost(l))}</td>
                  <td className={`${td} w-10`}><RemoveBtn onClick={() => onChange(lines.filter((_, i) => i !== idx))} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      {lines.length === 0 && <p className="px-4 py-4 text-sm text-stone-500">Nenhuma embalagem.</p>}
      <div className="flex items-center justify-between px-4 py-3">
        <Btn
          variant="success"
          size="sm"
          disabled={packaging.length === 0}
          onClick={() => packaging[0] && onChange([...lines, { packagingId: packaging[0].id, qty: 1 }])}
        >
          <Plus className="h-4 w-4" /> Embalagem
        </Btn>
        <span className="text-sm font-bold text-stone-600 dark:text-stone-300">
          Total: <span className="tabular-nums text-orange-600">{brl(lines.reduce((s, l) => s + cost(l), 0))}</span>
        </span>
      </div>
    </div>
  );
}

export function EnergyLinesEditor({ lines, onChange }: { lines: EnergyLine[]; onChange: (l: EnergyLine[]) => void }) {
  const { store, ctx } = usePricing();
  const sources = store.data.config.energy;
  const set = (idx: number, patch: Partial<EnergyLine>) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  return (
    <div>
      <TableWrap>
        <table className="w-full min-w-[620px]">
          <thead className="bg-stone-50 dark:bg-white/5">
            <tr>
              <th className={th}>Equipamento</th>
              <th className={th}>Minutos ligado</th>
              <th className={th}>Unidades por vez</th>
              <th className={`${th} text-right`}>Custo por unidade</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {lines.map((l, idx) => (
              <tr key={idx}>
                <td className={td}>
                  <Select value={l.sourceId} onChange={(e) => set(idx, { sourceId: e.target.value })}>
                    {!ctx.energy.has(l.sourceId) && <option value={l.sourceId}>Equipamento excluído</option>}
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.type === 'gas' ? '🔥' : '⚡'} {s.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className={`${td} w-28`}><NumInput value={l.minutes} digits={1} onChange={(minutes) => set(idx, { minutes })} /></td>
                <td className={`${td} w-28`}><NumInput value={l.batchUnits} onChange={(batchUnits) => set(idx, { batchUnits: Math.max(1, batchUnits) })} /></td>
                <td className={`${td} w-32 text-right font-bold tabular-nums text-orange-600`}>{brlUnit(energyLineCost(ctx.energy.get(l.sourceId), l))}</td>
                <td className={`${td} w-10`}><RemoveBtn onClick={() => onChange(lines.filter((_, i) => i !== idx))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      {sources.length === 0 ? (
        <p className="px-4 py-4 text-sm text-stone-500">Cadastre fogão, forno e outros em Despesas → Gás e energia.</p>
      ) : (
        <div className="px-4 py-3">
          <Btn variant="success" size="sm" onClick={() => onChange([...lines, { sourceId: sources[0].id, minutes: 10, batchUnits: 1 }])}>
            <Plus className="h-4 w-4" /> Equipamento
          </Btn>
        </div>
      )}
    </div>
  );
}
