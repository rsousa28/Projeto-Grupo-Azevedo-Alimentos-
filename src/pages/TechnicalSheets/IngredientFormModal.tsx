import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Scale, DollarSign, Package, ShieldAlert, Sparkles } from 'lucide-react';
import { IngredientMaster, IngredientCategory, UnitOfMeasure, AllergenType } from '../../types/foodService';
import { calcularCustoUnitarioInsumo, formatarMoedaBRL, formatarCustoUnidadeUso } from '../../utils/foodServiceMath';

interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ingredient: IngredientMaster) => void;
  initialData?: IngredientMaster | null;
  storeId?: string;
}

const CATEGORIES: { label: string; value: IngredientCategory }[] = [
  { label: 'Proteínas & Carnes', value: 'PROTEINAS' },
  { label: 'Massas & Farinhas', value: 'MASSAS' },
  { label: 'Laticínios & Queijos', value: 'LATICINIOS' },
  { label: 'Molhos & Caldos', value: 'MOLHOS' },
  { label: 'Hortifrúti & Frescos', value: 'HORTIFRUTI' },
  { label: 'Temperos & Condimentos', value: 'TEMPEROS' },
  { label: 'Embalagens de Entrega', value: 'EMBALAGENS' },
  { label: 'Descartáveis & Talheres', value: 'DESCARTAVEIS' },
  { label: 'Outros', value: 'OUTROS' },
];

const ALLERGEN_OPTIONS: { label: string; value: AllergenType }[] = [
  { label: 'Glúten', value: 'GLUTEN' },
  { label: 'Lactose', value: 'LACTOSE' },
  { label: 'Ovos', value: 'OVOS' },
  { label: 'Soja', value: 'SOJA' },
  { label: 'Oleaginosas', value: 'OLEAGINOSAS' },
  { label: 'Peixes', value: 'PEIXES' },
  { label: 'Crustáceos', value: 'CRUSTACEOS' },
];

