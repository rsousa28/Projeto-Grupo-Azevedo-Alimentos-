// Importar com IA: a pessoa envia as fichas técnicas e o relatório de vendas (planilha, PDF ou foto), a IA lê
// e o sistema monta o cadastro (ingredientes, receitas base, fichas e vendas por mês). Nada é gravado antes
// da conferência nesta tela.
import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChefHat,
  FileSpreadsheet,
  Loader2,
  Package,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Wheat,
  X,
} from 'lucide-react';
import { buildImportPlan, exampleSize, mergeExtractions, planWrites, type AiExtraction, type ImportPlan, type PlanSelection } from '../../lib/pricing/aiImport';
import type { RecipeLine, Unit } from '../../lib/pricing/types';
import { ACCEPT, fileToChunks, readWithAi, type ImportKind } from './aiImportClient';
import { usePricing } from './PricingContext';
import { Badge, Btn, Panel, PanelHeader, Segmented, brl, cx, num } from './ui';

type Stage = 'pick' | 'reading' | 'review';

const qtyText = (qty: number, unit: Unit | string) => `${num(qty, Number.isInteger(qty) ? 0 : 1)} ${unit}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function DropZone({
  title,
  hint,
  icon,
  files,
  onAdd,
  onRemove,
  testId,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  testId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <Panel className="p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className={cx(
          'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-6 text-center',
          over ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/10' : 'border-stone-200 dark:border-white/10',
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">{icon}</span>
        <div>
          <p className="font-semibold text-stone-900 dark:text-stone-100">{title}</p>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{hint}</p>
        </div>
        <Btn variant="outline" onClick={() => ref.current?.click()}>
          <Upload className="h-4 w-4" /> Escolher arquivos
        </Btn>
        <input
          ref={ref}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          data-testid={testId}
          onChange={(e) => {
            if (e.target.files) onAdd(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-white/5">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-stone-400">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              <button type="button" onClick={() => onRemove(i)} className="text-stone-400 hover:text-rose-600" aria-label={`Tirar ${f.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="mt-1 h-4 w-4 shrink-0 accent-orange-500" />;
}

