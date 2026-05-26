import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Settings, 
  History, 
  CheckSquare, 
  ArrowRight, 
  ClipboardList, 
  Plus, 
  RefreshCw,
  Store as StoreIcon,
  HelpCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  ChecklistTemplate, 
  ChecklistSubmission, 
  ActionPlan 
} from '../types/checklist';
import { INITIAL_TEMPLATES } from './Checklist/initialData';
import ChecklistExecution from './Checklist/ChecklistExecution';
import ChecklistTemplates from './Checklist/ChecklistTemplates';
import ChecklistHistory from './Checklist/ChecklistHistory';
import ActionPlans from './Checklist/ActionPlans';

export default function Checklist() {
  const { currentStore, isDarkMode, brandColors } = useStore();
  const { user } = useAuth();

  // Primary navigation tabs
  const [activeTab, setActiveTab] = useState<'fill' | 'history' | 'plans' | 'config'>('fill');

  // Checklist dynamic states (persisted via localStorage)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  
  // Execution workflow pointer
  const [executingTemplate, setExecutingTemplate] = useState<ChecklistTemplate | null>(null);

  // Load persistent database on mount and whenever currentStore changes
  useEffect(() => {
    const storeId = currentStore.id;
    
    // Fallback Mock Submissions generator
    const getMockSubmissions = (): ChecklistSubmission[] => {
      return [{
        id: 'mock_sub_1',
        templateId: 'temp_segalimentar',
        templateTitle: 'Auditoria Diária de Segurança Alimentar',
        category: 'Segurança alimentar',
        storeId: storeId !== 'admin-global' ? storeId : 'B32',
        storeName: storeId !== 'admin-global' ? currentStore.name : 'Bebelu Mossoró',
        submittedBy: 'Mariana Costa (Gerente)',
        submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        answers: [
          {
            questionId: 'q_seg_1',
            questionText: 'O freezer vertical de congelados está abaixo de -18ºC?',
            responseType: 'temperatura',
            value: '-21',
            photoUrl: 'https://images.unsplash.com/photo-1588615419957-c6de0d6f0302?w=500&auto=format&fit=crop&q=60'
          },
          {
            questionId: 'q_seg_2',
            questionText: 'Todos os insumos na bancada estão com etiquetas de validade legíveis?',
            responseType: 'sim_nao',
            value: 'SIM'
          },
          {
            questionId: 'q_seg_3',
            questionText: 'Verificar higiene pessoal da equipe (unhas cortadas, cabelos presos, avental limpo):',
            responseType: 'sim_nao',
            value: 'SIM'
          }
        ],
        score: 12,
        maxScore: 12,
        conformityIndex: 100
      }];
    };

    // Fallback Mock Plans generator
    const getMockPlans = (): ActionPlan[] => {
      return [{
        id: 'mock_plan_1',
        submissionId: 'mock_sub_2',
        storeId: storeId !== 'admin-global' ? storeId : '4E09',
        storeName: storeId !== 'admin-global' ? currentStore.name : '4Estylos Mossoró',
        category: 'Segurança alimentar',
        questionText: 'O freezer vertical de congelados está abaixo de -18ºC?',
        triggerAnswer: '-12 ºC',
        actionTitle: 'Temperatura do freezer inadequada! Acionar equipe de manutenção de equipamentos e mover insumos para outra câmera fria.',
        deadline: 'Imediato (1h)',
        responsible: 'Gerente de Turno',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
      }];
    };

    // 1. Immediate UI loading from localStorage (per-store scoped)
    const storedTemplates = localStorage.getItem(`checklist_templates_${storeId}`);
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates));
    } else {
      setTemplates(INITIAL_TEMPLATES);
    }

    const storedSubmissions = localStorage.getItem(`checklist_submissions_${storeId}`);
    if (storedSubmissions) {
      setSubmissions(JSON.parse(storedSubmissions));
    } else {
      setSubmissions(getMockSubmissions());
    }

    const storedPlans = localStorage.getItem(`checklist_action_plans_${storeId}`);
    if (storedPlans) {
      setActionPlans(JSON.parse(storedPlans));
    } else {
      setActionPlans(getMockPlans());
    }

    // 2. Synchronize in real-time from Firestore
    const templatesRef = doc(db, 'stores', storeId, 'checklists', 'templates');
    const unsubTemplates = onSnapshot(templatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudTemplates = snapshot.data().data || [];
        setTemplates(cloudTemplates);
        localStorage.setItem(`checklist_templates_${storeId}`, JSON.stringify(cloudTemplates));
      } else {
        // Keep what is in localStorage if exists, or default to INITIAL_TEMPLATES.
        const stored = localStorage.getItem(`checklist_templates_${storeId}`);
        if (stored) {
          setTemplates(JSON.parse(stored));
        } else {
          setTemplates(INITIAL_TEMPLATES);
        }
      }
    }, (err) => {
      console.error("Erro ao sincronizar templates em tempo real:", err);
    });

    // Fetch Submissions
    const submissionsRef = doc(db, 'stores', storeId, 'checklists', 'submissions');
    const unsubSubmissions = onSnapshot(submissionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudSubmissions = snapshot.data().data || [];
        setSubmissions(cloudSubmissions);
        localStorage.setItem(`checklist_submissions_${storeId}`, JSON.stringify(cloudSubmissions));
      } else {
        const stored = localStorage.getItem(`checklist_submissions_${storeId}`);
        if (stored) {
          setSubmissions(JSON.parse(stored));
        } else {
          setSubmissions([]);
        }
      }
    }, (err) => {
      console.error("Erro ao sincronizar submissions em tempo real:", err);
    });

    // Fetch Action Plans
    const plansRef = doc(db, 'stores', storeId, 'checklists', 'action_plans');
    const unsubPlans = onSnapshot(plansRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudPlans = snapshot.data().data || [];
        setActionPlans(cloudPlans);
        localStorage.setItem(`checklist_action_plans_${storeId}`, JSON.stringify(cloudPlans));
      } else {
        const stored = localStorage.getItem(`checklist_action_plans_${storeId}`);
        if (stored) {
          setActionPlans(JSON.parse(stored));
        } else {
          setActionPlans([]);
        }
      }
    }, (err) => {
      console.error("Erro ao sincronizar action plans em tempo real:", err);
    });

    return () => {
      unsubTemplates();
      unsubSubmissions();
      unsubPlans();
    };
  }, [currentStore.id]);

  // Persists helper methods synced with Firestore & LocalStorage
  const saveTemplates = async (updated: ChecklistTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem(`checklist_templates_${currentStore.id}`, JSON.stringify(updated));
    try {
      if (currentStore.code === 'ROOT') {
        // ONLY sync templates across all active stores if the admin explicitly configures the ROOT global store
        const targetStoreIds = ['1', '2', '3', 'admin-global'];
        const promises = targetStoreIds.map(async (sId) => {
          localStorage.setItem(`checklist_templates_${sId}`, JSON.stringify(updated));
          const docRef = doc(db, 'stores', sId, 'checklists', 'templates');
          await setDoc(docRef, { data: updated });
        });
        await Promise.all(promises);
      } else {
        // Each specific store keeps its own independent checklist model
        const docRef = doc(db, 'stores', currentStore.id, 'checklists', 'templates');
        await setDoc(docRef, { data: updated });
      }
    } catch (err) {
      console.error("Erro ao salvar templates:", err);
      throw err;
    }
  };

  const saveSubmissions = async (updated: ChecklistSubmission[]) => {
    setSubmissions(updated);
    localStorage.setItem(`checklist_submissions_${currentStore.id}`, JSON.stringify(updated));
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'checklists', 'submissions');
      await setDoc(docRef, { data: updated });
    } catch (err) {
      console.error("Erro ao salvar submissions:", err);
      throw err;
    }
  };

  const savePlans = async (updated: ActionPlan[]) => {
    setActionPlans(updated);
    localStorage.setItem(`checklist_action_plans_${currentStore.id}`, JSON.stringify(updated));
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'checklists', 'action_plans');
      await setDoc(docRef, { data: updated });
    } catch (err) {
      console.error("Erro ao salvar action plans:", err);
      throw err;
    }
  };

  // Submission submitted callback
  const handleSubmissionCommitted = (sub: ChecklistSubmission, newPlans: ActionPlan[]) => {
    const updatedSubmissions = [sub, ...submissions];
    saveSubmissions(updatedSubmissions);

    if (newPlans.length > 0) {
      const updatedPlans = [...newPlans, ...actionPlans];
      savePlans(updatedPlans);
    }

    setExecutingTemplate(null);
    setActiveTab('history'); // Go to history to see summary!
  };

  // Delete submission callback
  const handleDeleteSubmission = (id: string) => {
    const updated = submissions.filter(s => s.id !== id);
    saveSubmissions(updated);
  };

  // Resolve plan callback
  const handleResolvePlan = (id: string, notes: string, photo?: string) => {
    const updated = actionPlans.map(plan => {
      if (plan.id === id) {
        return {
          ...plan,
          status: 'RESOLVED' as const,
          resolvedAt: new Date().toISOString(),
          resolutionNotes: notes,
          resolutionPhoto: photo
        };
      }
      return plan;
    });
    savePlans(updated);
  };

  // Delete action plan callback
  const handleDeletePlan = (id: string) => {
    const updated = actionPlans.filter(p => p.id !== id);
    savePlans(updated);
  };

  return (
    <div className="space-y-6">
      {/* Visual Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-extrabold font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Supervisão e Checklists
          </h1>
          <p className="text-slate-500 text-xs">
            Controle de qualidade, rotinas operacionais e ações corretivas em tempo real no Grupo Azevedo.
          </p>
        </div>

        {/* Back control if actively completing */}
        {executingTemplate && (
          <button
            onClick={() => setExecutingTemplate(null)}
            className="px-5 py-3 rounded-2xl bg-zinc-800 text-white font-black uppercase text-[10px] tracking-wider hover:bg-zinc-700 transition"
          >
            ← Cancelar e Voltar
          </button>
        )}
      </div>

      {executingTemplate ? (
        // Rendering core execution form 
        <ChecklistExecution 
          template={executingTemplate}
          onBack={() => setExecutingTemplate(null)}
          onSubmit={handleSubmissionCommitted}
        />
      ) : (
        // Standard Tab Panel Dashboard
        <div className="space-y-6">
          {/* Custom Tabs Navigation Menu */}
          <div className="flex border-b border-slate-100 dark:border-zinc-850 gap-2 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'fill', label: 'Executar Checklist', icon: ClipboardCheck },
              { id: 'history', label: 'Histórico & PDF', icon: History },
              { id: 'plans', label: 'Planos de Ação', icon: CheckSquare },
              { id: 'config', label: 'Configurar Modelos', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-4 font-black uppercase italic text-xs tracking-wider border-b-2 whitespace-nowrap transition-all ${
                    active
                      ? (isDarkMode ? 'border-[#FFCB05] text-[#FFCB05]' : 'border-amber-500 text-amber-600')
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab rendering router */}
          <div className="space-y-6">
            {/* TAB 1: EXECUTE CHECKLISTS (Displays categories and templates) */}
            {activeTab === 'fill' && (
              <div className="space-y-8">
                {/* Intro message */}
                <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
                  isDarkMode ? 'bg-[#121212]/30 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="space-y-1">
                    <h3 className={`text-base font-black uppercase italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Auditoria de Unidade Ativa</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Selecione um dos modelos operacionais listados abaixo para auditar a unidade <span className="font-extrabold text-[#FFCB05]">{currentStore.name}</span>.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="flex items-center gap-1.5 bg-slate-200/50 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-4 py-2 rounded-2xl border border-slate-300/30 dark:border-zinc-700 font-black text-[10px] uppercase tracking-wider text-slate-600 dark:text-zinc-300 transition-all active:scale-95 cursor-pointer"
                      title="Sincronizar com Banco de Dados"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                    </button>

                    <div className="flex items-center gap-1.5 bg-[#FFCB05]/10 px-4 py-2 rounded-2xl border border-[#FFCB05]/20 text-[#FFCB05] font-black text-[10px] uppercase tracking-wider">
                      <StoreIcon className="w-4 h-4" /> Unidade: {currentStore.code || 'GERAL'}
                    </div>
                  </div>
                </div>

                {/* Templates Grid Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(temp => (
                    <div
                      key={temp.id}
                      className={`p-6 rounded-[2.5rem] border flex flex-col justify-between transition-all group ${
                        isDarkMode 
                          ? 'bg-black border-slate-800/90 hover:border-[#FFCB05]' 
                          : 'bg-white border-slate-150 hover:border-amber-500 shadow-lg shadow-slate-100/40'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                            isDarkMode ? 'bg-[#FFCB05]/10 text-[#FFCB05]' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {temp.category}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{temp.questions.length} Questões</span>
                        </div>

                        <div>
                          <h4 className={`text-sm font-black uppercase italic tracking-tighter leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {temp.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-2">
                            {temp.description || 'Procedimento operacional padrão.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-zinc-900 mt-6 flex justify-end">
                        <button
                          onClick={() => setExecutingTemplate(temp)}
                          disabled={temp.questions.length === 0}
                          className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow flex items-center gap-2 group-hover:-translate-y-0.5 ${
                            temp.questions.length === 0
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-750 text-white'
                          }`}
                        >
                          {temp.questions.length === 0 ? 'Falta de Perguntas' : 'Iniciar Vistoria'} <ArrowRight className="w-3 px-0.5 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Create Template Quick Tile shortcut */}
                  <div
                    onClick={() => setActiveTab('config')}
                    className="p-6 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 group transition-colors min-h-[220px]"
                  >
                    <Plus className="w-8 h-8 text-slate-400 group-hover:scale-110 group-hover:text-indigo-500 transition-all mb-3" />
                    <h4 className={`text-xs font-black uppercase italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Criar Novo Modelo</h4>
                    <p className="text-[10px] text-slate-500 max-w-[200px] mt-1.5 leading-normal">Configure uma nova área de checagem e perguntas customizadas.</p>
                  </div>
                </div>

                {/* Checklist Categories Quick reference info */}
                <div className="space-y-4">
                  <h3 className={`text-xs font-black uppercase italic tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Áreas de Supervisão Padrão</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { l: 'Abertura da loja', count: templates.filter(t => t.category === 'Abertura da loja').length },
                      { l: 'Fechamento', count: templates.filter(t => t.category === 'Fechamento').length },
                      { l: 'Limpeza', count: templates.filter(t => t.category === 'Limpeza').length },
                      { l: 'Produção', count: templates.filter(t => t.category === 'Produção').length },
                      { l: 'Estoque', count: templates.filter(t => t.category === 'Estoque').length },
                      { l: 'Segurança alimentar', count: templates.filter(t => t.category === 'Segurança alimentar').length },
                      { l: 'Caixa', count: templates.filter(t => t.category === 'Caixa').length },
                      { l: 'Equipamentos', count: templates.filter(t => t.category === 'Equipamentos').length },
                      { l: 'Delivery', count: templates.filter(t => t.category === 'Delivery').length },
                      { l: 'Manutenção', count: templates.filter(t => t.category === 'Manutenção').length },
                    ].map(it => (
                      <div 
                        key={it.l}
                        className={`p-4 rounded-2xl border text-center ${
                          isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-100 shadow-sm'
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase block leading-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{it.l}</span>
                        <span className="text-[9px] font-bold text-slate-500 mt-1 block">({it.count} modelos)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIT RECORDS HISTORY & score inspection */}
            {activeTab === 'history' && (
              <ChecklistHistory 
                submissions={submissions}
                onDeleteSubmission={handleDeleteSubmission}
              />
            )}

            {/* TAB 3: AUTOMATIC ACTION PLANS (Fluxo inteligente) */}
            {activeTab === 'plans' && (
              <ActionPlans 
                actionPlans={actionPlans}
                onResolvePlan={handleResolvePlan}
                onDeletePlan={handleDeletePlan}
              />
            )}

            {/* TAB 4: DEFINE AND CONFIGURE CHECKLISTS TEMPLATES */}
            {activeTab === 'config' && (
              <ChecklistTemplates 
                templates={templates}
                onSaveTemplates={saveTemplates}
                onComplete={() => {
                  setActiveTab('fill');
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
