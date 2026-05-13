import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for persisted session
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Mock validation
        if (email.includes('admin')) {
          const newUser: User = { id: '1', name: 'Rennan Inácio', email, role: 'ADMIN' };
          setUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
          resolve();
        } else if (email.includes('gerente')) {
          const newUser: User = { id: '2', name: 'Gerente Loja', email, role: 'MANAGER' };
          setUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
          resolve();
        } else if (email.includes('fin')) {
          const newUser: User = { id: '3', name: 'Financeiro Dept', email, role: 'FINANCIAL' };
          setUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
          resolve();
        } else {
          // Default to admin for demo if not specified
          const newUser: User = { id: '1', name: 'Rennan Inácio', email, role: 'ADMIN' };
          setUser(newUser);
          localStorage.setItem('auth_user', JSON.stringify(newUser));
          resolve();
        }
        setIsLoading(false);
      }, 1000);
    });
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
