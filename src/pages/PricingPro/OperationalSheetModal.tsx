// Ficha técnico-operacional da cozinha: gerada a partir da precificação, editável e pronta para imprimir.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Camera, Plus, Printer, Trash2, X } from 'lucide-react';
import { newId } from '../../lib/pricing/engine';
import { compressImage } from '../../lib/pricing/usePricingData';
import type { OperationalSheet, Product } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { ProductThumb } from './ProductsTab';
import { Btn, Field, Modal, inputClass, num } from './ui';

interface OpIngredient {
  name: string;
  qty: string;
}

function useOpIngredients(product: Product): OpIngredient[] {
  const { ctx } = usePricing();
  return useMemo(
    () =>
      product.lines.map((l) => {
        if (l.kind === 'ingredient') {
          const ing = ctx.ingredients.get(l.refId);
          return { name: ing?.name || 'Item excluído', qty: `${num(l.qty, 2)} ${ing?.unit || ''}` };
        }
        const r = ctx.recipes.get(l.refId);
        return { name: r?.name || 'Receita excluída', qty: `${num(l.qty, 2)} ${r?.unit || ''}` };
      }),
    [product.lines, ctx],
  );
}

export function defaultOps(product: Product, ingredients: OpIngredient[]): OperationalSheet {
  return {
    utensils: ['Balança', 'Pegador', 'Prato / embalagem'],
    steps: [
      { id: newId('step'), title: 'Prepare a estação', text: 'Separe e confira as porções na balança. Organize os utensílios.' },
      ...ingredients.map((i) => ({ id: newId('step'), title: `Adicione ${i.name}`, text: `Porção: ${i.qty}.` })),
      { id: newId('step'), title: 'Confira e expeça', text: 'Confira a montagem, limpe as bordas e envie imediatamente.' },
    ],
    assembly: ingredients.map((i) => i.name).join(' → '),
    checks: ['Porções conferidas na balança', 'Montagem centralizada', 'Temperatura correta'],
  };
}

