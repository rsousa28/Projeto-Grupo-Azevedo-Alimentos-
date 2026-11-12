// Notas fiscais de entrada: importa o XML da NF-e, confere os itens e, com autorização,
// atualiza o preço dos ingredientes e embalagens (as fichas recalculam sozinhas).
import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, CloudDownload, FileText, Inbox, Loader2, Upload, XCircle } from 'lucide-react';
import { InvoiceParseError, formatCnpj, parseNFeXml, prepareInvoiceItems } from '../../lib/pricing/nfe';
import type { Invoice } from '../../lib/pricing/types';
import { usePricing } from './PricingContext';
import InvoiceReview from './InvoiceReview';
import { Badge, EmptyState, Panel, Segmented, brl, cx } from './ui';
import { useToast } from '../../contexts/ToastContext';

type Filter = 'pending' | 'applied' | 'dismissed';

export default function InvoicesTab() {
  const { store, run } = usePricing();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(
    () => ({
      pending: store.invoices.filter((i) => i.status === 'pending').length,
      applied: store.invoices.filter((i) => i.status === 'applied').length,
      dismissed: store.invoices.filter((i) => i.status === 'dismissed').length,
    }),
    [store.invoices],
  );
  const rows = store.invoices.filter((i) => i.status === filter);
  const opened = store.invoices.find((i) => i.id === openId);

  const importFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /\.xml$/i.test(f.name) || f.type.includes('xml'));
    if (list.length === 0) {
      toast.warning('Escolha o arquivo .xml da nota. O PDF (DANFE) não traz os dados que o sistema precisa.', 'Arquivo não suportado');
      return;
    }
    setBusy(true);
    const imported: Invoice[] = [];
    const skipped: string[] = [];
    for (const file of list) {
      try {
        const parsed = parseNFeXml(await file.text());
        if (store.invoices.some((i) => i.id === parsed.id) || imported.some((i) => i.id === parsed.id)) {
          skipped.push(`NF ${parsed.number} (já importada)`);
          continue;
        }
        const now = new Date().toISOString();
        imported.push({
          ...parsed,
          items: prepareInvoiceItems(parsed, store.data, store.itemMaps),
          status: 'pending',
          source: 'xml',
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        skipped.push(`${file.name}: ${err instanceof InvoiceParseError ? err.message : 'não foi possível ler o arquivo'}`);
      }
    }
    if (imported.length) {
      const ok = await run(() => store.saveMany(imported.map((item) => ({ kind: 'invoices' as const, item }))));
      if (ok) {
        setFilter('pending');
        if (imported.length === 1) setOpenId(imported[0].id);
        toast.success(
          imported.length === 1
            ? `NF ${imported[0].number} de ${imported[0].supplierName} pronta para conferir.`
            : `${imported.length} notas importadas para conferência.`,
          'Nota importada',
        );
      }
    }
    if (skipped.length) toast.warning(skipped.join('\n'), skipped.length === 1 ? 'Arquivo não importado' : 'Alguns arquivos não foram importados', 8000);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (opened) return <InvoiceReview invoice={opened} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <Panel>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            importFiles(e.dataTransfer.files);
          }}
          className={cx(
            'm-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition sm:flex-row sm:text-left',
            dragging ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/10' : 'border-stone-200 dark:border-white/10',
          )}
          data-testid="nfe-dropzone"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 dark:text-stone-100">Importar XML da nota fiscal</p>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Arraste aqui ou escolha o arquivo .xml que o fornecedor envia por e-mail. Você confere os itens e só depois autoriza a
              atualização dos preços.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
          >
            <FileText className="h-4 w-4" /> Escolher XML
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && importFiles(e.target.files)}
            data-testid="nfe-input"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-white/5">
          <CloudDownload className="h-4 w-4 shrink-0 text-stone-400" />
          Em breve: as notas emitidas para o CNPJ da loja chegam sozinhas da SEFAZ (precisa do certificado digital A1).
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: `Para conferir (${counts.pending})` },
            { value: 'applied', label: `Autorizadas (${counts.applied})` },
            { value: 'dismissed', label: `Descartadas (${counts.dismissed})` },
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title={filter === 'pending' ? 'Nenhuma nota para conferir' : filter === 'applied' ? 'Nenhuma nota autorizada ainda' : 'Nenhuma nota descartada'}
            text={filter === 'pending' ? 'Importe o XML de uma compra para atualizar os preços dos ingredientes.' : undefined}
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {rows.map((inv) => {
              const linked = inv.items.filter((i) => i.target && i.target !== 'ignore').length;
              const missing = inv.items.filter((i) => !i.target).length;
              return (
                <li key={inv.id}>
                  <button type="button" onClick={() => setOpenId(inv.id)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-stone-50 sm:px-5 dark:hover:bg-white/[0.03]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-300">
                      <FileText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-900 dark:text-stone-100">{inv.supplierName}</span>
                      <span className="block truncate text-xs text-stone-500">
                        NF {inv.number}
                        {inv.series ? `-${inv.series}` : ''} · {new Date(inv.issuedAt).toLocaleDateString('pt-BR')} · {formatCnpj(inv.supplierCnpj)}
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block font-semibold tabular-nums text-stone-900 dark:text-stone-100">{brl(inv.total)}</span>
                      <span className="block text-xs text-stone-500">{inv.items.length} itens</span>
                    </span>
                    <span className="shrink-0">
                      {inv.status === 'applied' ? (
                        <Badge tone="green">
                          <CheckCircle2 className="h-3 w-3" /> {inv.appliedCount ?? linked} preços
                        </Badge>
                      ) : inv.status === 'dismissed' ? (
                        <Badge tone="slate">
                          <XCircle className="h-3 w-3" /> Descartada
                        </Badge>
                      ) : missing > 0 ? (
                        <Badge tone="amber">{missing} sem vínculo</Badge>
                      ) : (
                        <Badge tone="blue">Pronta</Badge>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
