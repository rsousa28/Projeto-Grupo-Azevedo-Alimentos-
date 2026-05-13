import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store } from '../types';

interface StoreContextType {
  currentStore: Store;
  setStore: (store: Store) => void;
  isDarkMode: boolean;
}

const STORES: Store[] = [
  { id: '1', name: 'Bebelu Mossoró', brand: 'BEBELU', location: 'Centro' },
  { id: '2', name: 'Bebelu Rio Mar', brand: 'BEBELU', location: 'Rio Mar Shopping' },
  { id: '3', name: '4 Estylos Mossoró', brand: '4ESTYLOS', location: 'Avenida Principal' },
];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentStore, setCurrentStore] = useState<Store>(STORES[0]);

  const isDarkMode = currentStore.brand === '4ESTYLOS';

  return (
    <StoreContext.Provider value={{ currentStore, setStore: setCurrentStore, isDarkMode }}>
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