export default function OperationalSheetModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { store, run, storeName } = usePricing();
  const ingredients = useOpIngredients(product);
  const [ops, setOps] = useState<OperationalSheet>(() => product.ops || defaultOps(product, ingredients));
  const [utensilText, setUtensilText] = useState('');
  const [dirty, setDirty] = useState(!product.ops);

  const change = (patch: Partial<OperationalSheet>) => {
    setOps((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const setStep = (id: string, patch: Partial<OperationalSheet['steps'][number]>) =>
    change({ steps: ops.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (idx: number, dir: -1 | 1) => {
    const steps = [...ops.steps];
    const [s] = steps.splice(idx, 1);
    steps.splice(idx + dir, 0, s);
    change({ steps });
  };

  const save = async () => {
    const ok = await run(() => store.save('products', { ...product, ops, version: (product.version || 1) + (product.ops ? 1 : 0) }), 'Ficha da cozinha salva.');
    if (ok) setDirty(false);
    return ok;
  };

  const print = async () => {
    if (dirty && !(await save())) return;
    setTimeout(() => window.print(), 50);
  };

  return (
    <>
      <Modal
        open
        wide
        onClose={() => {
          if (!dirty || window.confirm('Sair sem salvar as mudanças da ficha da cozinha?')) onClose();
        }}
        title={`Ficha técnica da cozinha · ${product.code} ${product.name}`}
        footer={
          <>
            <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
            <Btn variant="outline" onClick={save} disabled={!dirty}>Salvar</Btn>
            <Btn variant="dark" onClick={print}>
              <Printer className="h-4 w-4" /> Imprimir / salvar PDF
            </Btn>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-stone-500">
            Os ingredientes e porções vêm da precificação. Aqui você define utensílios, passo a passo com foto, ordem de montagem e conferência.
          </p>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Ingredientes (da ficha)</p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((i, idx) => (
                <span key={idx} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs dark:bg-white/5">
                  <b>{i.qty}</b> {i.name}
                </span>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Utensílios da estação</p>
            <div className="flex flex-wrap items-center gap-2">
              {ops.utensils.map((u) => (
                <span key={u} className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-500/10 dark:text-orange-300">
                  {u}
                  <button type="button" onClick={() => change({ utensils: ops.utensils.filter((x) => x !== u) })} aria-label={`Remover ${u}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <form
                className="flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = utensilText.trim();
                  if (t && !ops.utensils.includes(t)) change({ utensils: [...ops.utensils, t] });
                  setUtensilText('');
                }}
              >
                <input value={utensilText} onChange={(e) => setUtensilText(e.target.value)} placeholder="Adicionar utensílio" className={`${inputClass} w-44 py-1 text-xs`} />
                <Btn size="sm" variant="outline" type="submit">
                  <Plus className="h-3.5 w-3.5" />
                </Btn>
              </form>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Passo a passo</p>
              <Btn size="sm" variant="success" onClick={() => change({ steps: [...ops.steps, { id: newId('step'), title: 'Novo passo', text: '' }] })}>
                <Plus className="h-3.5 w-3.5" /> Passo
              </Btn>
            </div>
            <div className="space-y-2">
              {ops.steps.map((s, idx) => (
                <div key={s.id} className="flex gap-3 rounded-xl border border-stone-200 p-2.5 dark:border-white/10">
                  <div className="flex w-8 shrink-0 flex-col items-center gap-1 pt-1">
                    <span className="text-lg font-black text-stone-400">{String(idx + 1).padStart(2, '0')}</span>
                    <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="text-stone-400 disabled:opacity-30" aria-label="Subir">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" disabled={idx === ops.steps.length - 1} onClick={() => move(idx, 1)} className="text-stone-400 disabled:opacity-30" aria-label="Descer">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <label className="relative flex h-20 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-400 dark:bg-white/5" title="Foto do passo">
                    {s.photo ? <img src={s.photo} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setStep(s.id, { photo: await compressImage(f, 420, 0.72) });
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input value={s.title} onChange={(e) => setStep(s.id, { title: e.target.value })} className={`${inputClass} py-1.5 font-bold uppercase`} />
                    <textarea value={s.text} onChange={(e) => setStep(s.id, { text: e.target.value })} rows={2} className={`${inputClass} py-1.5`} />
                  </div>
                  <button type="button" onClick={() => change({ steps: ops.steps.filter((x) => x.id !== s.id) })} className="self-start rounded-lg p-1.5 text-stone-400 hover:text-rose-600" aria-label="Remover passo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ordem de montagem">
              <textarea value={ops.assembly} onChange={(e) => change({ assembly: e.target.value })} rows={2} className={inputClass} />
            </Field>
            <Field label="Conferência final (um item por linha)">
              <textarea
                value={ops.checks.join('\n')}
                onChange={(e) => change({ checks: e.target.value.split('\n') })}
                onBlur={() => change({ checks: ops.checks.map((c) => c.trim()).filter(Boolean) })}
                rows={3}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </Modal>
      {createPortal(<PrintableSheet product={product} ops={ops} ingredients={ingredients} storeName={storeName} />, document.body)}
    </>
  );
}

function PrintableSheet({ product, ops, ingredients, storeName }: { product: Product; ops: OperationalSheet; ingredients: OpIngredient[]; storeName: string }) {
  const today = new Date().toLocaleDateString('pt-BR');
  return (
    <div id="ops-print-root" className="bg-white p-6 font-sans text-black">
      <div className="mb-3 flex items-start justify-between border-b-4 border-black pb-2">
        <div>
          <p className="inline-block bg-black px-2 py-0.5 text-[11px] font-black tracking-wider text-white">FICHA TÉCNICO-OPERACIONAL · {storeName}</p>
          <h1 className="mt-1 text-3xl font-black uppercase leading-none">{product.name}</h1>
          <p className="text-sm font-semibold">Padrão de montagem · {product.portionLabel || '1 unidade'}</p>
        </div>
        <p className="rounded border-2 border-black px-2 py-1 text-sm font-black">
          {product.code} | V.{String(product.version || 1).padStart(2, '0')}
        </p>
      </div>

      <div className="grid grid-cols-[38%_1fr] gap-4">
        <div>
          <ProductThumb product={product} className="aspect-square w-full rounded border border-black" />
          <p className="mt-1 bg-black py-0.5 text-center text-[10px] font-bold text-white">REFERÊNCIA DO PRODUTO</p>
        </div>
        <div>
          <p className="bg-black px-2 py-0.5 text-xs font-black text-white">INGREDIENTES · PORÇÕES</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {ingredients.map((i, idx) => (
                <tr key={idx} className="border-b border-stone-400">
                  <td className="py-1 pr-2">{i.name}</td>
                  <td className="py-1 text-right font-bold">{i.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 bg-black px-2 py-0.5 text-xs font-black text-white">UTENSÍLIOS</p>
          <p className="py-1 text-sm">{ops.utensils.join(' · ')}</p>
        </div>
      </div>

      <p className="mt-4 bg-black px-2 py-0.5 text-xs font-black text-white">PASSO A PASSO</p>
      <div className="space-y-2 pt-2">
        {ops.steps.map((s, idx) => (
          <div key={s.id} className="flex break-inside-avoid gap-3 border border-stone-400">
            <div className="flex w-12 shrink-0 items-center justify-center bg-stone-800 text-xl font-black text-white">{String(idx + 1).padStart(2, '0')}</div>
            {s.photo && <img src={s.photo} alt="" className="h-24 w-32 shrink-0 object-cover" />}
            <div className="py-2 pr-2">
              <p className="font-black uppercase">{s.title}</p>
              <p className="text-sm">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 break-inside-avoid">
        <p className="bg-black px-2 py-0.5 text-xs font-black text-white">ORDEM DE MONTAGEM</p>
        <p className="border border-stone-400 px-2 py-1.5 text-sm font-semibold">{ops.assembly}</p>
      </div>
      <div className="mt-3 break-inside-avoid">
        <p className="bg-black px-2 py-0.5 text-xs font-black text-white">CONFERÊNCIA FINAL</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border border-stone-400 px-2 py-1.5 text-sm">
          {ops.checks.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 border-2 border-black" /> {c}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-between border-t border-black pt-2 text-[11px]">
        <span>Validar gramaturas, cocção e procedimento com o responsável da operação. Gerada em {today}.</span>
        <span>Responsável: ________________ Revisão: ___/___/___</span>
      </div>
    </div>
  );
}
