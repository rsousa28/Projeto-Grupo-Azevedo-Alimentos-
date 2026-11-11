import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Download, Table2 } from 'lucide-react';
import { NUTRIENT_KEYS, NUTRIENT_LABELS, productNutrition, roundNutrient } from '../../lib/pricing/engine';
import type { Nutrients, Product } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { downloadSvgAsPng, nutritionLabelSvg } from './labelImage';
import { Btn, Field, NumInput, Panel, PanelHeader, TableWrap, TextInput, num, td, th } from './ui';

const INDENT: Partial<Record<keyof Nutrients, number>> = { sugarTotal: 1, sugarAdded: 2, fatSat: 1, fatTrans: 1 };

export default function NutritionPanel({ product, update }: { product: Product; update: (p: Partial<Product>) => Promise<boolean> }) {
  const { ctx } = usePricing();
  const facts = useMemo(() => productNutrition(ctx, product), [ctx, product]);
  const [showMemory, setShowMemory] = useState(false);
  const unit = product.liquid ? 'ml' : 'g';
  const portion = Math.round(facts.portionGrams);
  const highIn = [facts.highIn.sugarAdded && 'AÇÚCAR ADICIONADO', facts.highIn.fatSat && 'GORDURA SATURADA', facts.highIn.sodium && 'SÓDIO'].filter(Boolean) as string[];

  const download = async () => {
    const { svg, width, height } = nutritionLabelSvg(facts, unit, product.portionLabel || '1 porção', highIn);
    const slug = product.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-');
    await downloadSvgAsPng(svg, width, height, `tabela-nutricional-${product.code}-${slug}.png`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <Panel>
        <PanelHeader
          icon={<Table2 className="h-5 w-5" />}
          title="Tabela nutricional"
          subtitle="Calculada pelos ingredientes da ficha, no padrão da RDC 429/2020 e IN 75/2020."
        />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Porção (${unit})`} hint="Vazio usa o peso total do produto">
              <NumInput value={product.portionGrams || NaN} onChange={(portionGrams) => update({ portionGrams: portionGrams || undefined })} placeholder={String(Math.round(facts.totalGrams))} />
            </Field>
            <Field label="Medida caseira">
              <TextInput value={product.portionLabel || ''} onChange={(portionLabel) => update({ portionLabel })} placeholder="1 prato" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <input type="checkbox" checked={!!product.liquid} onChange={(e) => update({ liquid: e.target.checked })} className="accent-orange-500" />
            Produto líquido (bebida): usa ml e os limites de líquidos
          </label>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Peso total da receita: <b className="tabular-nums">{num(facts.totalGrams, 1)} {unit}</b>
          </p>
          {facts.missing.length > 0 && (
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <b>Faltam dados do rótulo:</b> {facts.missing.join(', ')}. Preencha em Ingredientes (ícone da maçã) para a tabela ficar correta.
              </div>
            </div>
          )}
          {highIn.length > 0 && (
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Pela RDC 429, este produto precisa da <b>lupa frontal</b> (ao lado da tabela). Ela não se aplica a pratos preparados na hora e vendidos no balcão.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="success" onClick={download} disabled={facts.totalGrams <= 0}>
              <Download className="h-4 w-4" /> Baixar tabela (PNG)
            </Btn>
            <Btn variant="outline" onClick={() => setShowMemory((v) => !v)}>
              <Calculator className="h-4 w-4" /> Memória de cálculo
            </Btn>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="mb-3 flex items-center justify-between text-sm font-bold text-stone-700 dark:text-stone-200">
          Prévia do rótulo
          <span className="font-normal text-stone-400">
            {portion} {unit} · {product.portionLabel || '1 porção'}
          </span>
        </p>
        <div className="overflow-x-auto rounded-xl bg-stone-50 p-3 dark:bg-white/5">
          <div className="inline-flex items-start gap-3 bg-white p-3 text-black">
            <div className="w-[360px] border-2 border-black px-2 pb-1.5 pt-2 font-sans text-[12px] leading-tight">
              <p className="text-center text-[15px] font-black tracking-wide">INFORMAÇÃO NUTRICIONAL</p>
              <p className="mb-1 mt-0.5 text-center">
                Porção: {portion} {unit} ({product.portionLabel || '1 porção'})
              </p>
              <div className="h-[5px] bg-black" />
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="w-[46%] py-0.5" />
                    <th className="border-l border-black py-0.5 text-center font-semibold">100 {unit}</th>
                    <th className="border-l border-black py-0.5 text-center font-semibold">{portion} {unit}</th>
                    <th className="border-l border-black py-0.5 text-center font-semibold">%VD*</th>
                  </tr>
                </thead>
                <tbody>
                  {NUTRIENT_KEYS.map((k) => (
                    <tr key={k} className="border-b border-black last:border-b-0">
                      <td className="py-[3px]" style={{ paddingLeft: (INDENT[k] || 0) * 10 }}>
                        {NUTRIENT_LABELS[k]}
                      </td>
                      <td className="border-l border-black text-center tabular-nums">{roundNutrient(k, facts.per100[k])}</td>
                      <td className="border-l border-black text-center tabular-nums">{roundNutrient(k, facts.perPortion[k])}</td>
                      <td className="border-l border-black text-center tabular-nums">
                        {facts.vdPct[k] !== undefined ? Math.round((facts.vdPct[k] || 0) * 100) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 border-t-2 border-black pt-1 text-[10px]">*Percentual de valores diários fornecidos pela porção.</div>
            </div>
            {highIn.length > 0 && (
              <div className="w-[120px] border-2 border-black bg-white p-1.5 text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-[11px] font-black">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="black" strokeWidth="3">
                    <circle cx="10" cy="10" r="6.5" />
                    <path d="m15 15 6 6" />
                  </svg>
                  ALTO EM
                </div>
                {highIn.map((h) => (
                  <div key={h} className="mb-1 bg-black px-1 py-1 text-[10px] font-black leading-tight text-white last:mb-0">
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {showMemory && (
        <Panel className="lg:col-span-2">
          <PanelHeader icon={<Calculator className="h-5 w-5" />} title="Memória de cálculo" subtitle="Quanto cada ingrediente contribui na receita inteira." />
          <TableWrap>
            <table className="w-full min-w-[900px]">
              <thead className="bg-stone-50 dark:bg-white/5">
                <tr>
                  <th className={th}>Item</th>
                  <th className={`${th} text-right`}>{unit}</th>
                  {NUTRIENT_KEYS.map((k) => (
                    <th key={k} className={`${th} text-right`}>
                      {NUTRIENT_LABELS[k].replace(/ \(.*\)/, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                {facts.lines.map((l, i) => (
                  <tr key={i} className={l.missing ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}>
                    <td className={td}>{l.name}{l.missing && ' ⚠'}</td>
                    <td className={`${td} text-right tabular-nums`}>{num(l.grams, 1)}</td>
                    {NUTRIENT_KEYS.map((k) => (
                      <td key={k} className={`${td} text-right tabular-nums`}>
                        {num(l.nutrients[k], 2)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className={td}>Por 100 {unit}</td>
                  <td className={`${td} text-right`}>100</td>
                  {NUTRIENT_KEYS.map((k) => (
                    <td key={k} className={`${td} text-right tabular-nums`}>
                      {num(facts.per100[k], 2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </TableWrap>
          <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
            Receitas base entram pela proporção usada sobre o rendimento (a água que evapora no preparo já sai do peso). %VD com base em
            2.000 kcal (IN 75/2020). Para rótulo de produto embalado, confirme os valores com um nutricionista responsável.
          </p>
        </Panel>
      )}
    </div>
  );
}
