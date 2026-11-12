// Conferência de uma NF-e: vínculo de cada item, variação de preço e impacto nas fichas antes de autorizar.
import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, Copy, Loader2, RotateCcw, ShieldCheck, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import { computeInvoiceUpdates, defaultFactor, effectiveUnitPrice, formatCnpj, mapId } from '../../lib/pricing/nfe';
import { priceChangeImpact } from '../../lib/pricing/engine';
import type { Invoice, InvoiceItem, SupplierItemMap, Unit } from '../../lib/pricing/types';
import type { PricingWrite } from '../../lib/pricing/usePricingData';
import { useAuth } from '../../contexts/AuthContext';
import { usePricing } from './PricingContext';
import { Badge, Btn, NumInput, Panel, PanelHeader, Select, brl, cx, num, pct } from './ui';

/** Custo de 1 g / ml / un mostrado na unidade que a pessoa usa: por kg, por litro ou por unidade. */
function perDisplay(costPerBase: number, unit: Unit): string {
  if (unit === 'g') return `${brl(costPerBase * 1000)}/kg`;
  if (unit === 'ml') return `${brl(costPerBase * 1000)}/L`;
  return `${brl(costPerBase)}/un`;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 0.0005) return <Badge tone="slate">sem variação</Badge>;
  const up = delta > 0;
  return (
    <Badge tone={up ? 'red' : 'green'}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : '−'}
      {pct(Math.abs(delta))}
    </Badge>
  );
}

