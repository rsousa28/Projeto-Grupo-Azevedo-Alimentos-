import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Clipboard, 
  FileText,
  AlertCircle,
  Clock,
  User,
  Settings2,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, STORES } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  ChecklistTemplate, 
  ChecklistQuestion, 
  ChecklistCategory, 
  ResponseType 
} from '../../types/checklist';

const CATEGORIES: ChecklistCategory[] = [
  'Abertura da loja',
  'Fechamento',
  'Limpeza',
  'Produção',
  'Estoque',
  'Segurança alimentar',
  'Caixa',
  'Equipamentos',
  'Delivery',
  'Manutenção'
];

const RESPONSE_TYPES: { value: ResponseType; label: string }[] = [
  { value: 'sim_nao', label: 'Sim / Não' },
  { value: 'texto', label: 'Texto Descritivo' },
  { value: 'numero', label: 'Número' },
  { value: 'foto', label: 'Carregar Foto' },
  { value: 'assinatura', label: 'Assinatura Eletrônica' },
  { value: 'multipla_escolha', label: 'Múltiplas Opções (Pills)' },
  { value: 'temperatura', label: 'Temperatura (ºC)' },
  { value: 'data_hora', label: 'Data e Hora' }
];

interface TemplatesProps {
  templates: ChecklistTemplate[];
  onSaveTemplates: (updated: ChecklistTemplate[]) => Promise<void>;
  onComplete?: (templateId?: string, updatedTemplates?: ChecklistTemplate[]) => void;
}

