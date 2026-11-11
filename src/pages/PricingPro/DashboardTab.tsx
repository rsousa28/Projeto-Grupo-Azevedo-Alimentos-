import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Crown,
  DollarSign,
  Gauge,
  Package,
  PieChart,
  Scale,
  Search,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react';
import { overview, productMetrics, type ProductMetrics } from '../../lib/pricing/engine';
import type { Product } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { ProductThumb } from './ProductsTab';
import { Badge, Panel, PanelHeader, Select, StatCard, TableWrap, brl, cx, num, pct, td, th } from './ui';

// Paleta categórica validada (slots 1-4) e cor única para magnitude
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const BAR = '#eb6834';

type Row = { p: Product; m: ProductMetrics };

export default function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { store, ctx, overhead } = usePricing();
  const o = useMemo(() => overview(ctx), [ctx]);
  const rows: Row[] = useMemo(() => store.data.products.map((p) => ({ p, m: productMetrics(ctx, p, 'salao', overhead) })), [store.data.products, ctx, overhead]);
  const priced = rows.filter((r) => r.m.hasPrice);
  const [analysisId, setAnalysisId] = useState<string>('');
  const selected = priced.find((r) => r.p.id === analysisId) || priced[0];

  const topMargins = [...priced].sort((a, b) => b.m.profit - a.m.profit).slice(0, 6);
  const topCosts = [...priced].sort((a, b) => b.m.cost.total - a.m.cost.total).slice(0, 5);
  const maxCost = Math.max(...topCosts.map((r) => r.m.cost.total), 1);
  const noPriceIngredients = store.data.ingredients.filter((i) => !(i.price > 0)).length;
  const highCmv = priced.filter((r) => r.m.cmvPct > store.data.config.cmvTargetPct);

  const structure = [
    { label: 'Despesas fixas', value: o.structure.fixedExpenses },
    { label: 'Despesas variáveis', value: o.structure.variableExpenses },
    { label: 'Depreciação', value: o.structure.depreciation },
    { label: 'Folha (custo fixo)', value: o.structure.payroll },
  ].filter((s) => s.value > 0);

  const alerts = [
    o.belowTarget > 0 && { tone: 'red' as const, text: `${o.belowTarget} produto(s) com margem não alcançada`, tab: 'fichas' },
    o.withoutPrice > 0 && { tone: 'amber' as const, text: `${o.withoutPrice} produto(s) sem preço de venda`, tab: 'fichas' },
    noPriceIngredients > 0 && { tone: 'amber' as const, text: `${noPriceIngredients} ingrediente(s) sem preço`, tab: 'ingredientes' },
    highCmv.length > 0 && { tone: 'red' as const, text: `${highCmv.length} produto(s) com CMV acima da meta de ${pct(store.data.config.cmvTargetPct, 0)}`, tab: 'fichas' },
    o.structure.total === 0 && { tone: 'amber' as const, text: 'Cadastre as despesas do mês para o preço cobrir aluguel e contas', tab: 'despesas' },
  ].filter(Boolean) as Array<{ tone: 'red' | 'amber'; text: string; tab: string }>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={<ShoppingCart className="h-5 w-5" />} label="Produtos" value={store.data.products.length} hint={`${store.data.combos.length} combos`} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Preço médio" value={brl(o.avgPrice)} tone="amber" />
        <StatCard icon={<PieChart className="h-5 w-5" />} label="Estrutura do mês" value={brl(o.structure.total)} tone="red" hint={`${pct(o.overheadPct)} do faturamento`} />
        <StatCard
          icon={<Scale className="h-5 w-5" />}
          label="Ponto de equilíbrio"
          value={o.breakEvenUnits !== null ? `${num(o.breakEvenUnits)} un.` : '—'}
          tone="blue"
          hint={o.breakEvenRevenue !== null ? `≈ ${brl(o.breakEvenRevenue)} por mês` : 'Sem margem de contribuição'}
        />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Lucro médio por unidade" value={brl(o.avgProfit)} highlight tone="green" />
      </div>

      {alerts.length > 0 && (
        <Panel className="p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> O que precisa de atenção
          </p>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <button key={a.text} type="button" onClick={() => onNavigate(a.tab)} className="text-left">
                <Badge tone={a.tone}>
                  <AlertTriangle className="h-3 w-3" /> {a.text} →
                </Badge>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <PanelHeader icon={<BarChart3 className="h-5 w-5" />} title="Maiores lucros por unidade" subtitle="Quanto sobra limpo em cada venda no salão" />
          {topMargins.length === 0 ? (
            <p className="p-6 text-sm text-stone-500">Defina preços nas fichas técnicas para ver o ranking.</p>
          ) : (
            <div className="h-72 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMargins.map((r) => ({ name: r.p.name, lucro: Number(r.m.profit.toFixed(2)) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} tickFormatter={(v: number) => `R$ ${v}`} />
                  <Tooltip
                    cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
                    formatter={(v: number) => [brl(v), 'Lucro por unidade']}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', fontSize: 12 }}
                  />
                  <Bar dataKey="lucro" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader icon={<PieChart className="h-5 w-5" />} title="Estrutura do mês" subtitle="O que o faturamento precisa pagar além do custo dos pratos" />
          <div className="space-y-4 p-5">
            <p className="text-3xl font-black tabular-nums text-stone-900 dark:text-stone-50">{brl(o.structure.total)}</p>
            {structure.length > 0 ? (
              <>
                <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                  {structure.map((s, i) => (
                    <div key={s.label} style={{ width: `${(s.value / o.structure.total) * 100}%`, background: SERIES[i] }} title={`${s.label}: ${brl(s.value)}`} />
                  ))}
                </div>
                <ul className="space-y-2 text-sm">
                  {structure.map((s, i) => (
                    <li key={s.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} /> {s.label}
                      </span>
                      <span className="tabular-nums font-semibold text-stone-900 dark:text-stone-100">
                        {brl(s.value)} <span className="text-xs font-normal text-stone-500">({pct(s.value / o.structure.total, 0)})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <button type="button" onClick={() => onNavigate('despesas')} className="text-sm font-semibold text-orange-600">
                Cadastrar despesas →
              </button>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <PanelHeader
            icon={<Search className="h-5 w-5" />}
            title="Análise do produto"
            actions={
              priced.length > 0 && (
                <Select value={selected?.p.id || ''} onChange={(e) => setAnalysisId(e.target.value)} className="w-56 py-1.5 text-xs">
                  {priced.map((r) => (
                    <option key={r.p.id} value={r.p.id}>
                      {r.p.code} · {r.p.name}
                    </option>
                  ))}
                </Select>
              )
            }
          />
          {selected ? (
            <div className="grid gap-4 p-5 sm:grid-cols-[160px_1fr]">
              <ProductThumb product={selected.p} className="aspect-square w-full rounded-xl" />
              <dl className="divide-y divide-stone-100 text-sm dark:divide-white/5">
                {([
                  ['Venda', brl(selected.m.price)],
                  ['Custo', brl(selected.m.cost.total)],
                  ['Impostos e taxas', brl(selected.m.fees)],
                  ['Contribuição', brl(selected.m.contribution)],
                  ['Margem de contribuição', pct(selected.m.contributionPct)],
                  ['Estrutura do mês', brl(selected.m.overheadShare)],
                  [`Lucro (${pct(selected.m.profitPct)})`, brl(selected.m.profit)],
                ] as const).map(([k, v], i, arr) => (
                  <div key={k} className="flex justify-between py-2">
                    <dt className="text-stone-600 dark:text-stone-300">{k}</dt>
                    <dd className={cx('tabular-nums font-bold', i === arr.length - 1 && (selected.m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'))}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="p-6 text-sm text-stone-500">Nenhum produto com preço ainda.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader icon={<Gauge className="h-5 w-5" />} title="Faturamento x estrutura" subtitle={`${num(o.unitsSold)} vendas/mês cadastradas`} />
          <div className="space-y-4 p-5 text-sm">
            {[
              ['Faturamento', o.revenue, SERIES[0]],
              ['Estrutura do mês', o.structure.total, SERIES[1]],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <div className="mb-1 flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300">{label as string}</span>
                  <span className="font-bold tabular-nums">{brl(value as number)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-stone-100 dark:bg-white/5">
                  <div className="h-2.5 rounded-full" style={{ width: `${Math.min(100, ((value as number) / Math.max(o.revenue, o.structure.total, 1)) * 100)}%`, background: color as string }} />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 dark:bg-white/5">
              <span className="font-semibold">Resultado do mês</span>
              <span className={cx('text-lg font-black tabular-nums', o.monthResult >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{brl(o.monthResult)}</span>
            </div>
            <p className="text-xs text-stone-500">Contribuição de todas as vendas menos a estrutura do mês.</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Panel>
          <PanelHeader icon={<Package className="h-5 w-5" />} title="Maiores custos" />
          <ul className="space-y-3 p-5 text-sm">
            {topCosts.map((r) => (
              <li key={r.p.id}>
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate text-stone-700 dark:text-stone-300">{r.p.name}</span>
                  <span className="shrink-0 font-bold tabular-nums">{brl(r.m.cost.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-100 dark:bg-white/5">
                  <div className="h-2 rounded-full" style={{ width: `${(r.m.cost.total / maxCost) * 100}%`, background: BAR }} />
                </div>
              </li>
            ))}
            {topCosts.length === 0 && <li className="text-stone-500">Sem produtos com preço.</li>}
          </ul>
        </Panel>
        <MenuEngineering rows={priced} />
      </div>
    </div>
  );
}

/** Engenharia de cardápio (Kasavana & Smith): popularidade x margem de contribuição. */
function MenuEngineering({ rows }: { rows: Row[] }) {
  const totalSales = rows.reduce((s, r) => s + (r.p.monthlySales || 0), 0);
  if (rows.length < 2 || totalSales === 0) {
    return (
      <Panel>
        <PanelHeader icon={<Star className="h-5 w-5" />} title="Engenharia de cardápio" />
        <p className="p-5 text-sm text-stone-500">Informe as vendas por mês nas fichas técnicas para classificar o cardápio.</p>
      </Panel>
    );
  }
  // Popular = vendeu pelo menos 70% da participação média; rentável = contribuição acima da média ponderada.
  const popularityCut = (1 / rows.length) * 0.7;
  const avgContribution = rows.reduce((s, r) => s + r.m.contribution * r.p.monthlySales, 0) / totalSales;
  const classes = {
    estrela: { label: 'Estrela', tone: 'green' as const, icon: <Crown className="h-3 w-3" />, tip: 'Manter padrão e destaque no cardápio' },
    burro: { label: 'Burro de carga', tone: 'amber' as const, icon: <TrendingUp className="h-3 w-3" />, tip: 'Vende muito, lucra pouco: rever preço ou porção' },
    enigma: { label: 'Quebra-cabeça', tone: 'blue' as const, icon: <Search className="h-3 w-3" />, tip: 'Lucra bem, vende pouco: divulgar' },
    cao: { label: 'Cão', tone: 'red' as const, icon: <AlertTriangle className="h-3 w-3" />, tip: 'Reformular ou tirar do cardápio' },
  };
  const classified = rows
    .map((r) => {
      const share = (r.p.monthlySales || 0) / totalSales;
      const popular = share >= popularityCut;
      const profitable = r.m.contribution >= avgContribution;
      const key = popular ? (profitable ? 'estrela' : 'burro') : profitable ? 'enigma' : 'cao';
      return { ...r, share, key: key as keyof typeof classes };
    })
    .sort((a, b) => b.share - a.share);

  return (
    <Panel>
      <PanelHeader
        icon={<Star className="h-5 w-5" />}
        title="Engenharia de cardápio"
        subtitle={`Popularidade × margem de contribuição (média ${brl(avgContribution)})`}
      />
      <TableWrap>
        <table className="w-full min-w-[560px]">
          <thead className="bg-stone-50 dark:bg-white/5">
            <tr>
              <th className={th}>Produto</th>
              <th className={`${th} text-right`}>Vendas</th>
              <th className={`${th} text-right`}>Participação</th>
              <th className={`${th} text-right`}>Contribuição</th>
              <th className={th}>Classe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-white/5">
            {classified.map((r) => {
              const c = classes[r.key];
              return (
                <tr key={r.p.id} title={c.tip}>
                  <td className={td}>{r.p.name}</td>
                  <td className={`${td} text-right tabular-nums`}>{num(r.p.monthlySales)}</td>
                  <td className={`${td} text-right tabular-nums`}>{pct(r.share)}</td>
                  <td className={`${td} text-right tabular-nums`}>{brl(r.m.contribution)}</td>
                  <td className={td}>
                    <Badge tone={c.tone}>
                      {c.icon} {c.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </Panel>
  );
}