export default function InvoiceReview({ invoice, onBack }: { invoice: Invoice; onBack: () => void }) {
  const { store, run } = usePricing();
  const { user } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items);
  const [busy, setBusy] = useState<'apply' | 'save' | 'dismiss' | null>(null);
  const readOnly = invoice.status !== 'pending';
  const { ingredients, packaging } = store.data;
  const storeCnpj = (store.data.config.cnpj || '').replace(/\D/g, '');
  const wrongRecipient = !!storeCnpj && !!invoice.recipientCnpj && storeCnpj !== invoice.recipientCnpj;
  const dirty = JSON.stringify(items) !== JSON.stringify(invoice.items);

  const updates = useMemo(() => computeInvoiceUpdates({ items }, store.data), [items, store.data]);
  const impact = useMemo(
    () => priceChangeImpact(store.data, updates.ingredients.map((c) => c.after), updates.packaging.map((c) => c.after)),
    [store.data, updates],
  );
  const changeCount = updates.ingredients.length + updates.packaging.length;
  const unlinked = items.filter((i) => !i.target).length;

  const setItem = (index: number, patch: Partial<InvoiceItem>) => setItems((prev) => prev.map((it) => (it.index === index ? { ...it, ...patch } : it)));

  const choose = (it: InvoiceItem, value: string) => {
    if (value === '') return setItem(it.index, { target: undefined, refId: undefined, apply: false });
    if (value === 'ignore') return setItem(it.index, { target: 'ignore', refId: undefined, apply: false });
    const [target, refId] = value.split(/:(.+)/) as ['ingredient' | 'packaging', string];
    setItem(it.index, { target, refId, factor: defaultFactor(it, store.data, target, refId), apply: true });
  };

  const persistInvoice = (patch: Partial<Invoice>): PricingWrite => ({ kind: 'invoices', item: { ...invoice, items, ...patch } });

  const memoryWrites = (): PricingWrite[] =>
    items
      .filter((it) => it.target)
      .map((it) => {
        const map: SupplierItemMap = {
          id: mapId(invoice.supplierCnpj, it.code),
          supplierCnpj: invoice.supplierCnpj,
          code: it.code,
          description: it.description,
          target: it.target!,
          ...(it.refId ? { refId: it.refId } : {}),
          factor: it.factor || 1,
          updatedAt: '',
        };
        return { kind: 'itemMaps', item: map };
      });

  const authorize = async () => {
    if (wrongRecipient && !window.confirm(`Esta nota foi emitida para outro CNPJ (${formatCnpj(invoice.recipientCnpj)}). Autorizar mesmo assim?`)) return;
    setBusy('apply');
    const now = new Date().toISOString();
    const source = `NF ${invoice.number} · ${invoice.supplierName}`;
    const writes: PricingWrite[] = [
      ...updates.ingredients.map(
        (c): PricingWrite => ({
          kind: 'ingredients',
          item: {
            ...c.after,
            supplier: c.after.supplier || invoice.supplierName,
            priceHistory: [...(c.before.priceHistory || []), { date: now, price: c.newPrice, purchaseQty: c.after.purchaseQty, source }].slice(-30),
          },
        }),
      ),
      ...updates.packaging.map((c): PricingWrite => ({ kind: 'packaging', item: { ...c.after, supplier: c.after.supplier || invoice.supplierName } })),
      ...memoryWrites(),
      persistInvoice({ status: 'applied', appliedAt: now, appliedBy: user?.name || user?.username || 'Usuário', appliedCount: changeCount }),
    ];
    const ok = await run(
      () => store.saveMany(writes),
      `${changeCount} ${changeCount === 1 ? 'preço atualizado' : 'preços atualizados'}${impact.length ? ` · ${impact.length} fichas recalculadas` : ''}.`,
    );
    setBusy(null);
    if (ok) onBack();
  };

  const saveDraft = async () => {
    setBusy('save');
    await run(() => store.saveMany([persistInvoice({}), ...memoryWrites()]), 'Conferência salva.');
    setBusy(null);
  };

  const setStatus = async (status: Invoice['status']) => {
    setBusy('dismiss');
    const ok = await run(() => store.save('invoices', { ...invoice, items, status }), status === 'dismissed' ? 'Nota descartada.' : 'Nota reaberta.');
    setBusy(null);
    if (ok && status === 'dismissed') onBack();
  };

  const refOptions = (
    <>
      <option value="">Escolha o cadastro…</option>
      <option value="ignore">Não atualizar este item</option>
      <optgroup label="Ingredientes">
        {ingredients.map((i) => (
          <option key={i.id} value={`ingredient:${i.id}`}>
            {i.name}
          </option>
        ))}
      </optgroup>
      {packaging.length > 0 && (
        <optgroup label="Embalagens">
          {packaging.map((p) => (
            <option key={p.id} value={`packaging:${p.id}`}>
              {p.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar para as notas
        </Btn>
        {invoice.status === 'applied' && (
          <Badge tone="green">
            <CheckCircle2 className="h-3 w-3" /> Autorizada por {invoice.appliedBy} em {new Date(invoice.appliedAt || '').toLocaleString('pt-BR')}
          </Badge>
        )}
        {invoice.status === 'dismissed' && (
          <Btn variant="outline" size="sm" onClick={() => setStatus('pending')} disabled={!!busy}>
            <RotateCcw className="h-4 w-4" /> Reabrir para conferir
          </Btn>
        )}
      </div>

      {/* Cabeçalho da nota */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-stone-900 dark:text-stone-50">{invoice.supplierName}</p>
              <p className="text-sm text-stone-500">
                CNPJ {formatCnpj(invoice.supplierCnpj)} · NF {invoice.number}
                {invoice.series ? ` série ${invoice.series}` : ''} · {new Date(invoice.issuedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(invoice.id)}
                className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-stone-400 hover:text-stone-600"
                title="Copiar chave de acesso"
              >
                {invoice.id.replace(/(\d{4})/g, '$1 ').trim()} <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total da nota</p>
            <p className="text-2xl font-black tabular-nums text-stone-900 dark:text-stone-50">{brl(invoice.total)}</p>
            <p className="text-xs text-stone-500">{invoice.items.length} itens</p>
          </div>
        </div>

        {wrongRecipient ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Esta nota foi emitida para {invoice.recipientName || 'outro destinatário'} (CNPJ {formatCnpj(invoice.recipientCnpj)}), não para o CNPJ desta loja.
          </div>
        ) : !storeCnpj && invoice.recipientCnpj ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
            <span>
              Destinatário: {invoice.recipientName || '—'} · CNPJ {formatCnpj(invoice.recipientCnpj)}. Salve como o CNPJ da loja para o sistema conferir as próximas
              notas.
            </span>
            <Btn size="sm" variant="outline" onClick={() => run(() => store.saveConfig({ cnpj: invoice.recipientCnpj }), 'CNPJ da loja salvo.')}>
              <ShieldCheck className="h-4 w-4" /> Salvar CNPJ da loja
            </Btn>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* Itens */}
        <Panel>
          <PanelHeader
            title="Itens da nota"
            subtitle={
              readOnly
                ? 'Vínculos usados nesta nota.'
                : unlinked
                  ? `${unlinked} ${unlinked === 1 ? 'item precisa' : 'itens precisam'} de vínculo. O sistema lembra a escolha nas próximas notas deste fornecedor.`
                  : 'Confira os vínculos e as conversões. O sistema lembra as escolhas nas próximas notas.'
            }
          />
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {items.map((it) => {
              const ing = it.target === 'ingredient' ? ingredients.find((i) => i.id === it.refId) : undefined;
              const pack = it.target === 'packaging' ? packaging.find((p) => p.id === it.refId) : undefined;
              const baseUnit: Unit = ing ? ing.unit : 'un';
              const factor = it.factor && it.factor > 0 ? it.factor : 1;
              const newBase = effectiveUnitPrice(it) / factor;
              const oldBase = ing ? ing.price / (ing.purchaseQty || 1) : pack ? pack.packPrice / (pack.packQty || 1) : 0;
              const delta = oldBase > 0 ? newBase / oldBase - 1 : 0;
              const linked = !!(ing || pack);
              return (
                <li key={it.index} className={cx('px-4 py-3.5 sm:px-5', !it.target && !readOnly && 'bg-amber-50/60 dark:bg-amber-500/5')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 dark:text-stone-100">{it.description}</p>
                      <p className="text-xs text-stone-500">
                        Cód. {it.code} · {num(it.qty, 3)} {it.unit} × {brl(it.unitPrice)}
                        {it.discount > 0 ? ` · desconto ${brl(it.discount)}` : ''} = <b>{brl(it.total - it.discount)}</b>
                      </p>
                    </div>
                    {linked && <DeltaBadge delta={delta} />}
                  </div>

                  <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">Vincular ao cadastro</span>
                      <Select
                        value={it.target === 'ignore' ? 'ignore' : it.target && it.refId ? `${it.target}:${it.refId}` : ''}
                        onChange={(e) => choose(it, e.target.value)}
                        disabled={readOnly}
                        aria-label={`Vínculo de ${it.description}`}
                      >
                        {refOptions}
                      </Select>
                    </label>
                    {linked && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-stone-500">
                          1 {it.unit} da nota = quantos {baseUnit} do cadastro
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-28">
                            <NumInput value={factor} digits={3} onChange={(v) => setItem(it.index, { factor: v > 0 ? v : 1 })} disabled={readOnly} />
                          </div>
                          <span className="text-sm text-stone-500">{baseUnit}</span>
                        </div>
                      </label>
                    )}
                  </div>

                  {linked && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-white/5">
                      <span className="tabular-nums text-stone-600 dark:text-stone-300">
                        {perDisplay(oldBase, baseUnit)} <span className="text-stone-400">→</span>{' '}
                        <b className="text-stone-900 dark:text-stone-50">{perDisplay(newBase, baseUnit)}</b>
                        <span className="ml-2 text-xs text-stone-500">({ing?.name || pack?.name})</span>
                      </span>
                      {!readOnly && (
                        <label className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                          <input type="checkbox" checked={!!it.apply} onChange={(e) => setItem(it.index, { apply: e.target.checked })} className="accent-orange-500" />
                          Atualizar este preço
                        </label>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Resumo e impacto */}
        <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Panel>
            <PanelHeader title={readOnly ? 'Resumo' : 'O que muda ao autorizar'} />
            <div className="space-y-3 p-4 sm:p-5">
              {changeCount === 0 ? (
                <p className="text-sm text-stone-500">Nenhum preço marcado para atualizar.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {[...updates.ingredients.map((c) => ({ name: c.after.name, old: c.oldPrice, now: c.newPrice, delta: c.delta, qty: `${num(c.after.purchaseQty)} ${c.after.unit}` })),
                    ...updates.packaging.map((c) => ({ name: c.after.name, old: c.oldPrice, now: c.newPrice, delta: c.delta, qty: `${num(c.after.packQty)} un` }))].map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-stone-800 dark:text-stone-200">{r.name}</span>
                        <span className="block text-xs tabular-nums text-stone-500">
                          {brl(r.old)} → {brl(r.now)} por {r.qty}
                        </span>
                      </span>
                      <DeltaBadge delta={r.delta} />
                    </li>
                  ))}
                </ul>
              )}

              {impact.length > 0 && (
                <div className="border-t border-stone-100 pt-3 dark:border-white/5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Fichas técnicas afetadas</p>
                  <ul className="space-y-1.5 text-sm">
                    {impact.slice(0, 8).map((p) => (
                      <li key={p.productId} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-stone-700 dark:text-stone-300">{p.name}</span>
                        <span className="shrink-0 text-right text-xs tabular-nums">
                          <span className="block text-stone-500">
                            custo {brl(p.costBefore)} → <b className="text-stone-800 dark:text-stone-100">{brl(p.costAfter)}</b>
                          </span>
                          <span
                            className={cx(
                              'block',
                              p.profitPctAfter - p.profitPctBefore > 0.0005
                                ? 'text-emerald-600'
                                : p.profitPctAfter - p.profitPctBefore < -0.0005
                                  ? 'text-rose-600'
                                  : 'text-stone-500',
                            )}
                          >
                            margem {pct(p.profitPctBefore)} → {pct(p.profitPctAfter)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {impact.some((p) => p.losesTarget) && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> {impact.filter((p) => p.losesTarget).length} ficha(s) passam a ficar abaixo da margem desejada.
                    </p>
                  )}
                  {impact.length > 8 && <p className="mt-1 text-xs text-stone-500">e mais {impact.length - 8}.</p>}
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="space-y-2 border-t border-stone-100 p-4 dark:border-white/5">
                <Btn variant="success" className="w-full" onClick={authorize} disabled={!!busy || changeCount === 0}>
                  {busy === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Autorizar e atualizar {changeCount} {changeCount === 1 ? 'preço' : 'preços'}
                </Btn>
                <div className="flex gap-2">
                  <Btn variant="outline" className="flex-1" onClick={saveDraft} disabled={!!busy || !dirty}>
                    {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Salvar conferência
                  </Btn>
                  <Btn variant="danger" onClick={() => window.confirm('Descartar esta nota? Nenhum preço será alterado.') && setStatus('dismissed')} disabled={!!busy}>
                    <XCircle className="h-4 w-4" /> Descartar
                  </Btn>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
