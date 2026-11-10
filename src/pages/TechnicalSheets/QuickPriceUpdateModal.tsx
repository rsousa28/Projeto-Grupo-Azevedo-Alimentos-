import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  FileCode, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  DollarSign, 
  Building2, 
  Calendar, 
  Search,
  Upload,
  ArrowRight
} from 'lucide-react';
import { IngredientMaster } from '../../types/foodService';
import { 
  formatarMoedaBRL, 
  formatarPercentualBRL, 
  formatarDataBRL, 
  formatarFatorBRL, 
  formatarCustoUnidadeUso 
} from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';

interface QuickPriceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: IngredientMaster[];
  onSaveBatch: (updates: Array<{ id: string; novoPrecoCentavos: number; fornecedor?: string; pesoVariavelRealG?: number }>) => void;
}

interface RowUpdateState {
  novoPrecoReais: string; // string editável
  fornecedor: string;
  isPesoVariavel: boolean;
  pesoRealG: string;
  valorTotalPecaReais: string;
}

export const QuickPriceUpdateModal: React.FC<QuickPriceUpdateModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  onSaveBatch
}) => {
  const { success, error, info } = useToast();
  const fileXmlRef = useRef<HTMLInputElement>(null);

  const [numeroNota, setNumeroNota] = useState('');
  const [dataNota, setDataNota] = useState(new Date().toISOString().split('T')[0]);
  const [fornecedorGeral, setFornecedorGeral] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Estado de edição de cada linha
  const [rowsState, setRowsState] = useState<Record<string, RowUpdateState>>(() => {
    const initial: Record<string, RowUpdateState> = {};
    ingredients.forEach(ing => {
      initial[ing.id] = {
        novoPrecoReais: (ing.precoEmbalagemCompraCentavos / 100).toFixed(2),
        fornecedor: ing.fornecedorPadrao || '',
        isPesoVariavel: false,
        pesoRealG: String(ing.quantidadeEmbalagemCompra),
        valorTotalPecaReais: (ing.precoEmbalagemCompraCentavos / 100).toFixed(2)
      };
    });
    return initial;
  });

  if (!isOpen) return null;

  // Filtragem de linhas
  const visibleIngredients = ingredients.filter(ing => 
    ing.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
    ing.categoria.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (ing.fornecedorPadrao || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Manipulação de preço em linha
  const handlePriceChange = (id: string, value: string) => {
    setRowsState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        novoPrecoReais: value
      }
    }));
  };

  // Manipulação de peso variável (peça a vácuo)
  const handleVariableWeightChange = (id: string, pesoG: string, valorTotal: string) => {
    const p = parseFloat(pesoG.replace(',', '.')) || 0;
    const v = parseFloat(valorTotal.replace(',', '.')) || 0;
    const targetIng = ingredients.find(i => i.id === id);
    const embalagemPadrao = targetIng?.quantidadeEmbalagemCompra || 1000;

    let precoEmbalagemCalculado = v;
    if (p > 0) {
      // Normaliza para o tamanho da embalagem padrão
      precoEmbalagemCalculado = (v / p) * embalagemPadrao;
    }

    setRowsState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        pesoRealG: pesoG,
        valorTotalPecaReais: valorTotal,
        novoPrecoReais: precoEmbalagemCalculado > 0 ? precoEmbalagemCalculado.toFixed(2) : prev[id].novoPrecoReais
      }
    }));
  };

  const handleTogglePesoVariavel = (id: string) => {
    setRowsState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isPesoVariavel: !prev[id].isPesoVariavel
      }
    }));
  };

  // Leitor de XML de NF-e brasileira (SEFAZ)
  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        // Extrai dados da NF-e
        const nNF = xmlDoc.getElementsByTagName('nNF')[0]?.textContent || '';
        const xNomeEmit = xmlDoc.getElementsByTagName('xNome')[0]?.textContent || '';
        const dhEmi = xmlDoc.getElementsByTagName('dhEmi')[0]?.textContent || '';

        if (nNF) setNumeroNota(nNF);
        if (xNomeEmit) setFornecedorGeral(xNomeEmit);
        if (dhEmi) setDataNota(dhEmi.split('T')[0]);

        const detNodes = xmlDoc.getElementsByTagName('det');
        let matchedCount = 0;

        const updatedState = { ...rowsState };

        for (let i = 0; i < detNodes.length; i++) {
          const det = detNodes[i];
          const xProd = det.getElementsByTagName('xProd')[0]?.textContent || '';
          const vUnCom = parseFloat(det.getElementsByTagName('vUnCom')[0]?.textContent || '0');
          const vProd = parseFloat(det.getElementsByTagName('vProd')[0]?.textContent || '0');
          const qCom = parseFloat(det.getElementsByTagName('qCom')[0]?.textContent || '0');

          if (!xProd || vUnCom <= 0) continue;

          // Busca correspondência com insumos cadastrados
          const matched = ingredients.find(ing => {
            const nomeClean = ing.nome.toLowerCase();
            const xmlClean = xProd.toLowerCase();
            return xmlClean.includes(nomeClean) || nomeClean.split(' ').some(w => w.length > 4 && xmlClean.includes(w));
          });

          if (matched && updatedState[matched.id]) {
            matchedCount++;
            updatedState[matched.id] = {
              ...updatedState[matched.id],
              novoPrecoReais: vUnCom.toFixed(2),
              fornecedor: xNomeEmit || updatedState[matched.id].fornecedor
            };
          }
        }

        setRowsState(updatedState);

        if (matchedCount > 0) {
          success(`NF-e nº ${nNF} processada: ${matchedCount} insumos identificados e preenchidos automaticamente!`, 'XML Importado com Sucesso');
        } else {
          info(`NF-e nº ${nNF} lida com sucesso, mas nenhum item teve match exato. Preencha os valores na tabela.`, 'XML Lido');
        }
      } catch (err: any) {
        error(`Falha ao ler XML da NF-e: ${err.message || err}`, 'Erro no XML');
      }
    };
    reader.readAsText(file);
    if (fileXmlRef.current) fileXmlRef.current.value = '';
  };

  // Contagem de alterações
  const changedList = ingredients.filter(ing => {
    const state = rowsState[ing.id];
    if (!state) return false;
    const novoPrecoNum = parseFloat(state.novoPrecoReais.replace(',', '.')) || 0;
    const precoAtualNum = ing.precoEmbalagemCompraCentavos / 100;
    return Math.abs(novoPrecoNum - precoAtualNum) > 0.009;
  });

  const handleSaveAll = () => {
    if (changedList.length === 0) {
      alert('Nenhum preço foi alterado na nota.');
      return;
    }

    const updates = changedList.map(ing => {
      const state = rowsState[ing.id];
      const precoReais = parseFloat(state.novoPrecoReais.replace(',', '.')) || 0;
      return {
        id: ing.id,
        novoPrecoCentavos: Math.round(precoReais * 100),
        fornecedor: state.fornecedor || fornecedorGeral || ing.fornecedorPadrao,
        pesoVariavelRealG: state.isPesoVariavel ? parseFloat(state.pesoRealG.replace(',', '.')) : undefined
      };
    });

    onSaveBatch(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Input Oculto de XML */}
        <input
          type="file"
          ref={fileXmlRef}
          onChange={handleXmlUpload}
          accept=".xml"
          className="hidden"
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Lançamento Rápido de Preços (Nota de Compra do Dia)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-800">
                  {changedList.length} alterados
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Lance todos os insumos da nota fiscal de uma vez e veja o impacto consolidado nos pratos.
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

        {/* Barra Superior: Dados da NF-e & Importador XML */}
        <div className="p-4 sm:px-6 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nº da Nota Fiscal / Pedido:
            </label>
            <input
              type="text"
              placeholder="Ex: NF-e 048219"
              value={numeroNota}
              onChange={(e) => setNumeroNota(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Fornecedor Principal:
            </label>
            <input
              type="text"
              placeholder="Ex: JBS / Friboi"
              value={fornecedorGeral}
              onChange={(e) => setFornecedorGeral(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Data da Nota:
            </label>
            <input
              type="date"
              value={dataNota}
              onChange={(e) => setDataNota(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-mono text-gray-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => fileXmlRef.current?.click()}
              className="w-full py-2 px-3 bg-white hover:bg-orange-50 border border-orange-300 text-orange-900 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              title="Importar XML direto da SEFAZ"
            >
              <FileCode className="w-4 h-4 text-orange-600" />
              <span>Importar XML NF-e</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtro Rápido */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Localizar insumo na nota..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Mostrando {visibleIngredients.length} de {ingredients.length} insumos
          </span>
        </div>

        {/* Tabela de Lançamento em Linha */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2.5 px-4">Insumo & Embalagem</th>
                <th className="py-2.5 px-3 text-right">Preço Atual</th>
                <th className="py-2.5 px-4 text-right bg-amber-50/80 font-black text-amber-950 border-x border-amber-200">
                  Novo Preço da Nota (R$)
                </th>
                <th className="py-2.5 px-3 text-right">Variação %</th>
                <th className="py-2.5 px-3 text-center">Peso Variável?</th>
                <th className="py-2.5 px-4">Fornecedor da Compra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleIngredients.map(ing => {
                const state = rowsState[ing.id] || {
                  novoPrecoReais: (ing.precoEmbalagemCompraCentavos / 100).toFixed(2),
                  fornecedor: ing.fornecedorPadrao || '',
                  isPesoVariavel: false,
                  pesoRealG: String(ing.quantidadeEmbalagemCompra),
                  valorTotalPecaReais: (ing.precoEmbalagemCompraCentavos / 100).toFixed(2)
                };

                const precoAtualReais = ing.precoEmbalagemCompraCentavos / 100;
                const novoPrecoNum = parseFloat(state.novoPrecoReais.replace(',', '.')) || 0;
                const variacaoPercent = precoAtualReais > 0 ? (novoPrecoNum - precoAtualReais) / precoAtualReais : 0;
                const isChanged = Math.abs(novoPrecoNum - precoAtualReais) > 0.009;

                return (
                  <tr 
                    key={ing.id} 
                    className={`transition-colors ${
                      isChanged ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    {/* Insumo */}
                    <td className="py-2.5 px-4">
                      <div>
                        <p className="font-bold text-gray-900">{ing.nome}</p>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Emb: {ing.unidadeCompraNome} ({ing.quantidadeEmbalagemCompra} {ing.unidadeUso})
                        </span>
                      </div>
                    </td>

                    {/* Preço Atual */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-600">
                      {formatarMoedaBRL(precoAtualReais)}
                    </td>

                    {/* Novo Preço Editável */}
                    <td className="py-1.5 px-4 text-right bg-amber-50/40 border-x border-amber-200">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-amber-800 font-bold">R$</span>
                        <input
                          type="text"
                          value={state.novoPrecoReais}
                          onChange={(e) => handlePriceChange(ing.id, e.target.value)}
                          className={`w-24 px-2 py-1 text-right font-mono font-black text-xs rounded-lg border focus:ring-2 focus:ring-orange-500 ${
                            isChanged 
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Variação % */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {isChanged ? (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                          variacaoPercent > 0 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {variacaoPercent > 0 ? '+' : ''}{formatarPercentualBRL(variacaoPercent, 1)}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-normal">--</span>
                      )}
                    </td>

                    {/* Toggle Peso Variável (Peça / Nota) */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePesoVariavel(ing.id)}
                        className={`p-1 rounded-lg border text-[10px] font-bold transition-all ${
                          state.isPesoVariavel 
                            ? 'bg-purple-100 border-purple-300 text-purple-900 font-black' 
                            : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                        }`}
                        title="Ativar para peças com peso variável (ex: carnes a vácuo, queijos)"
                      >
                        <Scale className="w-3.5 h-3.5 inline mr-1" />
                        <span>{state.isPesoVariavel ? 'Peça Real' : 'Padrão'}</span>
                      </button>

                      {/* Modalzinho inline se for peso variável */}
                      {state.isPesoVariavel && (
                        <div className="mt-1.5 p-2 bg-purple-50 border border-purple-200 rounded-lg text-[10px] space-y-1 text-left">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-purple-900 font-bold">Peso Real (g):</span>
                            <input
                              type="text"
                              value={state.pesoRealG}
                              onChange={(e) => handleVariableWeightChange(ing.id, e.target.value, state.valorTotalPecaReais)}
                              className="w-16 px-1.5 py-0.5 bg-white border border-purple-200 rounded text-right font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-purple-900 font-bold">Valor Nota (R$):</span>
                            <input
                              type="text"
                              value={state.valorTotalPecaReais}
                              onChange={(e) => handleVariableWeightChange(ing.id, state.pesoRealG, e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-white border border-purple-200 rounded text-right font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Fornecedor */}
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={state.fornecedor}
                        placeholder={fornecedorGeral || 'Fornecedor padrão'}
                        onChange={(e) => {
                          const f = e.target.value;
                          setRowsState(prev => ({
                            ...prev,
                            [ing.id]: { ...prev[ing.id], fornecedor: f }
                          }));
                        }}
                        className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-700">Resumo do Lançamento:</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
              {changedList.length} insumos com novo preço
            </span>
            {numeroNota && (
              <span className="text-gray-500 font-mono">
                • Ref: {numeroNota} ({formatarDataBRL(dataNota)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={changedList.length === 0}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Nota & Analisar Impacto Consolidado</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
