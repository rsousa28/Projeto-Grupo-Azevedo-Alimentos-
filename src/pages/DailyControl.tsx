import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, STORES } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDocCached, setDocCached } from '../lib/firestoreQueryCache';

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
  'Aso',
  'Despesa',
  'Passagem',
  'Diaria',
  'Alimentação',
  'Manutenção',
  'Limpeza',
  'Outros'
];

const PAYMENT_METHODS = [
  'Dinheiro (Caixa)',
  'PIX',
  'Cartão Coporativo',
  'Outros'
];

const CHART_COLORS = [
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B'  // Slate
];

const standardizeName = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export default function DailyControl() {
  const { currentStore, isDarkMode, brandColors, setStore } = useStore();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const isRoot = user?.role === 'ADMIN' || currentStore.id === 'admin-global';

  // State
  const [activeTab, setActiveTab] = useState<'expenses' | 'vouchers'>('expenses');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    currentStore.id === 'admin-global' ? 'all' : currentStore.id
  );
  const [expensesSortOrder, setExpensesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [vouchersSortOrder, setVouchersSortOrder] = useState<'asc' | 'desc'>('desc');

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

  // Category manager states
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryManagerName, setNewCategoryManagerName] = useState('');
  const [categoryToDeleteState, setCategoryToDeleteState] = useState<string | null>(null);

  // Employee manager states
  const [showEmployeeManager, setShowEmployeeManager] = useState(false);
  const [newEmployeeManagerName, setNewEmployeeManagerName] = useState('');
  const [employeeToDeleteState, setEmployeeToDeleteState] = useState<string | null>(null);

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

  // Dynamic list of categories (defaults + custom ones loaded from localStorage)
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const defaultCategories = [
      'Aso',
      'Despesa',
      'Passagem',
      'Diaria',
      'Alimentação',
      'Manutenção',
      'Limpeza',
      'Outros'
    ];
    try {
      const saved = localStorage.getItem('g_azevedo_custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const combined = [...defaultCategories];
          parsed.forEach((cat: string) => {
            const formatted = cat.trim();
            if (formatted && !combined.includes(formatted)) {
              combined.push(formatted);
            }
          });
          return combined;
        }
      }
    } catch (e) {
      console.error("Erro ao carregar categorias customizadas:", e);
    }
    return defaultCategories;
  });

  const handleCreateCategory = (newCategoryName: string): boolean => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return false;
    
    // Format to capitalized word
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    if (categoriesList.includes(formatted)) {
      toastWarning('Esta categoria já existe!');
      setFormCategory(formatted);
      return false;
    }
    
    const updated = [...categoriesList, formatted];
    setCategoriesList(updated);
    
    const defaultCategories = ['Aso', 'Despesa', 'Passagem', 'Diaria', 'Alimentação', 'Manutenção', 'Limpeza', 'Outros'];
    const customOnly = updated.filter(c => !defaultCategories.includes(c));
    localStorage.setItem('g_azevedo_custom_categories', JSON.stringify(customOnly));
    
    toastSuccess(`Categoria "${formatted}" criada com sucesso!`);
    setFormCategory(formatted);
    return true;
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    const defaultCategories = [
      'Aso',
      'Despesa',
      'Passagem',
      'Diaria',
      'Alimentação',
      'Manutenção',
      'Limpeza',
      'Outros'
    ];
    if (defaultCategories.includes(categoryToDelete)) {
      toastWarning('Categorias padrão não podem ser excluídas!');
      return;
    }
    
    const updated = categoriesList.filter(c => c !== categoryToDelete);
    setCategoriesList(updated);
    
    const customOnly = updated.filter(c => !defaultCategories.includes(c));
    localStorage.setItem('g_azevedo_custom_categories', JSON.stringify(customOnly));
    
    if (formCategory === categoryToDelete) {
      setFormCategory('');
    }
    
    toastSuccess(`Categoria "${categoryToDelete}" excluída com sucesso!`);
  };

  // Dynamic list of custom employees loaded from localStorage
  const [employeesNamesList, setEmployeesNamesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('g_azevedo_custom_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(e => standardizeName(e)).filter(Boolean);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar funcionários customizados:", e);
    }
    return ['Yan Marques', 'Francineide'].map(e => standardizeName(e));
  });

  // Combined available employees (defaults, custom-added, and existing in loaded vouchers)
  const allAvailableEmployees = useMemo(() => {
    const setOfNames = new Set<string>();
    
    // Add default fallbacks
    setOfNames.add('Yan Marques');
    setOfNames.add('Francineide');
    
    // Add custom-managed ones
    employeesNamesList.forEach(e => {
      const formatted = standardizeName(e);
      if (formatted) setOfNames.add(formatted);
    });
    
    // Add existing ones from vouchers in DB
    vouchers.forEach(v => {
      const formatted = standardizeName(v.employeeName);
      if (formatted) setOfNames.add(formatted);
    });
    
    return Array.from(setOfNames).sort();
  }, [employeesNamesList, vouchers]);

  const handleCreateEmployee = (newEmpName: string): boolean => {
    const trimmed = newEmpName.trim();
    if (!trimmed) return false;
    
    const formatted = standardizeName(trimmed);
    
    if (allAvailableEmployees.map(e => e.toLowerCase()).includes(formatted.toLowerCase())) {
      toastWarning('Este funcionário já existe!');
      setFormEmployeeName(formatted);
      return false;
    }
    
    const updated = Array.from(new Set([...employeesNamesList, formatted])).sort();
    setEmployeesNamesList(updated);
    localStorage.setItem('g_azevedo_custom_employees', JSON.stringify(updated));
    
    toastSuccess(`Funcionário "${formatted}" cadastrado com sucesso!`);
    setFormEmployeeName(formatted);
    return true;
  };

  const handleDeleteEmployee = (empToDelete: string) => {
    const formattedToDelete = standardizeName(empToDelete);
    const updated = employeesNamesList.filter(e => standardizeName(e) !== formattedToDelete);
    setEmployeesNamesList(updated);
    localStorage.setItem('g_azevedo_custom_employees', JSON.stringify(updated));
    
    if (standardizeName(formEmployeeName) === formattedToDelete) {
      setFormEmployeeName('');
    }
    
    toastSuccess(`Funcionário "${empToDelete}" removido do cadastro!`);
  };

  // One-time automatic migration of June 2026 from B32 to B28 is now disabled to prevent duplicate data mapping
  const runMigrationB32toB28 = async () => {
    return false;
  };

  // Database Repair Tool States for June/2026 Admin Correction
  const [isRepairPanelOpen, setIsRepairPanelOpen] = useState(false);
  const [repairingDocs, setRepairingDocs] = useState<boolean>(false);
  const [b28VouchersToReview, setB28VouchersToReview] = useState<DailyVoucher[]>([]);
  const [b28ExpensesToReview, setB28ExpensesToReview] = useState<DailyExpense[]>([]);
  const [selections, setSelections] = useState<Record<string, '1' | '2'>>({});

  const handleOpenRepairPanel = async () => {
    setRepairingDocs(true);
    try {
      const docRefId = 'period_2026_06';
      const docRefB28 = doc(db, 'stores', '2', 'daily_control', docRefId);
      const snapB28 = await getDoc(docRefB28);

      if (snapB28.exists() && snapB28.data().data) {
        const d = snapB28.data().data;
        const vchList = d.vouchers || [];
        const expList = d.expenses || [];
        setB28VouchersToReview(vchList);
        setB28ExpensesToReview(expList);

        const initialSelections: Record<string, '1' | '2'> = {};
        vchList.forEach((v: DailyVoucher) => {
          const name = v.employeeName?.toLowerCase() || '';
          if (name.includes('yan') || name.includes('marques') || name.includes('francineide') || name.includes('fran')) {
            initialSelections[v.id] = '1'; // B32
          } else {
            initialSelections[v.id] = '2'; // B28
          }
        });

        expList.forEach((e: DailyExpense) => {
          const desc = e.description?.toLowerCase() || '';
          const rec = e.recipient?.toLowerCase() || '';
          const notes = e.notes?.toLowerCase() || '';
          if (desc.includes('mossoró') || desc.includes('mossoro') || rec.includes('mossoro') || notes.includes('mossoro')) {
            initialSelections[e.id] = '1'; // B32
          } else {
            initialSelections[e.id] = '2'; // B28
          }
        });

        setSelections(initialSelections);
        setIsRepairPanelOpen(true);
      } else {
        toastWarning('Nenhum dado encontrado para Bebelu Riomar Papicu (B28) no período de Junho/2026.');
      }
    } catch (err) {
      console.error(err);
      toastError('Erro ao carregar dados para verificação.');
    } finally {
      setRepairingDocs(false);
    }
  };

  const handleSaveRepair = async () => {
    setRepairingDocs(true);
    try {
      const docRefId = 'period_2026_06';

      const docRefB28 = doc(db, 'stores', '2', 'daily_control', docRefId);
      const docRefB32 = doc(db, 'stores', '1', 'daily_control', docRefId);

      const [snapB28, snapB32] = await Promise.all([
        getDoc(docRefB28),
        getDoc(docRefB32)
      ]);

      const currentB28Exp = snapB28.exists() ? (snapB28.data().data?.expenses || []) : [];
      const currentB28Vch = snapB28.exists() ? (snapB28.data().data?.vouchers || []) : [];
      const currentB32Exp = snapB32.exists() ? (snapB32.data().data?.expenses || []) : [];
      const currentB32Vch = snapB32.exists() ? (snapB32.data().data?.vouchers || []) : [];

      const newB28Exp: DailyExpense[] = [];
      const newB28Vch: DailyVoucher[] = [];
      const newB32Exp: DailyExpense[] = [...currentB32Exp];
      const newB32Vch: DailyVoucher[] = [...currentB32Vch];

      currentB28Vch.forEach((v: DailyVoucher) => {
        const destStoreId = selections[v.id] || '2';
        if (destStoreId === '1') {
          // Move to B32:
          const existsInB32 = newB32Vch.some((x: DailyVoucher) => x.id === v.id);
          if (!existsInB32) {
            newB32Vch.push({
              ...v,
              storeId: '1',
              storeName: 'Bebelu Mossoró'
            });
          }
        } else {
          // Remains in B28:
          newB28Vch.push({
            ...v,
            storeId: '2',
            storeName: 'Bebelu Riomar Papicu'
          });
        }
      });

      currentB28Exp.forEach((e: DailyExpense) => {
        const destStoreId = selections[e.id] || '2';
        if (destStoreId === '1') {
          // Move to B32:
          const existsInB32 = newB32Exp.some((x: DailyExpense) => x.id === e.id);
          if (!existsInB32) {
            newB32Exp.push({
              ...e,
              storeId: '1',
              storeName: 'Bebelu Mossoró'
            });
          }
        } else {
          // Remains in B28:
          newB28Exp.push({
            ...e,
            storeId: '2',
            storeName: 'Bebelu Riomar Papicu'
          });
        }
      });

      // Also clean up any potential references in B32 if they got restored
      // (B32 should now have its proper, non-duplicated items)
      await Promise.all([
        setDoc(docRefB28, {
          data: {
            expenses: newB28Exp,
            vouchers: newB28Vch
          },
          updatedAt: new Date().toISOString()
        }),
        setDoc(docRefB32, {
          data: {
            expenses: newB32Exp,
            vouchers: newB32Vch
          },
          updatedAt: new Date().toISOString()
        })
      ]);

      toastSuccess('Ajuste de lançamentos concluído com sucesso! Os vales e despesas foram redirecionados aos seus respectivos caixas de filiais.');
      setIsRepairPanelOpen(false);
      loadDailyData();
    } catch (err) {
      console.error(err);
      toastError('Erro ao salvar reajuste do banco de dados.');
    } finally {
      setRepairingDocs(false);
    }
  };

  // Synchronize store selections
  useEffect(() => {
    if (currentStore.id !== 'admin-global') {
      setSelectedStoreId(currentStore.id);
    } else {
      setSelectedStoreId('all');
    }
  }, [currentStore]);

  // Load Data
  const loadDailyData = async () => {
    setLoading(true);
    const docId = `period_${selectedYear}_${selectedMonth}`;
    try {
      // Auto migration from B32 to B28 is now disabled to protect data segregation
      // June 2026 data correction is handled via the interactive Repair Panel for ADMIN users.

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
          const docSnap = await getDocCached(docRef, currentStore.id, user);
          
          let rawData: any = null;
          
          if (docSnap.exists() && docSnap.data().data) {
            rawData = docSnap.data().data;
          } else {
            // BACKWARD COMPATIBILITY / FALLBACK to 'all' filtered by year-month
            const oldDocRef = doc(db, 'stores', storeId, 'daily_control', 'all');
            const oldDocSnap = await getDocCached(oldDocRef, currentStore.id, user);
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
        const docSnap = await getDocCached(docRef, currentStore.id, user);

        if (docSnap.exists() && docSnap.data().data) {
          const rawData = docSnap.data().data;
          setExpenses(rawData.expenses || []);
          setVouchers(rawData.vouchers || []);
        } else {
          // BACKWARD COMPATIBILITY / FALLBACK to 'all' filtered by year-month
          const oldDocRef = doc(db, 'stores', currentStore.id, 'daily_control', 'all');
          const oldDocSnap = await getDocCached(oldDocRef, currentStore.id, user);
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
    const initialStoreId = currentStore.id !== 'admin-global' 
      ? currentStore.id 
      : (STORES.filter(s => s.id !== 'admin-global')[0]?.id || '');
    setFormStoreId(initialStoreId);
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
    const editStoreId = item.storeId || (currentStore.id !== 'admin-global' ? currentStore.id : (STORES.filter(s => s.id !== 'admin-global')[0]?.id || ''));
    setFormStoreId(editStoreId);
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

    // Auto-save newly typed custom category if any
    if (activeTab === 'expenses' && formCategory) {
      const trimmed = formCategory.trim();
      if (trimmed) {
        const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        if (!categoriesList.includes(formatted)) {
          const updated = [...categoriesList, formatted];
          setCategoriesList(updated);
          const defaultCategories = ['Aso', 'Despesa', 'Passagem', 'Diaria', 'Alimentação', 'Manutenção', 'Limpeza', 'Outros'];
          const customOnly = updated.filter(c => !defaultCategories.includes(c));
          localStorage.setItem('g_azevedo_custom_categories', JSON.stringify(customOnly));
        }
      }
    }

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
      const originalStoreId = editingItem ? (editingItem.storeId || currentStore.id) : null;
      const originalDocId = editingItem ? getDocIdFromDate(editingItem.date) : null;
      const isStoreChanged = editingItem && originalStoreId !== targetStoreId;
      const isPeriodChanged = editingItem && originalDocId !== newDocId;
      const isMoving = isStoreChanged || isPeriodChanged;

      // 1. Fetch current list for this specific store & new period
      const targetDocRef = doc(db, 'stores', targetStoreId, 'daily_control', newDocId);
      const targetDocSnap = await getDocCached(targetDocRef, currentStore.id, user);
      
      let targetExpenses: DailyExpense[] = [];
      let targetVouchers: DailyVoucher[] = [];

      if (targetDocSnap.exists() && targetDocSnap.data().data) {
        targetExpenses = targetDocSnap.data().data.expenses || [];
        targetVouchers = targetDocSnap.data().data.vouchers || [];
      } else {
        // Look for older data in 'all' filtered by year-month as fallback
        const oldDocRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
        const oldDocSnap = await getDocCached(oldDocRef, currentStore.id, user);
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

        if (editingItem && !isMoving) {
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
          employeeName: standardizeName(formEmployeeName),
          value: valueNum,
          description: formDescription || 'Lanche',
          paymentMethod: formPaymentMethod || 'Lanche',
          status: formStatus as 'Pendente' | 'Descontado',
          notes: formNotes,
          createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
        };

        if (editingItem && !isMoving) {
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
        await setDocCached(targetDocRef, {
          data: {
            expenses: targetExpenses,
            vouchers: targetVouchers
          },
          updatedAt: new Date().toISOString()
        }, currentStore.id, user);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathForWrite);
      }

      // If the item was moved to a different store or different period, remove it from the original document
      if (editingItem && isMoving && originalStoreId && originalDocId) {
        const oldDocRef = doc(db, 'stores', originalStoreId, 'daily_control', originalDocId);
        const oldDocSnap = await getDocCached(oldDocRef, currentStore.id, user);

        let oldExpenses: DailyExpense[] = [];
        let oldVouchers: DailyVoucher[] = [];

        if (oldDocSnap.exists() && oldDocSnap.data().data) {
          oldExpenses = oldDocSnap.data().data.expenses || [];
          oldVouchers = oldDocSnap.data().data.vouchers || [];
        } else {
          // Try fetching from legacy 'all' filtered
          const oldDocRefAll = doc(db, 'stores', originalStoreId, 'daily_control', 'all');
          const oldDocSnapAll = await getDocCached(oldDocRefAll, currentStore.id, user);
          if (oldDocSnapAll.exists() && oldDocSnapAll.data().data) {
            const oldData = oldDocSnapAll.data().data;
            const oldYearMonth = originalDocId.replace('period_', '').replace('_', '-');
            oldExpenses = (oldData.expenses || []).filter((e: any) => e.date && e.date.startsWith(oldYearMonth));
            oldVouchers = (oldData.vouchers || []).filter((v: any) => v.date && v.date.startsWith(oldYearMonth));
          }
        }

        oldExpenses = oldExpenses.filter(e => e.id !== editingItem.id);
        oldVouchers = oldVouchers.filter(v => v.id !== editingItem.id);

        const pathForOldWrite = `/stores/${originalStoreId}/daily_control/${originalDocId}`;
        try {
          await setDocCached(oldDocRef, {
            data: {
              expenses: oldExpenses,
              vouchers: oldVouchers
            },
            updatedAt: new Date().toISOString()
          }, currentStore.id, user);
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
      const docSnap = await getDocCached(docRef, currentStore.id, user);

      let currentExpenses: DailyExpense[] = [];
      let currentVouchers: DailyVoucher[] = [];

      if (docSnap.exists() && docSnap.data().data) {
        currentExpenses = docSnap.data().data.expenses || [];
        currentVouchers = docSnap.data().data.vouchers || [];
      } else {
        // Fallback to legacy 'all'
        const oldDocRef = doc(db, 'stores', targetStoreId, 'daily_control', 'all');
        const oldDocSnap = await getDocCached(oldDocRef, currentStore.id, user);
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
        await setDocCached(docRef, {
          data: {
            expenses: currentExpenses,
            vouchers: currentVouchers
          },
          updatedAt: new Date().toISOString()
        }, currentStore.id, user);
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

    // Sort by Date
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return expensesSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [expenses, selectedStoreId, searchQuery, selectedCategory, dateFilter, selectedStatus, expensesSortOrder]);

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

    // Filter by Selected Employee Name
    if (selectedCategory !== 'all') {
      result = result.filter(item => standardizeName(item.employeeName) === standardizeName(selectedCategory));
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

    // Sort by Date
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return vouchersSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [vouchers, selectedStoreId, searchQuery, selectedCategory, dateFilter, selectedStatus, vouchersSortOrder]);

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

  // Unique list of employee names for Vouchers filtering
  const employeesList = allAvailableEmployees;

  // Unified distribution for interactive analysis (expenses by category OR vouchers by employee)
  const expensesByCategory = useMemo(() => {
    const isExpenses = activeTab === 'expenses';
    let baseList: any[] = isExpenses ? [...expenses] : [...vouchers];

    // Apply store filter
    if (selectedStoreId !== 'all') {
      baseList = baseList.filter(item => item.storeId === selectedStoreId);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      baseList = baseList.filter(item => item.status === selectedStatus);
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (isExpenses) {
        baseList = baseList.filter(item => 
          item.description?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.recipient?.toLowerCase().includes(q)
        );
      } else {
        baseList = baseList.filter(item => 
          item.employeeName?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        );
      }
    }

    // Apply Date filter if present
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (dateFilter === 'today') {
      baseList = baseList.filter(item => item.date === todayStr);
    } else if (dateFilter === '7days') {
      baseList = baseList.filter(item => new Date(item.date) >= sevenDaysAgo);
    }

    const categoriesMap: Record<string, number> = {};
    let totalAmt = 0;
    baseList.forEach(item => {
      const key = isExpenses ? (item.category || 'Outros') : (item.employeeName ? standardizeName(item.employeeName) : 'Sem Nome');
      categoriesMap[key] = (categoriesMap[key] || 0) + item.value;
      totalAmt += item.value;
    });

    const entries = Object.entries(categoriesMap).map(([key, value]) => ({
      category: key,
      value,
      percentage: totalAmt > 0 ? (value / totalAmt) * 100 : 0
    }));

    return {
      distribution: entries.sort((a, b) => b.value - a.value),
      total: totalAmt
    };
  }, [expenses, vouchers, activeTab, selectedStoreId, searchQuery, dateFilter, selectedStatus]);

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
              <td style="padding: 10px; font-size: 11px; color: #334155; font-weight: bold;">${standardizeName(item.employeeName) || '-'}</td>
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

      {/* KPI Stats Cards & Category Analysis Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Despesas Diárias</span>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-extrabold font-display">
              R$ {stats.totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            R$ {stats.pendingExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes de ajuste
          </p>
        </div>

        {/* KPI 2 */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vales do Período</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-extrabold font-display">
              R$ {stats.totalVch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            R$ {stats.pendingVch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ativos (pendentes de desconto)
          </p>
        </div>

        {/* Category Breakdown Card */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {activeTab === 'expenses' ? 'Análise por Categoria' : 'Análise por Funcionário'}
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                {activeTab === 'expenses' ? 'Despesas' : 'Vales'}
              </span>
            </div>
            
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
              {expensesByCategory.distribution.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-slate-400">
                  Nenhum lançamento no filtro atual
                </div>
              ) : (
                expensesByCategory.distribution.map(({ category, value, percentage }) => (
                  <div 
                    key={category} 
                    onClick={() => setSelectedCategory(prev => prev === category ? 'all' : category)}
                    className={`group p-1.5 rounded-lg cursor-pointer transition-all border ${
                      selectedCategory === category 
                        ? (isDarkMode ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700') 
                        : (isDarkMode ? 'bg-transparent border-transparent hover:bg-white/5' : 'bg-transparent border-transparent hover:bg-slate-50')
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="truncate max-w-[120px]" style={{ color: selectedCategory === category ? brandColors.button : undefined }}>
                        {category}
                      </span>
                      <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>
                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/10 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: brandColors.button || '#F59E0B'
                        }}
                      />
                    </div>
                    <div className="text-right text-[8px] text-slate-400 mt-0.5 font-medium">
                      {percentage.toFixed(1)}% {selectedCategory === category && '(Ativo)'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {selectedCategory !== 'all' && (
            <button 
              onClick={() => setSelectedCategory('all')}
              className="mt-2 text-center text-[10px] font-bold text-amber-500 hover:text-amber-600 transition-colors pt-2 border-t border-slate-100 dark:border-white/5 w-full"
            >
              Exibir todas
            </button>
          )}
        </div>

        {/* Category Donut Chart Card */}
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-slate-100'} shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Distribuição Visual</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">Gráfico</span>
            </div>

            {expensesByCategory.distribution.length === 0 ? (
              <div className="text-center py-10 text-[11px] text-slate-400 italic">
                Nenhum lançamento no filtro atual
              </div>
            ) : (
              <div className="h-[120px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory.distribution.map((item, index) => ({
                        name: item.category,
                        value: item.value,
                        percentage: item.percentage,
                        index
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.name) {
                          setSelectedCategory(prev => prev === data.name ? 'all' : data.name);
                        }
                      }}
                    >
                      {expensesByCategory.distribution.map((entry, index) => {
                        const isSelected = selectedCategory === entry.category;
                        const cellColor = CHART_COLORS[index % CHART_COLORS.length];
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={cellColor} 
                            stroke={isDarkMode ? '#1E1E1E' : '#FFFFFF'}
                            strokeWidth={isSelected ? 3 : 1}
                            style={{ 
                              cursor: 'pointer',
                              filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(245, 158, 11, 0.5))' : 'none',
                              opacity: selectedCategory === 'all' || isSelected ? 1 : 0.4
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className={`p-2 rounded-xl border shadow-lg text-[10px] font-bold leading-none ${
                              isDarkMode ? 'bg-[#222222]/95 border-[#333] text-white' : 'bg-white/95 border-slate-100 text-slate-900 shadow-slate-200/50'
                            }`}>
                              <p className="mb-1 font-black text-slate-400 uppercase text-[8px] tracking-wider">{data.name}</p>
                              <p className="text-amber-500">R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <p className="text-slate-400 text-[9px] mt-0.5">{data.percentage.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text indicating total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-black uppercase text-slate-400 leading-none">Total</span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-200 leading-tight">
                    R$ {expensesByCategory.total > 1000 ? `${(expensesByCategory.total / 1000).toFixed(1)}k` : expensesByCategory.total.toFixed(0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-1 pt-1 border-t border-slate-100 dark:border-white/5">
            {expensesByCategory.distribution.slice(0, 4).map((entry, index) => {
              const isSelected = selectedCategory === entry.category;
              const color = CHART_COLORS[index % CHART_COLORS.length];
              return (
                <div 
                  key={entry.category} 
                  onClick={() => setSelectedCategory(prev => prev === entry.category ? 'all' : entry.category)}
                  className="flex items-center gap-1 cursor-pointer select-none"
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className={`text-[8px] font-extrabold truncate max-w-[50px] uppercase tracking-wider ${
                    isSelected ? 'text-amber-500' : 'text-slate-400 hover:text-slate-300'
                  }`}>
                    {entry.category}
                  </span>
                </div>
              );
            })}
            {expensesByCategory.distribution.length > 4 && (
              <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">+{expensesByCategory.distribution.length - 4}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-row flex-nowrap border-b border-slate-200 dark:border-[#333] gap-1 sm:gap-2 overflow-x-auto scrollbar-none snap-x w-full">
        <button
          onClick={() => { setActiveTab('expenses'); setSelectedStatus('all'); setSelectedCategory('all'); }}
          className={`flex-1 sm:flex-initial px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all text-center justify-center whitespace-nowrap shrink-0 snap-center ${
            activeTab === 'expenses' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          style={{ borderBottomColor: activeTab === 'expenses' ? brandColors.button : 'transparent' }}
        >
          Despesas Diárias / Caixa Rápido
        </button>
        <button
          onClick={() => { setActiveTab('vouchers'); setSelectedStatus('all'); setSelectedCategory('all'); }}
          className={`flex-1 sm:flex-initial px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all text-center justify-center whitespace-nowrap shrink-0 snap-center ${
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
        <div className={`${
          isRoot ? 'md:col-span-6' : 'md:col-span-9'
        } relative`}>
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

        {/* Category filter for Expenses tab */}
        {activeTab === 'expenses' && (
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
              } outline-none cursor-pointer`}
            >
              <option value="all">Todas as Categorias</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Outros">Outras (Personalizadas)</option>
            </select>
          </div>
        )}

        {/* Employee filter for Vouchers tab */}
        {activeTab === 'vouchers' && (
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                isDarkMode ? 'bg-[#252525] border-[#3F3F3F] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
              } outline-none cursor-pointer`}
            >
              <option value="all">Todos os Funcionários</option>
              {employeesList.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
        )}

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
                      <th 
                        onClick={() => setExpensesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className={`px-4 py-3.5 cursor-pointer select-none transition-colors ${
                          isDarkMode ? 'hover:bg-[#252525] text-white' : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          Data
                          {expensesSortOrder === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3.5">Descrição</th>
                      <th className="px-4 py-3.5">Categoria</th>
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
                      <th 
                        onClick={() => setVouchersSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className={`px-4 py-3.5 cursor-pointer select-none transition-colors ${
                          isDarkMode ? 'hover:bg-[#252525] text-white' : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          Data
                          {vouchersSortOrder === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3.5">Funcionário</th>
                      <th className="px-4 py-3.5">Lanche Escolhido</th>
                      <th className="px-4 py-3.5">Valor</th>
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
                        <td className="px-4 py-4 font-bold text-slate-150">{standardizeName(item.employeeName)}</td>
                        <td className="px-4 py-4 text-slate-450">{item.description}</td>
                        <td className="px-4 py-4 font-extrabold text-amber-500">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* DETAILED DATABASE REPAIR MODAL */}
      {isRepairPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsRepairPanelOpen(false)} />
          <div className={`relative w-full max-w-4xl max-h-[85vh] p-6 rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${
            isDarkMode ? 'bg-[#181818] border-[#2C2C2C] text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-[#2C2C2C] mb-4">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-amber-500">Módulo de Reparação Local</h3>
                <h2 className="text-lg font-bold font-display">Painel de Direcionamento de Lançamentos — Junho/2026</h2>
              </div>
              <button 
                onClick={() => setIsRepairPanelOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px]">
                <p className="font-semibold text-amber-500">💡 Como funciona o ajuste de filiais:</p>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Todos os lançamentos listados abaixo estão atualmente salvos sob a unidade <strong>Bebelu Riomar Papicu (B28)</strong> no banco de dados. Os nomes destacados já foram associados automaticamente à <strong>Bebelu Mossoró (B32)</strong> como sugestão. Revise a lista e atribua cada lançamento à filial correta. Ao salvar, o sistema atualizará as duas unidades no Firestore.
                </p>
              </div>

              {/* Vales Section */}
              <div>
                <h3 className="font-bold text-xs tracking-wide text-amber-500 mb-2 uppercase">Vales de Funcionários</h3>
                {b28VouchersToReview.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhum vale encontrado para revisão.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-[#2C2C2C] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-neutral-900 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-[#2c2c2c]">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Funcionário</th>
                          <th className="px-4 py-3">Descrição / Lanche</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3 text-right">Destinação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#2c2c2c]">
                        {b28VouchersToReview.map(v => {
                          const dest = selections[v.id] || '2';
                          const isSuggestedMossoro = ['yan', 'marques', 'francineide', 'fran'].some(namePart => v.employeeName?.toLowerCase().includes(namePart));
                          return (
                            <tr key={v.id} className={`hover:bg-slate-50 dark:hover:bg-neutral-800/50 ${isSuggestedMossoro ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-4 py-3 font-mono">{v.date}</td>
                              <td className="px-4 py-3 font-bold">
                                {standardizeName(v.employeeName)}
                                {isSuggestedMossoro && (
                                  <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black">MOSSORÓ</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{v.description || 'Vale / Adiantamento'}</td>
                              <td className="px-4 py-3 font-bold">R$ {v.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right">
                                <select
                                  value={dest}
                                  onChange={(e) => setSelections(prev => ({ ...prev, [v.id]: e.target.value as '1' | '2' }))}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border outline-none cursor-pointer ${
                                    dest === '1'
                                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                      : 'bg-green-500/20 border-green-500/40 text-green-400'
                                  }`}
                                >
                                  <option value="2" className="text-slate-900 bg-white">Riomar (B28)</option>
                                  <option value="1" className="text-slate-900 bg-white">Mossoró (B32)</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="font-bold text-xs tracking-wide text-amber-500 mb-2 uppercase">Despesas Diárias</h3>
                {b28ExpensesToReview.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhuma despesa encontrada para revisão.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-[#2C2C2C] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-neutral-900 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-[#2c2c2c]">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Descrição / Fornecedor</th>
                          <th className="px-4 py-3">Categoria</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3 text-right">Destinação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-[#2c2c2c]">
                        {b28ExpensesToReview.map(e => {
                          const dest = selections[e.id] || '2';
                          const isSuggestedMossoro = ['mossoró', 'mossoro'].some(kw => 
                            e.description?.toLowerCase().includes(kw) || 
                            e.recipient?.toLowerCase().includes(kw) || 
                            e.notes?.toLowerCase().includes(kw)
                          );
                          return (
                            <tr key={e.id} className={`hover:bg-slate-50 dark:hover:bg-neutral-800/50 ${isSuggestedMossoro ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-4 py-3 font-mono">{e.date}</td>
                              <td className="px-4 py-3 font-bold">
                                {e.description}
                                {isSuggestedMossoro && (
                                  <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black">MOSSORÓ</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{e.category}</td>
                              <td className="px-4 py-3 font-bold text-red-500">R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right">
                                <select
                                  value={dest}
                                  onChange={(evt) => setSelections(prev => ({ ...prev, [e.id]: evt.target.value as '1' | '2' }))}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border outline-none cursor-pointer ${
                                    dest === '1'
                                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                      : 'bg-green-500/20 border-green-500/40 text-green-400'
                                  }`}
                                >
                                  <option value="2" className="text-slate-900 bg-white">Riomar (B28)</option>
                                  <option value="1" className="text-slate-900 bg-white">Mossoró (B32)</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4 border-slate-200 dark:border-[#2C2C2C] mt-4">
              <button
                onClick={() => setIsRepairPanelOpen(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                  isDarkMode ? 'hover:bg-neutral-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRepair}
                disabled={repairingDocs}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md shrink-0 focus:outline-none"
              >
                {repairingDocs ? 'Processando e Gravando...' : 'Confirmar e Ajustar Banco de Dados'}
              </button>
            </div>
          </div>
        </div>
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
                        <div className="flex items-center justify-between h-5 mb-1 text-[10px] select-none">
                          <label className="font-black uppercase text-slate-400">Categoria</label>
                          <button
                            type="button"
                            onClick={() => setShowCategoryManager(true)}
                            className="font-black uppercase text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-0.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Gerenciar
                          </button>
                        </div>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
                          } outline-none`}
                        >
                          <option value="">Selecione...</option>
                          {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center h-5 mb-1 text-[10px] select-none">
                          <label className="font-black uppercase text-slate-400">Meio de Pagamento</label>
                        </div>
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
                        <div className="flex items-center justify-between h-5 mb-1 text-[10px] select-none">
                          <label className="font-black uppercase text-slate-400">Nome do Funcionário</label>
                          <button
                            type="button"
                            onClick={() => setShowEmployeeManager(true)}
                            className="font-black uppercase text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-0.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Gerenciar
                          </button>
                        </div>
                        <select
                          value={formEmployeeName}
                          onChange={(e) => setFormEmployeeName(e.target.value)}
                          className={`w-full text-xs px-3 py-2.5 rounded-xl border ${
                            isDarkMode ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'
                          } outline-none`}
                          required
                        >
                          <option value="">Selecione...</option>
                          {allAvailableEmployees.map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </select>
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
                    ? `(${standardizeName(itemToDelete.employeeName)})` 
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

      {/* CATEGORY MANAGER MODAL */}
      <AnimatePresence>
        {showCategoryManager && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            
            {/* Backdrop visual */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryManager(false)}
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
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2C2C2C] transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              <h2 className="text-base font-black uppercase italic tracking-wider mb-5 text-amber-500">
                Gerenciar Categorias
              </h2>

              <div className="space-y-4">
                {/* Form to Create Category */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Criar Nova Categoria</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryManagerName}
                      onChange={(e) => setNewCategoryManagerName(e.target.value)}
                      placeholder="Ex: Gasolina, Brindes..."
                      className={`flex-1 text-xs px-3 py-2.5 rounded-xl border outline-none ${
                        isDarkMode 
                          ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' 
                          : 'bg-white border-slate-200 focus:border-amber-500'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const success = handleCreateCategory(newCategoryManagerName);
                          if (success) {
                            setNewCategoryManagerName('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const success = handleCreateCategory(newCategoryManagerName);
                        if (success) {
                          setNewCategoryManagerName('');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                    >
                      Criar
                    </button>
                  </div>
                </div>

                {/* List of Custom Categories */}
                <div className="border-t border-slate-100 dark:border-[#2C2C2C] pt-4">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                    Minhas Categorias Personalizadas
                  </label>
                  
                  {categoriesList.filter(c => !['Aso', 'Despesa', 'Passagem', 'Diaria', 'Alimentação', 'Manutenção', 'Limpeza', 'Outros'].includes(c)).length === 0 ? (
                    <p className="text-center text-[11px] text-slate-400 italic py-4">
                      Nenhuma categoria personalizada criada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {categoriesList
                        .filter(c => !['Aso', 'Despesa', 'Passagem', 'Diaria', 'Alimentação', 'Manutenção', 'Limpeza', 'Outros'].includes(c))
                        .map(cat => {
                          const isConfirming = categoryToDeleteState === cat;
                          return (
                            <div 
                              key={cat} 
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold leading-none min-h-[40px] ${
                                isDarkMode 
                                  ? 'bg-[#222222] border-[#2C2C2C]' 
                                  : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <span className="truncate max-w-[150px] text-[11px] font-bold">{cat}</span>
                              
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] text-red-500 uppercase font-black tracking-wider animate-pulse">Apagar?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteCategory(cat);
                                      setCategoryToDeleteState(null);
                                    }}
                                    className="p-1 px-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 text-[10px] font-bold"
                                    title="Confirmar"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCategoryToDeleteState(null)}
                                    className="p-1 px-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center shrink-0 text-[10px] font-bold"
                                    title="Cancelar"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCategoryToDeleteState(cat)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 active:scale-95 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                  title="Excluir Categoria"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(false)}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-[#333] hover:bg-[#252525] text-slate-300' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    Pronto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EMPLOYEE MANAGER MODAL */}
      <AnimatePresence>
        {showEmployeeManager && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            
            {/* Backdrop visual */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmployeeManager(false)}
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
                type="button"
                onClick={() => setShowEmployeeManager(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2C2C2C] transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>

              <h2 className="text-base font-black uppercase italic tracking-wider mb-5 text-amber-500">
                Gerenciar Funcionários
              </h2>

              <div className="space-y-4">
                {/* Form to Register Employee */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Cadastrar Novo Funcionário</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEmployeeManagerName}
                      onChange={(e) => setNewEmployeeManagerName(e.target.value)}
                      placeholder="Ex: Yan Marques, Francineide..."
                      className={`flex-1 text-xs px-3 py-2.5 rounded-xl border outline-none ${
                        isDarkMode 
                          ? 'bg-[#252525] border-[#3C3C3C] text-white focus:border-amber-500' 
                          : 'bg-white border-slate-200 focus:border-amber-500'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const success = handleCreateEmployee(newEmployeeManagerName);
                          if (success) {
                            setNewEmployeeManagerName('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const success = handleCreateEmployee(newEmployeeManagerName);
                        if (success) {
                          setNewEmployeeManagerName('');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                    >
                      Criar
                    </button>
                  </div>
                </div>

                {/* List of Custom Registered Employees */}
                <div className="border-t border-slate-100 dark:border-[#2C2C2C] pt-4">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                    Funcionários Cadastrados
                  </label>
                  
                  {employeesNamesList.length === 0 ? (
                    <p className="text-center text-[11px] text-slate-400 italic py-4">
                      Nenhum funcionário personalizado cadastrado ainda.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      {employeesNamesList
                        .map(emp => {
                          const isConfirming = employeeToDeleteState === emp;
                          return (
                            <div 
                              key={emp} 
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold leading-none min-h-[40px] ${
                                isDarkMode 
                                  ? 'bg-[#222222] border-[#2C2C2C]' 
                                  : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <span className="truncate max-w-[150px] text-[11px] font-bold">{emp}</span>
                              
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] text-red-500 uppercase font-black tracking-wider animate-pulse">Remover?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteEmployee(emp);
                                      setEmployeeToDeleteState(null);
                                    }}
                                    className="p-1 px-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 text-[10px] font-bold"
                                    title="Confirmar"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEmployeeToDeleteState(null)}
                                    className="p-1 px-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center justify-center shrink-0 text-[10px] font-bold"
                                    title="Cancelar"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEmployeeToDeleteState(emp)}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 active:scale-95 rounded-lg transition-colors flex items-center justify-center shrink-0"
                                  title="Excluir Funcionário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmployeeManager(false)}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-[#333] hover:bg-[#252525] text-slate-300' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    Pronto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
