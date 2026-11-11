import React, { useMemo, useState } from 'react';
import { Box, Plus, Trash2 } from 'lucide-react';
import { newId, nextCode, packagingUnitCost, packagingUsages } from '../../lib/pricing/engine';
import type { Packaging } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import { Btn, NumInput, Panel, PanelHeader, SearchBox, StatCard, TableWrap, TextInput, brlUnit, td, th } from './ui';

export default function PackagingTab() {
  const { store, run } = usePricing();
  const { packaging } = store.data;
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packaging.filter((p) => !q || p.name.toLowerCase().includes(q) || p.code.includes(q));
  }, [packaging, query]);

  const update = (p: Packaging, patch: Partial<Packaging>) => run(() => store.save('packaging', { ...p, ...patch }));

  const add = () =>
    run(() =>
      store.save('packaging', {
        id: newId('pack'),
        code: nextCode('', packaging.map((p) => p.code), 4),
        name: 'Nova embalagem',
        packQty: 100,
        packPrice: 0,
        updatedAt: '',
      }),
    );

  const remove = (p: Packaging) => {
    const uses = packagingUsages(store.data, p.id);
    if (uses.length) {
      window.alert(`"${p.name}" está em uso e não pode ser excluída:\n\n• ${uses.join('\n• ')}`);
      return;
    }
    if (window.confirm(`Excluir a embalagem "${p.name}"?`)) run(() => store.remove('packaging', p.id));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={<Box className="h-5 w-5" />} label="Embalagens cadastradas" value={packaging.length} />
        <StatCard
          icon={<Box className="h-5 w-5" />}
          label="Sem preço"
          value={packaging.filter((p) => !(p.packPrice > 0)).length}
          tone={packaging.some((p) => !(p.packPrice > 0)) ? 'red' : 'green'}
        />
      </div>
      <Panel>
        <PanelHeader
          icon={<Box className="h-5 w-5" />}
          title="Embalagens, rótulos e etiquetas"
          subtitle="Pare de dar a embalagem de graça: cadastre o pacote e o sistema calcula o custo de cada unidade."
          actions={
            <Btn variant="success" onClick={add}>
              <Plus className="h-4 w-4" /> Adicionar embalagem
            </Btn>
          }
        />
        <div className="border-b border-stone-100 p-4 dark:border-white/5">
          <SearchBox value={query} onChange={setQuery} placeholder="Pesquisar embalagem…" />
        </div>
        <TableWrap>
          <table className="w-full min-w-[760px]">
            <thead className="bg-stone-50 dark:bg-white/5">
              <tr>
                <th className={th}>Cód</th>
                <th className={th}>Embalagem</th>
                <th className={th}>Qtd. no pacote</th>
                <th className={th}>Preço do pacote</th>
                <th className={`${th} text-right`}>Custo por unidade</th>
                <th className={th}>Fornecedor</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-white/5">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={`${td} w-16 font-mono text-xs text-stone-500`}>{p.code}</td>
                  <td className={td}><TextInput value={p.name} onChange={(name) => update(p, { name })} /></td>
                  <td className={`${td} w-28`}><NumInput value={p.packQty} onChange={(packQty) => update(p, { packQty })} /></td>
                  <td className={`${td} w-36`}><NumInput mode="money" value={p.packPrice} onChange={(packPrice) => update(p, { packPrice })} /></td>
                  <td className={`${td} w-32 text-right font-bold tabular-nums text-orange-600`}>{brlUnit(packagingUnitCost(p))}</td>
                  <td className={`${td} w-44`}><TextInput value={p.supplier || ''} placeholder="—" onChange={(supplier) => update(p, { supplier })} /></td>
                  <td className={`${td} w-10`}>
                    <button type="button" onClick={() => remove(p)} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-500">Nenhuma embalagem encontrada.</p>}
      </Panel>
    </div>
  );
}
