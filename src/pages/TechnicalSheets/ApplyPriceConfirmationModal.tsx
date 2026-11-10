import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Bike, 
  Store, 
  Copy, 
  Download, 
  FileText, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { formatarMoedaBRL, formatarPercentualBRL } from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';

export interface PriceUpdateItem {
  sheetId: string;
  nome: string;
  canal: 'BALCAO' | 'IFOOD';
  precoAtual: number;
  novoPreco: number;
  cmvAtual: number;
  novoCmv: number;
}

interface ApplyPriceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  changedItems: PriceUpdateItem[];
  lucroDeltaMensal: number;
}

export const ApplyPriceConfirmationModal: React.FC<ApplyPriceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  changedItems,
  lucroDeltaMensal
}) => {
  const { success } = useToast();
  const [motivo, setMotivo] = useState('Repasse inflacionário e ajuste de margem operacional');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const ifoodItems = changedItems.filter(i => i.canal === 'IFOOD');
  const balcaoItems = changedItems.filter(i => i.canal === 'BALCAO');

  const handleCopyIfoodList = () => {
    if (ifoodItems.length === 0) return;
    const text = ifoodItems.map(item => 
      `• ${item.nome}: de ${formatarMoedaBRL(item.precoAtual)} para ${formatarMoedaBRL(item.novoPreco)}`
    ).join('\n');
    
    const clipboardText = `TABELA DE REAJUSTE DE PREÇOS - PORTAL IFOOD (GRUPO AZEVEDO)\nData: ${new Date().toLocaleDateString('pt-BR')}\nMotivo: ${motivo}\n\n${text}\n\n*Atualizar manualmente no Portal do Parceiro iFood.*`;
    
    navigator.clipboard.writeText(clipboardText);
    setCopied(true);
    success('Lista de preços formatada copiada para a área de transferência!', 'Copiado para Área de Transferência');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportIfoodCsv = () => {
    if (ifoodItems.length === 0) return;
    const headers = ['Prato iFood', 'Preco Anterior (R$)', 'Novo Preco (R$)', 'Variacao (R$)'];
    const rows = ifoodItems.map(i => [
      `"${i.nome}"`,
      i.precoAtual.toFixed(2),
      i.novoPreco.toFixed(2),
      (i.novoPreco - i.precoAtual).toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Reajuste_Precos_Portal_iFood_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Confirmar Aplicação de Novos Preços ao Cardápio
              </h3>
              <p className="text-xs text-gray-500">
                Holding Grupo Azevedo • {changedItems.length} {changedItems.length === 1 ? 'prato alterado' : 'pratos alterados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
          
          {/* Card Resumo do Impacto */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Impacto Mensal Estimado
              </span>
              <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                {lucroDeltaMensal >= 0 ? '+' : ''}{formatarMoedaBRL(lucroDeltaMensal)} / mês
              </p>
              <span className="text-[11px] text-emerald-700/80">
                {balcaoItems.length} no Balcão • {ifoodItems.length} no iFood
              </span>
            </div>
            <div className="px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Alterações</span>
              <span className="text-lg font-black text-gray-900 font-mono">{changedItems.length}</span>
            </div>
          </div>

          {/* Campo de Registro no Histórico de Versões */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Motivo do Reajuste (Histórico de Versões / Auditoria):
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Repasse inflacionário de queijo e filé - Fevereiro/2026"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Este motivo ficará registrado permanentemente no histórico de custos e versões de cada ficha técnica.
            </span>
          </div>

          {/* Bloco iFood: AVISO CRÍTICO E LISTA EXPORTÁVEL */}
          {ifoodItems.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-xs">
                    Preços para Atualizar no Portal do iFood
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    O sistema atualiza a base interna de custos e relatórios do Grupo Azevedo. <strong>Os preços do iFood NÃO são alterados automaticamente via API</strong>. Utilize a lista abaixo para atualizar o cardápio no Portal do Parceiro iFood.
                  </p>
                </div>
              </div>

              {/* Tabela de Preços iFood */}
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Prato (iFood)</th>
                      <th className="py-2 px-2 text-right">Preço Atual</th>
                      <th className="py-2 px-2 text-right font-black text-amber-950">Novo Preço</th>
                      <th className="py-2 px-3 text-right">Variação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/70">
                    {ifoodItems.map(item => (
                      <tr key={item.sheetId}>
                        <td className="py-2 px-3 font-semibold text-gray-800">{item.nome}</td>
                        <td className="py-2 px-2 text-right text-gray-500 font-mono">{formatarMoedaBRL(item.precoAtual)}</td>
                        <td className="py-2 px-2 text-right font-black text-amber-900 font-mono bg-amber-50/50">{formatarMoedaBRL(item.novoPreco)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 font-mono">
                          +{formatarMoedaBRL(item.novoPreco - item.precoAtual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botões de Ação p/ iFood */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyIfoodList}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Lista Copiada!' : 'Copiar Lista p/ Digitar no iFood'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportIfoodCsv}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar CSV iFood</span>
                </button>
              </div>
            </div>
          )}

          {/* Pratos do Balcão */}
          {balcaoItems.length > 0 && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 flex items-center gap-1.5 border-b border-gray-200">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pratos de Balcão a serem Reajustados ({balcaoItems.length})</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/50 text-gray-400 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Prato</th>
                    <th className="py-2 px-2 text-right">Atual</th>
                    <th className="py-2 px-2 text-right">Novo</th>
                    <th className="py-2 px-3 text-right">CMV Novo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {balcaoItems.map(item => (
                    <tr key={item.sheetId}>
                      <td className="py-2 px-3 font-semibold text-gray-800">{item.nome}</td>
                      <td className="py-2 px-2 text-right text-gray-500 font-mono">{formatarMoedaBRL(item.precoAtual)}</td>
                      <td className="py-2 px-2 text-right font-black text-emerald-700 font-mono">{formatarMoedaBRL(item.novoPreco)}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-700 font-mono">{formatarPercentualBRL(item.novoCmv, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar e Gravar no Cardápio</span>
          </button>
        </div>

      </div>
    </div>
  );
};
