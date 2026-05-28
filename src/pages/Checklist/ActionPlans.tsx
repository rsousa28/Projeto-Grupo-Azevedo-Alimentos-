import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Camera, 
  X, 
  MessageSquare,
  Check,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../contexts/StoreContext';
import { ActionPlan } from '../../types/checklist';
import { PhotoZoomModal } from '../../components/PhotoZoomModal';

interface ActionPlansProps {
  actionPlans: ActionPlan[];
  onResolvePlan: (id: string, notes: string, photo?: string) => void;
  onDeletePlan?: (id: string) => void;
}

export default function ActionPlans({ actionPlans, onResolvePlan, onDeletePlan }: ActionPlansProps) {
  const { isDarkMode, currentStore } = useStore();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');

  // Confirmation state for deleting a resolved plan
  const [planToDelete, setPlanToDelete] = useState<ActionPlan | null>(null);

  // Resolution editor state
  const [resolvingPlanId, setResolvingPlanId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [zoomedPlanPhoto, setZoomedPlanPhoto] = useState<string | null>(null);

  // Filter plans based on active store and selected filter status
  const filteredPlans = React.useMemo(() => {
    return actionPlans.filter(plan => {
      const matchStore = currentStore.id === 'admin-global' || plan.storeId === currentStore.id;
      const matchStatus = filterStatus === 'ALL' || plan.status === filterStatus;
      return matchStore && matchStatus;
    });
  }, [actionPlans, currentStore, filterStatus]);

  // Handle Preset photos for solving plan quickly
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolutionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingPlanId) return;

    onResolvePlan(resolvingPlanId, resolutionNotes, resolutionPhoto || undefined);

    // Reset editor
    setResolvingPlanId(null);
    setResolutionNotes('');
    setResolutionPhoto(null);
  };

  // Quick statistics
  const pendingCount = actionPlans.filter(p => (currentStore.id === 'admin-global' || p.storeId === currentStore.id) && p.status === 'PENDING').length;
  const resolvedCount = actionPlans.filter(p => (currentStore.id === 'admin-global' || p.storeId === currentStore.id) && p.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Mini Stat Badges */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          {['PENDING', 'RESOLVED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                filterStatus === st
                  ? st === 'PENDING'
                    ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                    : st === 'RESOLVED'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-indigo-500 border-indigo-500 text-white'
                  : isDarkMode
                    ? 'bg-zinc-900 border-zinc-850 text-slate-400 hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'PENDING' ? `Pendentes (${pendingCount})` : st === 'RESOLVED' ? `Resolvidos (${resolvedCount})` : 'Todos'}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400 font-extrabold uppercase italic">
          💡 Os Planos de ação são iniciados a partir de respostas negativas em vistorias críticas.
        </span>
      </div>

      {/* Grid of Action Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlans.length === 0 ? (
          <div className="col-span-1 md:col-span-2 p-16 text-center border rounded-[3rem] bg-zinc-900/10 dark:bg-zinc-950/20">
            <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-500">Parabéns! Nenhum plano de ação pendente encontrado para este filtro.</p>
          </div>
        ) : (
          filteredPlans.map(plan => (
            <motion.div
              layout
              key={plan.id}
              className={`p-6 rounded-[2.5rem] border transition-all relative overflow-hidden flex flex-col justify-between ${
                plan.status === 'RESOLVED'
                  ? 'border-emerald-500/20 bg-emerald-500/[0.01]'
                  : 'border-rose-500/20 bg-rose-500/[0.01] shadow-lg shadow-rose-500/[0.02]'
              } ${isDarkMode ? 'bg-zinc-950' : 'bg-white'}`}
            >
              {/* Badge indicating urgency and category info */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    plan.status === 'RESOLVED' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                  }`}>
                    {plan.status === 'RESOLVED' ? 'RESOLVIDO' : 'PENDENTE'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{plan.category}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {plan.storeName}
                  </span>
                  {plan.status === 'RESOLVED' && onDeletePlan && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlanToDelete(plan);
                      }}
                      className="p-1 px-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shrink-0"
                      title="Excluir Plano de Ação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action plan title instruction */}
              <div className="space-y-2">
                <h4 className={`text-sm font-black uppercase italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {plan.actionTitle}
                </h4>

                <div className={`p-4 rounded-2xl text-[11px] leading-relaxed font-bold border ${
                  isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-slate-300' : 'bg-slate-50/50 border-slate-100 text-slate-700'
                }`}>
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 block mb-1">Motivo do gatilho</span>
                  Pergunta: "{plan.questionText}" <br />
                  <span className="text-rose-500">Resposta apurada: {plan.triggerAnswer}</span>
                </div>
              </div>

              {/* Assignment specifics */}
              <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-bold mt-4 pt-4 border-t border-slate-100 dark:border-zinc-900">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] text-slate-400 block uppercase leading-none font-extrabold">Responsável</span>
                    <span>{plan.responsible}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] text-slate-400 block uppercase leading-none font-extrabold">Prazo</span>
                    <span>{plan.deadline}</span>
                  </div>
                </div>
              </div>

              {/* Solved data logs display */}
              {plan.status === 'RESOLVED' ? (
                <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase italic">
                    <CheckCircle className="w-4 h-4" /> Solucionado com sucesso!
                  </div>
                  {plan.resolutionNotes && (
                    <p className="text-[11px] font-bold italic leading-relaxed text-slate-400">
                      " {plan.resolutionNotes} "
                    </p>
                  )}
                  {plan.resolvedAt && (
                    <div className="text-[9px] text-slate-400 font-bold uppercase">
                      Respondido em: {new Date(plan.resolvedAt).toLocaleDateString('pt-BR')} às {new Date(plan.resolvedAt).toLocaleTimeString('pt-BR')}
                    </div>
                  )}
                  {plan.resolutionPhoto && (
                    <div 
                      onClick={() => setZoomedPlanPhoto(plan.resolutionPhoto || null)}
                      className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 cursor-zoom-in group hover:brightness-95 transition-all shadow-sm shrink-0"
                      title="Clique para Zoom"
                    >
                      <img src={plan.resolutionPhoto} alt="Resolução" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-black uppercase text-white bg-indigo-600/60">
                        ZOOM
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-zinc-900 flex justify-end">
                  <button
                    onClick={() => setResolvingPlanId(plan.id)}
                    className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Dar Baixa / Resolver
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* DETAILED RESOLUTION DIALOG MODAL */}
      <AnimatePresence>
        {resolvingPlanId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setResolvingPlanId(null)}
            />
            
            <motion.form 
              onSubmit={handleResolveSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6 ${
                isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Resolver Plano de Ação</h3>
                </div>
                <button type="button" onClick={() => setResolvingPlanId(null)} className="p-1 rounded-full"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase italic text-slate-400">Ações Corretivas Aplicadas</label>
                  <textarea
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Descreva as ações aplicadas para sanar esta não-conformidade..."
                    className={`w-full p-4 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500 h-28 resize-none transition-all ${
                      isDarkMode ? 'bg-black border-slate-800 text-white placeholder:text-zinc-650' : 'bg-slate-50 border-slate-100 text-black'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase italic text-slate-400 block">Comprovação Fotográfica da Solução</span>
                  
                  {resolutionPhoto ? (
                    <div 
                      onClick={() => setZoomedPlanPhoto(resolutionPhoto)}
                      className="relative w-36 h-24 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 cursor-zoom-in group hover:brightness-95 transition-all shadow-md"
                      title="Clique para Zoom"
                    >
                      <img src={resolutionPhoto} alt="Solução" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                      <div className="absolute inset-z bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-black uppercase transition-opacity">
                        ZOOM
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Stop trigger zoom click
                          setResolutionPhoto(null);
                        }}
                        className="absolute bottom-2 right-2 bg-black/8 w-7 h-7 bg-zinc-950/80 backdrop-blur rounded-full flex items-center justify-center text-white font-bold hover:bg-rose-650 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      isDarkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-slate-300 hover:bg-zinc-900' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}>
                      <Camera className="w-4 h-4" />
                      Carregar Foto do Conserto (Opcional)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-zinc-850">
                <button 
                  type="button"
                  onClick={() => setResolvingPlanId(null)}
                  className={`px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors ${
                    isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Confirmar Resolução
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED DELETE PLAN CONFIRMATION PROMPT */}
      <AnimatePresence>
        {planToDelete && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setPlanToDelete(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-sm overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6 ${
                isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 flex flex-col items-center">
                  <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Excluir Plano de Ação?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold">
                    Deseja mesmo remover o plano resolvido <span className="font-extrabold text-[#FFCB05]">"{planToDelete.actionTitle}"</span>?
                  </p>
                  <p className="text-[10px] text-rose-500 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10 mt-2">
                    Esta ação removerá permanentemente o histórico de resolução deste plano para a unidade <span className="font-black">{planToDelete.storeName}</span>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className={`px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors flex-1 ${
                    isDarkMode ? 'text-slate-400 hover:text-white bg-zinc-900 border border-zinc-900' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-100'
                  }`}
                >
                  Voltar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onDeletePlan) {
                      onDeletePlan(planToDelete.id);
                    }
                    setPlanToDelete(null);
                  }}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex-1"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Zoom Lightbox in Action Plans */}
      <PhotoZoomModal 
        isOpen={!!zoomedPlanPhoto} 
        src={zoomedPlanPhoto || ''} 
        onClose={() => setZoomedPlanPhoto(null)} 
        alt="Foto do Plano de Ação"
      />
    </div>
  );
}
