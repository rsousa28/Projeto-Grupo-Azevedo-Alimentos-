import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store, Metric, DREData } from '../types';
import { mockMetrics, dreTimeline as mockDreTimeline, metaVsRealizado as mockMetaVsRealizado, topProducts as mockTopProducts, deliveryChannels as mockDeliveryChannels, salesByHour as mockSalesByHour, salesByDay as mockSalesByDay } from '../lib/mockData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface StoreContextType {
  currentStore: Store;
  setStore: (store: Store) => void;
  isDarkMode: boolean;
  metrics: Metric[];
  setMetrics: (metrics: Metric[]) => void;
  dreTimeline: DREData[];
  setDreTimeline: (data: DREData[]) => void;
  metaVsRealizado: any[];
  setMetaVsRealizado: (data: any[]) => void;
  operationalMetrics: any[];
  setOperationalMetrics: (data: any[]) => void;
  topProducts: any[];
  setTopProducts: (data: any[]) => void;
  inventoryItems: any[];
  setInventoryItems: (data: any[]) => void;
  yearlyHistory: { [year: string]: number };
  setYearlyHistory: (data: { [year: string]: number }) => void;
  deliveryChannels: any[];
  setDeliveryChannels: (data: any[]) => void;
  salesByHour: any[];
  setSalesByHour: (data: any[]) => void;
  salesByDay: any[];
  setSalesByDay: (data: any[]) => void;
  peakHour: string;
  setPeakHour: (hour: string) => void;
  saveCMVPeriod: (month: string, year: string, inventory: any[], products: any[]) => Promise<void>;
  loadCMVPeriod: (month: string, year: string) => Promise<boolean>;
  saveDREPeriod: (month: string, year: string, dreData: DREData) => Promise<void>;
  loadDREPeriod: (month: string, year: string) => Promise<boolean>;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
    button: string;
  };
}

