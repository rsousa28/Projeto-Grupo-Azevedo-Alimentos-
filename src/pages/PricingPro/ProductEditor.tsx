import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Leaf,
  Package,
  Pencil,
  Printer,
  Receipt,
  Tag,
  Target,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { channelFeePct, newId, nextCode, productMetrics, suggestedPrice, type Channel, type ProductMetrics } from '../../lib/pricing/engine';
import { compressImage } from '../../lib/pricing/usePricingData';
import type { Product } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { EnergyLinesEditor, LinesEditor, PackLinesEditor } from './editors';
import NutritionPanel from './NutritionPanel';
import OperationalSheetModal from './OperationalSheetModal';
import { ProductThumb } from './ProductsTab';
import { Badge, Btn, Field, NumInput, Panel, PanelHeader, Select, StatCard, TextInput, brl, brlUnit, cx, pct } from './ui';

type StepId = 'ingredientes' | 'embalagem' | 'energia' | 'mao' | 'preco' | 'nutricao';

const PRODUCT_STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'embalagem', label: 'Embalagem' },
  { id: 'energia', label: 'Gás e luz' },
  { id: 'mao', label: 'Mão de obra' },
  { id: 'preco', label: 'Precificar' },
  { id: 'nutricao', label: 'Tabela nutricional' },
];

const DRINK_STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'ingredientes', label: 'Produto' },
  { id: 'embalagem', label: 'Embalagem' },
  { id: 'preco', label: 'Precificar' },
  { id: 'nutricao', label: 'Tabela nutricional' },
];

