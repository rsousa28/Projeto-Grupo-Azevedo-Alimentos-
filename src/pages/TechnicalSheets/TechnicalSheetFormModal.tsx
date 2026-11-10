import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  Package, 
  ChefHat, 
  Scale, 
  Clock, 
  Utensils, 
  AlertCircle,
  Sparkles,
  Store,
  Bike
} from 'lucide-react';
import { 
  TechnicalSheet, 
  ChannelType, 
  SheetCategory, 
  IngredientItem, 
  PackagingItem, 
  PrepStep 
} from '../../types/technicalSheet';

interface TechnicalSheetFormModalProps {
  sheet?: TechnicalSheet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedSheet: TechnicalSheet) => void;
}

const CATEGORIES: SheetCategory[] = ['MASSAS', 'WRAPS', 'LASANHAS', 'PARMEGIANAS'];

export const TechnicalSheetFormModal: React.FC<TechnicalSheetFormModalProps> = ({
  sheet,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = !!sheet;

  // Form states
  const [nome, setNome] = useState<string>(sheet?.nome || '');
  const [canal, setCanal] = useState<ChannelType>(sheet?.canal || 'IFOOD');
  const [categoria, setCategoria] = useState<SheetCategory>(sheet?.categoria || 'MASSAS');
  const [descricao, setDescricao] = useState<string>(sheet?.descricao || '');
  const [precoVenda, setPrecoVenda] = useState<number>(sheet?.precoVenda || 35.90);
  const [taxaCanalPercent, setTaxaCanalPercent] = useState<number>(
    sheet?.taxaCanalPercent ?? (sheet?.canal === 'BALCAO' ? 7 : 28)
  );
  const [impostoSimplesPercent, setImpostoSimplesPercent] = useState<number>(
    sheet?.impostoSimplesPercent ?? 5
  );

  // Kitchen POP states
  const [pesoFinalGramas, setPesoFinalGramas] = useState<number>(sheet?.pesoFinalGramas || 450);
  const [tempoPreparoMinutos, setTempoPreparoMinutos] = useState<number>(sheet?.tempoPreparoMinutos || 8);
  const [utensiliosPadrao, setUtensiliosPadrao] = useState<string[]>(
    sheet?.utensiliosPadrao || [
      'Balança Digital de Precisão (1g)',
      'Concha Dosadora nº 20',
      'Pegador Inox para Massas'
    ]
  );
  const [novoUtensilio, setNovoUtensilio] = useState<string>('');
  const [observacoesCozinha, setObservacoesCozinha] = useState<string>(sheet?.observacoesCozinha || '');

  // Dynamic Insumos
  const [ingredientes, setIngredientes] = useState<IngredientItem[]>(
    sheet?.ingredientes || [
      { id: '1', nome: 'Massa Principal Cozida', unidade: 'g', quantidade: 90, custoUnitario: 0.019, custoTotal: 1.71 },
      { id: '2', nome: 'Proteína Porcionada', unidade: 'g', quantidade: 70, custoUnitario: 0.031, custoTotal: 2.17 },
      { id: '3', nome: 'Molho Base Artesanal', unidade: 'ml', quantidade: 200, custoUnitario: 0.014, custoTotal: 2.80 },
    ]
  );

  // Dynamic Embalagens
  const [embalagens, setEmbalagens] = useState<PackagingItem[]>(
    sheet?.embalagens || (sheet?.canal === 'BALCAO' ? [
      { id: 'e1', nome: 'Papel Bandeja Personalizado', quantidade: 1, custoUnitario: 0.22, custoTotal: 0.22 },
      { id: 'e2', nome: 'Guardanapo Sachê', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
    ] : [
      { id: 'e1', nome: 'Pote Térmico 500ml', quantidade: 1, custoUnitario: 1.86, custoTotal: 1.86 },
      { id: 'e2', nome: 'Saco Kraft Delivery Reforçado', quantidade: 1, custoUnitario: 0.65, custoTotal: 0.65 },
      { id: 'e3', nome: 'Lacre de Segurança Adesivo', quantidade: 1, custoUnitario: 0.10, custoTotal: 0.10 },
    ])
  );

  // Dynamic Steps
  const [passosPreparo, setPassosPreparo] = useState<PrepStep[]>(
    sheet?.passosPreparo || [
      { passo: 1, titulo: 'Aferição na Balança', descricao: 'Pesar os insumos individualmente na estação de montagem.', tempoMinutos: 1 },
      { passo: 2, titulo: 'Cocção e Aquecimento', descricao: 'Saltear a proteína e incorporar o molho com a concha dosadora.', tempoMinutos: 4 },
      { passo: 3, titulo: 'Montagem e Acabamento', descricao: 'Finalizar com queijo gratinado e acondicionar na embalagem padrão.', tempoMinutos: 3 },
    ]
  );

  const [activeTab, setActiveTab] = useState<'DADOS' | 'INSUMOS' | 'EMBALAGENS' | 'COZINHA'>('INSUMOS');

  if (!isOpen) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calculations
  const custoInsumos = Number(
    ingredientes.reduce((sum, item) => sum + (Number(item.custoTotal) || 0), 0).toFixed(2)
  );
  const custoEmbalagens = Number(
    embalagens.reduce((sum, item) => sum + (Number(item.custoTotal) || 0), 0).toFixed(2)
  );
  const custoTotal = Number((custoInsumos + custoEmbalagens).toFixed(2));
  const currentPrice = Number(precoVenda) || 0;
  const cmvTeorico = currentPrice > 0 ? (custoTotal / currentPrice) * 100 : 0;
  const taxaCanalReais = currentPrice * (taxaCanalPercent / 100);
  const impostoReais = currentPrice * (impostoSimplesPercent / 100);
  const margemReais = currentPrice - taxaCanalReais - impostoReais - custoTotal;
  const margemPercent = currentPrice > 0 ? (margemReais / currentPrice) * 100 : 0;

  // Handlers for Insumos
  const handleAddIngredient = () => {
    const newItem: IngredientItem = {
      id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: 'Novo Insumo',
      unidade: 'g',
      quantidade: 50,
      custoUnitario: 0.02,
      custoTotal: 1.00
    };
    setIngredientes([...ingredientes, newItem]);
  };

  const handleUpdateIngredient = (index: number, field: keyof IngredientItem, value: any) => {
    const updated = [...ingredientes];
    const current = { ...updated[index], [field]: value };
    
    // Auto-recalculate row cost
    if (field === 'quantidade' || field === 'custoUnitario') {
      const q = Number(field === 'quantidade' ? value : current.quantidade) || 0;
      const u = Number(field === 'custoUnitario' ? value : current.custoUnitario) || 0;
      current.custoTotal = Number((q * u).toFixed(2));
    }

    updated[index] = current;
    setIngredientes(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  // Handlers for Embalagens
  const handleAddPackaging = () => {
    const newItem: PackagingItem = {
      id: `emb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: canal === 'IFOOD' ? 'Embalagem Delivery' : 'Descartável Balcão',
      quantidade: 1,
      custoUnitario: 0.50,
      custoTotal: 0.50
    };
    setEmbalagens([...embalagens, newItem]);
  };

  const handleUpdatePackaging = (index: number, field: keyof PackagingItem, value: any) => {
    const updated = [...embalagens];
    const current = { ...updated[index], [field]: value };
    
    if (field === 'quantidade' || field === 'custoUnitario') {
      const q = Number(field === 'quantidade' ? value : current.quantidade) || 0;
      const u = Number(field === 'custoUnitario' ? value : current.custoUnitario) || 0;
      current.custoTotal = Number((q * u).toFixed(2));
    }

    updated[index] = current;
    setEmbalagens(updated);
  };

  const handleRemovePackaging = (index: number) => {
    setEmbalagens(embalagens.filter((_, i) => i !== index));
  };

  // Handlers for Kitchen Steps
  const handleAddStep = () => {
    const newStep: PrepStep = {
      passo: passosPreparo.length + 1,
      titulo: `Passo ${passosPreparo.length + 1}`,
      descricao: 'Descrição do procedimento padrão da linha.',
      tempoMinutos: 2
    };
    setPassosPreparo([...passosPreparo, newStep]);
  };

  const handleUpdateStep = (index: number, field: keyof PrepStep, value: any) => {
    const updated = [...passosPreparo];
    updated[index] = { ...updated[index], [field]: value };
    setPassosPreparo(updated);
  };

  const handleRemoveStep = (index: number) => {
    const updated = passosPreparo
      .filter((_, i) => i !== index)
      .map((step, idx) => ({ ...step, passo: idx + 1 }));
    setPassosPreparo(updated);
  };

  const handleAddUtensil = () => {
    if (!novoUtensilio.trim()) return;
    setUtensiliosPadrao([...utensiliosPadrao, novoUtensilio.trim()]);
    setNovoUtensilio('');
  };

  const handleRemoveUtensil = (index: number) => {
    setUtensiliosPadrao(utensiliosPadrao.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Por favor, informe o nome do prato.');
      return;
    }

    const payload: TechnicalSheet = {
      id: sheet?.id || `sheet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: nome.trim(),
      canal,
      categoria,
      descricao: descricao.trim(),
      ingredientes,
      embalagens,
      custoInsumos,
      custoEmbalagens,
      custoTotal,
      precoVenda: currentPrice,
      cmvTeoricoPercent: Number(cmvTeorico.toFixed(2)),
      taxaCanalPercent: Number(taxaCanalPercent),
      impostoSimplesPercent: Number(impostoSimplesPercent),
      margemContribuicaoReais: Number(margemReais.toFixed(2)),
      margemContribuicaoPercent: Number(margemPercent.toFixed(1)),
      pesoFinalGramas: Number(pesoFinalGramas) || 0,
      tempoPreparoMinutos: Number(tempoPreparoMinutos) || 0,
      utensiliosPadrao,
      passosPreparo,
      observacoesCozinha: observacoesCozinha.trim(),
      dataCriacao: sheet?.dataCriacao || new Date().toISOString().split('T')[0],
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-linear-to-r from-orange-50 to-white flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              {isEditing ? 'Edição de Ficha Técnica' : 'Cadastro de Nova Ficha Técnica'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {nome || 'Novo Prato / Receita Padrão'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metrics Floating Bar */}
        <div className="bg-slate-900 text-white px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium border-b border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Custo Total (CMV)</span>
            <span className="text-base font-black font-mono text-white">{formatCurrency(custoTotal)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Preço Venda</span>
            <span className="text-base font-black font-mono text-amber-400">{formatCurrency(currentPrice)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">CMV Teórico</span>
            <span className={`text-base font-black font-mono ${
              cmvTeorico <= 32 ? 'text-emerald-400' : cmvTeorico <= 38 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {cmvTeorico.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Margem Líquida</span>
            <span className="text-base font-black font-mono text-emerald-400">
              {formatCurrency(margemReais)} ({margemPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('DADOS')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'DADOS' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            1. Dados Gerais & Preço
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INSUMOS')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'INSUMOS' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            2. Ingredientes ({ingredientes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EMBALAGENS')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'EMBALAGENS' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            3. Embalagens ({embalagens.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COZINHA')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'COZINHA' ? 'border-amber-600 text-amber-700 bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            4. Modo Cozinha (POP)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: DADOS GERAIS */}
          {activeTab === 'DADOS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Nome do Prato *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Spaghetti c/ Frango Desfiado (iFood)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as SheetCategory)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Canal de Venda
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCanal('BALCAO');
                        setTaxaCanalPercent(7);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        canal === 'BALCAO' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Balcão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCanal('IFOOD');
                        setTaxaCanalPercent(28);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        canal === 'IFOOD' 
                          ? 'bg-red-600 text-white border-red-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>iFood</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Preço Praticado no Cardápio (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Taxa do Canal (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={taxaCanalPercent}
                    onChange={(e) => setTaxaCanalPercent(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Descrição Comercial / Ingredientes Principais
                </label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do prato para orientação do salão e cardápio online..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: INGREDIENTES */}
          {activeTab === 'INSUMOS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Insumos & Ingredientes da Porção
                  </h3>
                  <p className="text-xs text-slate-500">
                    Altere quantidades (g/ml) ou custos unitários para recalcular o CMV instantaneamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Insumo</span>
                </button>
              </div>

              <div className="space-y-2">
                {ingredientes.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome do Insumo</label>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={(e) => handleUpdateIngredient(idx, 'nome', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unidade</label>
                      <select
                        value={item.unidade}
                        onChange={(e) => handleUpdateIngredient(idx, 'unidade', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="un">un</option>
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Quantidade</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) => handleUpdateIngredient(idx, 'quantidade', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custo Unit (R$)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={item.custoUnitario}
                        onChange={(e) => handleUpdateIngredient(idx, 'custoUnitario', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-600"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total (R$)</label>
                      <span className="text-sm font-black font-mono text-slate-900 block py-1.5">
                        {formatCurrency(item.custoTotal)}
                      </span>
                    </div>

                    <div className="self-end sm:self-center pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover insumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between font-bold text-sm">
                <span className="text-slate-600">Subtotal de Insumos:</span>
                <span className="text-orange-600 font-mono text-base font-black">
                  {formatCurrency(custoInsumos)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: EMBALAGENS */}
          {activeTab === 'EMBALAGENS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Embalagens & Descartáveis ({canal})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Potes térmicos, sacos kraft, lacres invioláveis ou papel bandeja.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPackaging}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Embalagem</span>
                </button>
              </div>

              <div className="space-y-2">
                {embalagens.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Item de Embalagem</label>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={(e) => handleUpdatePackaging(idx, 'nome', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Qtd (un)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => handleUpdatePackaging(idx, 'quantidade', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Custo Unit (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.custoUnitario}
                        onChange={(e) => handleUpdatePackaging(idx, 'custoUnitario', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-600"
                      />
                    </div>

                    <div className="w-24 text-right">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total (R$)</label>
                      <span className="text-sm font-black font-mono text-slate-900 block py-1.5">
                        {formatCurrency(item.custoTotal)}
                      </span>
                    </div>

                    <div className="self-end sm:self-center pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemovePackaging(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover embalagem"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between font-bold text-sm">
                <span className="text-slate-600">Subtotal de Embalagens:</span>
                <span className="text-orange-600 font-mono text-base font-black">
                  {formatCurrency(custoEmbalagens)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: MODO COZINHA (POP) */}
          {activeTab === 'COZINHA' && (
            <div className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Peso Final Estimado do Prato Pronto (Gramas)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="5"
                      value={pesoFinalGramas}
                      onChange={(e) => setPesoFinalGramas(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900"
                    />
                    <span className="text-xs text-slate-500 font-bold">gramas</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Tempo Médio de Preparo (Minutos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      value={tempoPreparoMinutos}
                      onChange={(e) => setTempoPreparoMinutos(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900"
                    />
                    <span className="text-xs text-slate-500 font-bold">minutos</span>
                  </div>
                </div>
              </div>

              {/* Utensílios de Medida Padrão */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Utensílios de Medida Padrão (Ex: Concha nº 20, Copo medidor)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {utensiliosPadrao.map((u, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <span>{u}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUtensil(idx)}
                        className="text-amber-500 hover:text-amber-800 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novoUtensilio}
                    onChange={(e) => setNovoUtensilio(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddUtensil();
                      }
                    }}
                    placeholder="Adicionar novo utensílio padrão..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddUtensil}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Etapas do POP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Passo a Passo Cronológico de Preparo (POP)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Etapa</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {passosPreparo.map((step, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step.titulo || ''}
                          onChange={(e) => handleUpdateStep(idx, 'titulo', e.target.value)}
                          placeholder="Título da etapa (ex: Saltear a Proteína)"
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                        <div className="flex items-center gap-1 w-24">
                          <input
                            type="number"
                            value={step.tempoMinutos || 1}
                            onChange={(e) => handleUpdateStep(idx, 'tempoMinutos', Number(e.target.value))}
                            className="w-12 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center"
                          />
                          <span className="text-[10px] text-slate-500 font-semibold">min</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={step.descricao}
                        onChange={(e) => handleUpdateStep(idx, 'descricao', e.target.value)}
                        placeholder="Instrução detalhada para o operador da estação..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                      />

                      <input
                        type="text"
                        value={step.alertaPonto || ''}
                        onChange={(e) => handleUpdateStep(idx, 'alertaPonto', e.target.value)}
                        placeholder="Alerta de qualidade/ponto crítico (opcional)"
                        className="w-full px-2.5 py-1 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 italic"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Observações Gerais da Cozinha / Dicas de Ponto
                </label>
                <textarea
                  rows={2}
                  value={observacoesCozinha}
                  onChange={(e) => setObservacoesCozinha(e.target.value)}
                  placeholder="Recomendações finais para a equipe de cozinha..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                />
              </div>

            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Ficha Técnica'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