export default function ChecklistTemplates({ templates, onSaveTemplates, onComplete }: TemplatesProps) {
  const { currentStore, setStore, isDarkMode, brandColors } = useStore();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize activeTemplateId automatically when templates prop changes (e.g. on store switch)
  React.useEffect(() => {
    if (templates && templates.length > 0) {
      if (!activeTemplateId || !templates.some(t => t.id === activeTemplateId)) {
        setActiveTemplateId(templates[0].id);
      }
    } else {
      setActiveTemplateId(null);
    }
  }, [templates, activeTemplateId]);

  // Reset editing question state if templates change to avoid editing mismatch questions
  React.useEffect(() => {
    setEditingQuestion(null);
  }, [templates]);

  // Modal triggers
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // New Template Inputs
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<ChecklistCategory>('Abertura da loja');

  // New Question Inputs
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<ResponseType>('sim_nao');
  const [qRequired, setQRequired] = useState(true);
  const [qWeight, setQWeight] = useState(3);
  const [qPhotoRequired, setQPhotoRequired] = useState(false);
  const [qEnableObs, setQEnableObs] = useState(true);
  const [qResponsible, setQResponsible] = useState('Gerente');
  const [qDeadline, setQDeadline] = useState('24h');
  const [qOptions, setQOptions] = useState('Excelente,Bom,Regular,Ruim'); // For choice
  
  // Intelligent Flow state
  const [enableFlow, setEnableFlow] = useState(false);
  const [flowTrigger, setFlowTrigger] = useState('NÃO');
  const [flowActionTitle, setFlowActionTitle] = useState('');

  // Edit Question States
  const [editingQuestion, setEditingQuestion] = useState<ChecklistQuestion | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQType, setEditQType] = useState<ResponseType>('sim_nao');
  const [editQRequired, setEditQRequired] = useState(true);
  const [editQWeight, setEditQWeight] = useState(3);
  const [editQPhotoRequired, setEditQPhotoRequired] = useState(false);
  const [editQEnableObs, setEditQEnableObs] = useState(true);
  const [editQResponsible, setEditQResponsible] = useState('Gerente');
  const [editQDeadline, setEditQDeadline] = useState('24h');
  const [editQOptions, setEditQOptions] = useState('Excelente,Bom,Regular,Ruim');
  const [editEnableFlow, setEditEnableFlow] = useState(false);
  const [editFlowTrigger, setEditFlowTrigger] = useState('NÃO');
  const [editFlowActionTitle, setEditFlowActionTitle] = useState('');

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  // Create Template
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) return;

    const newTemplate: ChecklistTemplate = {
      id: `temp_${Date.now()}`,
      title: newTemplateTitle,
      description: newTemplateDesc,
      category: newTemplateCategory,
      questions: [],
      storeId: 'all',
      createdAt: new Date().toISOString()
    };

    onSaveTemplates([newTemplate, ...templates]);
    setActiveTemplateId(newTemplate.id);
    toastSuccess("Modelo de checklist criado com sucesso!");
    
    // Reset form
    setNewTemplateTitle('');
    setNewTemplateDesc('');
    setShowNewTemplateModal(false);
  };

  // Delete Template pointer triggering confirmation dialog
  const handleDeleteTemplate = (id: string, name: string) => {
    setTemplateToDelete({ id, name });
  };

  // Perform actual deletion safe from browser popup blocks
  const confirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    const { id } = templateToDelete;
    const filtered = templates.filter(t => t.id !== id);
    onSaveTemplates(filtered);
    if (activeTemplateId === id) {
      setActiveTemplateId(filtered[0]?.id || null);
    }
    toastSuccess("Modelo de checklist excluído com sucesso.");
    setTemplateToDelete(null);
  };

  // Create Question in Active Template
  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplateId || !qText.trim()) return;

    const newQuestion: ChecklistQuestion = {
      id: `q_${Date.now()}`,
      questionText: qText,
      responseType: qType,
      required: qRequired,
      weight: Number(qWeight),
      photoRequired: qPhotoRequired,
      enableObservation: qEnableObs,
      responsible: qResponsible,
      deadline: qDeadline,
      storeId: 'all',
      category: activeTemplate?.category || 'Abertura da loja',
      options: qType === 'multipla_escolha' ? qOptions.split(',').map(s => s.trim()) : undefined,
      intelligentFlow: enableFlow ? {
        triggerOnValue: flowTrigger,
        actionPlanTitle: flowActionTitle || `Corrigir desconformidade em: ${qText}`,
        requirePhotoOnTrigger: true
      } : undefined
    };

    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return {
          ...t,
          questions: [...t.questions, newQuestion]
        };
      }
      return t;
    });

    onSaveTemplates(updated);
    toastSuccess("Pergunta adicionada com sucesso!");
    
    // Reset question wizard
    setQText('');
    setQType('sim_nao');
    setQRequired(true);
    setQWeight(3);
    setQPhotoRequired(false);
    setQEnableObs(true);
    setQResponsible('Gerente');
    setQDeadline('24h');
    setEnableFlow(false);
    setFlowTrigger('NÃO');
    setFlowActionTitle('');
    setShowNewQuestionModal(false);
  };

  // Delete specific question
  const handleDeleteQuestion = (qId: string) => {
    if (!activeTemplateId) return;
    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return {
          ...t,
          questions: t.questions.filter(q => q.id !== qId)
        };
      }
      return t;
    });
    onSaveTemplates(updated);
    toastSuccess("Pergunta excluída com sucesso.");
  };

  // Start question edit workflow
  const handleBeginEditQuestion = (q: ChecklistQuestion) => {
    setEditingQuestion(q);
    setEditQText(q.questionText);
    setEditQType(q.responseType);
    setEditQRequired(q.required);
    setEditQWeight(q.weight);
    setEditQPhotoRequired(q.photoRequired);
    setEditQEnableObs(q.enableObservation);
    setEditQResponsible(q.responsible || 'Gerente');
    setEditQDeadline(q.deadline || '24h');
    setEditQOptions(q.options ? q.options.join(',') : 'Excelente,Bom,Regular,Ruim');
    setEditEnableFlow(!!q.intelligentFlow);
    setEditFlowTrigger(q.intelligentFlow?.triggerOnValue || 'NÃO');
    setEditFlowActionTitle(q.intelligentFlow?.actionPlanTitle || '');
  };

  // Save edited question
  const handleSaveEditQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplateId || !editingQuestion || !editQText.trim()) return;

    const updatedQuestion: ChecklistQuestion = {
      ...editingQuestion,
      questionText: editQText,
      responseType: editQType,
      required: editQRequired,
      weight: Number(editQWeight),
      photoRequired: editQPhotoRequired,
      enableObservation: editQEnableObs,
      responsible: editQResponsible,
      deadline: editQDeadline,
      options: editQType === 'multipla_escolha' ? editQOptions.split(',').map(s => s.trim()) : undefined,
      intelligentFlow: editEnableFlow ? {
        triggerOnValue: editFlowTrigger,
        actionPlanTitle: editFlowActionTitle || `Corrigir desconformidade em: ${editQText}`,
        requirePhotoOnTrigger: true
      } : undefined
    };

    const updated = templates.map(t => {
      if (t.id === activeTemplateId) {
        return {
          ...t,
          questions: t.questions.map(q => q.id === editingQuestion.id ? updatedQuestion : q)
        };
      }
      return t;
    });

    onSaveTemplates(updated);
    toastSuccess("Pergunta atualizada com sucesso!");
    setEditingQuestion(null);
  };

  // Autofill templates flow template when question type changes
  React.useEffect(() => {
    if (qType === 'sim_nao') {
      setFlowTrigger('NÃO');
    } else if (qType === 'temperatura') {
      setFlowTrigger('< -18');
    } else {
      setFlowTrigger('');
    }
  }, [qType]);

  // Autofill templates flow template when edit question type changes
  React.useEffect(() => {
    if (editQType === 'sim_nao') {
      setEditFlowTrigger('NÃO');
    } else if (editQType === 'temperatura') {
      setEditFlowTrigger('< -18');
    } else {
      setEditFlowTrigger('');
    }
  }, [editQType]);

  return (
    <div className="space-y-6">
      {/* Active Branch Selector Banner */}
      <div className={`p-5 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-[#121212]/60 border-amber-500/20 shadow-md' : 'bg-amber-500/5 border-amber-500/10 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFCB05]/10 flex items-center justify-center shrink-0 text-[#FFCB05]">
            <Settings className="w-5 h-5 animate-pulse text-[#FFCB05]" />
          </div>
          <div>
            <h4 className={`text-xs font-black uppercase italic ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              Configurando Checklist da Unidade: <span className="text-sm font-black underline italic tracking-tight">{currentStore.name} ({currentStore.code || 'GERAL'})</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
              Tudo que você cadastrar, excluir ou editar nesta aba será salvo para a filial selecionada acima.
            </p>
          </div>
        </div>

        {/* Change Store selector dropdown if user is administrator or financial roles */}
        {(user?.role === 'ADMIN' || user?.role === 'FINANCIAL') && (
          <div className="flex items-center gap-2 self-start md:self-center bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Filial ativa:</span>
            <select
              value={currentStore.id}
              onChange={(e) => {
                const selected = STORES.find(s => s.id === e.target.value);
                if (selected) {
                  setStore(selected);
                  toastSuccess(`Alterado para configurar: ${selected.name}`);
                }
              }}
              className={`px-2 py-1 bg-transparent rounded-lg text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}
            >
              {STORES.map(s => (
                <option key={s.id} value={s.id} className={isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-slate-800'}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Templates Selector List Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-black uppercase italic tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Modelos Existentes</h3>
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFCB05] text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-3 h-3" /> Criar Novo
          </button>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {templates.length === 0 ? (
            <div className={`p-8 text-center rounded-3xl border ${isDarkMode ? 'bg-[#151515] border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <Clipboard className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-bold">Nenhum modelo cadastrado.</p>
            </div>
          ) : (
            templates.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                  activeTemplateId === t.id
                    ? (isDarkMode ? 'bg-zinc-900 border-[#FFCB05]' : 'bg-slate-50 border-amber-500 shadow-md')
                    : (isDarkMode ? 'bg-black border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50')
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-[#FFCB05]/10 text-[#FFCB05]' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(t.id, t.title);
                    }}
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-2.5 lg:p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all scale-100 flex items-center justify-center shrink-0"
                    title="Excluir Modelo"
                  >
                    <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                  </button>
                </div>

                <h4 className={`text-xs font-black uppercase italic leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.title}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{t.description}</p>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <span className="flex items-center gap-1 text-slate-500"><Settings2 className="w-3 h-3" /> {t.questions.length} Questões</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Template Detail / List of Questions */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {activeTemplate ? (
            <motion.div
              key={activeTemplate.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`p-6 rounded-[2.5rem] border ${
                isDarkMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-xl shadow-slate-100/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-900 mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-500">{activeTemplate.category}</span>
                  <h2 className={`text-xl font-black uppercase italic leading-none mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeTemplate.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{activeTemplate.description}</p>
                </div>
                <button
                  onClick={() => setShowNewQuestionModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <h4 className={`text-xs font-black uppercase italic tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lista de Perguntas Cadastradas</h4>
                
                {activeTemplate.questions.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl">
                    <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-xs font-bold leading-normal">Este modelo ainda não tem perguntas criadas.</p>
                    <button
                      onClick={() => setShowNewQuestionModal(true)}
                      className="mt-4 text-[10px] text-indigo-500 hover:underline font-black uppercase tracking-wider"
                    >
                      Adicionar Pergunta Agora
                    </button>
                  </div>
                ) : (
                  activeTemplate.questions.map((q, idx) => (
                    <div 
                      key={q.id}
                      className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-900 hover:border-zinc-800' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black rounded-lg w-5 h-5 flex items-center justify-center ${
                            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-black uppercase text-[#FFCB05] px-1.5 bg-amber-500/10 rounded">
                            {RESPONSE_TYPES.find(r => r.value === q.responseType)?.label || q.responseType.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                            Peso: {q.weight}
                          </span>
                          {q.required && (
                            <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded leading-none">Obrigatório</span>
                          )}
                          {q.photoRequired && (
                            <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded leading-none">Foto Evidência</span>
                          )}
                        </div>

                        <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {q.questionText}
                        </p>

                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {q.responsible || 'Sem resp.'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo: {q.deadline || 'Turno'}</span>
                          {q.intelligentFlow && (
                            <span className="flex items-center gap-1 text-rose-500"><AlertCircle className="w-3 h-3" /> Fluxo Ativo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleBeginEditQuestion(q)}
                          className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                          title="Editar Pergunta"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                          title="Excluir Pergunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Salvar Modelo Button Footer */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-zinc-900">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Tudo pronto!</span>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal max-w-sm">
                    Clique em salvar para finalizar a configuração deste modelo para esta filial.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      try {
                        await onSaveTemplates(templates);
                        toastSuccess("Modelo de checklist salvo com sucesso para esta filial!");
                      } catch (error: any) {
                        console.error(error);
                        toastError(error?.message || "Ocorreu um erro ao salvar o checklist.");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r ${
                      isSaving 
                        ? 'from-slate-400 to-slate-500 cursor-not-allowed opacity-70' 
                        : 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-750 active:scale-95 shadow-lg shadow-emerald-500/10'
                    } text-white font-black uppercase tracking-wider text-[11px] rounded-2xl transition-all cursor-pointer`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Checklist ✓
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className={`p-16 text-center border rounded-[3rem] ${isDarkMode ? 'bg-[#121212] border-slate-800' : 'bg-white border-slate-100 shadow'}`}>
              <Clipboard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500">Selecione ou crie um modelo de checklist na barra lateral.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowNewTemplateModal(false)}
          />
          <motion.form 
            onSubmit={handleCreateTemplate}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6 ${
              isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Cadastrar Modelo de Checklist</h3>
              <button type="button" onClick={() => setShowNewTemplateModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-500 dark:text-slate-400">Título do Modelo</label>
                <input
                  type="text"
                  required
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Ex: Checklist Geral de Fechamento"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-500 dark:text-slate-400">Descrição Curta</label>
                <input
                  type="text"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="Ex: Auditoria noturna e procedimentos de segurança"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-500 dark:text-slate-400">Categoria / Tipo</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as ChecklistCategory)}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button"
                onClick={() => setShowNewTemplateModal(false)}
                className={`px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
              >
                Criar Modelo
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* CREATE NEW QUESTION MODAL - Rich Wizard */}
      {showNewQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowNewQuestionModal(false)}
          />
          <motion.form 
            onSubmit={handleCreateQuestion}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Nova Pergunta para Checklist</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Modelo: <span className="font-extrabold text-[#FFCB05]">{activeTemplate?.title}</span></p>
              </div>
              <button type="button" onClick={() => setShowNewQuestionModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Question Text */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Texto da Pergunta</label>
                <input
                  type="text"
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Ex: O freezer vertical de congelados está abaixo de -18ºC?"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Response Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Tipo de Resposta</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as ResponseType)}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                >
                  {RESPONSE_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              {/* Weight selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Peso / Relevância (1 a 5)</label>
                <select
                  value={qWeight}
                  onChange={(e) => setQWeight(Number(e.target.value))}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                >
                  <option value={1}>1 (Baixo)</option>
                  <option value={2}>2 (Médio-Baixo)</option>
                  <option value={3}>3 (Médio)</option>
                  <option value={4}>4 (Alto)</option>
                  <option value={5}>5 (Crítico)</option>
                </select>
              </div>

              {/* Multiple Choice Options Builder */}
              {qType === 'multipla_escolha' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase italic text-slate-400">Opções de Escolha (Separadas por vírgula)</label>
                  <input
                    type="text"
                    required
                    value={qOptions}
                    onChange={(e) => setQOptions(e.target.value)}
                    placeholder="Excelente, Bom, Regular, Ruim"
                    className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                  />
                </div>
              )}

              {/* Responsible Person */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Responsável Recomendado</label>
                <input
                  type="text"
                  required
                  value={qResponsible}
                  onChange={(e) => setQResponsible(e.target.value)}
                  placeholder="Ex: Gerente da Loja, Líder de Cozinha"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Deadline Days */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Prazo para Solução</label>
                <input
                  type="text"
                  required
                  value={qDeadline}
                  onChange={(e) => setQDeadline(e.target.value)}
                  placeholder="Ex: Imediato, 24 horas, 2 dias"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Checkboxes parameters */}
              <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qRequired}
                    onChange={(e) => setQRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>É Obrigatória</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qPhotoRequired}
                    onChange={(e) => setQPhotoRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Foto de evidência obrigatória</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qEnableObs}
                    onChange={(e) => setQEnableObs(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Habilitar campo de Observação</span>
                </label>
              </div>

              {/* FLOW INTELIGENTE - Automatic Action Plan Rule */}
              {['sim_nao', 'temperatura', 'numero'].includes(qType) && (
                <div className="md:col-span-2 border-t border-slate-100 dark:border-zinc-800 pt-4 mt-2 space-y-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFlow}
                      onChange={(e) => setEnableFlow(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-rose-400 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="text-left">
                      <span className="text-xs font-black text-rose-500 uppercase italic">Ativar Fluxo Inteligente para esta pergunta</span>
                      <p className="text-[10px] text-slate-500 font-medium">Abre um plano de ação automático se a resposta estiver fora de conformidade.</p>
                    </div>
                  </label>

                  {enableFlow && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl border space-y-4 ${
                        isDarkMode ? 'bg-zinc-950 border-rose-500/20' : 'bg-rose-50/20 border-rose-200'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400">Trigger (Gatilho)</span>
                          <input 
                            type="text" 
                            required
                            value={flowTrigger}
                            onChange={(e) => setFlowTrigger(e.target.value)}
                            placeholder={qType === 'sim_nao' ? 'NÃO' : '< -18'}
                            className={`px-3 py-2.5 rounded-lg border text-xs font-bold w-full outline-none focus:border-rose-400 ${
                              isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                            }`}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400">Título do Plano de Ação Automático</span>
                          <input 
                            type="text" 
                            required
                            value={flowActionTitle}
                            onChange={(e) => setFlowActionTitle(e.target.value)}
                            placeholder="Anormalidade identificada! Solicitar ajuste inmediato."
                            className={`px-3 py-2.5 rounded-lg border text-xs font-semibold w-full outline-none focus:border-rose-400 ${
                              isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-[#FFCB05] font-extrabold uppercase italic leading-none">
                        💡 Nota: O fluxo inteligente exige obrigatoriamente imagem comprovando o desvio no ato da resposta.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-zinc-900">
              <button 
                type="button"
                onClick={() => setShowNewQuestionModal(false)}
                className={`px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
              >
                Cadastrar Pergunta
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* EDIT QUESTION MODAL - Rich Wizard */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setEditingQuestion(null)}
          />
          <motion.form 
            onSubmit={handleSaveEditQuestion}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Editar Pergunta</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Modelo: <span className="font-extrabold text-[#FFCB05]">{activeTemplate?.title}</span></p>
              </div>
              <button type="button" onClick={() => setEditingQuestion(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Question Text */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Texto da Pergunta</label>
                <input
                  type="text"
                  required
                  value={editQText}
                  onChange={(e) => setEditQText(e.target.value)}
                  placeholder="Ex: O freezer vertical de congelados está abaixo de -18ºC?"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Response Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Tipo de Resposta</label>
                <select
                  value={editQType}
                  onChange={(e) => setEditQType(e.target.value as ResponseType)}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                >
                  {RESPONSE_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>

              {/* Weight selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Peso / Relevância (1 a 5)</label>
                <select
                  value={editQWeight}
                  onChange={(e) => setEditQWeight(Number(e.target.value))}
                  className={`px-4 py-3 rounded-xl border text-xs font-bold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                >
                  <option value={1}>1 (Baixo)</option>
                  <option value={2}>2 (Médio-Baixo)</option>
                  <option value={3}>3 (Médio)</option>
                  <option value={4}>4 (Alto)</option>
                  <option value={5}>5 (Crítico)</option>
                </select>
              </div>

              {/* Multiple Choice Options Builder */}
              {editQType === 'multipla_escolha' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase italic text-slate-400">Opções de Escolha (Separadas por vírgula)</label>
                  <input
                    type="text"
                    required
                    value={editQOptions}
                    onChange={(e) => setEditQOptions(e.target.value)}
                    placeholder="Excelente, Bom, Regular, Ruim"
                    className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                  />
                </div>
              )}

              {/* Responsible Person */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Responsável Recomendado</label>
                <input
                  type="text"
                  required
                  value={editQResponsible}
                  onChange={(e) => setEditQResponsible(e.target.value)}
                  placeholder="Ex: Gerente da Loja, Líder de Cozinha"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Deadline Days */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase italic text-slate-400">Prazo para Solução</label>
                <input
                  type="text"
                  required
                  value={editQDeadline}
                  onChange={(e) => setEditQDeadline(e.target.value)}
                  placeholder="Ex: Imediato, 24 horas, 2 dias"
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold w-full outline-none focus:border-amber-500 transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-slate-50 border-slate-100'}`}
                />
              </div>

              {/* Checkboxes parameters */}
              <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editQRequired}
                    onChange={(e) => setEditQRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>É Obrigatória</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editQPhotoRequired}
                    onChange={(e) => setEditQPhotoRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Foto de evidência obrigatória</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editQEnableObs}
                    onChange={(e) => setEditQEnableObs(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold leading-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Habilitar campo de Observação</span>
                </label>
              </div>

              {/* FLOW INTELIGENTE - Automatic Action Plan Rule */}
              {['sim_nao', 'temperatura', 'numero'].includes(editQType) && (
                <div className="md:col-span-2 border-t border-slate-100 dark:border-zinc-800 pt-4 mt-2 space-y-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEnableFlow}
                      onChange={(e) => setEditEnableFlow(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-rose-400 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="text-left">
                      <span className="text-xs font-black text-rose-500 uppercase italic">Ativar Fluxo Inteligente para esta pergunta</span>
                      <p className="text-[10px] text-slate-500 font-medium">Abre um plano de ação automático se a resposta estiver fora de conformidade.</p>
                    </div>
                  </label>

                  {editEnableFlow && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl border space-y-4 ${
                        isDarkMode ? 'bg-zinc-950 border-rose-500/20' : 'bg-rose-50/20 border-rose-200'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400">Trigger (Gatilho)</span>
                          <input 
                            type="text" 
                            required
                            value={editFlowTrigger}
                            onChange={(e) => setEditFlowTrigger(e.target.value)}
                            placeholder={editQType === 'sim_nao' ? 'NÃO' : '< -18'}
                            className={`px-3 py-2.5 rounded-lg border text-xs font-bold w-full outline-none focus:border-rose-400 ${
                              isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                            }`}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400">Título do Plano de Ação Automático</span>
                          <input 
                            type="text" 
                            required
                            value={editFlowActionTitle}
                            onChange={(e) => setEditFlowActionTitle(e.target.value)}
                            placeholder="Anormalidade identificada! Solicitar ajuste inmediato."
                            className={`px-3 py-2.5 rounded-lg border text-xs font-semibold w-full outline-none focus:border-rose-400 ${
                              isDarkMode ? 'bg-black border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-[#FFCB05] font-extrabold uppercase italic leading-none">
                        💡 Nota: O fluxo inteligente exige obrigatoriamente imagem comprovando o desvio no ato da resposta.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-zinc-900">
              <button 
                type="button"
                onClick={() => setEditingQuestion(null)}
                className={`px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 bg-[#FFCB05] text-black font-black uppercase tracking-widest text-[10px] rounded-lg transition-all active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* DELETE TEMPLATE CONFIRMATION MODAL */}
      <AnimatePresence>
        {templateToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setTemplateToDelete(null)}
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
                <div className="space-y-1.5">
                  <h3 className={`text-base font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Excluir Modelo?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold">
                    Deseja mesmo apagar o modelo <span className="font-extrabold text-rose-500">"{templateToDelete.name}"</span>?
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Todas as perguntas deste modelo serão excluídas irrevogavelmente.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => setTemplateToDelete(null)}
                  className={`px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors flex-1 ${
                    isDarkMode ? 'text-slate-400 hover:text-white bg-zinc-900 border border-zinc-900' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-100'
                  }`}
                >
                  Voltar
                </button>
                <button 
                  type="button"
                  onClick={confirmDeleteTemplate}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex-1"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