export default function ProductEditor({
  product,
  siblings,
  onSelect,
  onBack,
  onCreate,
}: {
  product: Product;
  siblings: Product[];
  onSelect: (id: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const { store, ctx, overhead, run } = usePricing();
  const steps = product.kind === 'drink' ? DRINK_STEPS : PRODUCT_STEPS;
  const [step, setStep] = useState<StepId>('ingredientes');
  const [opsOpen, setOpsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const salao = useMemo(() => productMetrics(ctx, product, 'salao', overhead), [ctx, product, overhead]);
  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === step));

  const update = (patch: Partial<Product>) => run(() => store.save('products', { ...product, ...patch }));

  const done: Record<StepId, boolean> = {
    ingredientes: product.lines.length > 0,
    embalagem: product.packaging.length + (product.deliveryPackaging?.length || 0) > 0,
    energia: product.energy.length > 0,
    mao: product.laborMinutes > 0 || store.data.config.payrollMode === 'fixed',
    preco: product.salePrice > 0,
    nutricao: product.lines.length > 0,
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    const photo = await compressImage(file, 720, 0.78);
    await update({ photo });
  };

  const duplicate = async () => {
    const copy: Product = {
      ...product,
      id: newId('prod'),
      code: nextCode(product.kind === 'drink' ? 'B' : 'P', siblings.map((p) => p.code)),
      name: `${product.name} (cópia)`,
      version: 1,
    };
    if (await run(() => store.save('products', copy), 'Produto duplicado.')) onSelect(copy.id);
  };

  const remove = () => {
    const inCombos = store.data.combos.filter((c) => c.items.some((i) => i.productId === product.id));
    if (inCombos.length) {
      window.alert(`"${product.name}" está nos combos:\n\n• ${inCombos.map((c) => c.name).join('\n• ')}\n\nRetire do combo antes de excluir.`);
      return;
    }
    if (window.confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
      run(() => store.remove('products', product.id), 'Produto excluído.').then((ok) => ok && onBack());
    }
  };

  const c = salao.cost;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Btn>
        <span className="text-xs text-stone-400">Versão {product.version} · salvo automaticamente</span>
      </div>

      {/* Resumo do custo em etapas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <StatCard
          icon={<Tag className="h-5 w-5" />}
          label={salao.hasPrice ? 'Preço de venda' : 'Preço sugerido'}
          value={brl(salao.hasPrice ? salao.price : salao.suggested || 0)}
          tone="green"
          hint={salao.suggested ? `Sugerido: ${brl(salao.suggested)}` : 'Sem preço possível com estes percentuais'}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Margem de contribuição"
          value={brl(salao.contribution)}
          tone="purple"
          hint={`${pct(salao.contributionPct)} do preço`}
        />
        <StatCard icon={<Receipt className="h-5 w-5" />} label="Custo total" value={brl(c.total)} tone="red" hint={`CMV ${pct(salao.cmvPct)}`} />
        <StatCard
          icon={<Check className="h-5 w-5" />}
          label="Lucro por unidade"
          value={brl(salao.profit)}
          highlight={salao.marginReached}
          tone={salao.marginReached ? 'green' : 'red'}
          hint={`${pct(salao.profitPct)} · meta ${pct(salao.targetMarginPct, 0)}`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniCost icon={<Leaf className="h-4 w-4" />} label="Ingredientes" value={c.ingredients} />
        <MiniCost icon={<Box className="h-4 w-4" />} label="Embalagens" value={c.packaging} />
        <MiniCost icon={<Flame className="h-4 w-4" />} label="Gás / energia" value={c.energy} />
        <MiniCost icon={<Users className="h-4 w-4" />} label="Mão de obra" value={c.labor} />
        <MiniCost icon={<Receipt className="h-4 w-4" />} label="Taxas / extras" value={c.extras} />
      </div>

      {/* Identificação */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative w-full max-w-[240px] self-start overflow-hidden rounded-2xl border border-stone-200 dark:border-white/10"
          title="Trocar foto"
        >
          <ProductThumb product={product} className="aspect-square w-full" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-2 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
            <Camera className="h-4 w-4" /> {product.photo ? 'Trocar foto' : 'Adicionar foto'}
          </span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </button>
        <div className="space-y-3">
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 p-3 text-white shadow-md">
              <span className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-sm font-black">{product.code}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-orange-100">
                  Nome do {product.kind === 'drink' ? 'item' : 'produto'} · clique para editar
                </p>
                <div className="relative">
                  <TextInput
                    value={product.name}
                    onChange={(name) => update({ name })}
                    className="border-dashed border-white/50 bg-white/10 pr-8 text-lg font-bold text-white placeholder:text-orange-100 focus:border-white focus:ring-white/30 dark:bg-white/10"
                  />
                  <Pencil className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {product.kind === 'product' && (
                <Btn variant="dark" onClick={() => setOpsOpen(true)}>
                  <Printer className="h-4 w-4" /> Gerar ficha técnica
                </Btn>
              )}
              <Btn variant="outline" onClick={duplicate} title="Duplicar">
                <Copy className="h-4 w-4" />
              </Btn>
              <Btn variant="outline" onClick={remove} title="Excluir" className="text-rose-600">
                <Trash2 className="h-4 w-4" />
              </Btn>
            </div>
          </div>
          <Panel className="p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Seus {product.kind === 'drink' ? 'itens' : 'produtos'}</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.map((s) => {
                const m = productMetrics(ctx, s, 'salao', overhead);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s.id)}
                    title={s.name}
                    className={cx(
                      'rounded-lg px-2.5 py-1 text-xs font-black text-white shadow-sm transition',
                      s.id === product.id ? 'bg-emerald-600 ring-2 ring-emerald-300' : m.hasPrice && !m.marginReached ? 'bg-rose-500 hover:bg-rose-600' : 'bg-orange-500 hover:bg-orange-600',
                    )}
                  >
                    {s.code}
                  </button>
                );
              })}
              <button type="button" onClick={onCreate} className="rounded-lg border border-dashed border-orange-400 px-2.5 py-1 text-xs font-black text-orange-600" aria-label="Novo">
                +
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Categoria">
                <Select value={product.category} onChange={(e) => update({ category: e.target.value })}>
                  {Array.from(new Set([...store.data.config.categories, product.category])).map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Vendas por mês (un.)" hint="Usado na visão geral: faturamento, ponto de equilíbrio e ranking">
                <NumInput value={product.monthlySales} onChange={(monthlySales) => update({ monthlySales })} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      {/* Etapas */}
      <Panel className="px-3 py-4 sm:px-6">
        <ol className="flex items-start justify-between gap-1 overflow-x-auto">
          {steps.map((s, i) => {
            const active = s.id === step;
            return (
              <li key={s.id} className="relative flex min-w-[78px] flex-1 flex-col items-center">
                {i > 0 && <span className="absolute right-1/2 top-5 -z-0 h-0.5 w-full bg-stone-200 dark:bg-white/10" />}
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cx(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition',
                    active
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-4 ring-orange-200 dark:ring-orange-500/30'
                      : done[s.id]
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-stone-300 bg-white text-stone-500 dark:border-white/20 dark:bg-[#171513]',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done[s.id] && !active ? <Check className="h-5 w-5" /> : i + 1}
                </button>
                <span className={cx('mt-2 text-center text-xs font-semibold', active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500')}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </Panel>

      {step === 'ingredientes' && (
        <Panel>
          <PanelHeader
            icon={<Leaf className="h-5 w-5" />}
            title={product.kind === 'drink' ? 'Produto comprado' : 'Cálculo dos ingredientes'}
            subtitle={
              product.kind === 'drink'
                ? 'Escolha o item comprado (cadastrado em Ingredientes) e a quantidade por venda.'
                : 'Quantidades líquidas que vão no prato. Receitas base (★) entram pelo custo por grama.'
            }
          />
          <LinesEditor lines={product.lines} onChange={(lines) => update({ lines })} />
        </Panel>
      )}

      {step === 'embalagem' && (
        <Panel>
          <PanelHeader icon={<Package className="h-5 w-5" />} title="Embalagens" subtitle="O delivery soma as duas listas: a do salão e a extra do delivery." />
          <PackLinesEditor title="Salão e delivery" lines={product.packaging} onChange={(packaging) => update({ packaging })} />
          <div className="border-t border-stone-100 dark:border-white/5">
            <PackLinesEditor title="Só no delivery (pote, saco, lacre, talher)" lines={product.deliveryPackaging || []} onChange={(deliveryPackaging) => update({ deliveryPackaging })} />
          </div>
        </Panel>
      )}

      {step === 'energia' && (
        <Panel>
          <PanelHeader
            icon={<Flame className="h-5 w-5" />}
            title="Gás e luz"
            subtitle="Quanto tempo cada equipamento fica ligado e quantas unidades saem de uma vez (o custo é dividido)."
          />
          <EnergyLinesEditor lines={product.energy} onChange={(energy) => update({ energy })} />
        </Panel>
      )}

      {step === 'mao' && (
        <Panel>
          <PanelHeader icon={<Users className="h-5 w-5" />} title="Mão de obra" subtitle={`Custo médio do minuto da equipe: ${brlUnit(ctx.laborPerMinute)}`} />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Minutos de preparo e montagem" hint="Só o tempo deste produto. O preparo das receitas base já está na receita.">
              <NumInput value={product.laborMinutes} digits={1} onChange={(laborMinutes) => update({ laborMinutes })} />
            </Field>
            <Field label="Funcionários envolvidos">
              <NumInput value={product.laborWorkers} digits={1} onChange={(laborWorkers) => update({ laborWorkers })} />
            </Field>
            <Field label="Taxas / extras por unidade" hint="Qualquer custo por unidade que não está nas outras etapas">
              <NumInput mode="money" value={product.extraCost} onChange={(extraCost) => update({ extraCost })} />
            </Field>
          </div>
          {store.data.config.payrollMode === 'fixed' && (
            <p className="mx-5 mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              A folha está configurada como custo fixo (Despesas → Funcionários). Os minutos ficam registrados, mas não somam no custo
              para não cobrar a equipe duas vezes.
            </p>
          )}
          <div className="border-t border-stone-100 px-5 py-3 text-right text-sm font-bold dark:border-white/5">
            Custo de mão de obra: <span className="tabular-nums text-orange-600">{brl(c.labor)}</span>
          </div>
        </Panel>
      )}

      {step === 'preco' && <PricingStep product={product} update={update} />}

      {step === 'nutricao' && <NutritionPanel product={product} update={update} />}

      <div className="flex justify-between">
        <Btn variant="outline" disabled={stepIndex === 0} onClick={() => setStep(steps[stepIndex - 1].id)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Btn>
        {stepIndex < steps.length - 1 ? (
          <Btn variant="success" onClick={() => setStep(steps[stepIndex + 1].id)}>
            Próximo: {steps[stepIndex + 1].label} <ChevronRight className="h-4 w-4" />
          </Btn>
        ) : product.kind === 'product' ? (
          <Btn variant="dark" onClick={() => setOpsOpen(true)}>
            <Printer className="h-4 w-4" /> Gerar ficha técnica da cozinha
          </Btn>
        ) : (
          <span />
        )}
      </div>

      {opsOpen && <OperationalSheetModal product={product} onClose={() => setOpsOpen(false)} />}
    </div>
  );
}

function MiniCost({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#171513]">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold text-stone-500">{label}</p>
        <p className="font-bold tabular-nums text-stone-900 dark:text-stone-100">{brl(value)}</p>
      </div>
    </div>
  );
}

function PricingStep({ product, update }: { product: Product; update: (p: Partial<Product>) => Promise<boolean> }) {
  const { store, ctx, overhead } = usePricing();
  const config = store.data.config;
  const salao = productMetrics(ctx, product, 'salao', overhead);
  const delivery = productMetrics(ctx, product, 'delivery', overhead);
  const target = product.targetMarginPct ?? config.targetMarginPct;

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          icon={<Wand2 className="h-5 w-5" />}
          title="Precificar"
          subtitle="Preço sugerido = custo ÷ (1 − impostos e taxas − estrutura do mês − margem desejada)."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Margem de lucro desejada" hint="Lucro líquido que sobra depois de pagar tudo. Vazio = padrão da loja.">
            <NumInput mode="pct" value={target} onChange={(v) => update({ targetMarginPct: v })} />
          </Field>
          <div className="text-sm">
            <p className="text-xs font-semibold text-stone-500">Estrutura do mês sobre o faturamento</p>
            <p className="mt-2 font-bold tabular-nums text-stone-900 dark:text-stone-100">{pct(overhead)}</p>
          </div>
          <div className="flex items-end">
            {product.targetMarginPct !== undefined && (
              <Btn variant="ghost" size="sm" onClick={() => update({ targetMarginPct: undefined })}>
                Voltar ao padrão da loja ({pct(config.targetMarginPct, 0)})
              </Btn>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelCard
          title="Salão / balcão"
          channel="salao"
          m={salao}
          onPrice={(salePrice) => update({ salePrice })}
        />
        <ChannelCard
          title="Delivery (app)"
          channel="delivery"
          m={delivery}
          onPrice={(deliveryPrice) => update({ deliveryPrice })}
          note={!product.deliveryPrice ? 'Sem preço próprio: usando o do salão.' : undefined}
        />
      </div>

      <MarginTable product={product} />
    </div>
  );
}

function ChannelCard({
  title,
  channel,
  m,
  onPrice,
  note,
}: {
  title: string;
  channel: Channel;
  m: ProductMetrics;
  onPrice: (v: number) => void;
  note?: string;
}) {
  const rows: Array<[string, number, string?]> = [
    ['Preço de venda', m.price],
    ['(−) Custo do produto', -m.cost.total],
    [`(−) Impostos e taxas (${pct(m.feePct)})`, -m.fees],
    ['= Margem de contribuição', m.contribution, 'font-bold'],
    ['(−) Estrutura do mês', -m.overheadShare],
    ['= Lucro líquido', m.profit, 'font-black'],
  ];
  return (
    <Panel>
      <PanelHeader
        title={title}
        subtitle={channel === 'delivery' ? 'Comissão do app + pagamento online + imposto' : 'Cartão + imposto'}
        actions={m.hasPrice ? m.marginReached ? <Badge tone="green">Margem alcançada</Badge> : <Badge tone="red">Margem não alcançada</Badge> : <Badge tone="amber">Sem preço</Badge>}
      />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Preço praticado" className="w-40">
            <NumInput mode="money" value={m.price} onChange={onPrice} />
          </Field>
          {m.suggested ? (
            <Btn variant="outline" onClick={() => onPrice(charmPrice(m.suggested!))} title={`Sugerido exato: ${brl(m.suggested)}`}>
              <Wand2 className="h-4 w-4 text-orange-500" /> Usar sugerido {brl(charmPrice(m.suggested))}
            </Btn>
          ) : (
            <p className="text-xs text-rose-600">Os percentuais passam de 95%: não existe preço que feche a conta.</p>
          )}
        </div>
        {note && <p className="text-xs text-stone-500">{note}</p>}
        <dl className="divide-y divide-stone-100 text-sm dark:divide-white/5">
          {rows.map(([label, value, weight]) => (
            <div key={label} className="flex justify-between py-1.5">
              <dt className={cx('text-stone-600 dark:text-stone-300', weight)}>{label}</dt>
              <dd className={cx('tabular-nums', weight, value < 0 ? 'text-stone-500' : 'text-stone-900 dark:text-stone-100')}>{brl(value)}</dd>
            </div>
          ))}
        </dl>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Pill label="Margem" value={pct(m.profitPct)} tone={m.marginReached ? 'text-emerald-600' : 'text-rose-600'} />
          <Pill label="CMV" value={pct(m.cmvPct)} />
          <Pill label="Markup" value={m.cost.total > 0 ? `${(m.price / m.cost.total).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x` : '—'} />
        </div>
      </div>
    </Panel>
  );
}

/** Arredonda para cima até o próximo preço terminado em ,90 (22,20 → 22,90). */
export function charmPrice(value: number): number {
  const candidate = Math.ceil(value) - 0.1;
  return Number((candidate >= value - 1e-9 ? candidate : candidate + 1).toFixed(2));
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-2 py-2 dark:bg-white/5">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className={cx('font-black tabular-nums', tone || 'text-stone-900 dark:text-stone-100')}>{value}</p>
    </div>
  );
}

/** Tabela "e se": preço necessário para cada margem, nos dois canais. */
function MarginTable({ product }: { product: Product }) {
  const { store, ctx, overhead } = usePricing();
  const margins = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
  const costS = productMetrics(ctx, product, 'salao', overhead).cost.total;
  const costD = productMetrics(ctx, product, 'delivery', overhead).cost.total;
  const feeS = channelFeePct(store.data.config, 'salao');
  const feeD = channelFeePct(store.data.config, 'delivery');
  return (
    <Panel>
      <PanelHeader title="Simulador de margem" subtitle="Quanto cobrar para ter cada margem de lucro em cada canal." />
      <div className="grid grid-cols-3 gap-2 p-4 text-sm sm:grid-cols-6">
        {margins.map((mg) => {
          const s = suggestedPrice(costS, feeS, overhead, mg);
          const d = suggestedPrice(costD, feeD, overhead, mg);
          return (
            <div key={mg} className="rounded-xl border border-stone-200 p-2.5 text-center dark:border-white/10">
              <p className="text-xs font-bold text-orange-600">{pct(mg, 0)}</p>
              <p className="mt-1 text-[11px] text-stone-500">Salão</p>
              <p className="font-bold tabular-nums">{s ? brl(s) : '—'}</p>
              <p className="mt-1 text-[11px] text-stone-500">Delivery</p>
              <p className="font-bold tabular-nums">{d ? brl(d) : '—'}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
