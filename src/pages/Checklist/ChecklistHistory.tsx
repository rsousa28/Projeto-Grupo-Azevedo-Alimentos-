import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  TrendingUp, 
  Check, 
  X, 
  ChevronRight, 
  Eye, 
  Download,
  Award,
  AlertTriangle,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../contexts/StoreContext';
import { ChecklistSubmission, ChecklistAnswer } from '../../types/checklist';
import { PhotoZoomModal } from '../../components/PhotoZoomModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryProps {
  submissions: ChecklistSubmission[];
  onDeleteSubmission?: (id: string) => void;
}

export default function ChecklistHistory({ submissions, onDeleteSubmission }: HistoryProps) {
  const { isDarkMode, currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  
  // Modal state for inspecting a single submission
  const [activeInspection, setActiveInspection] = useState<ChecklistSubmission | null>(null);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  
  // Modal state for double-confirm audit delete
  const [submissionToDelete, setSubmissionToDelete] = useState<ChecklistSubmission | null>(null);

  // Filter submissions by current active store and search term / category
  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter(sub => {
      // If store is Admin-Global, show all. Otherwise filter by active store.
      const matchStore = currentStore.id === 'admin-global' || sub.storeId === currentStore.id;
      const matchCategory = selectedCategory === 'TODOS' || sub.category === selectedCategory;
      const matchSearch = sub.templateTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sub.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStore && matchCategory && matchSearch;
    });
  }, [submissions, currentStore, searchTerm, selectedCategory]);

  // Unique categories in submissions for filter pills
  const availableCategories = React.useMemo(() => {
    const list = new Set(submissions.map(s => s.category));
    return ['TODOS', ...Array.from(list)];
  }, [submissions]);

  // Export checklist result to elegant PDF
  const handleExportPDF = (sub: ChecklistSubmission) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Elegant metadata
    const primaryColor = '#1e293b'; 
    const secondaryColor = '#f59e0b'; // amber color for branding
    
    // Header banner
    doc.setFillColor(30, 41, 59); // deep slate/charcoal
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor('#ffffff');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('GRUPO AZEVEDO - AUDITORIA DE CHECKLIST', 15, 17);
    
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Modelo preenchido: ${sub.templateTitle.toUpperCase()}`, 15, 23);
    doc.text(`Unidade: ${sub.storeName} | Operador: ${sub.submittedBy}`, 15, 28);
    doc.text(`Data e Hora: ${new Date(sub.submittedAt).toLocaleString('pt-BR')}`, 15, 33);

    // Score circular mock indicator
    doc.setFillColor(242, 175, 41); // yellow circle
    // Left border score badge in PDF
    doc.setFillColor(4, 120, 87); // Green banner
    doc.rect(145, 10, 50, 20, 'F');
    doc.setTextColor('#ffffff');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONFORMIDADE', 150, 16);
    doc.setFontSize(18);
    doc.text(`${sub.conformityIndex}%`, 150, 24);

    // Table of responses
    const tableData = sub.answers.map((ans, idx) => {
      let notes = ans.observation ? `Obs: ${ans.observation}` : '';
      if (ans.value === 'NÃO' && notes) {
        notes = `${notes}`;
      }
      return [
        idx + 1,
        ans.questionText,
        ans.value,
        notes || '-'
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['#', 'Pergunta', 'Resposta', 'Observações / Notas']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 8, fontStyle: 'bold' },
        1: { cellWidth: 100 },
        2: { cellWidth: 35, fontStyle: 'bold' },
        3: { cellWidth: 45 }
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle'
      }
    });

    // Check if there are signatures or pictures to output
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Assinaturas e Validação:', 15, currentY);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Responsável pelo encerramento: ____________________________`, 15, currentY + 15);
    doc.text(`Assinado eletronicamente por: ${sub.submittedBy}`, 15, currentY + 20);

    // Save PDF file
    doc.save(`Checklist_${sub.templateTitle.replace(/\s+/g, '_')}_${sub.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500">Auditorias Realizadas</span>
            <h4 className={`text-2xl font-black italic mt-1 leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {filteredSubmissions.length}
            </h4>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500">Média Geral de Conformidade</span>
            <h4 className={`text-2xl font-black italic mt-1 leading-none text-emerald-500`}>
              {filteredSubmissions.length > 0 
                ? `${Math.round(filteredSubmissions.reduce((acc, s) => acc + s.conformityIndex, 0) / filteredSubmissions.length)}%`
                : '100%'}
            </h4>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-6 rounded-3xl border flex items-center justify-between ${
          isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500">Status Operacional</span>
            <h4 className="text-sm font-black uppercase mt-2 text-emerald-500 italic leading-none">
              ● Regularizado
            </h4>
          </div>
          <div className="p-3 bg-amber-500/10 text-[#FFCB05] rounded-2xl shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Database Toolbar Filter */}
      <div className={`p-6 rounded-[2.5rem] border flex flex-col md:flex-row gap-4 items-center justify-between ${
        isDarkMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow shadow-slate-100/50'
      }`}>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por operador ou modelo..."
            className={`pl-11 pr-4 py-3 rounded-2xl border text-xs font-semibold w-full outline-none transition-all ${
              isDarkMode 
                ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#FFCB05]' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FFCB05]'
            }`}
          />
        </div>

        {/* Filter Selection Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto py-1">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                selectedCategory === cat
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : isDarkMode
                    ? 'bg-zinc-900 border-zinc-800 text-slate-400 hover:border-zinc-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* History Submissions Log List */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className={`p-16 text-center border rounded-[3rem] ${isDarkMode ? 'bg-[#121212] border-slate-800' : 'bg-white border-slate-100 shadow'}`}>
            <History className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-500">Nenhum envio de checklist registrado para esta unidade.</p>
          </div>
        ) : (
          filteredSubmissions.map(sub => (
            <div
              key={sub.id}
              className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isDarkMode ? 'bg-zinc-950 border-zinc-900 hover:border-zinc-800' : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-[#FFCB05]/10 text-[#FFCB05]' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {sub.category}
                  </span>
                  <span className={`text-[9px] font-extrabold text-slate-500 uppercase tracking-widest`}>
                    Unidade: {sub.storeName}
                  </span>
                </div>

                <h3 className={`text-sm font-bold leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {sub.templateTitle}
                </h3>

                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {sub.submittedBy}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(sub.submittedAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Submission visual scores and button controls */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-4 md:pt-0 border-t border-dashed border-slate-100 dark:border-zinc-900 md:border-0">
                <div className="flex flex-col text-right leading-none md:mr-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Índice Conformidade</span>
                  <span className={`text-lg font-black italic ${
                    sub.conformityIndex >= 90 ? 'text-emerald-500' : sub.conformityIndex >= 70 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {sub.conformityIndex}%
                  </span>
                  <span className="text-[9px] text-slate-400 mt-1 font-bold">({sub.score} de {sub.maxScore} pontos)</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveInspection(sub)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
                      isDarkMode 
                        ? 'bg-zinc-900 border-zinc-800 text-slate-300 hover:text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Inspecionar Respostas"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleExportPDF(sub)}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center"
                    title="Exportar Relatório PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {onDeleteSubmission && (
                    <button
                      onClick={() => setSubmissionToDelete(sub)}
                      className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                      title="Apagar Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* INSPECTION DETAILED MODAL */}
      <AnimatePresence>
        {activeInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setActiveInspection(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] ${
                isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'
              }`}
            >
              {/* Modal Top Metadata Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-850 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                      {activeInspection.category}
                    </span>
                    <span className="text-xs text-slate-500 font-extrabold uppercase italic">Unidade: {activeInspection.storeName}</span>
                  </div>
                  <h3 className={`text-lg font-black uppercase italic tracking-tighter mt-1 leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {activeInspection.templateTitle}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center gap-3">
                    <span>Operador: <span className="font-bold text-slate-400">{activeInspection.submittedBy}</span></span>
                    <span>●</span>
                    <span>Enviado: <span className="font-bold text-slate-400">{new Date(activeInspection.submittedAt).toLocaleString('pt-BR')}</span></span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase">Conformidade Final</span>
                    <h4 className={`text-2xl font-black italic leading-none mt-1 ${
                      activeInspection.conformityIndex >= 85 ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {activeInspection.conformityIndex}%
                    </h4>
                  </div>
                  <button
                    onClick={() => handleExportPDF(activeInspection)}
                    className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 transition-all"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>

              {/* Modal Questions Answers Scroll List Content */}
              <div className="flex-1 overflow-y-auto py-6 pr-2 space-y-4 max-h-[55vh]">
                {activeInspection.answers.map((ans, idx) => {
                  const isConforming = ans.responseType === 'sim_nao' ? ans.value === 'SIM' : true;
                  return (
                    <div 
                      key={ans.questionId}
                      className={`p-5 rounded-2xl border ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-slate-50 border-slate-150'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none block">PERGUNTA {idx + 1}</span>
                          <h4 className={`text-xs font-black block leading-snug ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{ans.questionText}</h4>
                        </div>

                        {/* Answer visual representation */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider italic ${
                            ans.value === 'SIM'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : ans.value === 'NÃO'
                                ? 'bg-rose-500/10 text-rose-500'
                                : (isDarkMode ? 'bg-zinc-900 text-slate-300' : 'bg-white border text-slate-700')
                          }`}>
                            {ans.value}
                          </span>
                        </div>
                      </div>

                      {/* Display drawn signatures, observations or evidence photo if available */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-900">
                        {ans.observation && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase italic text-slate-500">Observação do operador</span>
                            <p className="text-xs font-semibold text-slate-400 italic">"{ans.observation}"</p>
                          </div>
                        )}

                        {ans.signatureData && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase italic text-slate-500">Assinatura Recebida</span>
                            <div className="bg-white p-2 border rounded-xl w-48 shrink-0">
                              <img src={ans.signatureData} alt="Assinatura" className="h-10 w-auto" />
                            </div>
                          </div>
                        )}

                        {ans.photoUrl && (
                          <div className="space-y-1 md:col-span-2">
                            <span className="text-[9px] font-black uppercase italic text-slate-500">Evidência Fotográfica Anexada (Clique para Zoom)</span>
                            <div 
                              onClick={() => setZoomedPhotoUrl(ans.photoUrl || null)}
                              className="relative w-40 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-850 cursor-zoom-in group hover:brightness-95 hover:border-indigo-500/50 transition-all shadow-sm active:scale-95"
                            >
                              <img 
                                src={ans.photoUrl} 
                                alt="Evidência fotográfica" 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[8px] font-black uppercase tracking-wider text-white bg-indigo-600/90 px-2 py-1 rounded-lg shadow-md">ZOOM</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Close Footer Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-850 justify-end flex shrink-0">
                <button
                  onClick={() => setActiveInspection(null)}
                  className={`px-6 py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95`}
                >
                  Fechar Inspeção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED DELETE SUBMISSION CONFIRMATION PROMPT */}
      <AnimatePresence>
        {submissionToDelete && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setSubmissionToDelete(null)}
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
                    Apagar Registro?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold">
                    Deseja mesmo remover a vistoria <span className="font-extrabold text-[#FFCB05]">{submissionToDelete.templateTitle}</span>?
                  </p>
                  <p className="text-[10px] text-rose-500 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10">
                    O registro para a unidade <span className="font-black">{submissionToDelete.storeName}</span> enviado por <span className="font-black">{submissionToDelete.submittedBy}</span> será excluído permanentemente do histórico.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  type="button"
                  onClick={() => setSubmissionToDelete(null)}
                  className={`px-5 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-colors flex-1 ${
                    isDarkMode ? 'text-slate-400 hover:text-white bg-zinc-900 border border-zinc-900' : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-100'
                  }`}
                >
                  Voltar
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onDeleteSubmission) {
                      onDeleteSubmission(submissionToDelete.id);
                    }
                    setSubmissionToDelete(null);
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

      {/* Global Photo Zoom Lightbox in History */}
      <PhotoZoomModal 
        isOpen={!!zoomedPhotoUrl} 
        src={zoomedPhotoUrl || ''} 
        onClose={() => setZoomedPhotoUrl(null)} 
        alt="Evidência de Checklist"
      />
    </div>
  );
}
