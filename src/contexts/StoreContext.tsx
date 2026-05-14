import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store, Metric, DREData } from '../types';
import { mockMetrics, dreTimeline as mockDreTimeline, metaVsRealizado as mockMetaVsRealizado, topProducts as mockTopProducts, deliveryChannels as mockDeliveryChannels, salesByHour as mockSalesByHour, salesByDay as mockSalesByDay } from '../lib/mockData';

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
  const [metrics, setMetrics] = useState<Metric[]>(mockMetrics);
  const [dreTimeline, setDreTimeline] = useState<DREData[]>(mockDreTimeline);
  const [metaVsRealizado, setMetaVsRealizado] = useState<any[]>(currentStore.brand === 'BEBELU' 
    ? [
        { name: 'Meta', valor: mockMetaVsRealizado[0].valor, color: '#7F300C' },
        { name: 'Realizado', valor: mockMetaVsRealizado[1].valor, color: '#FFCB05' },
      ]
    : mockMetaVsRealizado
  );

  useEffect(() => {
    // Update colors when store changes
    const latestData = dreTimeline[dreTimeline.length - 1];
    setMetaVsRealizado(prev => {
      const currentMeta = prev[0].valor;
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
  }, [currentStore.brand, isDarkMode]);
  const [topProducts, setTopProducts] = useState<any[]>(mockTopProducts);
  const [deliveryChannels, setDeliveryChannels] = useState<any[]>(mockDeliveryChannels);
  const [salesByHour, setSalesByHour] = useState<any[]>(mockSalesByHour);
  const [salesByDay, setSalesByDay] = useState<any[]>(mockSalesByDay);
  const [peakHour, setPeakHour] = useState<string>('21:00');
  const [yearlyHistory, setYearlyHistory] = useState<{ [year: string]: number }>({
    '2024': 85000,
    '2025': 105000,
  });
  const [operationalMetrics, setOperationalMetrics] = useState<any[]>([
    { label: 'Tempo de Produção', valor: '18 min', target: '20 min', percent: 85, icon: 'Clock' },
    { label: 'Desperdício / Perda', valor: '1.2%', target: '1.0%', percent: 40, icon: 'ShoppingBag', critical: true },
    { label: 'Satisfação (NPS)', valor: '8.8', target: '9.0', percent: 92, icon: 'Target' },
  ]);

  const brandColors = {
    primary: currentStore.brand === 'BEBELU' ? '#FFCB05' : '#E63946',
    secondary: currentStore.brand === 'BEBELU' ? '#BC2C18' : '#312E81',
    accent: currentStore.brand === 'BEBELU' ? '#6D912D' : '#10B981',
    button: currentStore.brand === 'BEBELU' ? '#FFCB05' : (isDarkMode ? '#E63946' : '#0066FF')
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
      yearlyHistory,
      setYearlyHistory,
      deliveryChannels,
      setDeliveryChannels,
      salesByHour,
      setSalesByHour,
      salesByDay,
      setSalesByDay,
      peakHour,
      setPeakHour
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
