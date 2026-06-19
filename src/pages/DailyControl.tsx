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
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isRoot ? 'all' : currentStore.id
  );

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, '0');
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const d = new Date();
    return String(d.getFullYear());
  });

  // Raw lists stored in Firestore
  // Keyed by store ID to allow fast state caching/switching
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [vouchers, setVouchers] = useState<DailyVoucher[]>([]);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formCategory, setFormCategory] = useState('');
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
    const docId = `period_${selectedYear}_${selectedMonth}`;
    try {
      if (isRoot) {
        // Root reads all stores
        const allExpenses: DailyExpense[] = [];
        const allVouchers: DailyVoucher[] = [];

        const functionalStoreIds = STORES.filter(s => s.id !== 'admin-global').map(s => s.id);
        
        for (const storeId of functionalStoreIds) {
          const storeDoc = STORES.find(s => s.id === storeId);
          const storeName = storeDoc ? storeDoc.name : `Unidade ${storeId}`;
          const path = `/stores/${storeId}/daily_control/${docId}`;
          const docRef = doc(db, 'stores', storeId, 'daily_control', docId);
          const docSnap = await getDoc(docRef);
          
          let rawData: any = null;
          
          if (docSnap.exists() && docSnap.data().data) {
            rawData = docSnap.data().data;
          } else {
            // BACKWARD COMPATIBILITY / FALLBACK to 'all' filtered by year-month
            const oldDocRef = doc(db, 'stores', storeId, 'daily_control', 'all');
            const oldDocSnap = await getDoc(oldDocRef);
            if (oldDocSnap.exists() && oldDocSnap.data().data) {
              const oldData = oldDocSnap.data().data;
              const yearMonthString = `${selectedYear}-${selectedMonth}`;
              const legacyExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(yearMonthString));
              const legacyVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(yearMonthString));
              
              rawData = {
                expenses: legacyExpenses,
                vouchers: legacyVouchers
              };
            }
          }

          if (rawData) {
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
        const path = `/stores/${currentStore.id}/daily_control/${docId}`;
        const docRef = doc(db, 'stores', currentStore.id, 'daily_control', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().data) {
          const rawData = docSnap.data().data;
          setExpenses(rawData.expenses || []);
          setVouchers(rawData.vouchers || []);
        } else {
          // BACKWARD COMPATIBILITY / FALLBACK to 'all' filtered by year-month
          const oldDocRef = doc(db, 'stores', currentStore.id, 'daily_control', 'all');
          const oldDocSnap = await getDoc(oldDocRef);
          if (oldDocSnap.exists() && oldDocSnap.data().data) {
            const oldData = oldDocSnap.data().data;
            const yearMonthString = `${selectedYear}-${selectedMonth}`;
            const legacyExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(yearMonthString));
            const legacyVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(yearMonthString));
            
            setExpenses(legacyExpenses);
            setVouchers(legacyVouchers);
          } else {
            setExpenses([]);
            setVouchers([]);
          }
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
  }, [currentStore, isRoot, selectedMonth, selectedYear]);

  // Open Modal Helpers
  const openAddModal = () => {
    setEditingItem(null);
    
    // Default to the first day of selectedYear and selectedMonth, or today if today matches selectedYear and selectedMonth
    const d = new Date();
    const currentY = String(d.getFullYear());
    const currentM = String(d.getMonth() + 1).padStart(2, '0');
    if (selectedYear === currentY && selectedMonth === currentM) {
      setFormDate(d.toISOString().split('T')[0]);
    } else {
      setFormDate(`${selectedYear}-${selectedMonth}-01`);
    }

    setFormDescription('');
    setFormValue('');
    setFormCategory('');
    setFormPaymentMethod(activeTab === 'expenses' ? PAYMENT_METHODS[0] : 'Lanche');
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
    setFormCategory(item.category || '');
    setFormPaymentMethod(item.paymentMethod || (activeTab === 'vouchers' ? 'Lanche' : PAYMENT_METHODS[0]));
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
      // Helper to generate docId based on the item date
      const getDocIdFromDate = (dateString: string) => {
        const parts = dateString.split('-');
        if (parts.length >= 2) {
          return `period_${parts[0]}_${parts[1]}`;
        }
        return `period_${selectedYear}_${selectedMonth}`;
      };

      const newDocId = getDocIdFromDate(formDate);
      const isPeriodChanged = editingItem && getDocIdFromDate(editingItem.date) !== newDocId;

      // 1. Fetch current list for this specific store & new period
      const targetDocRef = doc(db, 'stores', targetStoreId, 'daily_control', newDocId);
      const targetDocSnap = await getDoc(targetDocRef);
      
      let targetExpenses: DailyExpense[] = [];
      let targetVouchers: DailyVoucher[] = [];

      if (targetDocSnap.exists() && targetDocSnap.data().data) {
        targetExpenses = targetDocSnap.data().data.expenses || [];
        targetVouchers = targetDocSnap.data().data.vouchers || [];
      } else {
        // Look for older data in 'all' filtered by year-month as fallback
        const oldDocRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
        const oldDocSnap = await getDoc(oldDocRef);
        if (oldDocSnap.exists() && oldDocSnap.data().data) {
          const oldData = oldDocSnap.data().data;
          const targetYearMonth = newDocId.replace('period_', '').replace('_', '-');
          targetExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(targetYearMonth));
          targetVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(targetYearMonth));
        }
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

        if (editingItem && !isPeriodChanged) {
          targetExpenses = targetExpenses.map(item => item.id === editingItem.id ? payload : item);
        } else {
          // Add or replace
          targetExpenses = targetExpenses.filter(item => item.id !== payload.id);
          targetExpenses.push(payload);
        }
      } else {
        const payload: DailyVoucher = {
          id: editingItem ? editingItem.id : 'vch-' + Date.now(),
          storeId: targetStoreId,
          storeName: targetStoreName,
          date: formDate,
          employeeName: formEmployeeName,
          value: valueNum,
          description: formDescription || 'Lanche',
          paymentMethod: formPaymentMethod || 'Lanche',
          status: formStatus as 'Pendente' | 'Descontado',
          notes: formNotes,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
        };

        if (editingItem && !isPeriodChanged) {
          targetVouchers = targetVouchers.map(item => item.id === editingItem.id ? payload : item);
        } else {
          // Add or replace
          targetVouchers = targetVouchers.filter(item => item.id !== payload.id);
          targetVouchers.push(payload);
        }
      }

      // Save to target period document
      const pathForWrite = `/stores/${targetStoreId}/daily_control/${newDocId}`;
      try {
        await setDoc(targetDocRef, {
          data: {
            expenses: targetExpenses,
            vouchers: targetVouchers
          },
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForWrite);
      }

      // If the period of the item was modified, we also need to remove it from the old doc
      if (isPeriodChanged) {
        const oldDocId = getDocIdFromDate(editingItem.date);
        const oldDocRef = doc(db, 'stores', targetStoreId, 'daily_control', oldDocId);
        const oldDocSnap = await getDoc(oldDocRef);

        let oldExpenses: DailyExpense[] = [];
        let oldVouchers: DailyVoucher[] = [];

        if (oldDocSnap.exists() && oldDocSnap.data().data) {
          oldExpenses = oldDocSnap.data().data.expenses || [];
          oldVouchers = oldDocSnap.data().data.vouchers || [];
        } else {
          // Try fetching from legacy 'all' filtered
          const oldDocRefAll = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
          const oldDocSnapAll = await getDoc(oldDocRefAll);
          if (oldDocSnapAll.exists() && oldDocSnapAll.data().data) {
            const oldData = oldDocSnapAll.data().data;
            const oldYearMonth = oldDocId.replace('period_', '').replace('_', '-');
            oldExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(oldYearMonth));
            oldVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(oldYearMonth));
          }
        }

        oldExpenses = oldExpenses.filter(e => e.id !== editingItem.id);
        oldVouchers = oldVouchers.filter(v => v.id !== editingItem.id);

        const pathForOldWrite = `/stores/${targetStoreId}/daily_control/${oldDocId}`;
        try {
          await setDoc(oldDocRef, {
            data: {
              expenses: oldExpenses,
              vouchers: oldVouchers
            },
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForOldWrite);
        }
      }

      toastSuccess(editingItem ? 'Lançamento atualizado com sucesso!' : 'Novo lançamento cadastrado com sucesso!');
      setIsModalOpen(false);
      loadDailyData();
    } catch (err) {
      console.error(err);
      toastError('Ocorreu um erro ao salvar o lançamento no banco de dados.');
    }
  };

  // Delete Action
  const handleDeleteItem = (item: any) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const targetStoreId = itemToDelete.storeId;
      const getDocIdFromDate = (dateString: string) => {
        const parts = dateString.split('-');
        if (parts.length >= 2) {
          return `period_${parts[0]}_${parts[1]}`;
        }
        return `period_${selectedYear}_${selectedMonth}`;
      };

      const docId = getDocIdFromDate(itemToDelete.date);
      const docRef = doc(db, 'stores', targetStoreId, 'daily_control', docId);
      const docSnap = await getDoc(docRef);

      let currentExpenses: DailyExpense[] = [];
      let currentVouchers: DailyVoucher[] = [];

      if (docSnap.exists() && docSnap.data().data) {
        currentExpenses = docSnap.data().data.expenses || [];
        currentVouchers = docSnap.data().data.vouchers || [];
      } else {
        // Fallback to legacy 'all'
        const oldDocRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
        const oldDocSnap = await getDoc(oldDocRef);
        if (oldDocSnap.exists() && oldDocSnap.data().data) {
          const oldData = oldDocSnap.data().data;
          const targetYearMonth = docId.replace('period_', '').replace('_', '-');
          currentExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(targetYearMonth));
          currentVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(targetYearMonth));
        }
      }

      if (activeTab === 'expenses') {
        currentExpenses = currentExpenses.filter(e => e.id !== itemToDelete.id);
      } else {
        currentVouchers = currentVouchers.filter(v => v.id !== itemToDelete.id);
      }

      const pathForWrite = `/stores/${targetStoreId}/daily_control/${docId}`;
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
    } catch (err) {
      console.error(err);
      toastError('Erro ao excluir o lançamento do banco de dados.');
    } finally {
      setItemToDelete(null);
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
    
    if (dateFilter === 'today') {
      result = result.filter(item => item.date === todayStr);
    } else if (dateFilter === '7days') {
      result = result.filter(item => new Date(item.date) >= sevenDaysAgo);
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
    
    if (dateFilter === 'today') {
      result = result.filter(item => item.date === todayStr);
    } else if (dateFilter === '7days') {
      result = result.filter(item => new Date(item.date) >= sevenDaysAgo);
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

  // Export to PDF Helper (Aesthetic browser-direct PDF print style)
  const handleExportPDF = () => {
    try {
      const isExpenses = activeTab === 'expenses';
      const listToPrint = isExpenses ? filteredExpensesList : filteredVouchersList;
      
      const storeLabel = selectedStoreId === 'all' 
        ? 'Todas as Lojas' 
        : (STORES.find(s => s.id === selectedStoreId)?.name || currentStore.name);
        
      const monthNames: Record<string, string> = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
      };
      
      const periodLabel = `${monthNames[selectedMonth] || selectedMonth}/${selectedYear}`;

      const totalItems = listToPrint.length;
      const totalValue = listToPrint.reduce((sum, item) => sum + item.value, 0);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toastError('Popups bloqueados! Permita popups para poder gerar o PDF.');
        return;
      }

      const formattedDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const title = isExpenses 
        ? 'Relatório de Despesas Diárias' 
        : 'Relatório de Vales (Lanches)';

      let tableHeaders = '';
      if (isExpenses) {
        tableHeaders = `
          <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Data</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Loja</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Categoria</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Descrição</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Meio Pagto.</th>
            <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Valor</th>
          </tr>
        `;
      } else {
        tableHeaders = `
          <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Data</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Loja</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Funcionário</th>
            <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Descrição</th>
            <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">Valor</th>
          </tr>
        `;
      }

      let tableRows = '';
      listToPrint.forEach(item => {
        const itemDate = item.date ? item.date.split('-').reverse().join('/') : '-';
        if (isExpenses) {
          tableRows += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-size: 11px; color: #334155;">${itemDate}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155;">${item.storeName || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155; font-weight: bold;">${item.category || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155;">${item.description || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155;">${item.paymentMethod || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #0f172a; font-weight: bold; text-align: right;">R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        } else {
          tableRows += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-size: 11px; color: #334155;">${itemDate}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155;">${item.storeName || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155; font-weight: bold;">${item.employeeName || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #334155;">${item.description || '-'}</td>
              <td style="padding: 10px; font-size: 11px; color: #0f172a; font-weight: bold; text-align: right;">R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          `;
        }
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #1e293b;
              margin: 40px;
              background: #fff;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .title-brand {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #ea580c;
              margin-bottom: 4px;
            }
            .title-main {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            .meta-info {
              font-size: 11px;
              color: #64748b;
              text-align: right;
              line-height: 1.6;
            }
            .filter-chips {
              display: flex;
              gap: 15px;
              margin-bottom: 25px;
              background: #f8fafc;
              padding: 12px 16px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .chip {
              font-size: 11px;
              color: #475569;
            }
            .chip strong {
              color: #0f172a;
            }
            .kpis {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              padding: 16px;
              border-radius: 12px;
              background: #fff;
            }
            .kpi-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .kpi-value {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              font-weight: 600;
            }
            .total-row td {
              border-top: 2px solid #0f172a;
              font-weight: bold;
              font-size: 12px;
              color: #0f172a;
              padding: 15px 10px;
            }
            @media print {
              body {
                margin: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <div class="title-brand">${currentStore.brand || 'ORGANIZAÇÃO'}</div>
              <h1 class="title-main">${title}</h1>
            </div>
            <div class="meta-info">
              <div>Gerado em: <strong>${formattedDate}</strong></div>
              <div>Por: <strong>Painel de Controle</strong></div>
            </div>
          </div>

          <div class="filter-chips">
            <div class="chip">Unidade Selecionada: <strong>${storeLabel}</strong></div>
            <div style="width: 1px; background: #cbd5e1; height: 14px; align-self: center;"></div>
            <div class="chip">Período: <strong>${periodLabel}</strong></div>
          </div>

          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Volume Total de Transações</div>
              <div class="kpi-value">${totalItems} lançamentos</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Soma Total Informada</div>
              <div class="kpi-value" style="color: #ea580c;">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table>
            <thead>
              ${tableHeaders}
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td colspan="${isExpenses ? 5 : 4}" style="text-align: right;">Total Geral</td>
                <td style="text-align: right; font-size: 13px;">R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            Este documento é de uso restrito interno do gestor de controle financeiro. Para salvar como PDF, selecione a opção apropriada nas configurações de destinação da sua impressora.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toastSuccess('Relatório PDF aberto para impressão!');
    } catch (err) {
      console.error(err);
      toastError('Erro ao gerar relatório em PDF.');
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
            onClick={handleExportPDF}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors ${
              isDarkMode 
                ? 'bg-[#1E1E1E] border-[#333] hover:bg-[#252525]' 
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Exportar PDF
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

      {/* Período de Trabalho (Active Period Selection) */}
      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-amber-500/5 border-amber-500/20'} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Período Ativo do Controle Diário
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Defina o período para visualizar, cadastrar e exportar lançamentos do respectivo mês.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
            }}
            className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            <option value="01">Janeiro</option>
            <option value="02">Fevereiro</option>
            <option value="03">Março</option>
            <option value="04">Abril</option>
            <option value="05">Maio</option>
            <option value="06">Junho</option>
            <option value="07">Julho</option>
            <option value="08">Agosto</option>
            <option value="09">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
            }}
            className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${
              isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
            } outline-none cursor-pointer`}
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className={`${isRoot ? 'md:col-span-9' : 'md:col-span-12'} relative`}>
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

        {/* Store ID (Show only if ROOT) */}
        {isRoot && (
          <div className="md:col-span-3">
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
                      <th className="px-4 py-3.5">Lanche Escolhido</th>
                      <th className="px-4 py-3.5">Valor</th>
                      <th className="px-4 py-3.5">Meio de Liberação</th>
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
                        <input
                          type="text"
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          placeholder="Digite a categoria..."
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                          } outline-none focus:border-amber-500`}
                          required
                        />
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
                          <option value="Lanche">Lanche</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Qual Lanche escolhido</label>
                      <input
                        type="text"
                        placeholder="Ex: Bebelu Burger + Refri, Combo Duplo, etc..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                          isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white' : 'bg-white border-slate-200'
                        } outline-none focus:border-amber-500`}
                      />
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

        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop visual */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-black/60"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative w-full max-w-sm p-6 rounded-2xl shadow-xl border overflow-hidden ${
                isDarkMode 
                  ? 'bg-[#181818] border-[#2C2C2C] text-white' 
                  : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              <button 
                onClick={() => setItemToDelete(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2C2C2C] transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              <h2 className="text-base font-black uppercase italic tracking-wider mb-3 text-red-500 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" /> Excluir Lançamento
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o lançamento de{' '}
                <strong className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  R$ {itemToDelete.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>{' '}
                {itemToDelete.description && itemToDelete.description !== 'Lanche' 
                  ? `(${itemToDelete.description})` 
                  : itemToDelete.employeeName 
                    ? `(${itemToDelete.employeeName})` 
                    : ''
                }? Esta ação não poderá ser desfeita.
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border ${
                    isDarkMode ? 'border-[#333] hover:bg-[#252525]' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="text-xs font-black text-white bg-red-600 px-5 py-2.5 rounded-xl transition-all hover:bg-red-700 shadow-md active:scale-95"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
