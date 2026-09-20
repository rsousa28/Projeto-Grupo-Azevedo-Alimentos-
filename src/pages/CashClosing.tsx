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
  RotateCcw,
  Check,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDocCached, setDocCached } from '../lib/firestoreQueryCache';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
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
  const { currentStore, isDarkMode, closingsData, setClosingsData, brandColors } = useStore();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const isAdmin = user?.role === 'ADMIN' || user?.username === 'adm';
  const isBebelu = currentStore.brand === 'BEBELU';
  const isB28 = currentStore?.code === 'B28' || 
                currentStore?.id === '2' || 
                (currentStore?.name || '').toLowerCase().includes('riomar') || 
                (currentStore?.name || '').toLowerCase().includes('papicu') ||
                (currentStore?.name || '').toLowerCase().includes('b28');
  const themeButtonBg = brandColors.button;
  const themeTextContrast = isBebelu ? '#121212' : '#FFFFFF';
  const currentInitialDate = new Date();
  const initialMonthStr = String(currentInitialDate.getMonth() + 1).padStart(2, '0');
  const initialYearStr = String(currentInitialDate.getFullYear());

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(initialMonthStr);
  const [selectedYear, setSelectedYear] = useState(initialYearStr);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  // Load initial store custom closings on mount, store, and period changes
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

    // 2. Load from central Firestore for cross-user/cross-device synchronization
    let isMounted = true;
    const fetchCloudClosings = async () => {
      try {
        const periodDocKey = `${selectedYear}_${selectedMonth}`;
        const periodRef = doc(db, 'stores', currentStore.id, 'closings', periodDocKey);
        const allRef = doc(db, 'stores', currentStore.id, 'closings', 'all');

        const [periodSnap, allSnap] = await Promise.all([
          getDocCached(periodRef, currentStore.id, user).catch(() => ({ exists: () => false, data: () => null })),
          getDocCached(allRef, currentStore.id, user).catch(() => ({ exists: () => false, data: () => null }))
        ]);

        let cloudMerged: Record<string, any> = {};

        if (allSnap.exists() && allSnap.data()?.data) {
          cloudMerged = { ...allSnap.data().data };
        }
        if (periodSnap.exists() && periodSnap.data()?.data) {
          cloudMerged = { ...cloudMerged, ...periodSnap.data().data };
        }

        if (isMounted && Object.keys(cloudMerged).length > 0) {
          setClosingsData(prev => {
            const merged = { ...prev, ...cloudMerged };
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
  }, [currentStore.id, selectedYear, selectedMonth, setClosingsData]);

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
  const [extraFields, setExtraFields] = useState<('outros2' | 'outros3' | 'outros4')[]>([]);

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
      const periodDocKey = `${selectedYear}_${selectedMonth}`;
      const periodRef = doc(db, 'stores', currentStore.id, 'closings', periodDocKey);
      const allRef = doc(db, 'stores', currentStore.id, 'closings', 'all');

      // Filter entries belonging to this month to keep period payload lean
      const monthPrefix = `${selectedYear}-${selectedMonth}`;
      const periodEntries: Record<string, any> = {};
      Object.entries(closingsData).forEach(([dateKey, val]) => {
        if (dateKey.startsWith(monthPrefix)) {
          periodEntries[dateKey] = val;
        }
      });

      await Promise.all([
        setDocCached(periodRef, { data: periodEntries }, currentStore.id, user),
        setDocCached(allRef, { data: closingsData }, currentStore.id, user)
      ]);
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

        // Dispatch real-time push notification alert for cash closing save
        let periodTotalGeral = 0;
        let periodTotalSistema = 0;
        let periodDiff = 0;
        const monthPrefix = `${selectedYear}-${selectedMonth}`;

        Object.entries(closingsData).forEach(([dateKey, val]: [string, any]) => {
          if (dateKey.startsWith(monthPrefix) && val) {
            periodTotalGeral += Number(val.totalGeral || 0);
            periodTotalSistema += Number(val.totalSistema || 0);
            periodDiff += Number(val.diff || 0);
          }
        });

        const activeOperator = user.name || user.username || 'Operador';
        NotificationService.notifyCashClosingCompleted({
          storeName: currentStore.name,
          userName: activeOperator,
          date: `${monthLabel}/${selectedYear}`,
          totalGeral: periodTotalGeral,
          totalSistema: periodTotalSistema,
          diff: periodDiff,
        });
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
    if (isB28) {
      return (
        (formData.delivery || 0) +
        (formData.creditCard || 0) +
        (formData.debitCard || 0) +
        (formData.pix || 0) +
        (formData.refeicao || 0) + // mapped as VOUCHER in B28
        (formData.lancheFuncionarios || 0) + // LANCHE FUNCIONÁRIO
        (formData.valefuncionario || 0) + // VALE FUNCIONÁRIO
        (formData.despesas || 0) +
        (formData.sangria || 0)
      );
    }
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
  }, [formData, isB28]);

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

  const formatCurrencyInputDisplay = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return '0,00';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleInputChange = (field: keyof CashClosingForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof CashClosingForm, value: string) => {
    // Keep raw string in local state while typing
    setInputValues(prev => ({ ...prev, [field]: value }));
    
    // Normalize for numeric state (replace thousand dots, convert comma to dot)
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(normalized) || 0;
    setFormData(prev => ({ ...prev, [field]: num }));
  };

  const handleNumberFocus = (field: keyof CashClosingForm) => {
    const currentVal = inputValues[field];
    if (currentVal === '0,00' || currentVal === '0' || !currentVal) {
      setInputValues(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberBlur = (field: keyof CashClosingForm) => {
    const num = (formData[field] as number) || 0;
    setInputValues(prev => ({ ...prev, [field]: formatCurrencyInputDisplay(num) }));
  };

  const addExtraJustification = () => {
    const allExtras: ('outros2' | 'outros3' | 'outros4')[] = ['outros2', 'outros3', 'outros4'];
    const next = allExtras.find(field => !extraFields.includes(field));
    if (next) {
      setExtraFields(prev => [...prev, next]);
    }
  };

  const removeExtraJustification = (field: ('outros2' | 'outros3' | 'outros4')) => {
    setExtraFields(prev => prev.filter(f => f !== field));
    setFormData(prev => ({ ...prev, [field]: 0, [`${field}_label`]: '' }));
    setInputValues(prev => ({ ...prev, [field]: '0,00' }));
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
      await setDocCached(docRef, { data: updated }, currentStore.id, user);
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
          initialInputs[key] = formatCurrencyInputDisplay(val);
        }
      });
      setInputValues(initialInputs);

      // Check which extra fields have content
      const activeExtras: ('outros2' | 'outros3' | 'outros4')[] = [];
      if ((saved.outros2 && saved.outros2 > 0) || saved.outros2_label) activeExtras.push('outros2');
      if ((saved.outros3 && saved.outros3 > 0) || saved.outros3_label) activeExtras.push('outros3');
      if ((saved.outros4 && saved.outros4 > 0) || saved.outros4_label) activeExtras.push('outros4');
      setExtraFields(activeExtras);
    } else {
      setFormData({ 
        ...initialFormState, 
        date: id,
        operator: user?.name || ''
      });
      setInputValues({
        delivery: '0,00',
        creditCard: '0,00',
        debitCard: '0,00',
        refeicao: '0,00',
        pix: '0,00',
        totem: '0,00',
        sangria: '0,00',
        lancheFuncionarios: '0,00',
        valefuncionario: '0,00',
        despesas: '0,00',
        outros1: '0,00',
        outros2: '0,00',
        outros3: '0,00',
        outros4: '0,00',
        totalSistema: '0,00',
      });
      setExtraFields([]);
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
        title: 'CAIXA B28',
        location: 'RIO MAR FORTALEZA',
        brand: currentStore.brand,
        logo: 'B'
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
    
    if (isB28) {
      doc.setFontSize(22);
      doc.setTextColor(20, 50, 120);
      doc.setFont('helvetica', 'bold');
      doc.text('CAIXA B28', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(30, 70, 160);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('RIO MAR FORTALEZA', pageWidth / 2, 28, { align: 'center' });
      
      autoTable(doc, {
        startY: 35,
        head: [['CAMPO', 'VALOR INFORMADO']],
        body: [
          ['DATA', formData.date.split('-').reverse().join('/')],
          ['OPERADOR', formData.operator || 'NÃO INFORMADO'],
          ['IFOOD', formatCurrencyLocal(formData.delivery)],
          ['CARTÃO DE CRÉDITO', formatCurrencyLocal(formData.creditCard)],
          ['CARTÃO DE DÉBITO', formatCurrencyLocal(formData.debitCard)],
          ['PIX', formatCurrencyLocal(formData.pix)],
          ['VOUCHER', formatCurrencyLocal(formData.refeicao)],
          ['LANCHE FUNCIONÁRIO', formatCurrencyLocal(formData.lancheFuncionarios)],
          ['VALE FUNCIONÁRIO', formatCurrencyLocal(formData.valefuncionario)],
          ['DESPESAS', formatCurrencyLocal(formData.despesas)],
          ['SANGRIA', formatCurrencyLocal(formData.sangria)],
          ['TOTAL GERAL', formatCurrencyLocal(totalGeral)],
          ['TOTAL SISTEMA', formatCurrencyLocal(formData.totalSistema)],
          ['SOBRA/ FALTA', diff >= 0 ? `+${formatCurrencyLocal(diff)} (Sobra)` : `${formatCurrencyLocal(diff)} (Falta)`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' } as any,
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold' } } as any
      });
      
      doc.save(`caixa-b28-${formData.date}.pdf`);
      return;
    }

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
    <div className="space-y-6 pb-10">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-[#333]">
        <div>
          <h2 className={`text-2xl sm:text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Relatório de Caixa
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Gestão operacional e financeira do PDV {currentStore.brand}
          </p>
        </div>
        
        {/* Action Button Row */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleSavePeriod}
            disabled={isSaving}
            className={`flex-1 md:flex-initial btn-save-secondary ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#333] hover:bg-[#252525] text-white' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" /> : <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            {isSaving ? 'Salvando...' : 'Salvar Período'}
          </button>
          
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData(initialFormState);
              setShowModal(true);
            }}
            style={{
              backgroundColor: themeButtonBg,
              color: themeTextContrast,
              boxShadow: `0 10px 15px -3px ${themeButtonBg}40`,
            }}
            className="flex-1 md:flex-initial btn-save-primary"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Novo Fechamento
          </button>
        </div>
      </div>

      {/* Período de Trabalho (Active Period Selection) */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-amber-500/5 border-amber-500/20'} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Período Ativo do Relatório de Caixa
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Defina o período para visualizar, cadastrar e exportar lançamentos do respectivo mês.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`flex-1 md:flex-initial text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={`flex-1 md:flex-initial text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
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
                      <span 
                        style={closing.status !== 'Pendente' && Math.abs(closing.diff) < 1 ? {
                          backgroundColor: themeButtonBg,
                          color: themeTextContrast
                        } : {}}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic ${
                          closing.status === 'Pendente' 
                            ? 'bg-slate-500/10 text-slate-500'
                            : Math.abs(closing.diff) < 1 
                              ? 'shadow-sm' 
                              : closing.diff > 0 
                                ? 'bg-green-500/10 text-green-500' 
                                : 'bg-red-700/10 text-red-700'
                        }`}
                      >
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-5xl max-h-[96vh] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col border ${
                isDarkMode ? 'bg-[#121214] border-[#2C2C32] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* 1. Header Principal */}
              <div className="px-5 py-3 border-b border-white/10 dark:border-[#2C2C32] flex items-center justify-between bg-black text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-amber-500 rounded-xl font-black italic text-black text-sm shadow-md">
                    {storeInfo.logo}
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-black uppercase italic tracking-tighter leading-tight ${storeInfo.brand?.toLowerCase().includes('bebelu') ? 'text-amber-500' : 'text-white'}`}>
                      {storeInfo.title}
                    </h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest italic leading-none ${storeInfo.brand?.toLowerCase().includes('bebelu') ? 'text-amber-500/60' : 'text-slate-400'}`}>
                      {storeInfo.location}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2. Barra de Status Discreta (Data e Operador) */}
              <div className={`px-5 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
                isDarkMode 
                  ? 'bg-zinc-900/60 border-[#2C2C32] text-slate-300' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Data */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data:</label>
                    <input 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => handleInputChange('date', e.target.value)} 
                      className={`px-2.5 py-1 rounded-lg border font-bold text-xs outline-none transition-colors ${
                        isDarkMode 
                          ? 'bg-black/50 border-zinc-700 text-white focus:border-amber-500' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      }`} 
                    />
                  </div>

                  <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 hidden sm:block" />

                  {/* Operador */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operador:</label>
                    <input 
                      type="text" 
                      placeholder="Nome do responsável" 
                      value={formData.operator} 
                      onChange={(e) => handleInputChange('operator', e.target.value)} 
                      className={`w-44 sm:w-60 px-2.5 py-1 rounded-lg border font-bold text-xs outline-none transition-colors ${
                        isDarkMode 
                          ? 'bg-black/50 border-zinc-700 text-white focus:border-amber-500 placeholder:text-zinc-600' 
                          : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 placeholder:text-slate-400'
                      }`} 
                    />
                  </div>
                </div>

                {/* Badge de Status da Conferência */}
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    closingsData[formData.date]?.verified
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {closingsData[formData.date]?.verified ? '✓ Conferido' : '• Lançamento em Aberto'}
                  </span>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="flex-1 overflow-y-auto px-5 py-3.5 sm:px-6 sm:py-4 space-y-3.5">
                {/* 3. 2 Colunas de Lançamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 items-start">
                  
                  {/* Coluna Esquerda: Finalizadores de Venda */}
                  <div className="space-y-1">
                    <h4 className={`text-xs font-black uppercase italic border-b pb-1 mb-2 ${
                      storeInfo.brand?.toLowerCase().includes('bebelu') 
                        ? 'text-[#7F300C] border-[#7F300C]/20' 
                        : isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
                    }`}>
                      Finalizadores de Venda {isB28 ? '(B28)' : ''}
                    </h4>

                    {(isB28 ? [
                      { label: 'IFOOD', field: 'delivery' as const },
                      { label: 'CARTÃO CRÉDITO', field: 'creditCard' as const },
                      { label: 'CARTÃO DÉBITO', field: 'debitCard' as const },
                      { label: 'PIX', field: 'pix' as const },
                      { label: 'VOUCHER', field: 'refeicao' as const },
                      { label: 'SANGRIA', field: 'sangria' as const },
                    ] : [
                      { label: 'DELIVERY', field: 'delivery' as const },
                      { label: 'CARTÃO CRÉDITO', field: 'creditCard' as const },
                      { label: 'CARTÃO DÉBITO', field: 'debitCard' as const },
                      { label: 'REFEIÇÃO', field: 'refeicao' as const },
                      { label: 'PIX', field: 'pix' as const },
                      { label: 'TOTEM', field: 'totem' as const },
                      { label: 'SANGRIA', field: 'sangria' as const },
                    ]).map(item => (
                      <div key={item.field} className="flex items-center justify-between group py-0.5">
                        <span className={`text-[10px] sm:text-[11px] font-bold uppercase transition-colors ${
                          storeInfo.brand?.toLowerCase().includes('bebelu') 
                            ? 'text-[#7F300C]' 
                            : isDarkMode ? 'text-slate-300 group-hover:text-amber-500' : 'text-slate-700 group-hover:text-amber-500'
                        }`}>
                          {item.label}
                        </span>
                        <div className={`flex items-center w-36 px-2.5 py-1 rounded-xl border transition-all ${
                          isDarkMode 
                            ? 'bg-black/40 border-zinc-800 focus-within:border-amber-500' 
                            : 'bg-slate-50 border-slate-200 focus-within:border-amber-500'
                        }`}>
                          <span className="text-[10px] font-bold text-slate-400 select-none mr-1 shrink-0">R$</span>
                          <input 
                            type="text" 
                            value={inputValues[item.field] !== undefined ? inputValues[item.field] : formatCurrencyInputDisplay(formData[item.field] as number)} 
                            onChange={(e) => handleNumberChange(item.field, e.target.value)} 
                            onFocus={() => handleNumberFocus(item.field)}
                            onBlur={() => handleNumberBlur(item.field)}
                            className="w-full text-right font-black italic text-xs outline-none bg-transparent text-slate-900 dark:text-white"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coluna Direita: Outros / Justificativas */}
                  <div className="space-y-1">
                    <h4 className={`text-xs font-black uppercase italic border-b pb-1 mb-2 ${
                      storeInfo.brand?.toLowerCase().includes('bebelu') 
                        ? 'text-[#7F300C] border-[#7F300C]/20' 
                        : isDarkMode ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'
                    }`}>
                      Outros / Justificativas {isB28 ? '(B28)' : ''}
                    </h4>

                    {(isB28 ? [
                      { label: 'LANCHE FUNCIONÁRIO', field: 'lancheFuncionarios' as const, isFixed: true },
                      { label: 'VALE FUNCIONÁRIO', field: 'valefuncionario' as const, isFixed: true },
                      { label: 'DESPESAS', field: 'despesas' as const, isFixed: true },
                    ] : [
                      { label: 'LANCHE', field: 'lancheFuncionarios' as const, isFixed: true },
                      { label: 'VALE FUNCIONÁRIO', field: 'valefuncionario' as const, isFixed: true },
                      { label: 'DESPESAS', field: 'despesas' as const, isFixed: true },
                      { label: 'REPOSIÇÃO FUNDO DE CAIXA', field: 'outros1' as const, isFixed: true },
                    ]).map(item => (
                      <div key={item.field} className="flex items-center justify-between group py-0.5">
                        <span className={`text-[10px] sm:text-[11px] font-bold uppercase transition-colors shrink-0 ${
                          storeInfo.brand?.toLowerCase().includes('bebelu') 
                            ? 'text-[#7F300C]' 
                            : isDarkMode ? 'text-slate-300 group-hover:text-amber-500' : 'text-slate-700 group-hover:text-amber-500'
                        }`}>
                          {item.label}
                        </span>
                        <div className={`flex items-center w-36 px-2.5 py-1 rounded-xl border transition-all ${
                          isDarkMode 
                            ? 'bg-black/40 border-zinc-800 focus-within:border-amber-500' 
                            : 'bg-slate-50 border-slate-200 focus-within:border-amber-500'
                        }`}>
                          <span className="text-[10px] font-bold text-slate-400 select-none mr-1 shrink-0">R$</span>
                          <input 
                            type="text" 
                            value={inputValues[item.field] !== undefined ? inputValues[item.field] : formatCurrencyInputDisplay(formData[item.field] as number)} 
                            onChange={(e) => handleNumberChange(item.field, e.target.value)} 
                            onFocus={() => handleNumberFocus(item.field)}
                            onBlur={() => handleNumberBlur(item.field)}
                            className="w-full text-right font-black italic text-xs outline-none bg-transparent text-slate-900 dark:text-white"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Justificativas Extras Dinâmicas (outros2, outros3, outros4) */}
                    {extraFields.map((field) => {
                      const num = field.replace('outros', '');
                      const labelField = `${field}_label` as keyof CashClosingForm;
                      return (
                        <div key={field} className="flex items-center justify-between group gap-2 py-0.5">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => removeExtraJustification(field)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer shrink-0"
                              title="Remover justificativa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <input 
                              type="text" 
                              placeholder={`OUTROS ${num}`} 
                              value={(formData[labelField] as string) || ''}
                              onChange={(e) => handleInputChange(labelField, e.target.value)}
                              className={`w-full px-2 py-1 rounded-lg border text-[10px] font-bold uppercase outline-none transition-all ${
                                isDarkMode 
                                  ? 'bg-black/30 border-zinc-800 text-white focus:border-amber-500 placeholder:text-zinc-600' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 placeholder:text-slate-400'
                              }`} 
                            />
                          </div>
                          <div className={`flex items-center w-36 px-2.5 py-1 rounded-xl border transition-all shrink-0 ${
                            isDarkMode 
                              ? 'bg-black/40 border-zinc-800 focus-within:border-amber-500' 
                              : 'bg-slate-50 border-slate-200 focus-within:border-amber-500'
                          }`}>
                            <span className="text-[10px] font-bold text-slate-400 select-none mr-1 shrink-0">R$</span>
                            <input 
                              type="text" 
                              value={inputValues[field] !== undefined ? inputValues[field] : formatCurrencyInputDisplay(formData[field] as number)} 
                              onChange={(e) => handleNumberChange(field, e.target.value)} 
                              onFocus={() => handleNumberFocus(field)}
                              onBlur={() => handleNumberBlur(field)}
                              className="w-full text-right font-black italic text-xs outline-none bg-transparent text-slate-900 dark:text-white"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Botão de Adicionar Justificativa Extra */}
                    {!isB28 && extraFields.length < 3 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={addExtraJustification}
                          className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-500 hover:text-amber-400 hover:underline cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar outros</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Área Inferior: Observações e Totais (Duas Metades Equilibradas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-2.5 border-t border-slate-100 dark:border-white/5 items-stretch">
                  {/* Lado Esquerdo: Observações / Notas */}
                  <div className="flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-[10px] sm:text-xs font-black uppercase italic ${
                        storeInfo.brand?.toLowerCase().includes('bebelu') 
                          ? 'text-[#7F300C]' 
                          : isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        Observações / Notas
                      </label>
                      <span className="text-[9px] text-slate-400 font-medium">Opcional</span>
                    </div>
                    <textarea 
                      value={formData.observations}
                      onChange={(e) => handleInputChange('observations', e.target.value)}
                      placeholder="Observações ou justificativas relevantes sobre o fechamento..."
                      rows={3}
                      className={`w-full flex-1 p-2.5 rounded-xl border font-medium text-xs outline-none resize-none transition-all ${
                        isDarkMode 
                          ? 'bg-black/30 border-zinc-800 text-white focus:border-amber-500 placeholder:text-zinc-600' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 placeholder:text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Lado Direito: Card de Resumo Contábil Refinado */}
                  <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 ${
                    isDarkMode 
                      ? 'bg-[#18181C] border-[#2C2C32] shadow-sm' 
                      : 'bg-slate-50 border-slate-200 shadow-sm'
                  }`}>
                    {/* Total Geral Informado */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                        Total Informado
                      </span>
                      <span className="text-sm sm:text-base font-black italic text-slate-900 dark:text-white">
                        {formatCurrencyLocal(totalGeral)}
                      </span>
                    </div>

                    {/* Total Sistema */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                        Total Sistema
                      </span>
                      <div className={`flex items-center w-36 px-2.5 py-1 rounded-xl border transition-all ${
                        isDarkMode 
                          ? 'bg-black/50 border-zinc-800 focus-within:border-amber-500' 
                          : 'bg-white border-slate-200 focus-within:border-amber-500'
                      }`}>
                        <span className="text-[10px] font-bold text-slate-400 select-none mr-1 shrink-0">R$</span>
                        <input 
                          type="text" 
                          value={inputValues['totalSistema'] !== undefined ? inputValues['totalSistema'] : formatCurrencyInputDisplay(formData.totalSistema)} 
                          onChange={(e) => handleNumberChange('totalSistema', e.target.value)} 
                          onFocus={() => handleNumberFocus('totalSistema')}
                          onBlur={() => handleNumberBlur('totalSistema')}
                          className="w-full text-right font-black italic text-xs outline-none bg-transparent text-amber-500"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Linha Divisória */}
                    <div className="border-t border-slate-200 dark:border-zinc-800" />

                    {/* Diferença: Badge ou cor condicional */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                        Diferença
                      </span>
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-tight flex items-center gap-1.5 ${
                        diff === 0 
                          ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
                          : diff > 0 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' 
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                      }`}>
                        <span>
                          {diff === 0 ? 'Batido' : diff > 0 ? 'Sobra (+)' : 'Falta (-)'}
                        </span>
                        <span className="italic font-bold">
                          {diff === 0 ? 'R$ 0,00' : formatCurrencyLocal(Math.abs(diff))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Rodapé de Ações */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-[#2C2C32] flex items-center justify-between bg-slate-950 text-white shrink-0">
                {/* Botões Secundários: PDF e Imprimir minimalistas */}
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={exportToPDF} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer"
                    title="Exportar fechamento em PDF"
                  >
                    <FileDown className="w-3.5 h-3.5 text-amber-500" />
                    <span>PDF</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => window.print()} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-all cursor-pointer"
                    title="Imprimir fechamento"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Imprimir</span>
                  </button>
                </div>

                {/* Botões de Ação Final */}
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    disabled={isSaving}
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
                        const entryDateKey = formData.date;
                        const periodKey = entryDateKey.substring(0, 7).replace('-', '_');
                        const periodRef = doc(db, 'stores', currentStore.id, 'closings', periodKey);
                        const allRef = doc(db, 'stores', currentStore.id, 'closings', 'all');

                        const entryData = { ...formData, totalGeral, diff, sobra, falta };
                        
                        await Promise.all([
                          setDocCached(periodRef, { data: { [entryDateKey]: entryData } }, currentStore.id, user),
                          setDocCached(allRef, { data: updated }, currentStore.id, user)
                        ]);
                        toastSuccess("Fechamento de caixa confirmado e registrado com sucesso!");

                        const activeOperator = user?.name || user?.username || formData.operator || 'Operador';
                        NotificationService.notifyCashClosingCompleted({
                          storeName: currentStore.name,
                          userName: activeOperator,
                          date: formData.date,
                          totalGeral,
                          totalSistema: formData.totalSistema,
                          diff,
                        });
                      } catch (err) {
                        console.error("Erro ao salvar fechamento no Firestore:", err);
                        toastError("Erro ao salvar dados no servidor online.");
                      }
                      
                      setIsSaving(false);
                      setShowModal(false);
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Confirmar Fechamento</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
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
              className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 shadow-2xl flex flex-col space-y-6 z-10 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
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
                      await setDocCached(docRef, { data: updated }, currentStore.id, user);
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
