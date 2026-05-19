import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store, Metric, DREData } from '../types';
import { mockMetrics, dreTimeline as mockDreTimeline, metaVsRealizado as mockMetaVsRealizado, topProducts as mockTopProducts, deliveryChannels as mockDeliveryChannels, salesByHour as mockSalesByHour, salesByDay as mockSalesByDay } from '../lib/mockData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface StoreContextType {
  currentStore: Store;
  setStore: (store: Store) => void;
  isDarkMode: boolean;
  metrics: Metric[];
  setMetrics: React.Dispatch<React.SetStateAction<Metric[]>>;
  dreTimeline: DREData[];
  setDreTimeline: React.Dispatch<React.SetStateAction<DREData[]>>;
  metaVsRealizado: any[];
  setMetaVsRealizado: React.Dispatch<React.SetStateAction<any[]>>;
  operationalMetrics: any[];
  setOperationalMetrics: React.Dispatch<React.SetStateAction<any[]>>;
  topProducts: any[];
  setTopProducts: React.Dispatch<React.SetStateAction<any[]>>;
  inventoryItems: any[];
  setInventoryItems: React.Dispatch<React.SetStateAction<any[]>>;
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
  closingsData: Record<string, any>;
  setClosingsData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  saveCMVPeriod: (month: string, year: string, inventory: any[], products: any[]) => Promise<void>;
  loadCMVPeriod: (month: string, year: string) => Promise<boolean>;
  saveDREPeriod: (month: string, year: string, dreData: DREData) => Promise<void>;
  loadDREPeriod: (month: string, year: string) => Promise<boolean>;
  deletePeriodData: (month: string, year: string) => Promise<void>;
  clearAllStoreData: () => Promise<void>;
  clearAllData: () => void;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
    button: string;
  };
}

export const STORES: Store[] = [
  { id: '1', name: 'Bebelu Mossoró', brand: 'BEBELU', location: 'Espaço Fan', code: 'B32' },
  { id: '2', name: 'Bebelu Riomar Papicu', brand: 'BEBELU', location: 'Rio Mar Shopping', code: 'B28' },
  { id: '3', name: '4 Estylos Mossoró', brand: '4ESTYLOS', location: 'Espaço Fan', code: '4E09' },
  { id: 'admin-global', name: 'Admin Geral Grupo AZ', brand: 'GRUPO AZEVEDO', location: 'Todas as Lojas', code: 'ROOT' },
];