const STORES: Store[] = [
  { id: '1', name: 'Bebelu Mossoró', brand: 'BEBELU', location: 'Espaço Fan', code: 'B32' },
  { id: '2', name: 'Bebelu Rio Mar', brand: 'BEBELU', location: 'Rio Mar Shopping', code: 'B28' },
  { id: '3', name: '4 Estylos Mossoró', brand: '4ESTYLOS', location: 'Avenida Principal', code: '4E09' },
];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentStore, setCurrentStore] = useState<Store>(STORES[0]);
  const isDarkMode = currentStore.brand === '4ESTYLOS';
  const [metrics, setMetrics] = useState<Metric[]>(mockMetrics.map(m => ({ ...m, valor: 0, trend: 'neutral', change: '0%' })));
  const [dreTimeline, setDreTimeline] = useState<DREData[]>([]);
  const [metaVsRealizado, setMetaVsRealizado] = useState<any[]>([
    { name: 'Meta', valor: 0, color: '#7F300C' },
    { name: 'Realizado', valor: 0, color: '#FFCB05' },
  ]);

  useEffect(() => {
    // Update colors when store changes
    const latestData = dreTimeline.length > 0 ? dreTimeline[dreTimeline.length - 1] : { faturamento: 0 };
    setMetaVsRealizado(prev => {
      const currentMeta = prev[0]?.valor || 0;
      if (currentStore.brand === 'BEBELU') {
        return [
          { name: 'Meta', valor: currentMeta, color: '#7F300C' }, // Brown
          { name: 'Realizado', valor: latestData.faturamento, color: '#FFCB05' }, // Yellow
        ];
      } else {
        return [
          { name: 'Meta', valor: currentMeta, color: '#8884d8' },
          { name: 'Realizado', valor: latestData.faturamento, color: isDarkMode ? '#E63946' : '#0066FF' },
        ];
      }
    });
  }, [currentStore.brand, isDarkMode, dreTimeline]);
  
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [deliveryChannels, setDeliveryChannels] = useState<any[]>([
    { name: 'iFood', valor: 0, color: '#EA1D2C' },
    { name: 'WEDO', valor: 0, color: '#0066FF' },
    { name: 'Balcão', valor: 0, color: '#FFB800' }
  ]);
  const [salesByHour, setSalesByHour] = useState<any[]>(mockSalesByHour.map(s => ({ ...s, vendas: 0 })));
  const [salesByDay, setSalesByDay] = useState<any[]>(mockSalesByDay.map(s => ({ ...s, faturamento: 0 })));
  const [peakHour, setPeakHour] = useState<string>('00:00');
  const [yearlyHistory, setYearlyHistory] = useState<{ [year: string]: number }>({
    '2024': 0,
    '2025': 0,
  });
  const [operationalMetrics, setOperationalMetrics] = useState<any[]>([
    { label: 'Tempo de Produção', valor: '0 min', target: '20 min', percent: 0, icon: 'Clock' },
    { label: 'Desperdício / Perda', valor: '0%', target: '1.0%', percent: 0, icon: 'ShoppingBag', critical: true },
    { label: 'Satisfação (NPS)', valor: '0', target: '9.0', percent: 0, icon: 'Target' },
  ]);

  const brandColors = {
    primary: currentStore.brand === 'BEBELU' ? '#FFCB05' : '#E63946',
    secondary: currentStore.brand === 'BEBELU' ? '#BC2C18' : '#312E81',
    accent: currentStore.brand === 'BEBELU' ? '#6D912D' : '#10B981',
    button: currentStore.brand === 'BEBELU' ? '#FFCB05' : (isDarkMode ? '#E63946' : '#0066FF')
  };

  const clearAllData = () => {
    setMetrics(metrics.map(m => ({ ...m, valor: 0, trend: 'neutral', change: '0%' })));
    setDreTimeline([]);
    setMetaVsRealizado([
      { name: 'Meta', valor: 0, color: brandColors.primary },
      { name: 'Realizado', valor: 0, color: brandColors.button },
    ]);
    setOperationalMetrics(operationalMetrics.map(m => ({ ...m, valor: '0', percent: 0 })));
    setTopProducts([]);
    setInventoryItems([]);
    setYearlyHistory({ '2024': 0, '2025': 0 });
    setDeliveryChannels([
      { name: 'iFood', valor: 0, color: '#EA1D2C' },
      { name: 'WEDO', valor: 0, color: '#0066FF' },
      { name: 'Balcão', valor: 0, color: '#FFB800' }
    ]);
    setSalesByHour(salesByHour.map(s => ({ ...s, vendas: 0 })));
    setSalesByDay(salesByDay.map(s => ({ ...s, faturamento: 0 })));
    setPeakHour('00:00');
  };

  const saveCMVPeriod = async (month: string, year: string, inventory: any[], products: any[]) => {
    const periodId = `${year}-${month}`;
    const path = `stores/${currentStore.id}/cmv_periods/${periodId}`;
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'cmv_periods', periodId);
      await setDoc(docRef, {
        month,
        year,
        inventoryItems: inventory,
        topProducts: products,
        updatedAt: serverTimestamp()
      });
      console.log('Período salvo com sucesso:', periodId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const loadCMVPeriod = async (month: string, year: string) => {
    const periodId = `${year}-${month}`;
    const path = `stores/${currentStore.id}/cmv_periods/${periodId}`;
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'cmv_periods', periodId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInventoryItems(data.inventoryItems || []);
        setTopProducts(data.topProducts || []);
        return true;
      }
      return false;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return false;
    }
  };

  const saveDREPeriod = async (month: string, year: string, dreData: DREData) => {
    const periodId = `${year}-${month}`;
    const path = `stores/${currentStore.id}/dre_periods/${periodId}`;
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'dre_periods', periodId);
      await setDoc(docRef, {
        ...dreData,
        monthValue: month,
        yearValue: year,
        updatedAt: serverTimestamp()
      });
      console.log('DRE salva com sucesso:', periodId);
      
      // Update local timeline
      setDreTimeline(prev => {
        const index = prev.findIndex(p => p.month === dreData.month && p.year === year);
        if (index >= 0) {
          const newTimeline = [...prev];
          newTimeline[index] = dreData;
          return newTimeline;
        }
        return [...prev, dreData];
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const loadDREPeriod = async (month: string, year: string) => {
    const periodId = `${year}-${month}`;
    const path = `stores/${currentStore.id}/dre_periods/${periodId}`;
    try {
      const docRef = doc(db, 'stores', currentStore.id, 'dre_periods', periodId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as DREData;
        setDreTimeline(prev => {
          const exists = prev.some(p => p.month === data.month && p.year === year);
          if (!exists) return [...prev, data];
          return prev.map(p => (p.month === data.month && p.year === year) ? data : p);
        });
        return true;
      }
      return false;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{ 
      currentStore, 
      setStore: setCurrentStore, 
      isDarkMode,
      brandColors,
      metrics,
      setMetrics,
      dreTimeline,
      setDreTimeline,
      metaVsRealizado,
      setMetaVsRealizado,
      operationalMetrics,
      setOperationalMetrics,
      topProducts,
      setTopProducts,
      inventoryItems,
      setInventoryItems,
      yearlyHistory,
      setYearlyHistory,
      deliveryChannels,
      setDeliveryChannels,
      salesByHour,
      setSalesByHour,
      salesByDay,
      setSalesByDay,
      peakHour,
      setPeakHour,
      saveCMVPeriod,
      loadCMVPeriod,
      saveDREPeriod,
      loadDREPeriod
    }}>
      <div className={isDarkMode ? 'dark bg-[#0F0F0F] text-[#F5F5F5]' : 'bg-[#F8FAFC] text-[#121212]'}>
        {children}
      </div>
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