export default function AiImportTab({ onDone }: { onDone: () => void }) {
  const { store, run } = usePricing();
  const [files, setFiles] = useState<Record<ImportKind, File[]>>({ fichas: [], sales: [] });
  const [stage, setStage] = useState<Stage>('pick');
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [extraction, setExtraction] = useState<AiExtraction | null>(null);
  const [removeExample, setRemoveExample] = useState(true);
  const [replaceAll, setReplaceAll] = useState(false);
  const [salesMode, setSalesMode] = useState<'average' | 'last'>('average');
  const [applySales, setApplySales] = useState(true);
  // O que a pessoa desmarcou (o resto vai junto): sobrevive quando o plano é refeito
  const [off, setOff] = useState({ products: new Set<string>(), recipes: new Set<string>(), prices: new Set<string>() });
  const [saving, setSaving] = useState(false);

  const plan: ImportPlan | null = useMemo(
    () => (extraction ? buildImportPlan(extraction, store.data, { removeExample, replaceAll, salesMode }) : null),
    [extraction, store.data, removeExample, replaceAll, salesMode],
  );
  const current = store.data;
  const currentCount = current.products.length + current.recipes.length + current.ingredients.length + current.packaging.length + current.combos.length;
  const sel: PlanSelection | null = plan
    ? {
        products: new Set(plan.products.map((p) => p.key).filter((k) => !off.products.has(k))),
        recipes: new Set(plan.recipes.map((r) => r.key).filter((k) => !off.recipes.has(k))),
        priceUpdates: new Set(plan.priceUpdates.map((u) => u.id).filter((k) => !off.prices.has(k))),
        applySales,
        removeExample: removeExample && !!plan.example.present,
        replaceAll: replaceAll && currentCount > 0,
      }
    : null;
  const preview = plan && sel ? planWrites(plan, store.data, sel) : null;

  const toggle = (group: 'products' | 'recipes' | 'prices', key: string, on: boolean) =>
    setOff((prev) => {
      const next = new Set(prev[group]);
      if (on) next.delete(key);
      else next.add(key);
      return { ...prev, [group]: next };
    });

  const reset = () => {
    setFiles({ fichas: [], sales: [] });
    setExtraction(null);
    setErrors([]);
    setOff({ products: new Set(), recipes: new Set(), prices: new Set() });
    setStage('pick');
  };

  const read = async () => {
    setErrors([]);
    setStage('reading');
    const errs: string[] = [];
    const jobs: Array<{ kind: ImportKind; chunk: Awaited<ReturnType<typeof fileToChunks>>[number] }> = [];
    for (const kind of ['fichas', 'sales'] as ImportKind[]) {
      for (const f of files[kind]) {
        try {
          for (const chunk of await fileToChunks(f)) jobs.push({ kind, chunk });
        } catch (err: any) {
          errs.push(err?.message || `${f.name}: não foi possível ler.`);
        }
      }
    }
    setProgress({ done: 0, total: jobs.length, label: '' });
    const results: Array<Partial<AiExtraction>> = [];
    let done = 0;
    const queue = [...jobs];
    const worker = async () => {
      while (queue.length) {
        const job = queue.shift()!;
        setProgress((p) => ({ ...p, label: `${job.chunk.file} · ${job.chunk.label}` }));
        try {
          results.push(await readWithAi(job.kind, job.chunk));
        } catch (err: any) {
          errs.push(`${job.chunk.file} · ${job.chunk.label}: ${err?.message || 'falha na leitura'}`);
        }
        done++;
        setProgress((p) => ({ ...p, done }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const merged = mergeExtractions(results);
    setErrors(errs);
    if (!merged.fichas.length && !merged.sales.length) {
      if (!errs.length) setErrors(['A IA não encontrou fichas técnicas nem vendas nesses arquivos.']);
      setStage('pick');
      return;
    }
    setExtraction(merged);
    setStage('review');
  };

  const save = async () => {
    if (!plan || !sel || !preview) return;
    if (sel.replaceAll) {
      const what = [
        plural(current.products.length, 'ficha', 'fichas'),
        plural(current.recipes.length, 'receita base', 'receitas base'),
        plural(current.ingredients.length, 'ingrediente', 'ingredientes'),
        plural(current.packaging.length, 'embalagem', 'embalagens'),
      ].join(', ');
      if (!window.confirm(`Apagar o cadastro atual (${what}) e gravar no lugar o que a IA leu? Despesas e equipe ficam. Isso não pode ser desfeito.`)) return;
    } else {
      const removing = sel.removeExample ? exampleSize(plan.example) : 0;
      if (removing && !window.confirm(`Apagar ${plural(removing, 'item', 'itens')} do cardápio de exemplo? Isso não pode ser desfeito.`)) return;
    }
    setSaving(true);
    const c = preview.counts;
    const ok = await run(
      async () => {
        if (preview.writes.length) await store.saveMany(preview.writes);
        if (preview.config || store.isEmpty) await store.saveConfig(preview.config || {});
        for (const d of preview.deletes) await store.remove(d.kind, d.id);
      },
      `Cadastro atualizado: ${plural(c.products, 'ficha', 'fichas')}, ${plural(c.recipes, 'receita base', 'receitas base')}, ${plural(c.ingredients, 'ingrediente novo', 'ingredientes novos')}${c.sales ? `, vendas de ${plural(c.sales, 'produto', 'produtos')}` : ''}.`,
    );
    setSaving(false);
    if (ok) {
      reset();
      onDone();
    }
  };

  // ---- Etapa 1: arquivos ----
  if (stage === 'pick') {
    const total = files.fichas.length + files.sales.length;
    return (
      <div className="space-y-5">
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white sm:flex-row sm:items-center sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black">Monte o cadastro com IA</h2>
              <p className="mt-0.5 text-sm text-orange-50">
                Envie as fichas técnicas e o relatório de vendas por mês. A IA lê os arquivos e prepara ingredientes, receitas base, fichas e quantidade
                vendida. Você confere tudo antes de gravar.
              </p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <DropZone
            title="Fichas técnicas"
            hint="Planilha (Excel ou CSV), PDF ou foto. Pode ser uma ficha por aba ou todas juntas."
            icon={<BookOpen className="h-5 w-5" />}
            files={files.fichas}
            onAdd={(f) => setFiles((p) => ({ ...p, fichas: [...p.fichas, ...f] }))}
            onRemove={(i) => setFiles((p) => ({ ...p, fichas: p.fichas.filter((_, j) => j !== i) }))}
            testId="ai-fichas-input"
          />
          <DropZone
            title="Vendas por mês"
            hint="Relatório do PDV ou do iFood com produto e quantidade vendida. Um ou vários meses."
            icon={<TrendingUp className="h-5 w-5" />}
            files={files.sales}
            onAdd={(f) => setFiles((p) => ({ ...p, sales: [...p.sales, ...f] }))}
            onRemove={(i) => setFiles((p) => ({ ...p, sales: p.sales.filter((_, j) => j !== i) }))}
            testId="ai-sales-input"
          />
        </div>

        {errors.length > 0 && (
          <Panel className="space-y-1 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.map((e) => (
              <p key={e} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {e}
              </p>
            ))}
          </Panel>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">Os arquivos são lidos pela IA do Google (Gemini) só para montar o cadastro. Nada é gravado antes da sua conferência.</p>
          <Btn onClick={read} disabled={total === 0}>
            <Sparkles className="h-4 w-4" /> Ler {total > 0 ? `${total} ${total === 1 ? 'arquivo' : 'arquivos'}` : ''} com IA
          </Btn>
        </div>
      </div>
    );
  }

  // ---- Etapa 2: leitura ----
  if (stage === 'reading' || !plan || !sel || !preview) {
    const pctDone = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <Panel className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <div>
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">A IA está lendo seus arquivos</p>
          <p className="mt-1 text-sm text-stone-500">
            {progress.total ? `${progress.done} de ${progress.total} partes` : 'Preparando os arquivos…'}
            {progress.label ? ` · ${progress.label}` : ''}
          </p>
        </div>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pctDone}%` }} />
        </div>
        <p className="text-xs text-stone-400">Planilhas grandes levam alguns minutos. Pode deixar esta tela aberta.</p>
      </Panel>
    );
  }

  // ---- Etapa 3: conferência ----
  const ingName = (id: string) => plan.newIngredients.find((i) => i.id === id) || store.data.ingredients.find((i) => i.id === id);
  const recName = (id: string) => plan.recipes.find((r) => r.item.id === id)?.item || store.data.recipes.find((r) => r.id === id);
  const lineText = (l: RecipeLine) => {
    const ref = l.kind === 'recipe' ? recName(l.refId) : ingName(l.refId);
    return `${ref?.name || '?'} ${qtyText(l.qty, ref?.unit || '')}`;
  };
  const salesFor = (id: string) => plan.sales.find((s) => s.productId === id);
  const noPrice = plan.newIngredients.filter((i) => !(i.price > 0));
  const exampleCount = exampleSize(plan.example);
  const c = preview.counts;

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Btn variant="ghost" onClick={reset} disabled={saving}>
        <RotateCcw className="h-4 w-4" /> Começar de novo
      </Btn>
      <Btn variant="success" onClick={save} disabled={saving || (!preview.writes.length && !preview.deletes.length)}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Gravar no cadastro
      </Btn>
    </div>
  );

  return (
    <div className="space-y-5" data-testid="ai-review">
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">Confira antes de gravar</p>
            <p className="mt-1 text-lg font-black text-stone-900 dark:text-stone-50">
              {plural(c.products, 'ficha', 'fichas')} · {plural(c.recipes, 'receita base', 'receitas base')} · {plural(c.ingredients, 'ingrediente novo', 'ingredientes novos')}
              {c.sales ? ` · vendas de ${plural(c.sales, 'produto', 'produtos')}` : ''}
            </p>
            <p className="text-sm text-stone-500">Desmarque o que não quiser. Os preços que faltarem vêm das notas fiscais da SEFAZ quando você autorizar cada uma.</p>
          </div>
          {actions}
        </div>
      </Panel>

      {currentCount > 0 && (
        <Panel className={cx('p-4 sm:p-5', replaceAll && 'border-rose-300 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5')}>
          <label className="flex cursor-pointer gap-3">
            <Check checked={replaceAll} onChange={setReplaceAll} label="Substituir o cadastro atual" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100">
                <RotateCcw className="h-4 w-4 text-rose-500" /> Substituir o cadastro atual
              </span>
              <span className="block text-sm text-stone-500">
                Apaga as {plural(current.products.length, 'ficha', 'fichas')}, {plural(current.recipes.length, 'receita base', 'receitas base')},{' '}
                {plural(current.ingredients.length, 'ingrediente', 'ingredientes')} e {plural(current.packaging.length, 'embalagem', 'embalagens')} de hoje e
                grava no lugar só o que a IA leu agora. Use para refazer uma importação que veio errada. Despesas, equipe e notas fiscais ficam.
              </span>
            </span>
          </label>
        </Panel>
      )}

      {plan.example.present && !replaceAll && (
        <Panel className="p-4 sm:p-5">
          <label className="flex cursor-pointer gap-3">
            <Check checked={removeExample} onChange={setRemoveExample} label="Apagar o cardápio de exemplo" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100">
                <Trash2 className="h-4 w-4 text-rose-500" /> Apagar o cardápio de exemplo ({plural(exampleCount, 'item', 'itens')})
              </span>
              <span className="block text-sm text-stone-500">
                São os pratos, ingredientes, despesas, equipe e equipamentos de demonstração que vieram com o módulo (Spaghetti ao sugo, Atacadão,
                Aluguel R$ 6.000…). Com a caixa marcada, suas fichas entram no lugar deles.
              </span>
              {plan.example.kept.length > 0 && (
                <span className="mt-1 block text-xs text-stone-500">Ficam porque alguém editou: {plan.example.kept.join(', ')}.</span>
              )}
            </span>
          </label>
        </Panel>
      )}

      {plan.products.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelHeader icon={<BookOpen className="h-4 w-4" />} title={`Fichas técnicas (${plan.products.length})`} subtitle="Pratos e bebidas que a IA encontrou" />
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {plan.products.map((p) => {
              const s = salesFor(p.item.id);
              return (
                <li key={p.key} className="px-4 py-3 sm:px-5">
                  <label className="flex cursor-pointer gap-3">
                    <Check checked={sel.products.has(p.key)} onChange={(v) => toggle('products', p.key, v)} label={p.item.name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{p.item.name}</span>
                        <Badge tone={p.action === 'create' ? 'green' : 'blue'}>{p.action === 'create' ? 'Nova' : 'Atualiza a existente'}</Badge>
                        <Badge tone="slate">{p.item.category}</Badge>
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">{p.item.lines.map(lineText).join(' · ') || 'Sem ingredientes'}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <span className="block font-semibold tabular-nums">{p.item.salePrice > 0 ? brl(p.item.salePrice) : <span className="text-amber-600">sem preço</span>}</span>
                      {s && applySales && <span className="block text-xs text-stone-500">{num(s.monthly)} /mês</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {plan.recipes.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelHeader icon={<ChefHat className="h-4 w-4" />} title={`Receitas base (${plan.recipes.length})`} subtitle="Molhos, massas e preparos usados dentro das fichas" />
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {plan.recipes.map((r) => (
              <li key={r.key} className="px-4 py-3 sm:px-5">
                <label className="flex cursor-pointer gap-3">
                  <Check checked={sel.recipes.has(r.key)} onChange={(v) => toggle('recipes', r.key, v)} label={r.item.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{r.item.name}</span>
                      <Badge tone={r.action === 'create' ? 'green' : 'blue'}>{r.action === 'create' ? 'Nova' : 'Atualiza a existente'}</Badge>
                      <Badge tone="slate">rende {qtyText(r.item.yieldQty, r.item.unit)}</Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">{r.item.lines.map(lineText).join(' · ')}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {plan.newIngredients.length + plan.newPackaging.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelHeader
            icon={<Wheat className="h-4 w-4" />}
            title={`Ingredientes e embalagens novos (${plan.newIngredients.length + plan.newPackaging.length})`}
            subtitle={noPrice.length ? `${noPrice.length} sem preço na ficha: as notas fiscais preenchem` : 'Com o preço que estava na ficha'}
          />
          <div className="flex flex-wrap gap-2 p-4 sm:p-5">
            {plan.newIngredients.map((i) => (
              <span key={i.id} className="rounded-xl bg-stone-50 px-2.5 py-1.5 text-xs dark:bg-white/5">
                <span className="font-semibold text-stone-800 dark:text-stone-200">{i.name}</span>{' '}
                <span className={i.price > 0 ? 'text-stone-500' : 'text-amber-600'}>{i.price > 0 ? `${brl(i.price)}/${i.unit === 'un' ? 'un' : i.unit === 'g' ? 'kg' : 'L'}` : 'sem preço'}</span>
              </span>
            ))}
            {plan.newPackaging.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-xl bg-stone-50 px-2.5 py-1.5 text-xs dark:bg-white/5">
                <Package className="h-3 w-3 text-stone-400" />
                <span className="font-semibold text-stone-800 dark:text-stone-200">{p.name}</span>
                <span className="text-stone-500">{p.packPrice > 0 ? brl(p.packPrice) : 'sem preço'}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      {plan.priceUpdates.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelHeader title={`Preços diferentes na ficha (${plan.priceUpdates.length})`} subtitle="Ingredientes já cadastrados com outro preço. Marque para usar o da ficha." />
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {plan.priceUpdates.map((u) => (
              <li key={u.id} className="px-4 py-2.5 sm:px-5">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <Check checked={sel.priceUpdates.has(u.id)} onChange={(v) => toggle('prices', u.id, v)} label={u.name} />
                  <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                  <span className="shrink-0 tabular-nums text-stone-500">
                    {brl(u.before)} → <span className="font-semibold text-stone-900 dark:text-stone-100">{brl(u.after)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {(plan.sales.length > 0 || plan.unmatchedSales.length > 0) && (
        <Panel className="overflow-hidden">
          <PanelHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="Vendas por mês"
            subtitle="Usadas no painel, no ponto de equilíbrio e no rateio das despesas"
            actions={
              <Segmented<'average' | 'last'>
                value={salesMode}
                onChange={setSalesMode}
                options={[
                  { value: 'average', label: 'Média dos meses' },
                  { value: 'last', label: 'Último mês' },
                ]}
              />
            }
          />
          <div className="space-y-3 p-4 sm:p-5">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
              <Check checked={applySales} onChange={setApplySales} label="Atualizar as vendas por mês" />
              Atualizar a venda mensal de {plural(plan.sales.length, 'produto', 'produtos')}
            </label>
            {plan.sales.length > 0 && (
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {plan.sales.map((s) => (
                  <li key={s.productId} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 dark:bg-white/5">
                    <span className="min-w-0 truncate">
                      {s.productName}
                      {s.reportName.toLowerCase() !== s.productName.toLowerCase() && <span className="text-xs text-stone-400"> ({s.reportName})</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{num(s.monthly)}/mês</span>
                  </li>
                ))}
              </ul>
            )}
            {plan.unmatchedSales.length > 0 && (
              <p className="text-xs text-stone-500">
                Vendidos sem ficha técnica ({plan.unmatchedSales.length}): {plan.unmatchedSales.join(', ')}. Envie a ficha deles ou cadastre na aba Fichas
                técnicas / Bebidas.
              </p>
            )}
          </div>
        </Panel>
      )}

      {(plan.warnings.length > 0 || errors.length > 0) && (
        <Panel className="overflow-hidden">
          <PanelHeader icon={<AlertTriangle className="h-4 w-4" />} title={`Pontos para conferir (${plan.warnings.length + errors.length})`} />
          <ul className="space-y-1.5 p-4 text-sm text-stone-600 sm:p-5 dark:text-stone-300">
            {[...errors, ...plan.warnings].map((w) => (
              <li key={w} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {w}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="flex justify-end">{actions}</div>
    </div>
  );
}
