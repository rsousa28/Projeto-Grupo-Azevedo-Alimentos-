import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Percent, Plus, Store, Tags, Upload, X } from 'lucide-react';
import {
  channelFeePct,
  correctionFactor,
  ingredientUnitCost,
  monthlyRevenue,
  nextCode,
  productMetrics,
  recipeCost,
} from '../../lib/pricing/engine';
import type { Ingredient, PricingConfig } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { Btn, Field, NumInput, Panel, PanelHeader, brl, inputClass, pct } from './ui';

export default function SettingsTab() {
  const { store, ctx, overhead, run } = usePricing();
  const config = store.data.config;
  const [newCategory, setNewCategory] = useState('');
  const patch = (p: Partial<PricingConfig>) => run(() => store.saveConfig(p));
  const salesRevenue = monthlyRevenue({ ...store.data, config: { ...config, revenueEstimate: 0 } });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <PanelHeader icon={<Percent className="h-5 w-5" />} title="Impostos e taxas" subtitle="Percentuais cobrados sobre o preço de venda." />
        <div className="grid grid-cols-2 gap-4 p-5">
          <Field label="Imposto (Simples Nacional)" hint="Alíquota efetiva da sua faixa do Simples">
            <NumInput mode="pct" value={config.taxPct} onChange={(taxPct) => patch({ taxPct })} />
          </Field>
          <Field label="Taxa média do cartão (salão)" hint="Média ponderada entre débito, crédito e PIX">
            <NumInput mode="pct" value={config.cardFeePct} onChange={(cardFeePct) => patch({ cardFeePct })} />
          </Field>
          <Field label="Comissão do app de delivery" hint="Ex.: iFood plano básico 12%, plano entrega 23%">
            <NumInput mode="pct" value={config.deliveryFeePct} onChange={(deliveryFeePct) => patch({ deliveryFeePct })} />
          </Field>
          <Field label="Pagamento online no app">
            <NumInput mode="pct" value={config.deliveryCardFeePct} onChange={(deliveryCardFeePct) => patch({ deliveryCardFeePct })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-stone-100 px-5 py-3 text-sm dark:border-white/5">
          <span>Total no salão: <b>{pct(channelFeePct(config, 'salao'))}</b></span>
          <span>Total no delivery: <b>{pct(channelFeePct(config, 'delivery'))}</b></span>
        </div>
      </Panel>

      <Panel>
        <PanelHeader icon={<Store className="h-5 w-5" />} title="Margem e metas" subtitle="Base do preço sugerido e dos alertas." />
        <div className="grid grid-cols-2 gap-4 p-5">
          <Field label="Margem de lucro desejada" hint="Lucro líquido que deve sobrar em cada venda">
            <NumInput mode="pct" value={config.targetMarginPct} onChange={(targetMarginPct) => patch({ targetMarginPct })} />
          </Field>
          <Field label="Meta de CMV (máximo)" hint="Ingredientes + embalagens sobre o preço. Food service: 28% a 35%">
            <NumInput mode="pct" value={config.cmvTargetPct} onChange={(cmvTargetPct) => patch({ cmvTargetPct })} />
          </Field>
          <Field
            label="Faturamento mensal estimado"
            hint="Usado para dividir a estrutura do mês no preço. Deixe 0 para usar as vendas cadastradas nos produtos."
            className="col-span-2"
          >
            <NumInput mode="money" value={config.revenueEstimate} onChange={(revenueEstimate) => patch({ revenueEstimate })} />
          </Field>
        </div>
        <p className="border-t border-stone-100 px-5 py-3 text-sm dark:border-white/5">
          Pelas vendas cadastradas: <b>{brl(salesRevenue)}</b>/mês · estrutura do mês = <b>{pct(overhead)}</b> do faturamento.
        </p>
      </Panel>

      <Panel>
        <PanelHeader icon={<Tags className="h-5 w-5" />} title="Categorias do cardápio" />
        <div className="flex flex-wrap gap-2 p-5">
          {config.categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-sm font-semibold dark:bg-white/5">
              {c}
              <button type="button" onClick={() => patch({ categories: config.categories.filter((x) => x !== c) })} aria-label={`Remover ${c}`}>
                <X className="h-3.5 w-3.5 text-stone-400 hover:text-rose-600" />
              </button>
            </span>
          ))}
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const t = newCategory.trim();
              if (t && !config.categories.includes(t)) patch({ categories: [...config.categories, t] });
              setNewCategory('');
            }}
          >
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nova categoria" className={`${inputClass} w-40 py-1`} />
            <Btn size="sm" variant="outline" type="submit">
              <Plus className="h-4 w-4" />
            </Btn>
          </form>
        </div>
      </Panel>

      <Panel>
        <PanelHeader icon={<Download className="h-5 w-5" />} title="Planilhas e importação" />
        <div className="space-y-3 p-5 text-sm">
          <Btn variant="outline" onClick={() => exportWorkbook()}>
            <Download className="h-4 w-4 text-emerald-600" /> Exportar tudo para Excel
          </Btn>
          <div>
            <Btn variant="outline" onClick={importLegacy}>
              <Upload className="h-4 w-4 text-orange-500" /> Importar insumos do módulo antigo
            </Btn>
            <p className="mt-1 text-xs text-stone-500">Traz os insumos salvos neste aparelho pelo módulo antigo. Nomes repetidos são ignorados.</p>
          </div>
        </div>
      </Panel>
    </div>
  );

  function exportWorkbook() {
    const wb = XLSX.utils.book_new();
    const products = store.data.products.map((p) => {
      const s = productMetrics(ctx, p, 'salao', overhead);
      const d = productMetrics(ctx, p, 'delivery', overhead);
      return {
        Código: p.code,
        Tipo: p.kind === 'drink' ? 'Bebida' : 'Produto',
        Nome: p.name,
        Categoria: p.category,
        'Custo ingredientes': round(s.cost.ingredients),
        'Custo embalagens': round(s.cost.packaging),
        'Gás e energia': round(s.cost.energy),
        'Mão de obra': round(s.cost.labor),
        'Taxas/extras': round(s.cost.extras),
        'Custo total': round(s.cost.total),
        'Preço salão': p.salePrice,
        'Preço sugerido salão': s.suggested ? round(s.suggested) : '',
        'Lucro salão': round(s.profit),
        'Margem salão': round(s.profitPct * 100),
        'CMV %': round(s.cmvPct * 100),
        'Preço delivery': d.price,
        'Lucro delivery': round(d.profit),
        'Vendas/mês': p.monthlySales,
      };
    });
    const ingredients = store.data.ingredients.map((i) => ({
      Código: i.code,
      Nome: i.name,
      'Qtd. bruta': i.purchaseQty,
      'Qtd. líquida': i.netQty,
      Unidade: i.unit,
      Preço: i.price,
      Fator: round(correctionFactor(i), 3),
      'Custo por unidade': round(ingredientUnitCost(i), 5),
      Fornecedor: i.supplier || '',
    }));
    const recipes = store.data.recipes.map((r) => {
      const c = recipeCost(ctx, r.id);
      return { Código: r.code, Nome: r.name, Rendimento: r.yieldQty, Unidade: r.unit, 'Custo total': round(c.total), 'Custo por unidade': round(c.unitCost, 5) };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products), 'Produtos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingredients), 'Ingredientes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recipes), 'Receitas base');
    XLSX.writeFile(wb, `precificacao-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function importLegacy() {
    let legacy: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('grupo_azevedo_ingredients_v1_')) legacy = legacy.concat(JSON.parse(localStorage.getItem(k) || '[]'));
      }
    } catch {
      legacy = [];
    }
    const existing = new Set(store.data.ingredients.map((i) => i.name.trim().toLowerCase()));
    const codes = store.data.ingredients.map((i) => i.code);
    const toAdd: Ingredient[] = [];
    for (const old of legacy) {
      const name = String(old?.nome || '').trim();
      if (!name || existing.has(name.toLowerCase())) continue;
      const scale = old.unidadeUso === 'kg' || old.unidadeUso === 'l' ? 1000 : 1;
      const purchaseQty = Number(old.quantidadeEmbalagemCompra || 0) * scale;
      const factor = Number(old.fatorCorrecao) > 0 ? Number(old.fatorCorrecao) : 1;
      const code = nextCode('', codes, 4);
      codes.push(code);
      existing.add(name.toLowerCase());
      toAdd.push({
        id: `ing-legado-${String(old.id || code).replace(/[^a-zA-Z0-9_-]/g, '')}`,
        code,
        name,
        unit: old.unidadeUso === 'ml' || old.unidadeUso === 'l' ? 'ml' : old.unidadeUso === 'un' ? 'un' : 'g',
        purchaseQty,
        netQty: Number((purchaseQty / factor).toFixed(3)),
        price: Number(old.precoEmbalagemCompraCentavos || 0) / 100,
        supplier: old.fornecedorPadrao || '',
        updatedAt: '',
      });
    }
    if (toAdd.length === 0) {
      window.alert('Nenhum insumo novo encontrado no módulo antigo deste aparelho.');
      return;
    }
    if (!window.confirm(`Importar ${toAdd.length} insumos do módulo antigo?`)) return;
    await run(() => store.importAll({ ...store.data, ingredients: toAdd, packaging: [], recipes: [], products: [], combos: [] }), `${toAdd.length} insumos importados.`);
  }
}

const round = (v: number, d = 2) => Number(v.toFixed(d));