const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  // HotDog
  'BELUSDOG BAC E CHED': 'HotDog',
  'BELUSDOG CARNE DO SOL': 'HotDog',
  'BELUSDOG FRANG DESF': 'HotDog',
  'BELUSDOG CLASSICO': 'HotDog',

  // Linha Catupiry
  'FRANGO C/CATUPIRY': 'Linha Catupiry',
  'FILE C/CATUPIRY': 'Linha Catupiry',
  'LOMBO SUINO C/CATUPIRY': 'Linha Catupiry',

  // Linha Especial
  'PAI DEGUA GDE': 'Linha Especial',
  'LOMBO SUINO': 'Linha Especial',
  'FILET C/FRUTAS': 'Linha Especial',
  'TOSCANESA': 'Linha Especial',
  'CHICKEN ARABE': 'Linha Especial',
  'BELUS BURGAO': 'Linha Especial',
  'CHEESE ARABE': 'Linha Especial',
  'FRANBACON': 'Linha Especial',

  // Linha Imbativel
  'CHEESEFRANGO SIMPLES': 'Linha Imbativel',
  'SANDUICHE VACA E FRANGO': 'Linha Imbativel',
  'PAI DEGUA SIMPLES': 'Linha Imbativel',
  'CHEESEBURGER SIMPLES': 'Linha Imbativel',

  // Linha Infantil
  'KIT PLANETA': 'Linha Infantil',
  'KIT HAMBUR LARAN': 'Linha Infantil',
  'KIT HAMBUR SUCO': 'Linha Infantil',
  'BRINDES': 'Linha Infantil',

  // Linha Petisco
  'MINI BOX TIRINHA': 'Linha Petisco',
  'TIRINHA FRANGO': 'Linha Petisco',
  'BOX BELLUS TIRINHA': 'Linha Petisco',
  'PETISCO PEITO FRANGO': 'Linha Petisco',
  'MINI BALDE TIRINHA': 'Linha Petisco',
  'PETISCO CALABRESA': 'Linha Petisco',
  'BOX FRANBAC TIRINH': 'Linha Petisco',
  'PETISCO FILE MIGNON': 'Linha Petisco',

  // Linha Super
  'SUPER FRANGO': 'Linha Super',

  // Linha Tradicional
  'CHEESEBURGER': 'Linha Tradicional',
  'SUPER CHEESE': 'Linha Tradicional',
  'SALADA CHICKEN BURGUER': 'Linha Tradicional',
  'CHEESE HAMB DUPLO': 'Linha Tradicional',
  'HAMBURGER': 'Linha Tradicional',
  'SUPER QUEIJO QUENTE': 'Linha Tradicional',

  // Natural Light
  'FRANGO C/CENOURA E PASSAS': 'Natural Light',
  'SAND FGO ABACAXI': 'Natural Light',
  'FRANGO RICOTA ESPECIAL': 'Natural Light',
  'FRANGO C/RICOTA': 'Natural Light',
  'FRANGO C/SALADA': 'Natural Light',
  'SAND LEVE ATUM': 'Natural Light',
  'RICOTA C/ CENOURA E PASSA': 'Natural Light',

  // Opcionais
  'ÁGUA MINERAL 500ML': 'Opcionais',
  'BATATA FRITA GND': 'Opcionais',
  'DIF BAT PEQ -> GND': 'Opcionais',
  'BATATA FRITA MED': 'Opcionais',
  'BATATA FRITA PEQ': 'Opcionais',
  'DIF BOLA - ARABE': 'Opcionais',
  'PORCAO MAIO TEMP EXTRA': 'Opcionais',
  'PORÇÃO OVO': 'Opcionais',
  'FATIA DE CHEDDAR': 'Opcionais',
  'MACAXEIRA FRITA 125G': 'Opcionais',
  'PORÇÃO BACON': 'Opcionais',
  'PORÇÃO CALABRESA': 'Opcionais',
  'PORÇÃO MUSSARELA': 'Opcionais',
  'QUEIJO COALHO': 'Opcionais',
  'EMB P/SALADA': 'Opcionais',
  'PORÇ REQ CREMOSO': 'Opcionais',
  'BATATA RUSTICA': 'Opcionais',
  'DIF BAT-> MACAXEIRA': 'Opcionais',
  'EMB. P/ VIAGEM': 'Opcionais',
  'DIF ARABE INF-GRD': 'Opcionais',
  'PORÇÃO MILHO': 'Opcionais',
  'PORÇ APRESUNTADO': 'Opcionais',
  'REF MIX 300 COCA-COLA': 'Opcionais',
  'PORÇÃO ABACAXI': 'Opcionais',
  'DIF BAT PEQ -> MED': 'Opcionais',
  'DIF ARABE - BOLA': 'Opcionais',
  'PORÇÃO PASSAS': 'Opcionais',
  'PORCAO BARBECUE EXTRA': 'Opcionais',
  'SACO VIAGEM GND': 'Opcionais',
  'DIF ARABE-F. INT': 'Opcionais',
  'PORÇÃO ERVILHA': 'Opcionais',
  'MANDAR COPO E GUARDANAPOS': 'Opcionais',

  // PROMO
  'COMBO FRANG CROCAN': 'PROMO',
  'FGO CROCANTE': 'PROMO',
  'PROMO COMBO HAMBURGUER': 'PROMO',
  'PROMO TOSCANESA': 'PROMO',
  'PROMO FGO COM SALADA': 'PROMO',
  'PROMO HAMBURGUER': 'PROMO',
  'PROM FRANG CROCAN': 'PROMO',
  'PROM BELUS DOG CLASSICO': 'PROMO',
  'PROMO COMBO BELUSDOG': 'PROMO',
  'PROMO MILK ACAI': 'PROMO',
  'PROMO COMBO FGO C/SALADA': 'PROMO',
  'ADICIONAL IFOOD': 'PROMO',
  'FRANG C SALA': 'PROMO',
  'PROM SUNDAE MORANGO': 'PROMO',
  'PROMO SUNDAE CHOCOLATE': 'PROMO',
  'PROMO SUNDAE AÇAI': 'PROMO',
  'PROMO SUNDAE CHOCOLATE DDC': 'PROMO',
  'PROM SUNDAE FRUTAS VERME': 'PROMO',
  'PROM PETISCO CALABRESA': 'PROMO',
  'PROMO CP DELICIA 5': 'PROMO',

  // Saladas
  'EXECUTIVO SALPICAO TIRINH': 'Saladas',
  'EXECUTIVO TRADICIO TIRINH': 'Saladas',
  'EXECUTIVO TRADICIO FRANGO': 'Saladas',
  'EXECUTIVO SALPICAO FRANGO': 'Saladas',
  'EXECUTIVO ESSENCIA TIRINH': 'Saladas',
  'EXECUTIVO SALPICAO FILET': 'Saladas',
  'EXECUTIVO ESSENCIA FILET': 'Saladas',
  'SALADA CAESAR': 'Saladas',
  'SALPICAO': 'Saladas',
  'EXECUTIVO ESSENCIA FRANGO': 'Saladas',
  'EXECUTIVO TRADICIO FILET': 'Saladas',
  'SALADA ESP BEBELU': 'Saladas',
  'SALADA ATUM': 'Saladas',

  // Sobremesas
  'MILK OVO MALT 500ML': 'Sobremesas',
  'SORV MILK OVM 300': 'Sobremesas',
  'MILK CHOCOL 500ML': 'Sobremesas',
  'MILK FRUT VER 500': 'Sobremesas',
  'MILK CHOCOL 300ML': 'Sobremesas',
  'MILK ACAI 300ML': 'Sobremesas',
  'SORV MILKSHAK 300': 'Sobremesas',
  'MILK NEGRESCO 300': 'Sobremesas',
  'MILK NEGRESCO 500': 'Sobremesas',
  'MILK MORANG 500ML': 'Sobremesas',
  'MILK ACAI 500': 'Sobremesas',
  'MILK FRUT VER 300': 'Sobremesas',
  'MILK MORANG 300ML': 'Sobremesas',
  'MILK PISTACHE 500ML': 'Sobremesas',
  'MILK SHAKE 500ML': 'Sobremesas',
  'MILK PISTACHE 300ML': 'Sobremesas',
  'MILK ABACAXI 300ML': 'Sobremesas',
  'MILK SHAKE ACAI 300ML': 'Sobremesas',
  'MILK NINHO 300ML': 'Sobremesas',
  'MILK ACAI 500ML': 'Sobremesas',
  'SUNDAE MORANGO': 'Sobremesas',
  'MILK BAUNI 500ML': 'Sobremesas',
  'SUNDAE CHOCOLATE': 'Sobremesas',
  'MILK NINHO 500ML': 'Sobremesas',
  'MILK ABACAXI 500ML': 'Sobremesas',
  'SUNDAE BAUNI': 'Sobremesas',
  'MILK BANANA 500ML': 'Sobremesas',
  'SUNDAE NEGRESCO': 'Sobremesas',
  'SUNDAE ABACAXI': 'Sobremesas',
  'SUNDAE FRUTAS VER': 'Sobremesas',
  'MILK BANANA 300ML': 'Sobremesas',
  'SUNDAE DE PISTACHE': 'Sobremesas',
  'SORVETE SUNDAE': 'Sobremesas',
  'MILK BAUNI 300ML': 'Sobremesas',
  'SUNDAE BANANA FLAMBADA': 'Sobremesas',
  'SUNDAE ACAI': 'Sobremesas',
  'COBERTURA MORANGO': 'Sobremesas',
  'BOLA SORV MORANGO': 'Sobremesas',
  'BOLA SORV BAUNILHA': 'Sobremesas',
  'BOLA SORV CHOCOLATE': 'Sobremesas',
  'COBERTURA CHOCOLATE': 'Sobremesas',

  // Sucos
  'SUCO GOIABA S/LEITE': 'Sucos',
  'SUCO MANGA S/LEITE': 'Sucos',
  'SUCO ACEROLA S/LEITE': 'Sucos',
  'SUCO MARACUJA S/LEITE': 'Sucos',
  'SUCO ACEROLA': 'Sucos',
  'SUCO MARACUJA': 'Sucos',
  'SUCO GOIABA': 'Sucos',
  'SUCO MANGA': 'Sucos',
  'SUCO CAJU S/LEI': 'Sucos',
  'SUCO MORANGO': 'Sucos',

  // Sucos Naturais
  'SUCO LARANJA': 'Sucos Naturais',
  'SUC LARANJA 500ML': 'Sucos Naturais',
  'SUCO ABACAXI C/HORTELA': 'Sucos Naturais',
  'SUCO LARANJA C/CENOURA': 'Sucos Naturais',
  'S ABAX C/HORT 500': 'Sucos Naturais',
  'S LARJ C/BETE 500': 'Sucos Naturais',
  'SUCO LARANJA C/BETERRABA': 'Sucos Naturais',
  'S LARAN C/CEN 500': 'Sucos Naturais',

  // Delícias
  'DELICIA 2': 'Delícias',
  'DELICIA 6 C/ BAT': 'Delícias',
  'DELICIA 1': 'Delícias',
  'DELICIA 10': 'Delícias',
  'DELICIA 3': 'Delícias',
  'DELICIA 9': 'Delícias',
  'DELICIA 4': 'Delícias',
  'DELICIA 6': 'Delícias',
  'DELICIA 5': 'Delícias',
  'DELICIA 7': 'Delícias',
  'DELICIA 13': 'Delícias',
  'COMBO FRANGO CATUPIRY': 'Delícias',
  'COMBO FILE CATUPIRY': 'Delícias',
  'COMBO CHICKEN': 'Delícias',
  'COMBO PERNIL CATUPIRY': 'Delícias',
  'COMBO TOSCANESA': 'Delícias',
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentStore, setCurrentStore] = useState<Store>(STORES[3]);
  const isDarkMode = currentStore.brand === '4ESTYLOS' || currentStore.code === 'ROOT';
  const [metrics, setMetrics] = useState<Metric[]>(mockMetrics.map(m => ({ ...m, valor: 0, trend: 'neutral', change: '0%' })));
  const [dreTimeline, setDreTimeline] = useState<DREData[]>([]);
  const [metaVsRealizado, setMetaVsRealizado] = useState<any[]>([
    { name: 'Meta', valor: 0, color: '#7F300C' },
    { name: 'Realizado', valor: 0, color: '#FFCB05' },
  ]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [deliveryChannels, setDeliveryChannels] = useState<any[]>([
    { name: 'iFood', valor: 0, color: '#EA1D2C' },
    { name: 'WEDO', valor: 0, color: '#0066FF' },
    { name: 'Balcão', valor: 0, color: '#FFB800' }
  ]);
  const [salesByHour, setSalesByHour] = useState<any[]>(mockSalesByHour.map(s => ({ ...s, faturamento: 0 })));
  const [salesByDay, setSalesByDay] = useState<any[]>(mockSalesByDay.map(s => ({ ...s, faturamento: 0 })));
  const [peakHour, setPeakHour] = useState<string>('00:00');
  const [closingsData, setClosingsData] = useState<Record<string, any>>({});
  const [yearlyHistory, setYearlyHistory] = useState<{ [year: string]: number }>({
    '2024': 0,
    '2025': 0,
  });
  const [operationalMetrics, setOperationalMetrics] = useState<any[]>([
    { label: 'Tempo de Produção', valor: '0 min', target: '20 min', percent: 0, icon: 'Clock' },
    { label: 'Desperdício / Perda', valor: '0%', target: '1.0%', percent: 0, icon: 'ShoppingBag', critical: true },
    { label: 'Satisfação (NPS)', valor: '0', target: '9.0', percent: 0, icon: 'Target' },
  ]);

  useEffect(() => {
    // Reset data when store changes to ensure isolation
    setMetrics(mockMetrics.map(m => ({ ...m, valor: 0, trend: 'neutral', change: '0%' })));
    setDreTimeline([]);
    setTopProducts([]);
    setInventoryItems([]);
    setClosingsData({});
    setMetaVsRealizado([
      { name: 'Meta', valor: 0, color: brandColors.primary },
      { name: 'Realizado', valor: 0, color: brandColors.button },
    ]);
  }, [currentStore.id]);

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
    setSalesByHour(salesByHour.map(s => ({ ...s, faturamento: 0 })));
    setSalesByDay(salesByDay.map(s => ({ ...s, faturamento: 0 })));
    setPeakHour('00:00');
    setClosingsData({});

    // Also clear localStorage if any
    localStorage.removeItem('inventory_items');
    localStorage.removeItem('top_products');
    localStorage.removeItem('dre_data');
    localStorage.removeItem('metrics_data');
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
      
      // If no data, clear current local state for products to avoid ghost data
      setInventoryItems([]);
      setTopProducts([]);
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
        const data = { ...docSnap.data(), year } as DREData;
        setDreTimeline(prev => {
          const exists = prev.some(p => p.month === data.month && p.year === year);
          if (!exists) return [...prev, data];
          return prev.map(p => (p.month === data.month && p.year === year) ? data : p);
        });
        
        if (data.yearlyHistory) {
          setYearlyHistory(prev => ({ ...prev, ...data.yearlyHistory }));
        }
        
        return true;
      } else {
        // If it doesn't exist, remove it from timeline if it was there
        const monthIndex = parseInt(month, 10) - 1;
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthLabel = monthNames[monthIndex];

        setDreTimeline(prev => prev.filter(p => {
          const pYear = String(p.year || '2026').trim();
          const targetYear = String(year || '2026').trim();
          const pMonth = (p.month || '').trim();
          const targetMonth = monthLabel.trim();
          
          return !(pMonth === targetMonth && pYear === targetYear);
        }));
      }
      return false;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return false;
    }
  };

  const deletePeriodData = async (month: string, year: string) => {
    const periodId = `${year}-${month}`;
    const storeId = currentStore.id;
    
    try {
      // Deletar documentos de todas as coleções possíveis relacionadas ao período
      // Usamos Promise.all para performance, mas sem travar se um falhar (embora deleteDoc não trave se não existir)
      const collections = ['dre_periods', 'cmv_periods', 'dre_detailed', 'cmv_detailed', 'closings'];
      
      await Promise.all(collections.map(coll => 
        deleteDoc(doc(db, 'stores', storeId, coll, periodId)).catch(e => console.warn(`Erro ao deletar em ${coll}:`, e))
      ));
      
      // Obter o label do mês exato
      const monthIndex = parseInt(month, 10) - 1;
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthLabel = monthNames[monthIndex];

      // Atualizar estado local de forma agressiva
      // 1. DRE Timeline
      setDreTimeline(prev => prev.filter(p => {
        const pYear = String(p.year || '2026').trim();
        const targetYear = String(year || '2026').trim();
        const pMonth = (p.month || '').trim();
        const targetMonth = monthLabel.trim();
        
        return !(pMonth === targetMonth && pYear === targetYear);
      }));
      
      // 2. Estados do CMV e Métricas
      setTopProducts([]);
      setInventoryItems([]);
      setMetrics(prev => prev.map(m => ({ ...m, valor: 0, change: '0%', trend: 'neutral' })));
      setMetaVsRealizado([
        { name: 'Meta', valor: 0, color: '#7F300C' },
        { name: 'Realizado', valor: 0, color: '#FFCB05' },
      ]);
      setDeliveryChannels([
        { name: 'iFood', valor: 0, color: '#EA1D2C' },
        { name: 'WEDO', valor: 0, color: '#0066FF' },
        { name: 'Balcão', valor: 0, color: '#FFB800' }
      ]);
      
      // 3. Histórico anual se não for o ano corrente/default
      if (year !== '2026') {
        setYearlyHistory(prev => ({ ...prev, [year]: 0 }));
      }
      
      // 4. Fechamentos se houver
      setClosingsData(prev => {
        const next = { ...prev };
        delete next[periodId];
        return next;
      });

      console.log(`Período ${periodId} (${monthLabel}) removido com sucesso.`);
    } catch (error) {
      console.error('Erro fatal ao excluir período:', error);
      handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/dre_periods/${periodId}`);
    }
  };

  const clearAllStoreData = async () => {
    if (!window.confirm(`ATENÇÃO: Isso apagará TODOS os dados (Março, Abril, Maio) desta unidade no banco de dados. Deseja continuar?`)) return;
    
    const months = ['03', '04', '05'];
    const year = '2026';
    
    for (const month of months) {
      await deletePeriodData(month, year);
    }
    
    clearAllData();
    alert('Todos os dados da unidade foram zerados com sucesso.');
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
      closingsData,
      setClosingsData,
      saveCMVPeriod,
      loadCMVPeriod,
      saveDREPeriod,
      loadDREPeriod,
      deletePeriodData,
      clearAllStoreData,
      clearAllData
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
