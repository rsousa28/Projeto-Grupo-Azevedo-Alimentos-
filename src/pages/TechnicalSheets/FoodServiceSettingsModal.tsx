import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Save, 
  Percent, 
  Clock, 
  Store, 
  ShieldCheck, 
  DollarSign, 
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { StoreFoodServiceSettings } from '../../types/foodService';
import { FoodServiceSettingsService } from '../../services/FoodServiceSettingsService';
import { formatarPercentualBRL } from '../../utils/foodServiceMath';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

interface FoodServiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  onSettingsSaved?: (newSettings: StoreFoodServiceSettings) => void;
}

export const FoodServiceSettingsModal: React.FC<FoodServiceSettingsModalProps> = ({
  isOpen,
  onClose,
  storeId = '3',
  storeName = 'Vero Pasta',
  onSettingsSaved
}) => {
  const { user } = useAuth();
  const { success } = useToast();

  const [settings, setSettings] = useState<StoreFoodServiceSettings>(() => 
    FoodServiceSettingsService.getSettings(storeId)
  );

  const [metaCmvInput, setMetaCmvInput] = useState('32,0');
  const [diasAlertaInput, setDiasAlertaInput] = useState('15');
  const [taxaDespesasFixasInput, setTaxaDespesasFixasInput] = useState('18,0');
  const [margemLucroInput, setMargemLucroInput] = useState('15,0');

  useEffect(() => {
    if (isOpen) {
      const current = FoodServiceSettingsService.getSettings(storeId);
      setSettings(current);
      setMetaCmvInput((current.metaCmvPercent * 100).toFixed(1).replace('.', ','));
      setDiasAlertaInput(String(current.alertaDesatualizadoDias));
      setTaxaDespesasFixasInput((current.taxaRateioDespesasFixasPercent * 100).toFixed(1).replace('.', ','));
      setMargemLucroInput((current.margemLucroDesejadaPercent * 100).toFixed(1).replace('.', ','));
    }
  }, [isOpen, storeId]);

  if (!isOpen) return null;

  const isAdmin = user?.role === 'ADMIN' || user?.username === 'adm' || (user?.username || '').includes('rennan');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const metaCmvNum = (parseFloat(metaCmvInput.replace(',', '.')) || 32) / 100;
    const diasAlertaNum = parseInt(diasAlertaInput, 10) || 15;
    const taxaFixaNum = (parseFloat(taxaDespesasFixasInput.replace(',', '.')) || 18) / 100;
    const margemLucroNum = (parseFloat(margemLucroInput.replace(',', '.')) || 15) / 100;

    const updated: StoreFoodServiceSettings = {
      ...settings,
      metaCmvPercent: metaCmvNum,
      alertaDesatualizadoDias: diasAlertaNum,
      taxaRateioDespesasFixasPercent: taxaFixaNum,
      margemLucroDesejadaPercent: margemLucroNum
    };

    FoodServiceSettingsService.saveSettings(updated);
    if (onSettingsSaved) onSettingsSaved(updated);
    success('Parâmetros operacionais e metas de CMV da unidade atualizados!', 'Configurações Salvas');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Configurações Operacionais & Metas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  {storeName}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Parâmetros de semáforo de CMV e alertas de compra editáveis pelo Admin
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Card Meta de CMV */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                Meta de CMV Teórico da Unidade (%)
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Verde até {metaCmvInput}%
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Pratos com CMV até esta meta receberão selo verde (Ótimo). Até +3 p.p. receberão amarelo (Atenção) e acima disso, vermelho (Alto).
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={metaCmvInput}
                onChange={e => setMetaCmvInput(e.target.value)}
                placeholder="32,0"
                className="w-32 px-3 py-2 text-sm font-mono font-black bg-white border border-emerald-300 rounded-xl text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-center"
              />
              <span className="text-xs font-bold text-emerald-900">%</span>
            </div>
          </div>

          {/* Card Prazo de Preço Desatualizado */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Prazo de Preço Desatualizado (dias)
              </label>
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                Alerta &gt; {diasAlertaInput} dias
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80">
              Insumos cuja última nota fiscal de compra tiver sido emitida há mais dias que este limite aparecerão no card de alerta da Aba de Insumos.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="90"
                value={diasAlertaInput}
                onChange={e => setDiasAlertaInput(e.target.value)}
                placeholder="15"
                className="w-32 px-3 py-2 text-sm font-mono font-black bg-white border border-amber-300 rounded-xl text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-center"
              />
              <span className="text-xs font-bold text-amber-900">dias corridos</span>
            </div>
          </div>

          {/* Parâmetros DRE (Rateio e Lucro) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                Rateio Despesas Fixas (%)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={taxaDespesasFixasInput}
                  onChange={e => setTaxaDespesasFixasInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg text-gray-900"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                Margem Líquida Alvo (%)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={margemLucroInput}
                  onChange={e => setMargemLucroInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg text-gray-900"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
