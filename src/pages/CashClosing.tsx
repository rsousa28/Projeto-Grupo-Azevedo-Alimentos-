import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Banknote, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FileDown,
  Printer,
  User,
  ChevronUp,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AuditService } from '../services/AuditService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type definitions for the form
interface CashClosingForm {
  date: string;
  operator: string;
  delivery: number;
  creditCard: number;
  debitCard: number;
  refeicao: number;
  pix: number;
  totem: number;
  lancheFuncionarios: number;
  despesas: number;
  sangria: number;
  valefuncionario: number;
  outros1: number;
  outros2: number;
  outros3: number;
  outros4: number;
  totalSistema: number;
  observations: string;
  outros1_label?: string;
  outros2_label?: string;
  outros3_label?: string;
  outros4_label?: string;
  verified?: boolean;
}

const formatCurrencyLocal = (val: number) => 
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(val);

export default function CashClosing() {
  const { currentStore, isDarkMode, closingsData, setClosingsData } = useStore();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const isAdmin = user?.role === 'ADMIN' || user?.username === 'adm';
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('05');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  // Load initial store custom closings on mount and store changes
  useEffect(() => {
    // 1. Immediate local fallback
    const saved = localStorage.getItem(`closings_data_${currentStore.id}`);
    if (saved) {
      try {
        setClosingsData(JSON.parse(saved));
      } catch (e) {
        setClosingsData({});
      }
    } else {
      setClosingsData({});
    }

    // 2. Load from central Firestore for cross-user/cross-device synchronization (e.g., patriciab28 and owner)
    let isMounted = true;
    const fetchCloudClosings = async () => {
      try {
        const docRef = doc(db, 'stores', currentStore.id, 'closings', 'all');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const cloudData = docSnap.data().data || {};
          setClosingsData(prev => {
            const merged = { ...prev, ...cloudData };
            localStorage.setItem(`closings_data_${currentStore.id}`, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.error("Erro ao carregar fechamentos do Firestore:", err);
      }
    };

    fetchCloudClosings();

    return () => {
      isMounted = false;
    };
  }, [currentStore.id, setClosingsData]);

  // Form Initial State
  const initialFormState: CashClosingForm = {
    date: new Date().toISOString().split('T')[0],
    operator: '',
    delivery: 0,
    creditCard: 0,
    debitCard: 0,
    refeicao: 0,
    pix: 0,
    totem: 0,
    lancheFuncionarios: 0,
    despesas: 0,
    sangria: 0,
    valefuncionario: 0,
    outros1: 0,
    outros2: 0,
    outros3: 0,
    outros4: 0,
    totalSistema: 0,
    observations: '',
    outros1_label: '',
    outros2_label: '',
    outros3_label: '',
    outros4_label: '',
    verified: false,
  };

  const [formData, setFormData] = useState<CashClosingForm>(initialFormState);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // Helper to get all days of the month
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month - 1, 1, 12, 0, 0);
    const days = [];
    while (date.getMonth() === month - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const handleSavePeriod = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'closings', 'all');
      await setDoc(docRef, { data: closingsData });
      if (user) {
        const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
        await AuditService.logAction({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'CASH_CLOSING_SAVE',
          description: `Salvou faturamentos e fechamentos de caixa do período ${monthLabel}/${selectedYear}.`,
          storeCode: currentStore.code,
          storeName: currentStore.name
        }).catch(err => console.error(err));
      }
      setIsSaving(false);
      toastSuccess(`Dados de ${months.find(m => m.value === selectedMonth)?.label}/${selectedYear} salvos com sucesso no servidor do Grupo Azevedo!`);
    } catch (err) {
      console.error("Erro ao salvar fechamentos:", err);
      setIsSaving(false);
      toastError("Erro ao salvar dados do faturamento e fechamento de caixa no servidor.");
    }
  };

  // Calculations for the form
  const totalGeral = useMemo(() => {
    return (
      formData.delivery + 
      formData.creditCard + 
      formData.debitCard + 
      formData.refeicao + 
      formData.pix + 
      formData.totem +
      formData.sangria +
      formData.lancheFuncionarios +
      formData.valefuncionario +
      formData.despesas +
      formData.outros1 + formData.outros2 + formData.outros3 + formData.outros4
    );
  }, [formData]);

  const diff = totalGeral - formData.totalSistema;
  const sobra = diff > 0 ? diff : 0;
  const falta = diff < 0 ? Math.abs(diff) : 0;

  // Generate the list of days for the current period
  const daysInMonth = useMemo(() => getDaysInMonth(parseInt(selectedYear), parseInt(selectedMonth)), [selectedMonth, selectedYear]);
  
  const allClosings = useMemo(() => {
    const list = daysInMonth.map((date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dayStr = `${y}-${m}-${d}`;
      
      const savedData = closingsData[dayStr];
      
      if (savedData) {
        return {
          id: dayStr,
          date: dayStr,
          opener: savedData.operator,
          closer: savedData.operator,
          revenue: savedData.totalGeral,
          systemTotal: savedData.totalSistema,
          expenses: savedData.despesas + savedData.sangria + savedData.valefuncionario,
          balance: savedData.totalGeral,
          status: 'Concluído' as const,
          diff: savedData.totalGeral - savedData.totalSistema,
          verified: !!savedData.verified
        };
      }

      return {
        id: dayStr,
        date: dayStr,
        opener: '---',
        closer: '---',
        revenue: 0,
        systemTotal: 0,
        expenses: 0,
        balance: 0,
        status: 'Pendente' as const,
        diff: 0,
        verified: false
      };
    });

    return list.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });
  }, [daysInMonth, closingsData, sortOrder]);

  const closings = allClosings.filter(c => {
    if (!searchTerm) return true;
    return c.date.includes(searchTerm) || 
           c.opener.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.closer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalRevenue = allClosings.reduce((sum, c) => sum + c.revenue, 0);
  const totalExpenses = allClosings.reduce((sum, c) => sum + c.expenses, 0);
  const totalBalance = allClosings.reduce((sum, c) => sum + c.balance, 0);
  const avgDaily = allClosings.filter(c => c.revenue > 0).length > 0 
    ? totalRevenue / allClosings.filter(c => c.revenue > 0).length 
    : 0;

  const handleInputChange = (field: keyof CashClosingForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CashClosingForm, value: string) => {
    // Keep the raw string in local input state to allow typing comma
    setInputValues(prev => ({ ...prev, [field]: value }));
    
    // Normalize for numeric state (replace comma with dot)
    const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(normalized) || 0;
    setFormData(prev => ({ ...prev, [field]: num }));
  };

  const toggleVerifyClosing = async (id: string, currentVerified: boolean) => {
    const saved = closingsData[id];
    if (!saved) return; // Cannot verify a pending/non-existent closing

    const updated = {
      ...closingsData,
      [id]: { 
        ...saved, 
        verified: !currentVerified 
      }
    };
    
    // Update local state
    setClosingsData(updated);
    
    // Save to localStorage
    localStorage.setItem(`closings_data_${currentStore.id}`, JSON.stringify(updated));
    
    // Save to Firestore
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'closings', 'all');
      await setDoc(docRef, { data: updated });
      if (!currentVerified) {
        toastSuccess(`Caixa do dia ${id.split('-').reverse().join('/')} marcado como conferido!`);
      } else {
        toastSuccess(`Conferência do caixa do dia ${id.split('-').reverse().join('/')} removida.`);
      }
    } catch (err) {
      console.error("Erro ao atualizar status de conferência no Firestore:", err);
      toastError("Erro ao salvar status de conferência no servidor.");
    }
  };

  const openEditModal = (id: string) => {
    const saved = closingsData[id];
    setEditingId(id);
    if (saved) {
      setFormData(saved);
      // Initialize inputs with formatted values
      const initialInputs: Record<string, string> = {};
      Object.entries(saved).forEach(([key, val]) => {
        if (typeof val === 'number') {
          initialInputs[key] = val === 0 ? '' : val.toString().replace('.', ',');
        }
      });
      setInputValues(initialInputs);
    } else {
      setFormData({ 
        ...initialFormState, 
        date: id,
        operator: user?.name || ''
      });
      setInputValues({});
    }
    setShowModal(true);
  };

  // Store specific information helper
  const storeInfo = useMemo(() => {
    const code = currentStore.code.toUpperCase();
    
    if (code === 'B32') {
      return {
        title: `Planilha de Fechamento ${currentStore.brand}`,
        location: 'Mossoró/RN - Unidade B32',
        brand: currentStore.brand,
        logo: currentStore.brand.charAt(0)
      };
    } else if (code === 'B28') {
      return {
        title: `Planilha de Fechamento ${currentStore.brand}`,
        location: 'Bebelu Rio Mar/CE - Unidade B28',
        brand: currentStore.brand,
        logo: currentStore.brand.charAt(0)
      };
    } else if (code === '4E09') {
      return {
        title: 'Planilha de Fechamento 4 Estylos',
        location: 'Mossoro/RN - UNIDADE 4E09',
        brand: '4 Estylos',
        logo: '4'
      };
    }
    
    return {
      title: `Planilha de Fechamento ${currentStore.brand}`,
      location: currentStore.name,
      brand: currentStore.brand,
      logo: currentStore.brand.charAt(0)
    };
  }, [currentStore]);

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setTextColor(230, 57, 70);
    doc.text(storeInfo.brand.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${storeInfo.title.toUpperCase()}: ${storeInfo.location.toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });
    
    autoTable(doc, {
      startY: 35,
      head: [['CAMPO', 'VALOR']],
      body: [
        ['DATA', formData.date.split('-').reverse().join('/')],
        ['OPERADOR', formData.operator || 'NÃO INFORMADO'],
        ['DELIVERY', formatCurrencyLocal(formData.delivery)],
        ['CARTÃO CRÉDITO', formatCurrencyLocal(formData.creditCard)],
        ['CARTÃO DÉBITO', formatCurrencyLocal(formData.debitCard)],
        ['REFEIÇÃO', formatCurrencyLocal(formData.refeicao)],
        ['PIX', formatCurrencyLocal(formData.pix)],
        ['TOTEM', formatCurrencyLocal(formData.totem)],
        ['LANCHE FUNCIONÁRIOS', formatCurrencyLocal(formData.lancheFuncionarios)],
        ['DESPESAS', formatCurrencyLocal(formData.despesas)],
        ['SANGRIA', formatCurrencyLocal(formData.sangria)],
        ['VALE FUNCIONÁRIO', formatCurrencyLocal(formData.valefuncionario)],
        [formData.outros1_label || 'OUTROS (COD 50)', formatCurrencyLocal(formData.outros1)],
        [formData.outros2_label || 'OUTROS 2', formatCurrencyLocal(formData.outros2)],
        [formData.outros3_label || 'OUTROS 3', formatCurrencyLocal(formData.outros3)],
        [formData.outros4_label || 'OUTROS 4', formatCurrencyLocal(formData.outros4)],
        ['TOTAL GERAL', formatCurrencyLocal(totalGeral)],
        ['TOTAL SISTEMA', formatCurrencyLocal(formData.totalSistema)],
        ['SOBRA', formatCurrencyLocal(sobra)],
        ['FALTA', formatCurrencyLocal(falta)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] } as any,
      columnStyles: { 1: { halign: 'right' } } as any
    });
    
    doc.save(`fechamento-${formData.date}.pdf`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>Relatório de Caixa</h2>
          <p className={`text-sm font-bold italic ${isDarkMode ? 'text-slate-500' : 'text-slate-700'}`}>Gestão operacional e financeira do PDV {currentStore.brand}</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData(initialFormState);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-4 bg-[#FFCB05] hover:bg-black text-black hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          Novo Fechamento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-1.5 rounded-2xl bg-slate-100 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 w-fit">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
          >
            {months.map(m => (
              <option key={m.value} value={m.value} className="bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white">{m.label}</option>
            ))}
          </select>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none px-2 py-1 cursor-pointer text-slate-900 dark:text-white"
          >
            {years.map(y => (
              <option key={y} value={y} className="bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white">{y}</option>
            ))}
          </select>
        </div>
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
        <button 
          onClick={handleSavePeriod}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
            isSaving 
              ? 'bg-slate-400 text-white cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-black text-white'
          }`}
        >
          {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isSaving ? 'Salvando...' : 'Salvar Período'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest italic font-sans flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-green-500" /> Faturamento Médio Diário
          </div>
          <div className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrencyLocal(avgDaily)}</div>
        </div>
        <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest italic font-sans flex items-center gap-2">
            <Wallet className="w-3 h-3 text-indigo-500" /> Saldo Acumulado
          </div>
          <div className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrencyLocal(totalBalance)}</div>
        </div>
      </div>

      <div className={`overflow-hidden rounded-[2.5rem] border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="p-8 border-b dark:border-[#333] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium border outline-none focus:ring-2 focus:ring-amber-500/20 ${
                isDarkMode ? 'bg-black border-[#333] text-white' : 'bg-slate-50 border-slate-100'
              }`}
            />
          </div>
          <div className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Controle de Auditoria Digital</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left ${isDarkMode ? 'bg-black/40 text-slate-500' : 'bg-slate-50 text-slate-600'}`}>
                <th 
                  className="px-8 py-4 text-[10px] font-black uppercase italic tracking-widest cursor-pointer hover:text-amber-500 transition-colors select-none"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-2">
                    Data
                    {sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </div>
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase italic tracking-widest text-right">Faturamento</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase italic tracking-widest text-right">Sistema</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase italic tracking-widest text-center">Auditoria</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase italic tracking-widest text-center">Ações</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-[#333]">
              {closings.map((closing) => (
                <tr key={closing.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className={`font-black italic text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{closing.date.split('-').reverse().join('/')}</span>
                    </div>
                  </td>
                  <td className={`px-8 py-6 text-right font-black italic text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrencyLocal(closing.revenue)}
                  </td>
                  <td className={`px-8 py-6 text-right font-bold italic text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatCurrencyLocal(closing.systemTotal)}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic ${
                        closing.status === 'Pendente' 
                          ? 'bg-slate-500/10 text-slate-500'
                          : Math.abs(closing.diff) < 1 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : closing.diff > 0 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-700/10 text-red-700'
                      }`}>
                        {closing.status === 'Pendente' 
                          ? 'Pendente'
                          : Math.abs(closing.diff) < 1 
                            ? 'Batido' 
                            : closing.diff > 0 
                              ? `Sobra (+${formatCurrencyLocal(closing.diff)})` 
                              : `Falta (${formatCurrencyLocal(closing.diff)})`}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      {closing.status === 'Concluído' ? (
                        isAdmin ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVerifyClosing(closing.id, !!closing.verified);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider italic transition-all shrink-0 hover:scale-105 active:scale-95 ${
                              closing.verified
                                ? 'bg-green-500 text-white shadow-sm shadow-green-500/20 cursor-pointer'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-400 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-500 cursor-pointer'
                            }`}
                            title={closing.verified ? "Desmarcar como Conferido" : "Marcar como Conferido"}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${closing.verified ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span>{closing.verified ? 'Conferido' : 'Conferir'}</span>
                          </button>
                        ) : (
                          <span
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider italic shrink-0 cursor-default ${
                              closing.verified
                                ? 'bg-green-500/20 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                            }`}
                            title={closing.verified ? "Conferido por Diretor/ADM" : "Pendente de conferência"}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${closing.verified ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span>{closing.verified ? 'Conferido' : 'Pendente'}</span>
                          </span>
                        )
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider italic opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Conferir</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 inline-flex">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (closing.status === 'Concluído') {
                            setConfirmResetId(closing.id);
                          }
                        }}
                        disabled={closing.status !== 'Concluído'}
                        className={`p-3 rounded-xl transition-all transform ${
                          closing.status === 'Concluído'
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white hover:scale-105 cursor-pointer'
                            : 'opacity-30 bg-slate-500/5 text-slate-400 cursor-not-allowed'
                        }`}
                        title={closing.status === 'Concluído' ? "Zerar lançamentos" : "Sem lançamentos para zerar"}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(closing.id)}
                        className="p-3 bg-amber-500/10 rounded-xl text-amber-500 hover:bg-amber-500 hover:text-white transition-all transform group-hover:scale-110"
                        title={closing.status === 'Concluído' ? "Editar" : "Iniciar Fechamento"}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            key="cash-closing-modal-container"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
            >
              <div className="p-8 border-b dark:border-[#333] flex items-center justify-between bg-black">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500 rounded-2xl font-black italic">{storeInfo.logo}</div>
                  <div>
                    <h3 className={`text-xl font-black uppercase italic tracking-tighter ${storeInfo.brand?.toLowerCase().includes('bebelu') ? 'text-amber-500' : 'text-white'}`}>{storeInfo.title}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest italic ${storeInfo.brand?.toLowerCase().includes('bebelu') ? 'text-amber-500/50' : 'text-slate-400'}`}>{storeInfo.location}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-white"><X /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Data</label>
                    <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-black italic text-sm outline-none ${isDarkMode ? 'bg-black border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase italic ml-2">Operador</label>
                    <input type="text" placeholder="Nome do responsável" value={formData.operator} onChange={(e) => handleInputChange('operator', e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-black italic text-sm outline-none ${isDarkMode ? 'bg-black border-[#333] text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className={`text-sm font-black uppercase italic border-b pb-2 ${
                      storeInfo.brand?.toLowerCase().includes('bebelu') 
                        ? 'text-[#7F300C] border-[#7F300C]/20' 
                        : isDarkMode ? 'text-white border-white/20' : 'text-slate-900 border-slate-200'
                    }`}>Finalizadores de Venda</h4>
                    {[
                      { label: 'DELIVERY', field: 'delivery' as const },
                      { label: 'CARTÃO CRÉDITO', field: 'creditCard' as const },
                      { label: 'CARTÃO DÉBITO', field: 'debitCard' as const },
                      { label: 'REFEIÇÃO', field: 'refeicao' as const },
                      { label: 'PIX', field: 'pix' as const },
                      { label: 'TOTEM', field: 'totem' as const },
                      { label: 'SANGRIA', field: 'sangria' as const },
                    ].map(item => (
                      <div key={item.field} className="flex items-center justify-between group">
                        <span className={`text-[11px] font-bold uppercase transition-colors ${
                          storeInfo.brand?.toLowerCase().includes('bebelu') 
                            ? 'text-[#7F300C]' 
                            : isDarkMode ? 'text-white group-hover:text-amber-500' : 'text-slate-900 group-hover:text-amber-500'
                        }`}>{item.label}</span>
                        <input 
                          type="text" 
                          value={inputValues[item.field] !== undefined ? inputValues[item.field] : (formData[item.field] || '')} 
                          onChange={(e) => handleNumberChange(item.field, e.target.value)} 
                          className={`w-36 px-4 py-2 text-right rounded-xl font-black italic outline-none border transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500'}`}
                          placeholder="0,00"
                        />
                      </div>
                    ))}
                    
                    <div className="space-y-2 pt-6">
                      <label className={`text-[10px] font-black uppercase italic ml-2 ${storeInfo.brand?.toLowerCase().includes('bebelu') ? 'text-[#7F300C]' : (isDarkMode ? 'text-white' : 'text-slate-950')}`}>Observações / Notas</label>
                      <textarea 
                        value={formData.observations}
                        onChange={(e) => handleInputChange('observations', e.target.value)}
                        placeholder="Digite aqui observações relevantes sobre o fechamento..."
                        className={`w-full h-full min-h-[120px] p-6 rounded-[2rem] border font-medium text-sm outline-none resize-none transition-all ${
                          isDarkMode ? 'bg-black border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-950 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className={`text-sm font-black uppercase italic border-b pb-2 ${
                        storeInfo.brand?.toLowerCase().includes('bebelu') 
                          ? 'text-[#7F300C] border-[#7F300C]/20' 
                          : isDarkMode ? 'text-white border-white/20' : 'text-slate-900 border-slate-200'
                      }`}>Outros / Justificativas</h4>
                      {[
                        { label: 'LANCHE', field: 'lancheFuncionarios' as const, isFixed: true },
                        { label: 'VALE FUNCIONÁRIO', field: 'valefuncionario' as const, isFixed: true },
                        { label: 'DESPESAS', field: 'despesas' as const, isFixed: true },
                        { label: 'OUTROS (COD 50)', field: 'outros1' as const },
                        { label: 'OUTROS 2', field: 'outros2' as const },
                        { label: 'OUTROS 3', field: 'outros3' as const },
                        { label: 'OUTROS 4', field: 'outros4' as const },
                      ].map(item => (
                        <div key={item.field} className="flex items-center justify-between group gap-2">
                          {item.isFixed ? (
                            <span className={`text-[11px] font-bold uppercase transition-colors shrink-0 ${
                              storeInfo.brand?.toLowerCase().includes('bebelu') 
                                ? 'text-[#7F300C]' 
                                : isDarkMode ? 'text-white group-hover:text-amber-500' : 'text-slate-900 group-hover:text-amber-500'
                            }`}>{item.label}</span>
                          ) : (
                            <input 
                              type="text" 
                              placeholder={item.label} 
                              value={formData[`${item.field}_label` as keyof CashClosingForm] as string || ''}
                              onChange={(e) => handleInputChange(`${item.field}_label` as keyof CashClosingForm, e.target.value)}
                              className={`flex-1 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase outline-none transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white focus:border-amber-500 placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500'}`} 
                            />
                          )}
                          <input 
                            type="text" 
                            value={inputValues[item.field] !== undefined ? inputValues[item.field] : (formData[item.field] || '')} 
                            onChange={(e) => handleNumberChange(item.field, e.target.value)} 
                            className={`w-24 px-4 py-2 text-right rounded-xl font-black italic outline-none border transition-all ${isDarkMode ? 'bg-black border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-amber-500'}`}
                            placeholder="0,00"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-10">
                      <div className="p-8 rounded-[2rem] bg-black border border-slate-800 space-y-6 shadow-2xl flex flex-col justify-center">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase italic">Total Geral Informado</span>
                            <span className="text-2xl font-black text-white italic">{formatCurrencyLocal(totalGeral)}</span>
                         </div>
                         <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase italic">Total Sistema</span>
                            <input 
                              type="text" 
                              value={inputValues['totalSistema'] !== undefined ? inputValues['totalSistema'] : (formData.totalSistema || '')} 
                              onChange={(e) => handleNumberChange('totalSistema', e.target.value)} 
                              className="w-32 bg-transparent text-xl font-black text-amber-500 text-right outline-none underline underline-offset-4 decoration-amber-500/30"
                              placeholder="0,00"
                            />
                         </div>
                         <div className={`flex items-center justify-between border-t border-slate-800 pt-6 p-4 rounded-2xl ${diff >= 0 ? 'bg-green-500/10' : 'bg-red-700/10'}`}>
                            <span className={`text-[10px] font-black uppercase italic ${diff >= 0 ? 'text-green-500' : 'text-red-700'}`}>{diff >= 0 ? 'SOBRA (+)' : 'FALTA (-)'}</span>
                            <span className={`text-xl font-black italic ${diff >= 0 ? 'text-green-500' : 'text-red-700'}`}>{formatCurrencyLocal(Math.abs(diff))}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="p-8 border-t dark:border-[#333] flex items-center justify-between bg-slate-900 rounded-b-[3rem]">
                <div className="flex gap-2">
                   <button onClick={exportToPDF} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                     <FileDown className="w-4 h-4" /> PDF
                   </button>
                   <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                     <Printer className="w-4 h-4" /> IMPRIMIR
                   </button>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest">CANCELAR</button>
                  <button 
                    onClick={async () => {
                      setIsSaving(true);
                      await new Promise(r => setTimeout(r, 800));
                      
                      const updated = {
                        ...closingsData,
                        [formData.date]: { ...formData, totalGeral, diff, sobra, falta }
                      };
                      setClosingsData(updated);
                      localStorage.setItem(`closings_data_${currentStore.id}`, JSON.stringify(updated));
                      
                      try {
                        const docRef = doc(db, 'stores', currentStore.id, 'closings', 'all');
                        await setDoc(docRef, { data: updated });
                        toastSuccess("Fechamento de caixa confirmado e registrado com sucesso!");
                      } catch (err) {
                        console.error("Erro ao salvar fechamento no Firestore:", err);
                        toastError("Erro ao salvar dados no servidor online.");
                      }
                      
                      setIsSaving(false);
                      setShowModal(false);
                    }}
                    className="px-10 py-4 bg-amber-500 hover:bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95"
                  >
                    CONFIRMAR FECHAMENTO
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {confirmResetId && (
        <motion.div 
          key="cash-reset-modal-container"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setConfirmResetId(null)} 
            className="absolute inset-0 bg-black/85 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 shadow-2xl flex flex-col space-y-6 z-10 ${isDarkMode ? 'bg-[#121212] border border-slate-800' : 'bg-white border border-slate-100'}`}
          >
            <div className="flex items-center gap-4 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-lg font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Zerar Caixa?</h3>
                <p className="text-xs text-slate-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Deseja realmente zerar todos os lançamentos informados para o dia <span className="font-extrabold text-amber-500">{confirmResetId.split('-').reverse().join('/')}</span>? O status do caixa voltará a ser Pendente.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setConfirmResetId(null)}
                className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  const updated = { ...closingsData };
                  delete updated[confirmResetId];
                  setClosingsData(updated);
                  localStorage.setItem(`closings_data_${currentStore.id}`, JSON.stringify(updated));
                  
                  try {
                    const docRef = doc(db, 'stores', currentStore.id, 'closings', 'all');
                    await setDoc(docRef, { data: updated });
                  } catch (err) {
                    console.error("Erro ao remover fechamento do Firestore:", err);
                  }
                  
                  setConfirmResetId(null);
                }}
                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-500/20"
              >
                Zerar Lançamentos
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
}