export const IngredientFormModal: React.FC<IngredientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  storeId = '3'
}) => {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<IngredientCategory>('PROTEINAS');
  const [fornecedorPadrao, setFornecedorPadrao] = useState('');
  const [unidadeCompraNome, setUnidadeCompraNome] = useState('Pacote 1 kg');
  const [precoReais, setPrecoReais] = useState<string>('0');
  const [quantidadeEmbalagem, setQuantidadeEmbalagem] = useState<number>(1000);
  const [unidadeUso, setUnidadeUso] = useState<UnitOfMeasure>('g');
  const [dataUltimaCompra, setDataUltimaCompra] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fatorCorrecao, setFatorCorrecao] = useState<number>(1.0);
  const [indiceCoccao, setIndiceCoccao] = useState<number>(1.0);
  const [alergenos, setAlergenos] = useState<AllergenType[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modo Peso Variável (Peça / Vácuo / Balança)
  const [isPesoVariavel, setIsPesoVariavel] = useState(false);
  const [valorTotalPecaReais, setValorTotalPecaReais] = useState('');
  const [pesoRealPecaKg, setPesoRealPecaKg] = useState('');

  const handleCalculoPesoVariavel = (valorStr: string, pesoStr: string) => {
    const val = parseFloat(valorStr.replace(',', '.')) || 0;
    const peso = parseFloat(pesoStr.replace(',', '.')) || 0;
    if (val > 0 && peso > 0) {
      const precoPorKg = val / peso;
      setPrecoReais(precoPorKg.toFixed(2));
      setQuantidadeEmbalagem(1000);
      setUnidadeUso('g');
      setUnidadeCompraNome(`Peça ~${peso.toFixed(2).replace('.', ',')} kg`);
    }
  };

  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome || '');
      setCategoria(initialData.categoria || 'PROTEINAS');
      setFornecedorPadrao(initialData.fornecedorPadrao || '');
      setUnidadeCompraNome(initialData.unidadeCompraNome || 'Pacote 1 kg');
      setPrecoReais((initialData.precoEmbalagemCompraCentavos / 100).toFixed(2));
      setQuantidadeEmbalagem(initialData.quantidadeEmbalagemCompra || 1000);
      setUnidadeUso(initialData.unidadeUso || 'g');
      setDataUltimaCompra(initialData.dataUltimaCompra || new Date().toISOString().split('T')[0]);
      setFatorCorrecao(initialData.fatorCorrecao || 1.0);
      setIndiceCoccao(initialData.indiceCoccao || 1.0);
      setAlergenos(initialData.alergenos || []);
      setObservacoes(initialData.observacoes || '');
      setIsPesoVariavel(false);
      setValorTotalPecaReais('');
      setPesoRealPecaKg('');
    } else {
      setNome('');
      setCategoria('PROTEINAS');
      setFornecedorPadrao('');
      setUnidadeCompraNome('Pacote 1 kg');
      setPrecoReais('0,00');
      setQuantidadeEmbalagem(1000);
      setUnidadeUso('g');
      setDataUltimaCompra(new Date().toISOString().split('T')[0]);
      setFatorCorrecao(1.0);
      setIndiceCoccao(1.0);
      setAlergenos([]);
      setObservacoes('');
      setIsPesoVariavel(false);
      setValorTotalPecaReais('');
      setPesoRealPecaKg('');
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Cálculo prévio em tempo real
  const precoCentavosCalculado = Math.round((parseFloat(precoReais.replace(',', '.')) || 0) * 100);
  const custoUnitarioCalculado = calcularCustoUnitarioInsumo(precoCentavosCalculado, quantidadeEmbalagem);
  const custoFormatado = formatarCustoUnidadeUso(custoUnitarioCalculado, unidadeUso);

  const toggleAllergen = (al: AllergenType) => {
    if (alergenos.includes(al)) {
      setAlergenos(alergenos.filter(a => a !== al));
    } else {
      setAlergenos([...alergenos, al]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome do insumo.');
      return;
    }
    if (precoCentavosCalculado <= 0) {
      setErrorMsg('Informe um preço de compra válido maior que zero.');
      return;
    }
    if (quantidadeEmbalagem <= 0) {
      setErrorMsg('A quantidade contida na embalagem deve ser maior que zero.');
      return;
    }

    const payload: IngredientMaster = {
      id: initialData?.id || `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storeId,
      nome: nome.trim(),
      categoria,
      fornecedorPadrao: fornecedorPadrao.trim(),
      unidadeCompraNome: unidadeCompraNome.trim(),
      precoEmbalagemCompraCentavos: precoCentavosCalculado,
      quantidadeEmbalagemCompra: quantidadeEmbalagem,
      unidadeUso,
      dataUltimaCompra,
      fatorCorrecao: fatorCorrecao > 0 ? fatorCorrecao : 1.0,
      indiceCoccao: indiceCoccao > 0 ? indiceCoccao : 1.0,
      alergenos,
      ativo: true,
      observacoes: observacoes.trim(),
      updatedAt: new Date().toISOString()
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#2C2C2C] w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2C2C2C] flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
                {initialData ? 'Editar Insumo Mestre' : 'Novo Insumo Mestre'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cadastro com conversão de compra, fatores técnicos e alérgenos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nome & Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                Nome do Insumo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Queijo Mussarela Peça"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value as IngredientCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fornecedor & Data de Compra */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                Fornecedor Padrão
              </label>
              <input
                type="text"
                value={fornecedorPadrao}
                onChange={e => setFornecedorPadrao(e.target.value)}
                placeholder="Ex: Laticínios Betânia"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                Data da Última Compra
              </label>
              <input
                type="date"
                value={dataUltimaCompra}
                onChange={e => setDataUltimaCompra(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Bloco de Compra vs Unidade de Uso */}
          <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700 dark:text-amber-400">
                <DollarSign className="w-4 h-4" />
                <span>Conversão de Compra para Uso Operacional</span>
              </div>

              {/* Botão para ativar modo Peso Variável */}
              <button
                type="button"
                onClick={() => setIsPesoVariavel(!isPesoVariavel)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                  isPesoVariavel 
                    ? 'bg-amber-500 text-slate-900 shadow-xs' 
                    : 'bg-white dark:bg-[#252525] text-gray-500 hover:text-amber-600 border border-gray-200 dark:border-[#333]'
                }`}
              >
                <Scale className="w-3 h-3" />
                <span>{isPesoVariavel ? 'Peça Variável Ativa' : 'Calcular Peça com Peso Variável (Vácuo/Balança)'}</span>
              </button>
            </div>

            {/* Painel de Cálculo de Peso Variável (Item 15) */}
            {isPesoVariavel && (
              <div className="p-3 bg-amber-500/10 dark:bg-[#252525] border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Calculadora de Peça de Peso Variável (Alcatra, Queijo Peça, etc.)</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Informe o valor total pago na nota e o peso real conferido na balança para calcular o preço exato por kg/g:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-0.5">
                      Valor Total da Peça na NF (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 110,00"
                      value={valorTotalPecaReais}
                      onChange={e => {
                        setValorTotalPecaReais(e.target.value);
                        handleCalculoPesoVariavel(e.target.value, pesoRealPecaKg);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#1E1E1E] border border-amber-500/30 rounded-lg text-gray-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-0.5">
                      Peso Real Aferido na Balança (kg)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2.15"
                      value={pesoRealPecaKg}
                      onChange={e => {
                        setPesoRealPecaKg(e.target.value);
                        handleCalculoPesoVariavel(valorTotalPecaReais, e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#1E1E1E] border border-amber-500/30 rounded-lg text-gray-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Embalagem Compra
                </label>
                <input
                  type="text"
                  value={unidadeCompraNome}
                  onChange={e => setUnidadeCompraNome(e.target.value)}
                  placeholder="Ex: Caixa 5 kg"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Preço Embalagem (R$)
                </label>
                <input
                  type="text"
                  value={precoReais}
                  onChange={e => setPrecoReais(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Qtd na Embalagem
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={quantidadeEmbalagem}
                  onChange={e => setQuantidadeEmbalagem(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Unidade de Uso
                </label>
                <select
                  value={unidadeUso}
                  onChange={e => setUnidadeUso(e.target.value as UnitOfMeasure)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold"
                >
                  <option value="g">Gramas (g)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilos (kg)</option>
                  <option value="l">Litros (L)</option>
                </select>
              </div>
            </div>

            {/* Resultado do Custo de Uso Calculado */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#202020] rounded-xl border border-amber-500/20 text-xs">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Custo de Uso Calculado (sem distorção):
              </span>
              <div className="text-right">
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {custoFormatado.principal}
                </span>
                <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
                  ({custoFormatado.secundario})
                </span>
              </div>
            </div>
          </div>

          {/* Fator de Correção & Índice de Cocção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#2C2C2C] rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Fator de Correção (FC)
                </label>
                <span className="text-[10px] text-gray-400 font-mono">Bruto / Líquido</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="1.0"
                value={fatorCorrecao}
                onChange={e => setFatorCorrecao(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold"
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {fatorCorrecao > 1 
                  ? `Perda de ${((fatorCorrecao - 1) * 100).toFixed(1)}% na limpeza e toalete.` 
                  : 'Sem perdas no pré-preparo (FC = 1.00).'}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#2C2C2C] rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Índice de Cocção (IC)
                </label>
                <span className="text-[10px] text-gray-400 font-mono">Cozido / Cru</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={indiceCoccao}
                onChange={e => setIndiceCoccao(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-bold"
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {indiceCoccao > 1 
                  ? `Rendimento aumenta ${((indiceCoccao - 1) * 100).toFixed(0)}% (ex: massas que absorvem água).` 
                  : indiceCoccao < 1
                  ? `Perda de ${((1 - indiceCoccao) * 100).toFixed(0)}% de água ao grelhar/assar.`
                  : 'Peso inalterado no cozimento (IC = 1.00).'}
              </p>
            </div>
          </div>

          {/* Alérgenos */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Alérgenos Presentes neste Insumo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map(al => {
                const isSelected = alergenos.includes(al.value);
                return (
                  <button
                    type="button"
                    key={al.value}
                    onClick={() => toggleAllergen(al.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-gray-50 dark:bg-[#252525] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-gray-300'
                    }`}
                  >
                    {al.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
              Observações & Detalhes Técnicos
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex: Marca recomendada, especificações de granulometria, ponto de toalete..."
              className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl text-gray-900 dark:text-white font-medium focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#2C2C2C] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Insumo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
