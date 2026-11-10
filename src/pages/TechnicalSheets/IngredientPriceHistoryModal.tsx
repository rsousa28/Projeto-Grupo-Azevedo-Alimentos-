import React, { useState } from 'react';
import { 
  X, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  User, 
  DollarSign, 
  Building2, 
  Award, 
  Layers 
} from 'lucide-react';
import { IngredientMaster } from '../../types/foodService';
import { IngredientService } from '../../services/IngredientService';
import { 
  formatarMoedaBRL, 
  formatarDataBRL, 
  formatarCustoUnidadeUso 
} from '../../utils/foodServiceMath';

interface IngredientPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: IngredientMaster | null;
}

export const IngredientPriceHistoryModal: React.FC<IngredientPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  ingredient
}) => {
  const [activeTab, setActiveTab] = useState<'HISTORICO' | 'FORNECEDORES'>('HISTORICO');

  if (!isOpen || !ingredient) return null;

  const history = IngredientService.getPriceHistory(ingredient.id);

  // Agrupamento por Fornecedor (Comparativo de Fornecedores)
  const supplierComparison = React.useMemo(() => {
    const map = new Map<string, {
      fornecedor: string;
      ultimoPrecoCentavos: number;
      quantidadeEmbalagem: number;
      ultimaData: string;
      totalCompras: number;
    }>();

    // Adiciona o fornecedor atual praticado
    if (ingredient.fornecedorPadrao) {
      map.set(ingredient.fornecedorPadrao, {
        fornecedor: ingredient.fornecedorPadrao,
        ultimoPrecoCentavos: ingredient.precoEmbalagemCompraCentavos,
        quantidadeEmbalagem: ingredient.quantidadeEmbalagemCompra,
        ultimaData: ingredient.dataUltimaCompra || new Date().toISOString(),
        totalCompras: 1
      });
    }

    // Processa o histórico
    history.forEach(entry => {
      const f = entry.fornecedor || 'Fornecedor Diverso';
      const existing = map.get(f);
      if (!existing) {
        map.set(f, {
          fornecedor: f,
          ultimoPrecoCentavos: entry.precoEmbalagemCompraCentavos,
          quantidadeEmbalagem: entry.quantidadeEmbalagemCompra,
          ultimaData: entry.data,
          totalCompras: 1
        });
      } else {
        existing.totalCompras += 1;
        // Se a data for mais recente, atualiza o último preço
        if (new Date(entry.data).getTime() > new Date(existing.ultimaData).getTime()) {
          existing.ultimoPrecoCentavos = entry.precoEmbalagemCompraCentavos;
          existing.ultimaData = entry.data;
        }
      }
    });

    // Converte para array e identifica o menor preço unitário
    const list = Array.from(map.values()).map(item => {
      const custoUnitario = (item.ultimoPrecoCentavos / 100) / item.quantidadeEmbalagem;
      return {
        ...item,
        custoUnitario
      };
    });

    const menorCusto = list.length > 0 ? Math.min(...list.map(i => i.custoUnitario)) : 0;

    return list.map(item => ({
      ...item,
      isMelhorPreco: Math.abs(item.custoUnitario - menorCusto) < 0.0001
    })).sort((a, b) => a.custoUnitario - b.custoUnitario);
  }, [ingredient, history]);

  const custoUsoAtual = formatarCustoUnidadeUso(
    (ingredient.precoEmbalagemCompraCentavos / 100) / ingredient.quantidadeEmbalagemCompra,
    ingredient.unidadeUso
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                Auditoria de Preços & Fornecedores
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {ingredient.nome} • {ingredient.unidadeCompraNome} ({ingredient.quantidadeEmbalagemCompra} {ingredient.unidadeUso})
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

        {/* Abas Internas */}
        <div className="flex items-center border-b border-gray-100 px-6 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('HISTORICO')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'HISTORICO'
                ? 'border-amber-500 text-amber-700 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Compras ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FORNECEDORES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FORNECEDORES'
                ? 'border-amber-500 text-amber-700 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Comparativo de Fornecedores ({supplierComparison.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Card Atual Praticado */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Preço Atual da Embalagem
              </span>
              <div className="text-xl font-black text-gray-900 font-mono mt-0.5">
                {formatarMoedaBRL(ingredient.precoEmbalagemCompraCentavos, true)}
              </div>
              <span className="text-xs text-gray-500">
                Fornecedor: <strong className="text-gray-800">{ingredient.fornecedorPadrao || 'Não informado'}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Custo de Uso Principal
              </span>
              <div className="text-sm font-black text-amber-700 font-mono">
                {custoUsoAtual.principal}
              </div>
              <span className="text-[11px] text-gray-500 font-mono">{custoUsoAtual.secundario}</span>
            </div>
          </div>

          {/* TAB 1: HISTÓRICO CRONOLÓGICO */}
          {activeTab === 'HISTORICO' && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Linha do Tempo de Notas & Reajustes
              </h4>

              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Nenhuma alteração de preço registrada ainda no histórico deste insumo.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry, idx) => {
                    const custoLinha = formatarCustoUnidadeUso(
                      (entry.precoEmbalagemCompraCentavos / 100) / entry.quantidadeEmbalagemCompra,
                      ingredient.unidadeUso
                    );

                    return (
                      <div
                        key={entry.id || idx}
                        className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold font-mono">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 font-mono">
                                {formatarMoedaBRL(entry.precoEmbalagemCompraCentavos, true)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({entry.quantidadeEmbalagemCompra} {ingredient.unidadeUso})
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatarDataBRL(entry.data)}
                              </span>
                              {entry.fornecedor && (
                                <span className="font-semibold text-gray-600">{entry.fornecedor}</span>
                              )}
                              {entry.responsavel && (
                                <span>&bull; {entry.responsavel}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-800 font-mono">
                            {custoLinha.principal}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {custoLinha.secundario}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPARATIVO DE FORNECEDORES (REQUISITO 16) */}
          {activeTab === 'FORNECEDORES' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Última Cotação Registrada por Fornecedor
              </h4>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Fornecedor</th>
                      <th className="py-2.5 px-3 text-right">Último Preço Embalagem</th>
                      <th className="py-2.5 px-3 text-right">Custo de Uso</th>
                      <th className="py-2.5 px-3 text-center">Data Última Cotação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierComparison.map((sup, idx) => {
                      const custo = formatarCustoUnidadeUso(sup.custoUnitario, ingredient.unidadeUso);

                      return (
                        <tr key={sup.fornecedor || idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{sup.fornecedor}</span>
                              {sup.isMelhorPreco && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <Award className="w-3 h-3 text-emerald-600" />
                                  Melhor Cotação
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                            {formatarMoedaBRL(sup.ultimoPrecoCentavos, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span className="font-bold text-amber-700">{custo.principal}</span>
                            <span className="text-[10px] text-gray-400 block">{custo.secundario}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                            {formatarDataBRL(sup.ultimaData)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
