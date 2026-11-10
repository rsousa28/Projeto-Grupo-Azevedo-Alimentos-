import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { ImpactAnalysis } from '../../services/IngredientService';
import { formatarMoedaBRL } from '../../utils/foodServiceMath';

interface PriceImpactAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  impact: ImpactAnalysis | null;
  ingredientName: string;
}

export const PriceImpactAlertModal: React.FC<PriceImpactAlertModalProps> = ({
  isOpen,
  onClose,
  impact,
  ingredientName
}) => {
  if (!isOpen || !impact || !impact.hasPriceChange) return null;

  const isIncrease = impact.deltaPercent > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#2C2C2C] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isIncrease ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isIncrease ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'
            }`}>
              {isIncrease ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
                Impacto de Preço em Cascata
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Insumo: <span className="font-bold text-gray-900 dark:text-white">{ingredientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Card de Variação de Preço */}
          <div className="p-4 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Preço Anterior
              </span>
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400 font-mono">
                {formatarMoedaBRL(impact.oldPriceCentavos, true)}
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400" />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Novo Preço
              </span>
              <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                {formatarMoedaBRL(impact.newPriceCentavos, true)}
              </div>
            </div>

            <div className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono ${
              isIncrease ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
              {isIncrease ? '+' : ''}{impact.deltaPercent}%
            </div>
          </div>

          {/* Receitas Afetadas */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Receitas & Pratos Impactados</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Sub-Receitas</span>
                <div className="text-xl font-black text-amber-600 font-mono">
                  {impact.affectedSubRecipesCount}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Pratos Finais</span>
                <div className="text-xl font-black text-amber-600 font-mono">
                  {impact.affectedDishesCount}
                </div>
              </div>
            </div>

            {impact.affectedDishesNames.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl max-h-36 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  Lista de Pratos com Custo Atualizado:
                </span>
                <ul className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                  {impact.affectedDishesNames.map((dishName, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{dishName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <p>
              O motor matemático recalculou automaticamente os custos diretos das sub-receitas e pratos vinculados com precisão decimal.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#2C2C2C] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
