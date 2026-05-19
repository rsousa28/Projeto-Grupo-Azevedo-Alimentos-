import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clear user on mount to force login every time
  useEffect(() => {
    localStorage.removeItem('auth_user');
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const u = username?.trim().toLowerCase();
      const p = password?.trim();

      // 1. Check for root administrator fallback
      if (u === 'adm' && p === 'adm123') {
        const adminUser: User = { 
          id: 'root-admin', 
          name: 'Admin Geral Grupo AZ', 
          username: 'adm', 
          role: 'ADMIN' 
        };
        setUser(adminUser);
        localStorage.setItem('auth_user', JSON.stringify(adminUser));
        return;
      }

      if (u === 'patriciab28' && p === 'b28') {
        const pUser: User = { 
          id: 'patricia-b28', 
          name: 'Patrícia - Bebelu Papicu', 
          username: 'patriciab28', 
          role: 'MANAGER_BEBELU_RIOMAR_PAPICU' 
        };
        setUser(pUser);
        localStorage.setItem('auth_user', JSON.stringify(pUser));
        return;
      }

      // 2. Check Firestore for custom users
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', u), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const userData = doc.data();
          
          // Verify password (stored in Firestore for this demo)
          if (userData.password === p) {
            const newUser: User = {
              id: doc.id,
              name: userData.name,
              username: userData.username,
              role: userData.role,
              email: userData.email
            };
            setUser(newUser);
            localStorage.setItem('auth_user', JSON.stringify(newUser));
            return;
          }
        }
      } catch (dbError) {
        console.error("Database access error:", dbError);
      }

      throw new Error('Credenciais inválidas.');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
