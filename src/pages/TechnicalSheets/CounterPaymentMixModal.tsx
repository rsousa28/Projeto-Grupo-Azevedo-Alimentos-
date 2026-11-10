import React, { useState } from 'react';
import { 
  X, 
  Store, 
  Percent, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { 
  MeioPagamentoMix, 
  MIX_PAGAMENTOS_BALCAO_PADRAO, 
  calcularTaxaMediaPonderadaBalcao, 
  formatarPercentualBRL 
} from '../../utils/foodServiceMath';

interface CounterPaymentMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  mix: MeioPagamentoMix[];
  onSave: (newMix: MeioPagamentoMix[]) => void;
}

export const CounterPaymentMixModal: React.FC<CounterPaymentMixModalProps> = ({
  isOpen,
  onClose,
  mix: initialMix,
  onSave
}) => {
  const [currentMix, setCurrentMix] = useState<MeioPagamentoMix[]>(() => [...initialMix]);

  if (!isOpen) return null;

  const totalParticipacao = currentMix.reduce((sum, item) => sum + item.participacaoPercent, 0);
  const taxaPonderada = calcularTaxaMediaPonderadaBalcao(currentMix);

  const handleUpdateItem = (id: string, part100: number, fee100: number) => {
    setCurrentMix(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          participacaoPercent: Number((part100 / 100).toFixed(4)),
          taxaOperadoraPercent: Number((fee100 / 100).toFixed(4))
        };
      }
      return item;
    }));
  };

  const handleReset = () => {
    setCurrentMix([...MIX_PAGAMENTOS_BALCAO_PADRAO]);
  };

  const handleSave = () => {
    onSave(currentMix);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                Mix de Meios de Pagamento do Balcão
              </h3>
              <p className="text-xs text-gray-500">
                Padrão Grupo Azevedo • Cálculo da Taxa Média Ponderada
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
          
          {/* Card da Taxa Média Ponderada Calculada */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Taxa Média Ponderada Calculada
              </span>
              <p className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                {formatarPercentualBRL(taxaPonderada, 2)}
              </p>
              <span className="text-[11px] text-emerald-700/80">
                Aplicada automaticamente sobre os pratos vendidos no balcão
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Soma dos Meios
              </span>
              <span className={`text-base font-black font-mono ${
                Math.abs(totalParticipacao - 1.0) < 0.01 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {formatarPercentualBRL(totalParticipacao, 0)}
              </span>
              {Math.abs(totalParticipacao - 1.0) >= 0.01 && (
                <span className="text-[10px] text-amber-700 block font-semibold">
                  Ajuste para somar 100%
                </span>
              )}
            </div>
          </div>

          {/* Tabela Interativa de Meios */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Meio de Pagamento</th>
                  <th className="py-2.5 px-3 text-right">Mix no Balcão (%)</th>
                  <th className="py-2.5 px-3 text-right">Taxa da Operadora (%)</th>
                  <th className="py-2.5 px-3 text-right">Taxa Efetiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentMix.map(item => {
                  const part100 = Number((item.participacaoPercent * 100).toFixed(1));
                  const fee100 = Number((item.taxaOperadoraPercent * 100).toFixed(2));
                  const efetiva = item.participacaoPercent * item.taxaOperadoraPercent;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-gray-800 flex items-center gap-2">
                        {item.id === 'pix' && <QrCode className="w-4 h-4 text-emerald-600" />}
                        {item.id === 'dinheiro' && <Banknote className="w-4 h-4 text-green-600" />}
                        {item.id === 'debito' && <CreditCard className="w-4 h-4 text-blue-600" />}
                        {item.id === 'credito' && <CreditCard className="w-4 h-4 text-indigo-600" />}
                        {item.id === 'voucher' && <CreditCard className="w-4 h-4 text-amber-600" />}
                        <span>{item.nome}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={part100}
                            onChange={(e) => handleUpdateItem(item.id, Number(e.target.value) || 0, fee100)}
                            className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-lg text-right font-mono font-bold text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-gray-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.05"
                            value={fee100}
                            onChange={(e) => handleUpdateItem(item.id, part100, Number(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-lg text-right font-mono font-bold text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-gray-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-500 font-medium">
                        {formatarPercentualBRL(efetiva, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            * Cada percentual representa a proporção média das vendas faturadas no balcão que passam por cada modalidade de recebimento.
          </p>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar Mix de Taxas</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
