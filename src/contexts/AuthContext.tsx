import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { AuditService } from '../services/AuditService';
import { sha256 } from '../utils/crypto';

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
    const u = username?.trim().toLowerCase();
    const p = password?.trim();
    try {
      // 1. Check for root administrator fallback
      if (u === 'adm' && p === '88028837') {
        const adminUser: User = { 
          id: 'root-admin', 
          name: 'Admin Geral Grupo AZ', 
          username: 'adm', 
          role: 'ADMIN' 
        };
        setUser(adminUser);
        localStorage.setItem('auth_user', JSON.stringify(adminUser));
        await AuditService.logAction({
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: adminUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Admin Geral.`
        });
        return;
      }

      if (u === 'victordiretor' && p === '1234') {
        const victorUser: User = { 
          id: 'victor-diretor', 
          name: 'Victor - Diretor Grupo AZ', 
          username: 'victordiretor', 
          role: 'FINANCIAL' 
        };
        setUser(victorUser);
        localStorage.setItem('auth_user', JSON.stringify(victorUser));
        await AuditService.logAction({
          userId: victorUser.id,
          userName: victorUser.name,
          userRole: victorUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Diretor.`
        });
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
        await AuditService.logAction({
          userId: pUser.id,
          userName: pUser.name,
          userRole: pUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de Bebelu Papicu.`
        });
        return;
      }

      if ((u === 'andressa' || u === 'andressab32') && p === 'b32') {
        const andressaUser: User = { 
          id: 'andressa-b32', 
          name: 'Andressa - Bebelu Mossoró', 
          username: 'andressab32', 
          role: 'MANAGER_BEBELU_MOSSORO' 
        };
        setUser(andressaUser);
        localStorage.setItem('auth_user', JSON.stringify(andressaUser));
        await AuditService.logAction({
          userId: andressaUser.id,
          userName: andressaUser.name,
          userRole: andressaUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de Bebelu Mossoró.`
        });
        return;
      }

      if ((u === 'jef' || u === 'jef4e09') && p === '4e09') {
        const jefUser: User = { 
          id: 'jef-4e09', 
          name: 'Jefferson - 4 Estylos Mossoró', 
          username: 'jef4e09', 
          role: 'MANAGER_4ESTYLOS_MOSSORO' 
        };
        setUser(jefUser);
        localStorage.setItem('auth_user', JSON.stringify(jefUser));
        await AuditService.logAction({
          userId: jefUser.id,
          userName: jefUser.name,
          userRole: jefUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de 4 Estylos Mossoró.`
        });
        return;
      }

      // 2. Check Firestore for custom users
      try {
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('username', '==', u), limit(1));
        const querySnapshot = await getDocs(qUsers);

        if (!querySnapshot.empty) {
          const docUser = querySnapshot.docs[0];
          const userData = docUser.data();
          
          // Verify password (stored in Firestore as SHA-256 with plaintext fallback)
          const hashedEntered = await sha256(p);
          const isMatched = userData.password === p || userData.password === hashedEntered;
          
          if (isMatched) {
            const newUser: User = {
              id: docUser.id,
              name: userData.name,
              username: userData.username,
              role: userData.role,
              email: userData.email
            };
            setUser(newUser);
            localStorage.setItem('auth_user', JSON.stringify(newUser));
            await AuditService.logAction({
              userId: newUser.id,
              userName: newUser.name,
              userRole: newUser.role,
              action: 'LOGIN_SUCCESS',
              description: `Login via Banco de Dados com sucesso.`
            });
            return;
          }
        }
      } catch (dbError) {
        console.error("Database access error during login:", dbError);
      }

      // If we fall through, it's failed credentials
      await AuditService.logAction({
        userId: 'anonymous',
        userName: u || 'unknown',
        userRole: 'NONE',
        action: 'LOGIN_FAILED',
        description: `Tentativa de login malsucedida para usuário '${u}'.`
      });
      throw new Error('Credenciais inválidas.');
    } catch (error: any) {
      if (error.message !== 'Credenciais inválidas.') {
        await AuditService.logAction({
          userId: 'anonymous',
          userName: u || 'unknown',
          userRole: 'NONE',
          action: 'LOGIN_FAILED',
          description: `Erro durante o processo de login do usuário '${u}': ${error.message || error}`
        });
      }
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      AuditService.logAction({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGOUT',
        description: `Usuário '${user.name}' deslogou temporariamente do sistema.`
      });
    }
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('active_store_id');
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
