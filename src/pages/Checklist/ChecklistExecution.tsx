import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Camera, 
  AlertTriangle, 
  Check, 
  X, 
  Trash2, 
  ChevronLeft, 
  User, 
  Calendar,
  Thermometer,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../contexts/StoreContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ChecklistTemplate, 
  ChecklistQuestion, 
  ChecklistAnswer, 
  ChecklistSubmission, 
  ActionPlan 
} from '../../types/checklist';

// Pre-defined mock images to populate camera simulations easily
const MOCK_PHOTOS = [
  { id: 'img_fachada', label: 'Fachada Limpa', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60' },
  { id: 'img_freezer', label: 'Painel do Freezer (-20ºC)', url: 'https://images.unsplash.com/photo-1588615419957-c6de0d6f0302?w=500&auto=format&fit=crop&q=60' },
  { id: 'img_limpeza', label: 'Piso do Salão Impecável', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60' },
  { id: 'img_etiquetas', label: 'Etiquetas de Validade', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60' },
];

interface ExecutionProps {
  template: ChecklistTemplate;
  onBack: () => void;
  onSubmit: (submission: ChecklistSubmission, generatedPlans: ActionPlan[]) => void;
}

export default function ChecklistExecution({ template, onBack, onSubmit }: ExecutionProps) {
  const { currentStore, isDarkMode } = useStore();
  const { user } = useAuth();

  // Answer values keyed by questionId
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  // Touch signature canvas references
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const isDrawingRef = useRef<Record<string, boolean>>({});

  // Loading or error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize answers with defaults where appropriate
  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    template.questions.forEach(q => {
      if (q.responseType === 'sim_nao') {
        initialAnswers[q.id] = '';
      } else if (q.responseType === 'temperatura') {
        initialAnswers[q.id] = '';
      } else if (q.responseType === 'data_hora') {
        // Set standard ISO datetime
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        initialAnswers[q.id] = now.toISOString().slice(0, 16);
      } else if (q.responseType === 'multipla_escolha') {
        initialAnswers[q.id] = q.options && q.options.length > 0 ? q.options[0] : 'Bom';
      }
    });
    setAnswers(initialAnswers);
  }, [template]);

  // Handle Simple inputs
  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleObservationChange = (qId: string, value: string) => {
    setObservations(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  // Helper to determine if a question has an activated Intelligent Flow Trigger
  const isTriggered = (question: ChecklistQuestion): boolean => {
    const answer = answers[question.id] || '';
    if (!question.intelligentFlow) return false;

    // For Yes/No, check direct match
    if (question.responseType === 'sim_nao') {
      return answer === question.intelligentFlow.triggerOnValue;
    }

    // For Temperature, check if input is warm/cold based on rule (e.g. "< -18")
    if (question.responseType === 'temperatura' && answer !== '') {
      const numVal = parseFloat(answer);
      if (isNaN(numVal)) return false;

      const rule = question.intelligentFlow.triggerOnValue.trim();
      if (rule.startsWith('<')) {
        const threshold = parseFloat(rule.replace('<', '').trim());
        // For freezer below -18, if answer is -15, it is NOT below -18. So trigger is activated if answer is GREATER than -18!
        // "Freezer está abaixo de -18?" -> "Se NÃO" (which means temperature is > -18, e.g. -15 or 5).
        // If questionText is "Freezer está abaixo de -18º?" and responseType is Temperatura,
        // let's interpret rule '< -18'. If the user enters a temperature that is NOT below -18 (i.e. > -18), it triggers!
        return numVal > threshold;
      }
      if (rule.startsWith('>')) {
        const threshold = parseFloat(rule.replace('>', '').trim());
        return numVal < threshold;
      }
    }

    return false;
  };

  // Canvas Drawing Logic for Signatures
  const startDrawing = (qId: string, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRefs.current[qId];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Smooth drawing
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current[qId] = true;
  };

  const draw = (qId: string, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current[qId]) return;
    const canvas = canvasRefs.current[qId];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Store base64 data URL
    const dataUrl = canvas.toDataURL();
    setSignatures(prev => ({ ...prev, [qId]: dataUrl }));
  };

  const stopDrawing = (qId: string) => {
    isDrawingRef.current[qId] = false;
  };

  const clearCanvas = (qId: string) => {
    const canvas = canvasRefs.current[qId];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatures(prev => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });
  };

  // Simulated Photo Upload or Preset Selection
  const handleFileChange = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => ({
          ...prev,
          [qId]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPresetPhoto = (qId: string, url: string) => {
    setPhotos(prev => ({
      ...prev,
      [qId]: url
    }));
  };

  const removePhoto = (qId: string) => {
    setPhotos(prev => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate requirements
    const missingFields: string[] = [];

    for (const q of template.questions) {
      const ansVal = answers[q.id];
      const photoVal = photos[q.id];
      const observationVal = observations[q.id];
      const signatureVal = signatures[q.id];
      
      const isReq = q.required;
      // Photographic response types naturally require a photo if the question is mandatory.
      // Additionally, standard question forms might require a photo if photoRequired is true
      // or if triggered automatically via the Intelligent Flow.
      const isPhotoRequired = (q.responseType === 'foto' && isReq) || q.photoRequired || (q.intelligentFlow && isTriggered(q) && q.intelligentFlow.requirePhotoOnTrigger);

      let questionMissing = false;

      // Check if general response is completed
      if (isReq) {
        if (q.responseType === 'assinatura') {
          if (!signatureVal) {
            missingFields.push(`Assinatura para salvar a pergunta: "${q.questionText}"`);
            questionMissing = true;
          }
        } else if (q.responseType === 'foto') {
          if (!photoVal) {
            missingFields.push(`Foto de evidência obrigatória para: "${q.questionText}"`);
            questionMissing = true;
          }
        } else {
          if (ansVal === undefined || ansVal === '') {
            missingFields.push(`Resposta para: "${q.questionText}"`);
            questionMissing = true;
          }
        }
      }

      // Check photo requirement (only if not already flagged as missing)
      if (isPhotoRequired && !photoVal && !questionMissing) {
        missingFields.push(`Foto de evidência obrigatória para: "${q.questionText}"`);
      }
    }

    if (missingFields.length > 0) {
      setErrorMsg(missingFields.join('; \n'));
      // Scroll to error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200)); // Smooth saving effect

    // Map Answers
    const finalAnswers: ChecklistAnswer[] = template.questions.map(q => {
      let finalValue = answers[q.id] || '';
      
      if (q.responseType === 'assinatura') {
        finalValue = '[Assinatura Eletrônica]';
      } else if (q.responseType === 'foto') {
        finalValue = '[Foto de Evidência]';
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        responseType: q.responseType,
        value: finalValue,
        photoUrl: photos[q.id],
        observation: observations[q.id],
        signatureData: signatures[q.id]
      };
    });

    // Calculate conformities and weights
    let earnedWeight = 0;
    let totalWeight = 0;

    const generatedPlans: ActionPlan[] = [];
    const submissionId = `sub_${Date.now()}`;

    template.questions.forEach(q => {
      totalWeight += q.weight;
      const ans = answers[q.id] || '';
      const triggered = isTriggered(q);

      // A Yes/No answer defaults to conforming if it is 'SIM'
      // If it doesn't trigger the action plan, we consider it conforming
      let conforming = true;
      if (q.responseType === 'sim_nao') {
        conforming = ans === 'SIM';
      } else if (q.responseType === 'temperatura') {
        // Temperature of -18 is conforming if lower or equal. Otherwise or if triggered, non-conforming.
        conforming = !triggered;
      }

      if (conforming) {
        earnedWeight += q.weight;
      }

      // If triggered intelligent flow, generate an Action Plan!
      if (triggered && q.intelligentFlow) {
        generatedPlans.push({
          id: `ap_${Date.now()}_${q.id}`,
          submissionId,
          storeId: currentStore.id,
          storeName: currentStore.name,
          category: template.category,
          questionText: q.questionText,
          triggerAnswer: q.responseType === 'temperatura' ? `${ans} ºC` : ans,
          actionTitle: q.intelligentFlow.actionPlanTitle,
          deadline: q.deadline || '24h',
          responsible: q.responsible || 'Gerente',
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      }
    });

    const conformityIndex = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

    const submission: ChecklistSubmission = {
      id: submissionId,
      templateId: template.id,
      templateTitle: template.title,
      category: template.category,
      storeId: currentStore.id,
      storeName: currentStore.name,
      submittedBy: user?.name || user?.username || 'Colaborador',
      submittedAt: new Date().toISOString(),
      answers: finalAnswers,
      score: earnedWeight,
      maxScore: totalWeight,
      conformityIndex
    };

    setIsSubmitting(false);
    onSubmit(submission, generatedPlans);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <ChevronLeft className="w-4 h-4" /> Voltar aos Modelos
        </button>
        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
          isDarkMode ? 'bg-[#FFCB05]/10 text-[#FFCB05]' : 'bg-amber-100 text-amber-800'
        }`}>
          {template.category}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{template.title}</h2>
        <p className="text-xs text-slate-500">{template.description}</p>
      </div>

      {errorMsg && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-black uppercase italic text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Restam campos obrigatórios para preenchimento:
          </div>
          <p className="text-xs font-medium whitespace-pre-line leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Main Execution Form */}
      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {template.questions.map((question, index) => {
          const isReq = question.required;
          const userAns = answers[question.id] || '';
          const triggeredFlow = isTriggered(question);
          const needsPhoto = question.responseType === 'foto' || question.photoRequired || (triggeredFlow && question.intelligentFlow?.requirePhotoOnTrigger);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              key={question.id}
              className={`p-6 rounded-[2rem] border transition-all ${
                isDarkMode 
                  ? 'bg-black/40 border-slate-800' 
                  : 'bg-white border-slate-100 shadow-sm shadow-slate-100/50'
              } ${triggeredFlow ? 'ring-2 ring-rose-500/30 border-rose-500/30' : ''}`}
            >
              {/* Question Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black italic rounded-lg w-6 h-6 flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FFCB05]">
                      Peso {question.weight}
                    </span>
                    {isReq && (
                      <span className="text-[9px] font-black uppercase text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10 shrink-0">
                        Obrigatório
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center gap-3 font-semibold">
                  {question.responsible && (
                    <span className="flex items-center gap-1 shrink-0"><User className="w-3 h-3" /> {question.responsible}</span>
                  )}
                  {question.deadline && (
                    <span className="flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> {question.deadline}</span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className={`text-sm font-bold leading-snug mb-5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {question.questionText}
              </h3>

              {/* Answer Input Renderers */}
              <div className="space-y-4">
                {/* YES/NO */}
                {question.responseType === 'sim_nao' && (
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.id, 'SIM')}
                      className={`py-3.5 px-6 rounded-2xl font-black italic uppercase text-xs tracking-wider border transition-all flex items-center justify-center gap-2 ${
                        userAns === 'SIM'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                          : isDarkMode 
                            ? 'bg-zinc-900 text-slate-400 border-zinc-800 hover:border-zinc-700' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.id, 'NÃO')}
                      className={`py-3.5 px-6 rounded-2xl font-black italic uppercase text-xs tracking-wider border transition-all flex items-center justify-center gap-2 ${
                        userAns === 'NÃO'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                          : isDarkMode 
                            ? 'bg-zinc-900 text-slate-400 border-zinc-800 hover:border-zinc-700' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <X className="w-4 h-4" /> Não
                    </button>
                  </div>
                )}

                {/* GENERAL TEXT */}
                {question.responseType === 'texto' && (
                  <textarea
                    value={userAns}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Escreva sua resposta detalhada..."
                    className={`w-full p-4 rounded-2xl border text-sm font-medium outline-none h-24 resize-none transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#FFCB05] placeholder:text-zinc-600' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05] placeholder:text-slate-400'
                    }`}
                  />
                )}

                {/* NUMBER */}
                {question.responseType === 'numero' && (
                  <input
                    type="number"
                    value={userAns}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Digite o valor numérico"
                    className={`px-4 py-3.5 rounded-2xl border text-sm font-bold w-full max-w-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#FFCB05]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05]'
                    }`}
                  />
                )}

                {/* TEMPERATURE */}
                {question.responseType === 'temperatura' && (
                  <div className="flex items-center gap-3 max-w-xs">
                    <div className="relative flex-1">
                      <Thermometer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        step="0.1"
                        value={userAns}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Ex: -19.5"
                        className={`pl-11 pr-12 py-3.5 rounded-2xl border text-sm font-black italic w-full outline-none transition-all ${
                          isDarkMode 
                            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#FFCB05]' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05]'
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        ºC
                      </span>
                    </div>
                  </div>
                )}

                {/* MULTIPLE CHOICE */}
                {question.responseType === 'multipla_escolha' && (
                  <div className="flex flex-wrap gap-2.5">
                    {(question.options || ['Excelente', 'Bom', 'Regular', 'Ruim']).map(opt => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => handleAnswerChange(question.id, opt)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                          userAns === opt
                            ? (isDarkMode ? 'bg-[#FFCB05]/10 border-[#FFCB05] text-[#FFCB05]' : 'bg-amber-500 border-amber-500 text-white shadow-sm')
                            : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-slate-400 hover:border-zinc-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* DATE & TIME */}
                {question.responseType === 'data_hora' && (
                  <input
                    type="datetime-local"
                    value={userAns}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className={`px-4 py-3.5 rounded-2xl border text-sm font-bold w-full max-w-xs outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#FFCB05]' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05]'
                    }`}
                  />
                )}

                {/* SIGNATURE Canvas Drawing Pad */}
                {question.responseType === 'assinatura' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between max-w-md">
                      <span className="text-[10px] font-extrabold uppercase italic text-slate-400">Assine no quadro abaixo</span>
                      <button
                        type="button"
                        onClick={() => clearCanvas(question.id)}
                        className="text-[9px] font-black uppercase text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Limpar Assinatura
                      </button>
                    </div>
                    <div className={`p-1 rounded-2xl border bg-white ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                      <canvas
                        ref={(el) => { canvasRefs.current[question.id] = el; }}
                        onMouseDown={(e) => startDrawing(question.id, e)}
                        onMouseMove={(e) => draw(question.id, e)}
                        onMouseUp={() => stopDrawing(question.id)}
                        onMouseLeave={() => stopDrawing(question.id)}
                        onTouchStart={(e) => startDrawing(question.id, e)}
                        onTouchMove={(e) => draw(question.id, e)}
                        onTouchEnd={() => stopDrawing(question.id)}
                        width={400}
                        height={120}
                        className="w-full max-w-md h-[120px] bg-slate-50 rounded-xl cursor-crosshair blockTouchScroll"
                        style={{ touchAction: 'none' }}
                      />
                    </div>
                  </div>
                )}

                {/* INTELLIGENT FLOW TRIGGER WARNING */}
                {triggeredFlow && question.intelligentFlow && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase italic">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      Fluxo Inteligente Ativado!
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed">
                      Um <span className="underline">Plano de Ação Automático</span> será aberto após o envio:{' '}
                      <span className="text-[#FFCB05] italic font-black">"{question.intelligentFlow.actionPlanTitle}"</span>
                    </p>
                    {question.intelligentFlow.requirePhotoOnTrigger && (
                      <p className="text-[10px] text-rose-400 font-extrabold uppercase italic">
                        ⚠️ Foto de evidência tornou-se OBRIGATÓRIA para enviar o checklist.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* PHOTO Evidence Loader (Rendered if photoRequired or if flow required) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase italic leading-none ${
                      needsPhoto ? 'text-amber-500 animate-pulse' : 'text-slate-400'
                    }`}>
                      Anexar Foto de Evidência {needsPhoto ? '(OBRIGATÓRIO)' : '(OPCIONAL)'}
                    </span>
                  </div>

                  {photos[question.id] ? (
                    <div className="flex items-center gap-4">
                      <div className="relative w-32 h-24 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
                        <img 
                          src={photos[question.id]} 
                          alt="Evidência" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(question.id)}
                          className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Foto capturada!</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(question.id)}
                          className="text-[10px] font-extrabold uppercase text-slate-500 hover:text-rose-500 text-left"
                        >
                          Excluir imagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Upload / Capture options */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Native File Pick */}
                        <label className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${
                          isDarkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-slate-300 hover:bg-zinc-900 hover:text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                          <Camera className="w-3.5 h-3.5" />
                          Tirar Foto / Carregar
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(question.id, e)}
                            className="hidden"
                          />
                        </label>

                        {/* Test Simulator Buttons */}
                        <span className="text-[9px] font-black uppercase text-slate-500">Ou simular evidência:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {MOCK_PHOTOS.map(m => (
                            <button
                              type="button"
                              key={m.id}
                              onClick={() => selectPresetPhoto(question.id, m.url)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-colors ${
                                isDarkMode 
                                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-slate-400' 
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* OBSERVATION COMPONENT */}
                {question.enableObservation && (
                  <div className="space-y-1.5 pt-2 max-w-md">
                    <label className="text-[9px] font-black uppercase italic text-slate-400">Observações específicas da pergunta</label>
                    <input
                      type="text"
                      value={observations[question.id] || ''}
                      onChange={(e) => handleObservationChange(question.id, e.target.value)}
                      placeholder="Identificou algo relevante? Descreva aqui..."
                      className={`px-4 py-2 rounded-xl border text-[11px] font-medium w-full outline-none transition-all ${
                        isDarkMode 
                          ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#FFCB05] placeholder:text-zinc-600' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05]'
                      }`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Form Submission Bar */}
        <div className={`p-6 rounded-[2.5rem] border sticky bottom-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl z-20 ${
          isDarkMode ? 'bg-[#121212] border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}>
          <div>
            <h4 className={`text-sm font-black uppercase italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tudo Concluído?</h4>
            <p className="text-xs text-slate-500">Revise suas respostas e evidências antes de enviar.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className={`px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/10 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>Enviando...</>
              ) : (
                <>
                  Enviar Respostas <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
