import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Filter, 
  Calendar, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Banknote, 
  Users, 
  DollarSign,
  TrendingDown,
  Percent,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface DailyExpense {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  description: string;
  value: number;
  category: string;
  paymentMethod: string;
  recipient?: string;
  status: 'Pago' | 'Pendente';
  notes?: string;
  createdAt: string;
}

export interface DailyVoucher {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  employeeName: string;
  value: number;
  description: string;
  paymentMethod: string;
  status: 'Pendente' | 'Descontado';
  notes?: string;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  'Alimentação / Balcão',
  'Limpeza / Higiene',
  'Manutenção Rápida',
  'Transporte / Frete Rápido',
  'Papelaria / Escritório',
  'Outros Gastos Operacionais',
];

const PAYMENT_METHODS = [
  'Dinheiro (Caixa)',
  'PIX',
  'Cartão Coporativo',
  'Outros'
];

export default function DailyControl() {
  const { currentStore, isDarkMode, brandColors, setStore } = useStore();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const isRoot = currentStore.id === 'admin-global';

  // State
  const [activeTab, setActiveTab] = useState<'expenses' | 'vouchers'>('expenses');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isRoot ? 'all' : currentStore.id
  );

  // Raw lists stored in Firestore
  // Keyed by store ID to allow fast state caching/switching
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [vouchers, setVouchers] = useState<DailyVoucher[]>([]);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [formRecipient, setFormRecipient] = useState('');
  const [formStatus, setFormStatus] = useState<'Pago' | 'Pendente' | 'Descontado'>('Pago');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStoreId, setFormStoreId] = useState('');

  // Synchronize store selections
  useEffect(() => {
    if (!isRoot) {
      setSelectedStoreId(currentStore.id);
    } else {
      setSelectedStoreId('all');
    }
  }, [currentStore, isRoot]);

  // Load Data
  const loadDailyData = async () => {
    setLoading(true);
    try {
      if (isRoot) {
        // Root reads all stores
        const allExpenses: DailyExpense[] = [];
        const allVouchers: DailyVoucher[] = [];

        const functionalStoreIds = STORES.filter(s => s.id !== 'admin-global').map(s => s.id);
        
        for (const storeId of functionalStoreIds) {
          const storeDoc = STORES.find(s => s.id === storeId);
          const storeName = storeDoc ? storeDoc.name : `Unidade ${storeId}`;
          const path = `/stores/${storeId}/daily_control/all`;
          const docRef = doc(db, 'stores', storeId, 'daily_control', 'all');
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().data) {
            const rawData = docSnap.data().data;
            const expList = (rawData.expenses || []).map((e: any) => ({
              ...e,
              storeId,
              storeName: e.storeName || storeName
            }));
            const vchList = (rawData.vouchers || []).map((v: any) => ({
              ...v,
              storeId,
              storeName: v.storeName || storeName
            }));
            allExpenses.push(...expList);
            allVouchers.push(...vchList);
          }
        }
        
        // Sort newest first
        allExpenses.sort((a,b) => b.date.localeCompare(a.date));
        allVouchers.sort((a,b) => b.date.localeCompare(a.date));

        setExpenses(allExpenses);
        setVouchers(allVouchers);
      } else {
        // Individual store read
        const path = `/stores/${currentStore.id}/daily_control/all`;
        const docRef = doc(db, 'stores', currentStore.id, 'daily_control', 'all');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().data) {
          const rawData = docSnap.data().data;
          setExpenses(rawData.expenses || []);
          setVouchers(rawData.vouchers || []);
        } else {
          setExpenses([]);
          setVouchers([]);
        }
      }
    } catch (e) {
      console.error('Error fetching daily control documents:', e);
      toastError('Erro ao carregar dados do Controle Diário de despesas e vales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyData();
  }, [currentStore, isRoot]);

  // Open Modal Helpers
  const openAddModal = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormValue('');
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormPaymentMethod(PAYMENT_METHODS[0]);
    setFormRecipient('');
    setFormStatus(activeTab === 'expenses' ? 'Pago' : 'Pendente');
    setFormEmployeeName('');
    setFormNotes('');
    setFormStoreId(isRoot ? STORES.filter(s => s.id !== 'admin-global')[0].id : currentStore.id);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormDate(item.date);
    setFormDescription(item.description || '');
    setFormValue(String(item.value));
    setFormCategory(item.category || EXPENSE_CATEGORIES[0]);
    setFormPaymentMethod(item.paymentMethod || PAYMENT_METHODS[0]);
    setFormRecipient(item.recipient || '');
    setFormStatus(item.status);
    setFormEmployeeName(item.employeeName || '');
    setFormNotes(item.notes || '');
    setFormStoreId(item.storeId || currentStore.id);
    setIsModalOpen(true);
  };

  // Save / Submit Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription && activeTab === 'expenses') {
      toastWarning('Favor preencher a descrição da despesa.');
      return;
    }
    if (!formEmployeeName && activeTab === 'vouchers') {
      toastWarning('Favor informar o nome do funcionário.');
      return;
    }
    if (!formValue || Number(formValue) <= 0) {
      toastWarning('O valor deve ser maior do que zero.');
      return;
    }

    const valueNum = Number(formValue);
    const targetStoreId = isRoot ? formStoreId : currentStore.id;
    const targetStoreName = STORES.find(s => s.id === targetStoreId)?.name || currentStore.name;

    try {
      // 1. Fetch current list for this specific store
      const docRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
      const docSnap = await getDoc(docRef);
      
      let currentExpenses: DailyExpense[] = [];
      let currentVouchers: DailyVoucher[] = [];

      if (docSnap.exists() && docSnap.data().data) {
        currentExpenses = docSnap.data().data.expenses || [];
        currentVouchers = docSnap.data().data.vouchers || [];
      }

      if (activeTab === 'expenses') {
        const payload: DailyExpense = {
          id: editingItem ? editingItem.id : 'exp-' + Date.now(),
          storeId: targetStoreId,
          storeName: targetStoreName,
          date: formDate,
          description: formDescription,
          value: valueNum,
          category: formCategory,
          paymentMethod: formPaymentMethod,
          recipient: formRecipient,
          status: formStatus as 'Pago' | 'Pendente',
          notes: formNotes,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
        };

        if (editingItem) {
          currentExpenses = currentExpenses.map(item => item.id === editingItem.id ? payload : item);
        } else {
          currentExpenses.push(payload);
        }
      } else {
        const payload: DailyVoucher = {
          id: editingItem ? editingItem.id : 'vch-' + Date.now(),
          storeId: targetStoreId,
          storeName: targetStoreName,
          date: formDate,
          employeeName: formEmployeeName,
          value: valueNum,
          description: formDescription || 'Adiantamento / Vale',
          paymentMethod: formPaymentMethod,
          status: formStatus as 'Pendente' | 'Descontado',
          notes: formNotes,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
        };

        if (editingItem) {
          currentVouchers = currentVouchers.map(item => item.id === editingItem.id ? payload : item);
        } else {
          currentVouchers.push(payload);
        }
      }

      // Save to firebase
      const pathForWrite = `/stores/${targetStoreId}/daily_control/all`;
      try {
        await setDoc(docRef, {
          data: {
            expenses: currentExpenses,
            vouchers: currentVouchers
          },
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForWrite);
      }

      toastSuccess(editingItem ? 'Lançamento atualizado com sucesso!' : 'Novo lançamento cadastrado com sucesso!');
      setIsModalOpen(false);
      // Refresh
      loadDailyData();
    } catch (err) {
      console.error(err);
      toastError('Ocorreu um erro ao salvar o lançamento no banco de dados.');
    }
  };

  // Delete Action
  const handleDeleteItem = async (item: any) => {
    const isDeleteConfirmed = window.confirm(`Deseja realmente excluir este lançamento de R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`);
    if (!isDeleteConfirmed) return;

    try {
      const targetStoreId = item.storeId;
      const docRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().data) {
        let currentExpenses: DailyExpense[] = docSnap.data().data.expenses || [];
        let currentVouchers: DailyVoucher[] = docSnap.data().data.vouchers || [];

        if (activeTab === 'expenses') {
          currentExpenses = currentExpenses.filter(e => e.id !== item.id);
        } else {
          currentVouchers = currentVouchers.filter(v => v.id !== item.id);
        }

        const pathForWrite = `/stores/${targetStoreId}/daily_control/all`;
        try {
          await setDoc(docRef, {
            data: {
              expenses: currentExpenses,
              vouchers: currentVouchers
            },
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForWrite);
        }

        toastSuccess('Lançamento excluído com sucesso!');
        loadDailyData();
      }
    } catch (err) {
      console.error(err);
      toastError('Erro ao excluir o lançamento do banco de dados.');
    }
  };

  // Filters logic
  const filteredExpensesList = useMemo(() => {
    let result = [...expenses];

    // Filter by Active Store Select
    if (selectedStoreId !== 'all') {
      result = result.filter(item => item.storeId === selectedStoreId);
    }

    // Filter by Search text
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.description?.toLowerCase().includes(q) || 
          item.recipient?.toLowerCase().includes(q) || 
          item.notes?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.storeName?.toLowerCase().includes(q)
      );
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Filter by Date format
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    
    if (dateFilter === 'today') {
      result = result.filter(item => item.date === todayStr);
    } else if (dateFilter === '7days') {
      result = result.filter(item => new Date(item.date) >= sevenDaysAgo);
    } else if (dateFilter === 'month') {
      // Match active month / current year or simply general current month
      const currentYearMonth = todayStr.substring(0, 7); // "2026-06"
      result = result.filter(item => item.date.startsWith(currentYearMonth));
    }

    if (selectedStatus !== 'all') {
      result = result.filter(item => item.status === selectedStatus);
    }

    return result;
  }, [expenses, selectedStoreId, searchQuery, selectedCategory, dateFilter, selectedStatus]);

  const filteredVouchersList = useMemo(() => {
    let result = [...vouchers];

    // Filter by Active Store Select
    if (selectedStoreId !== 'all') {
      result = result.filter(item => item.storeId === selectedStoreId);
    }

    // Filter by Search text
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.employeeName?.toLowerCase().includes(q) || 
          item.description?.toLowerCase().includes(q) || 
          item.notes?.toLowerCase().includes(q) ||
          item.storeName?.toLowerCase().includes(q)
      );
    }

    // Filter by Date format
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    
    if (dateFilter === 'today') {
      result = result.filter(item => item.date === todayStr);
    } else if (dateFilter === '7days') {
      result = result.filter(item => new Date(item.date) >= sevenDaysAgo);
    } else if (dateFilter === 'month') {
      const currentYearMonth = todayStr.substring(0, 7);
      result = result.filter(item => item.date.startsWith(currentYearMonth));
    }

    if (selectedStatus !== 'all') {
      result = result.filter(item => item.status === selectedStatus);
    }

    return result;
  }, [vouchers, selectedStoreId, searchQuery, dateFilter, selectedStatus]);

  // Overall calculations
  const stats = useMemo(() => {
    const totalExp = filteredExpensesList.reduce((sum, item) => sum + item.value, 0);
    const totalVch = filteredVouchersList.reduce((sum, item) => sum + item.value, 0);
    const pendingExp = filteredExpensesList.filter(item => item.status === 'Pendente').reduce((sum, item) => sum + item.value, 0);
    const pendingVch = filteredVouchersList.filter(item => item.status === 'Pendente').reduce((sum, item) => sum + item.value, 0);

    return {
      totalExp,
      totalVch,
      pendingExp,
      pendingVch,
      grandTotal: totalExp + totalVch,
      pendingGrandTotal: pendingExp + pendingVch
    };
  }, [filteredExpensesList, filteredVouchersList]);

  // Export to CSV Helper
  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      
      if (activeTab === 'expenses') {
        csvContent += "ID,Loja,Data,Categoria,Descricao,Beneficiario,Valor,Pagamento,Status,Notas,CriadoEm\n";
        filteredExpensesList.forEach(item => {
          csvContent += `"${item.id}","${item.storeName}","${item.date}","${item.category}","${item.description.replace(/"/g, '""')}","${(item.recipient || '').replace(/"/g, '""')}",${item.value},"${item.paymentMethod}","${item.status}","${(item.notes || '').replace(/"/g, '""')}","${item.createdAt}"\n`;
        });
      } else {
        csvContent += "ID,Loja,Data,Funcionario,Descricao,Valor,Pagamento,Status,Notas,CriadoEm\n";
        filteredVouchersList.forEach(item => {
          csvContent += `"${item.id}","${item.storeName}","${item.date}","${item.employeeName.replace(/"/g, '""')}","${item.description.replace(/"/g, '""')}",${item.value},"${item.paymentMethod}","${item.status}","${(item.notes || '').replace(/"/g, '""')}","${item.createdAt}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `controle_diario_${activeTab === 'expenses' ? 'despesas' : 'vales'}_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess('Arquivo CSV baixado com sucesso!');
    } catch (err) {
      console.error(err);
      toastError('Erro ao exportar dados.');
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 border-slate-100 dark:border-[#333]">
        <div>
          <h1 className={`text-2xl font-black uppercase italic tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            CONTROLE DIÁRIO
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Administração local de pequenas despesas e vales/adiantamentos de colaboradores da unidade.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export and Add buttons */}
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#333] hover:bg-[#252525]' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          
          <button
            id="btn-add-daily-record"
            onClick={openAddModal}
            className="flex items-center gap-2 text-xs font-bold text-slate-900 px-5 py-2.5 rounded-xl transition-all shadow-md transform hover:scale-[1.02]"
            style={{ backgroundColor: brandColors.button }}
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'expenses' ? 'Lançar Despesa' : 'Lançar Vale'}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Despesas Diárias</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold font-display">
            R$ {stats.totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            R$ {stats.pendingExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes de ajuste
          </p>
        </div>

        {/* KPI 2 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vales do Período</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold font-display">
            R$ {stats.totalVch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            R$ {stats.pendingVch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ativos (pendentes de desconto)
          </p>
        </div>

        {/* KPI 3 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Lançamentos</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold font-display">
            R$ {stats.grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Despesas + vales somados
          </p>
        </div>

        {/* KPI 4 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor Pendente</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl font-extrabold font-display text-orange-500">
            R$ {stats.pendingGrandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Necessitam conciliação / desconto
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-[#333]">
        <button
          onClick={() => { setActiveTab('expenses'); setSelectedStatus('all'); }}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'expenses' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          style={{ borderBottomColor: activeTab === 'expenses' ? brandColors.button : 'transparent' }}
        >
          Despesas Diárias / Caixa Rápido
        </button>
        <button
          onClick={() => { setActiveTab('vouchers'); setSelectedStatus('all'); }}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'vouchers' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          style={{ borderBottomColor: activeTab === 'vouchers' ? brandColors.button : 'transparent' }}
        >
          Vales de Funcionários
        </button>
      </div>

      {/* Search and Filters Strip */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-slate-50 border-slate-100'} grid grid-cols-1 md:grid-cols-12 gap-3 items-center shadow-sm`}>
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'expenses' ? 'Buscar despesa, fornecedor, nota...' : 'Buscar funcionário, observação...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border ${
              isDarkMode 
                ? 'bg-[#252525] border-[#3F3F3F] text-white focus:border-amber-500' 
                : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none`}
          />
        </div>

        {/* Date Filter */}
        <div className="md:col-span-2">
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white' : 'bg-white border-slate-200'
            } outline-none`}
          >
            <option value="month">Este Mês (Atual)</option>
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 Dias</option>
            <option value="all">Sempre (Histórico Completo)</option>
          </select>
        </div>

        {/* Category Filter (Disabled for Vouchers) */}
        {activeTab === 'expenses' ? (
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white' : 'bg-white border-slate-200'
              } outline-none`}
            >
              <option value="all">Todas Categorias</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="md:col-span-2 opacity-30 pointer-events-none">
            <select className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3F3F3F]' : 'bg-white'
            }`} disabled>
              <option>Categorias (N/A)</option>
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="md:col-span-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white' : 'bg-white border-slate-200'
            } outline-none`}
          >
            <option value="all">Todos Status</option>
            {activeTab === 'expenses' ? (
              <>
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
              </>
            ) : (
              <>
                <option value="Pendente">Ativo / Pendente</option>
                <option value="Descontado">Descontado (Saldado)</option>
              </>
            )}
          </select>
        </div>

        {/* Store ID (Show only if ROOT) */}
        {isRoot ? (
          <div className="md:col-span-2">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white' : 'bg-white border-slate-200'
              } outline-none`}
            >
              <option value="all">Todas as Lojas</option>
              {STORES.filter(s => s.id !== 'admin-global').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="md:col-span-2 text-center text-slate-400 font-bold text-xs select-none">
            {currentStore.code} ativo
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Clock className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs text-slate-400">Processando e sincronizando lançamentos...</span>
        </div>
      ) : (
        <>
          {activeTab === 'expenses' ? (
            /* EXPENSES DATABASE VIEW */
            filteredExpensesList.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${isDarkMode ? 'bg-[#111] border-[#222]' : 'bg-white border-slate-100'}`}>
                <Banknote className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Nenhuma despesa diária encontrada</h4>
                <p className="text-xs text-slate-400 mt-1">Experimente alargar o filtro de data ou lançar uma nova despesa diária.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#2C2C2C] shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className={`${isDarkMode ? 'bg-[#1E1E1E] text-slate-300' : 'bg-slate-50 text-slate-600'} font-bold uppercase transition-colors`}>
                    <tr>
                      {isRoot && <th className="px-4 py-3.5">Unidade</th>}
                      <th className="px-4 py-3.5">Data</th>
                      <th className="px-4 py-3.5">Descrição</th>
                      <th className="px-4 py-3.5">Categoria</th>
                      <th className="px-4 py-3.5">Beneficiário/Favorecido</th>
                      <th className="px-4 py-3.5">Valor</th>
                      <th className="px-4 py-3.5">Meio de Pagamento</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2E2E2E]">
                    {filteredExpensesList.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-[#1C1C1C]' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {isRoot && <td className="px-4 py-4 font-black text-[10px] text-amber-500">{item.storeName}</td>}
                        <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-400">
                          {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4 font-bold">{item.description}</td>
                        <td className="px-4 py-4 font-medium text-slate-400">{item.category}</td>
                        <td className="px-4 py-4 text-slate-400">{item.recipient || '-'}</td>
                        <td className="px-4 py-4 font-extrabold text-red-500">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-400">{item.paymentMethod}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            item.status === 'Pago' 
                              ? 'bg-teal-500/10 text-teal-500' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {item.status === 'Pago' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1 px-2 rounded-lg bg-slate-100 dark:bg-[#2A2A2A] hover:opacity-85 text-blue-500 transition-opacity"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* VOUCHERS DATABASE VIEW */
            filteredVouchersList.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${isDarkMode ? 'bg-[#111] border-[#222]' : 'bg-white border-slate-100'}`}>
                <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm">Nenhum vale de funcionário encontrado</h4>
                <p className="text-xs text-slate-400 mt-1">Experimente alargar o filtro de data ou lançar um novo vale de funcionário.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#2C2C2C] shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className={`${isDarkMode ? 'bg-[#1E1E1E] text-slate-300' : 'bg-slate-50 text-slate-600'} font-bold uppercase transition-colors`}>
                    <tr>
                      {isRoot && <th className="px-4 py-3.5">Unidade</th>}
                      <th className="px-4 py-3.5">Data</th>
                      <th className="px-4 py-3.5">Funcionário</th>
                      <th className="px-4 py-3.5">Assunto/Motivo</th>
                      <th className="px-4 py-3.5">Valor</th>
                      <th className="px-4 py-3.5">Meio de Repasse</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2E2E2E]">
                    {filteredVouchersList.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-[#1C1C1C]' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {isRoot && <td className="px-4 py-4 font-black text-[10px] text-amber-500">{item.storeName}</td>}
                        <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-400">
                          {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-150">{item.employeeName}</td>
                        <td className="px-4 py-4 text-slate-450">{item.description}</td>
                        <td className="px-4 py-4 font-extrabold text-amber-500">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-400">{item.paymentMethod}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            item.status === 'Descontado' 
                              ? 'bg-teal-500/10 text-teal-500' 
                              : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {item.status === 'Descontado' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {item.status === 'Descontado' ? 'Descontado/Saldado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1 px-2 rounded-lg bg-slate-100 dark:bg-[#2A2A2A] hover:opacity-85 text-blue-500 transition-opacity"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* FORM DIALOG (MODAL) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop visual */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative w-full max-w-lg p-6 rounded-2xl shadow-xl border overflow-hidden ${
                isDarkMode 
                  ? 'bg-[#181818] border-[#2C2C2C] text-white' 
                  : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2C2C2C] transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              <h2 className="text-base font-black uppercase italic italic tracking-wider mb-5">
                {editingItem ? 'Editar Lançamento' : (activeTab === 'expenses' ? 'Lançar Despesa Diária' : 'Registar Vale')}
              </h2>

              <form onSubmit={handleSaveItem} className="space-y-4">
                
                {/* Store Selection (Visible to ROOT only) */}
                {isRoot && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Unidade Receptora</label>
                    <select
                      value={formStoreId}
                      onChange={(e) => setFormStoreId(e.target.value)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                        isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                      } outline-none focus:border-amber-500`}
                    >
                      {STORES.filter(s => s.id !== 'admin-global').map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Grid for Date & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Data</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                        isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                      } outline-none focus:border-amber-500`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                        isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                      } outline-none focus:border-amber-500`}
                      required
                    />
                  </div>
                </div>

                {activeTab === 'expenses' ? (
                  /* EXPENSE FIELDS */
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Categoria</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                          } outline-none focus:border-amber-500`}
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Meio de Pagamento</label>
                        <select
                          value={formPaymentMethod}
                          onChange={(e) => setFormPaymentMethod(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                          } outline-none focus:border-amber-500`}
                        >
                          {PAYMENT_METHODS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Descrição da Despesa</label>
                      <input
                        type="text"
                        placeholder="Ex: Compra de pão de forma, lâmpada reserva..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                        } outline-none focus:border-amber-500`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Beneficiário/Fornecedor (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Padaria do Sol S.A"
                        value={formRecipient}
                        onChange={(e) => setFormRecipient(e.target.value)}
                        className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                        } outline-none focus:border-amber-500`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Status de Lançamento</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                          <input
                            type="radio"
                            name="formStatus"
                            checked={formStatus === 'Pago'}
                            onChange={() => setFormStatus('Pago')}
                            className="accent-amber-500 scale-110"
                          />
                          Confirmado / Pago
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                          <input
                            type="radio"
                            name="formStatus"
                            checked={formStatus === 'Pendente'}
                            onChange={() => setFormStatus('Pendente')}
                            className="accent-amber-500 scale-110"
                          />
                          Pendente de Conferência / Caixa
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  /* VOUCHER FIELDS */
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Nome do Funcionário</label>
                        <input
                          type="text"
                          placeholder="Ex: Francisco de Assis"
                          value={formEmployeeName}
                          onChange={(e) => setFormEmployeeName(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                          } outline-none focus:border-amber-500`}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 font-sans">Meio de Liberação</label>
                        <select
                          value={formPaymentMethod}
                          onChange={(e) => setFormPaymentMethod(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                          } outline-none focus:border-amber-500`}
                        >
                          {PAYMENT_METHODS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Finalidade / Motivo</label>
                      <input
                        type="text"
                        placeholder="Ex: Adiantamento semanal, adiantamento de feriado..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                        } outline-none focus:border-amber-500`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Situação do Vale</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                          <input
                            type="radio"
                            name="formStatus"
                            checked={formStatus === 'Pendente'}
                            onChange={() => setFormStatus('Pendente')}
                            className="accent-amber-500 scale-110"
                          />
                          Ativo (Pendente de Desconto)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold select-none cursor-pointer">
                          <input
                            type="radio"
                            name="formStatus"
                            checked={formStatus === 'Descontado'}
                            onChange={() => setFormStatus('Descontado')}
                            className="accent-amber-500 scale-110"
                          />
                          Descontado na Folha de Pagamento
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Additional Notes */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Observações Adicionais</label>
                  <textarea
                    rows={2}
                    placeholder="Quaisquer dados adicionais que facilitem a conferência pela diretoria."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className={`w-full text-xs p-3 rounded-xl border resize-none ${
                      isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
                    } outline-none`}
                  />
                </div>

                {/* Submit Container */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl border ${
                      isDarkMode ? 'border-[#333] hover:bg-[#252525]' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-black text-slate-900 px-5 py-2.5 rounded-xl transition-all hover:opacity-90 shadow-md"
                    style={{ backgroundColor: brandColors.button }}
                  >
                    Sincronizar Lançamento
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
