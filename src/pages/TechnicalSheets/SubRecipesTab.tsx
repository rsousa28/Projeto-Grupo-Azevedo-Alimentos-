import React, { useState } from 'react';
import { 
  ChefHat, 
  Plus, 
  Layers, 
  Calculator, 
  Printer, 
  Scale, 
  Clock, 
  Calendar, 
  Thermometer, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  RefreshCw,
  X,
  Save,
  Link as LinkIcon
} from 'lucide-react';
import { SubRecipe, TechnicalSheet, SubRecipeCategory, SubRecipeIngredient } from '../../types/technicalSheet';
import { TechnicalSheetService } from '../../services/TechnicalSheetService';
import { 
  formatarMoedaBRL, 
  formatarPercentualBRL, 
  formatarCustoUnidadeUso, 
  formatarFatorBRL, 
  formatarDataBRL 
} from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';

interface SubRecipesTabProps {
  subRecipes: SubRecipe[];
  sheets: TechnicalSheet[];
  onSubRecipesChange: (subs: SubRecipe[], updatedSheets: TechnicalSheet[]) => void;
}

export const SubRecipesTab: React.FC<SubRecipesTabProps> = ({
  subRecipes,
  sheets,
  onSubRecipesChange,
}) => {
  const { success, info } = useToast();

  // State
  const [selectedSubRecipeForBatch, setSelectedSubRecipeForBatch] = useState<SubRecipe | null>(subRecipes[0] || null);
  const [targetBatchYield, setTargetBatchYield] = useState<number>(subRecipes[0]?.rendimentoLote || 5000);
  const [editingSubRecipe, setEditingSubRecipe] = useState<SubRecipe | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'TODAS' | SubRecipeCategory>('TODAS');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filtered sub-recipes
  const filteredSubs = subRecipes.filter(sub => {
    if (selectedCategoryFilter === 'TODAS') return true;
    return sub.categoria === selectedCategoryFilter;
  });

  // Count linked dishes for a given sub-recipe
  const getLinkedDishes = (subId: string, subName: string) => {
    return sheets.filter(dish => 
      dish.ingredientes.some(ing => 
        ing.subRecipeId === subId || 
        ing.nome.toLowerCase().includes(subName.toLowerCase().slice(0, 10))
      )
    );
  };

  // Batch production calculation
  const batchMultiplier = selectedSubRecipeForBatch 
    ? (targetBatchYield > 0 ? targetBatchYield / selectedSubRecipeForBatch.rendimentoLote : 1)
    : 1;

  const scaledBatchIngredients = selectedSubRecipeForBatch?.ingredientes.map(ing => ({
    ...ing,
    quantidadeEscalada: Number((ing.quantidade * batchMultiplier).toFixed(2)),
    custoTotalEscalado: Number((ing.custoTotal * batchMultiplier).toFixed(2))
  })) || [];

  const scaledTotalCost = selectedSubRecipeForBatch 
    ? Number((selectedSubRecipeForBatch.custoTotalLote * batchMultiplier).toFixed(2))
    : 0;

// Helper estrito para escalar dinamicamente APENAS marcadores vinculados a ingredientes: {{manteiga}}, {{farinha}}, etc.
// NÃO altera tempos ("3 a 4 minutos"), temperaturas ("4°C") ou números de etapas.
function escalarTextoPasso(
  textoOriginal: string,
  ingredientes: SubRecipeIngredient[],
  multiplier: number
): string {
  if (!textoOriginal) return '';
  
  // Substitui marcadores explícitos: {{chave}}
  let texto = textoOriginal.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, chave) => {
    const chaveClean = chave.toLowerCase().trim().replace(/[-_]/g, ' ');
    
    // Encontra o ingrediente correspondente pelo nome ou id
    const ing = ingredientes.find(i => {
      const nomeClean = i.nome.toLowerCase();
      return (
        nomeClean.includes(chaveClean) ||
        chaveClean.split(' ').every(word => word.length > 2 && nomeClean.includes(word)) ||
        i.id.toLowerCase() === chaveClean
      );
    });

    if (!ing) return match;

    const qtdOriginal = ing.quantidade;
    const qtdEscalada = Number((qtdOriginal * multiplier).toFixed(1));
    const qtdEscaladaFmt = qtdEscalada.toLocaleString('pt-BR');
    
    return `${qtdEscaladaFmt} ${ing.unidade}`;
  });

  return texto;
}

  // Print Batch Kitchen Order
  const handlePrintBatch = () => {
    window.print();
  };

  // Open Edit Modal
  const handleOpenEdit = (sub: SubRecipe) => {
    setEditingSubRecipe({ ...sub });
    setIsEditorOpen(true);
  };

  // Open Create Modal
  const handleOpenNew = () => {
    const newSub: SubRecipe = {
      id: `sub-${Date.now()}`,
      nome: '',
      categoria: 'MOLHOS',
      descricao: '',
      rendimentoLote: 5000,
      unidadeRendimento: 'ml',
      tempoPreparoMinutos: 40,
      validadeDias: 4,
      temperaturaArmazenamento: '0°C a 4°C sob refrigeração em cuba GN com etiqueta de validade',
      ingredientes: [
        { id: `ing-${Date.now()}-1`, nome: 'Ingrediente Base 1', quantidade: 1000, unidade: 'g', custoUnitario: 0.02, custoTotal: 20.00 }
      ],
      custoTotalLote: 20.00,
      custoUnitarioCalculado: 0.004,
      utensiliosPadrao: ['Caldeirão Inox', 'Balança Digital', 'Fouet'],
      passosPreparo: [
        { passo: 1, titulo: 'Preparo Inicial', descricao: 'Homogeneizar os ingredientes na caçarola em fogo brando.', tempoMinutos: 10 }
      ],
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };
    setEditingSubRecipe(newSub);
    setIsEditorOpen(true);
  };

  // Save SubRecipe and cascade
  const handleSaveSubRecipe = (subToSave: SubRecipe) => {
    if (!subToSave.nome.trim()) {
      alert('Por favor, informe o nome da sub-receita.');
      return;
    }

    const { subRecipes: newSubs, updatedSheets } = TechnicalSheetService.saveSubRecipe(subToSave);
    onSubRecipesChange(newSubs, updatedSheets);

    // If current selected in batch was edited, update it
    if (selectedSubRecipeForBatch?.id === subToSave.id) {
      setSelectedSubRecipeForBatch(subToSave);
      setTargetBatchYield(subToSave.rendimentoLote);
    }

    setIsEditorOpen(false);
    setEditingSubRecipe(null);
    success(
      `A base "${subToSave.nome}" foi salva e recalculou o custo de todos os pratos vinculados no cardápio!`, 
      'Sub-Receita Atualizada com Sucesso'
    );
  };

  // Delete SubRecipe
  const handleDeleteSubRecipe = (sub: SubRecipe) => {
    if (window.confirm(`Deseja realmente excluir a sub-receita "${sub.nome}"?`)) {
      const updated = TechnicalSheetService.deleteSubRecipe(sub.id);
      onSubRecipesChange(updated, sheets);
      if (selectedSubRecipeForBatch?.id === sub.id) {
        setSelectedSubRecipeForBatch(updated[0] || null);
      }
      info(`A base "${sub.nome}" foi removida.`, 'Base Removida');
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Informativo da Gestão de Sub-Receitas */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Padrão Grupo Azevedo
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-amber-400/90 font-semibold">Central de Pré-Preparo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sub-Receitas & Produção de Cozinha
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Gestão de molhos artesanais, massas frescas e bases de proteínas. Quando o custo de uma batelada varia (ex: oscilação no leite ou queijo), o CMV de todos os pratos vinculados no cardápio atualiza automaticamente em cascata.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md hover:shadow-amber-500/20 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ NOVA SUB-RECEITA (BASE)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CALCULADORA DE PRODUÇÃO DE BATELADA (KITCHEN PRODUCTION CALCULATOR) */}
      {selectedSubRecipeForBatch && (
        <div className="bg-white rounded-3xl border-2 border-amber-500/30 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Calculadora de Escala para Cozinha
                  </span>
                  <span className="text-xs text-gray-300">&bull;</span>
                  <span className="text-xs font-semibold text-gray-500">
                    Ordem de Produção de Batelada
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-0.5">
                  Produzir: {selectedSubRecipeForBatch.nome}
                </h3>
              </div>
            </div>

            {/* Ações da Batelada */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintBatch}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                title="Imprimir ordem de produção para a praça da cozinha"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ordem de Batelada A4</span>
              </button>
            </div>
          </div>

          {/* Seletor de Base & Input de Rendimento Alvo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 pb-6">
            
            {/* Escolha da Base */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                Sub-Receita Selecionada
              </label>
              <select
                value={selectedSubRecipeForBatch.id}
                onChange={(e) => {
                  const found = subRecipes.find(s => s.id === e.target.value);
                  if (found) {
                    setSelectedSubRecipeForBatch(found);
                    setTargetBatchYield(found.rendimentoLote);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {subRecipes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.rendimentoLote} {s.unidadeRendimento})
                  </option>
                ))}
              </select>
            </div>

            {/* Meta de Rendimento Desejado (Volume ou Peso) */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                Meta de Rendimento Desejado ({selectedSubRecipeForBatch.unidadeRendimento})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={targetBatchYield}
                  onChange={(e) => setTargetBatchYield(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl text-sm font-black text-amber-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700">
                  {selectedSubRecipeForBatch.unidadeRendimento}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">
                Padrão 1 lote: {selectedSubRecipeForBatch.rendimentoLote} {selectedSubRecipeForBatch.unidadeRendimento} ({batchMultiplier.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}x de escala)
              </span>
            </div>

            {/* Custo Total Estimado da Produção */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Custo Total da Batelada
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {batchMultiplier.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x Lote
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
                {formatCurrency(scaledTotalCost)}
              </p>
              {(() => {
                const custoUso = formatarCustoUnidadeUso(selectedSubRecipeForBatch.custoUnitarioCalculado, selectedSubRecipeForBatch.unidadeRendimento);
                return (
                  <span className="text-[11px] text-slate-300 font-mono">
                    Custo unitário: <strong className="text-white">{custoUso.principal}</strong> <span className="text-slate-400 font-normal">({custoUso.secundario})</span>
                  </span>
                );
              })()}
            </div>

          </div>

          {/* Tabela de Insumos Escalados */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-700">
              <span>Lista de Ingredientes Brutos Dimensionados para Esta Batelada ({targetBatchYield} {selectedSubRecipeForBatch.unidadeRendimento})</span>
              <span className="text-amber-700 font-mono font-bold">{scaledBatchIngredients.length} insumos</span>
            </div>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Ingrediente Bruto</th>
                  <th className="py-2.5 px-3 text-center">Unidade</th>
                  <th className="py-2.5 px-3 text-right">Qtd Base (1 Lote)</th>
                  <th className="py-2.5 px-3 text-right font-black text-amber-900 bg-amber-50/50">Qtd a Pesar Hoje</th>
                  <th className="py-2.5 px-4 text-right">Custo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scaledBatchIngredients.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-gray-900">
                      {item.nome}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                        {item.unidade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-500">
                      {item.quantidade} {item.unidade}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 bg-amber-50/40 text-sm">
                      {item.quantidadeEscalada} {item.unidade}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-800">
                      {formatCurrency(item.custoTotalEscalado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Passos Rápidos de Cozinha da Batelada */}
          <div className="mt-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-amber-600" />
              <span>Instruções de Produção & Ponto Ideal ({selectedSubRecipeForBatch.passosPreparo.length} etapas)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {selectedSubRecipeForBatch.passosPreparo.map((p) => {
                const descricaoEscalada = escalarTextoPasso(p.descricao, selectedSubRecipeForBatch.ingredientes, batchMultiplier);
                return (
                  <div key={p.passo} className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="font-bold text-amber-800">Etapa {p.passo}: {p.titulo}</span>
                    <p className="text-gray-700 mt-1 leading-relaxed">{descricaoEscalada}</p>
                    {p.alertaPonto && (
                      <span className="block mt-1 text-[11px] font-bold text-amber-700">
                        &bull; Atenção: {p.alertaPonto}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* FILTROS POR CATEGORIA DE SUB-RECEITA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
            Filtrar Categoria:
          </span>
          {(['TODAS', 'MOLHOS', 'MASSAS', 'PROTEINAS', 'BASES'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat === 'TODAS' ? 'Todas as Bases' : cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500 font-medium">
          {filteredSubs.length} sub-receitas ativas no catálogo
        </span>
      </div>

      {/* GRID DE CARDS DAS SUB-RECEITAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubs.map((sub) => {
          const linkedDishes = getLinkedDishes(sub.id, sub.nome);

          return (
            <div
              key={sub.id}
              className="bg-white rounded-3xl border border-gray-200/90 hover:border-amber-400 hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      {sub.categoria}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {sub.tempoPreparoMinutos} min
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 group-hover:text-amber-600 transition-colors">
                    {sub.nome}
                  </h3>
                  {sub.descricao && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {sub.descricao}
                    </p>
                  )}
                </div>

                {(() => {
                  const custoUso = formatarCustoUnidadeUso(sub.custoUnitarioCalculado, sub.unidadeRendimento);
                  return (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Custo Base de Uso
                      </span>
                      <span className="text-base font-black text-amber-700 font-mono block">
                        {custoUso.principal}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono block">
                        {custoUso.secundario}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
                        Lote: {formatCurrency(sub.custoTotalLote)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Informações Técnicas e de Conservação */}
              <div className="p-5 space-y-3 flex-1 text-xs">
                
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Rendimento Padrão
                    </span>
                    <span className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                      {sub.rendimentoLote} {sub.unidadeRendimento}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Validade Máxima
                    </span>
                    <span className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                      {sub.validadeDias} dias sob 0°-4°C
                    </span>
                  </div>
                </div>

                {/* Pratos Vinculados no Cardápio */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                      Pratos Vinculados ({linkedDishes.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {linkedDishes.length > 0 ? (
                      linkedDishes.map(d => (
                        <span
                          key={d.id}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-medium truncate max-w-[200px]"
                          title={d.nome}
                        >
                          {d.nome}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">
                        Nenhum prato vinculado diretamente ainda.
                      </span>
                    )}
                  </div>
                </div>

                {/* Ingredientes Resumo */}
                <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">Composição ({sub.ingredientes.length} insumos): </span>
                  {sub.ingredientes.map(i => i.nome).join(', ')}
                </div>

              </div>

              {/* Ações do Card */}
              <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubRecipeForBatch(sub);
                    setTargetBatchYield(sub.rendimentoLote);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Escalar Produção</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    title="Editar Sub-Receita e Insumos"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubRecipe(sub)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Sub-Receita"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE SUB-RECEITA */}
      {isEditorOpen && editingSubRecipe && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-linear-to-r from-amber-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {editingSubRecipe.nome ? `Editar: ${editingSubRecipe.nome}` : 'Nova Sub-Receita / Base Corporativa'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ao salvar, o custo unitário será cascateado para todos os pratos que usam esta base.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingSubRecipe(null);
                }}
                className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Nome da Sub-Receita / Base *
                  </label>
                  <input
                    type="text"
                    value={editingSubRecipe.nome}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, nome: e.target.value })}
                    placeholder="Ex: Molho Branco Artesanal (Bechamel)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Categoria
                  </label>
                  <select
                    value={editingSubRecipe.categoria}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, categoria: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="MOLHOS">MOLHOS</option>
                    <option value="MASSAS">MASSAS</option>
                    <option value="PROTEINAS">PROTEINAS</option>
                    <option value="BASES">BASES</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Descrição Técnica
                </label>
                <input
                  type="text"
                  value={editingSubRecipe.descricao}
                  onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, descricao: e.target.value })}
                  placeholder="Ex: Base aveludada clássica com roux loiro e toque de noz moscada."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Rendimento e Armazenamento */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Rendimento do Lote *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingSubRecipe.rendimentoLote}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, rendimentoLote: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={editingSubRecipe.unidadeRendimento}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, unidadeRendimento: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    <option value="ml">ml (Mililitros)</option>
                    <option value="g">g (Gramas)</option>
                    <option value="un">un (Unidades)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Tempo Preparo (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingSubRecipe.tempoPreparoMinutos}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, tempoPreparoMinutos: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Validade (Dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingSubRecipe.validadeDias}
                    onChange={(e) => setEditingSubRecipe({ ...editingSubRecipe, validadeDias: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
              </div>

              {/* Tabela de Insumos da Sub-Receita */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Ingredientes do Lote
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newIng: SubRecipeIngredient = {
                        id: `sbi-${Date.now()}`,
                        nome: '',
                        quantidade: 100,
                        unidade: 'g',
                        custoUnitario: 0.02,
                        custoTotal: 2.00
                      };
                      setEditingSubRecipe({
                        ...editingSubRecipe,
                        ingredientes: [...editingSubRecipe.ingredientes, newIng]
                      });
                    }}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Insumo
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3">Insumo</th>
                        <th className="py-2 px-2 text-center">Un</th>
                        <th className="py-2 px-2 text-right">Qtd</th>
                        <th className="py-2 px-2 text-right">Custo Unit</th>
                        <th className="py-2 px-3 text-right">Total R$</th>
                        <th className="py-2 px-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editingSubRecipe.ingredientes.map((ing, idx) => (
                        <tr key={ing.id || idx}>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={ing.nome}
                              onChange={(e) => {
                                const next = [...editingSubRecipe.ingredientes];
                                next[idx].nome = e.target.value;
                                setEditingSubRecipe({ ...editingSubRecipe, ingredientes: next });
                              }}
                              placeholder="Nome do insumo..."
                              className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md font-medium text-gray-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <select
                              value={ing.unidade}
                              onChange={(e) => {
                                const next = [...editingSubRecipe.ingredientes];
                                next[idx].unidade = e.target.value as any;
                                setEditingSubRecipe({ ...editingSubRecipe, ingredientes: next });
                              }}
                              className="px-1 py-1 bg-gray-50 border border-gray-200 rounded-md uppercase text-[10px] font-bold"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="un">un</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={ing.quantidade}
                              onChange={(e) => {
                                const next = [...editingSubRecipe.ingredientes];
                                const qtd = Number(e.target.value) || 0;
                                next[idx].quantidade = qtd;
                                next[idx].custoTotal = Number((qtd * next[idx].custoUnitario).toFixed(2));
                                setEditingSubRecipe({ ...editingSubRecipe, ingredientes: next });
                              }}
                              className="w-16 px-1.5 py-1 text-right font-mono bg-gray-50 border border-gray-200 rounded-md font-bold"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={ing.custoUnitario}
                              onChange={(e) => {
                                const next = [...editingSubRecipe.ingredientes];
                                const cu = Number(e.target.value) || 0;
                                next[idx].custoUnitario = cu;
                                next[idx].custoTotal = Number((next[idx].quantidade * cu).toFixed(2));
                                setEditingSubRecipe({ ...editingSubRecipe, ingredientes: next });
                              }}
                              className="w-20 px-1.5 py-1 text-right font-mono bg-gray-50 border border-gray-200 rounded-md"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                            {formatCurrency(ing.custoTotal)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next = editingSubRecipe.ingredientes.filter((_, i) => i !== idx);
                                setEditingSubRecipe({ ...editingSubRecipe, ingredientes: next });
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Custo estimado por {editingSubRecipe.unidadeRendimento}:{' '}
                <span className="font-bold font-mono text-amber-700">
                  {formatCurrency(
                    (editingSubRecipe.ingredientes.reduce((sum, i) => sum + i.custoTotal, 0)) / 
                    (editingSubRecipe.rendimentoLote || 1)
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubRecipe(editingSubRecipe)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar e Recalcular Cardápio</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
