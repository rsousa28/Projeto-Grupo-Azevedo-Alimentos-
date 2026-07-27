import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, deleteDoc } from 'firebase/firestore';
import { AuditService } from '../services/AuditService';
import { sha256 } from '../utils/crypto';
import { useToast } from './ToastContext';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos em milissegundos

import { BiometricService } from '../services/BiometricService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithBiometrics: (username?: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { warning } = useToast();
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Clear user on mount to force login every time and clean up deleted users from DB
  useEffect(() => {
    localStorage.removeItem('auth_user');

    // Clean up Victor and Paloma from firestore on startup to ensure removal is permanent
    const cleanupBadUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const qUsers = await getDocs(usersRef);
        qUsers.forEach(async (docSnap) => {
          const uData = docSnap.data();
          const usernameLower = (uData.username || '').toLowerCase();
          const nameLower = (uData.name || '').toLowerCase();
          if (
            usernameLower === 'victordiretor' || 
            usernameLower === 'paloma' ||
            nameLower.includes('paloma') ||
            nameLower.includes('victor')
          ) {
            console.log(`Auto-deleting restricted user: ${uData.name} (@${uData.username})`);
            await deleteDoc(doc(db, 'users', docSnap.id));
          }
        });
      } catch (err) {
        console.error("Error auto-cleaning up restricted users:", err);
      }
    };
    cleanupBadUsers();

    setIsLoading(false);
  }, []);

  // Handle session timeout when user is inactive for 30 minutes
  const handleSessionTimeout = useCallback(() => {
    const currentUser = userRef.current;
    if (currentUser) {
      AuditService.logAction({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'SESSION_TIMEOUT',
        description: 'Sessão expirada automaticamente após 30 minutos de inatividade.'
      }).catch((err) => console.error("Error logging session timeout:", err));
    }

    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('active_store_id');
    localStorage.removeItem('last_activity_timestamp');

    try {
      warning('Sessão expirada por inatividade (30 minutos). Faça login novamente.', 'Inatividade Detectada', 6000);
    } catch (e) {
      console.error("Failed to show timeout toast:", e);
    }
  }, [warning]);

  // Monitor user activity and handle inactivity timeout
  useEffect(() => {
    if (!user) return;

    // Initialize activity timestamp
    const now = Date.now();
    localStorage.setItem('last_activity_timestamp', now.toString());

    let lastUpdate = now;

    const updateActivity = () => {
      const currentNow = Date.now();
      // Throttle updates to avoid excessive localStorage calls
      if (currentNow - lastUpdate > 2000) {
        lastUpdate = currentNow;
        localStorage.setItem('last_activity_timestamp', currentNow.toString());
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'pointerdown'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, updateActivity, { passive: true });
    });

    const checkInactivity = () => {
      if (!userRef.current) return;
      const storedTimeStr = localStorage.getItem('last_activity_timestamp');
      const lastActivity = storedTimeStr ? parseInt(storedTimeStr, 10) : Date.now();
      const inactiveDuration = Date.now() - lastActivity;

      if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
        handleSessionTimeout();
      }
    };

    // Check inactivity every 5 seconds
    const intervalId = setInterval(checkInactivity, 5000);

    // Also check immediately when window gains focus or tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    window.addEventListener('focus', checkInactivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, updateActivity);
      });
      clearInterval(intervalId);
      window.removeEventListener('focus', checkInactivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, handleSessionTimeout]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    const u = username?.trim().toLowerCase();
    const p = password?.trim();
    try {
      // 1. Check Firestore for custom / database-saved users first (so custom edits/passwords take precedence)
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
            localStorage.setItem('last_activity_timestamp', Date.now().toString());
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

      // 2. Check for root administrator fallback
      if (u === 'adm' && p === '88028837') {
        const adminUser: User = { 
          id: 'root-admin', 
          name: 'Admin Geral Grupo AZ', 
          username: 'adm', 
          role: 'ADMIN' 
        };
        setUser(adminUser);
        localStorage.setItem('auth_user', JSON.stringify(adminUser));
        localStorage.setItem('last_activity_timestamp', Date.now().toString());
        await AuditService.logAction({
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: adminUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Admin Geral.`
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
        localStorage.setItem('last_activity_timestamp', Date.now().toString());
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
        localStorage.setItem('last_activity_timestamp', Date.now().toString());
        await AuditService.logAction({
          userId: andressaUser.id,
          userName: andressaUser.name,
          userRole: andressaUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de Bebelu Mossoró.`
        });
        return;
      }

      if ((u === 'jef' || u === 'jef4e09') && p === 'jqc26') {
        const jefUser: User = { 
          id: 'jef-4e09', 
          name: 'Jefferson - 4 Estylos Mossoró', 
          username: 'jef4e09', 
          role: 'MANAGER_4ESTYLOS_MOSSORO' 
        };
        setUser(jefUser);
        localStorage.setItem('auth_user', JSON.stringify(jefUser));
        localStorage.setItem('last_activity_timestamp', Date.now().toString());
        await AuditService.logAction({
          userId: jefUser.id,
          userName: jefUser.name,
          userRole: jefUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de 4 Estylos Mossoró.`
        });
        return;
      }

      if ((u === 'michele' || u === 'michele4e09') && p === '4e09') {
        const micheleUser: User = { 
          id: 'michele-4e09', 
          name: 'Michele - 4 Estylos Mossoró', 
          username: 'michele4e09', 
          role: 'MANAGER_4ESTYLOS_MOSSORO' 
        };
        setUser(micheleUser);
        localStorage.setItem('auth_user', JSON.stringify(micheleUser));
        localStorage.setItem('last_activity_timestamp', Date.now().toString());
        await AuditService.logAction({
          userId: micheleUser.id,
          userName: micheleUser.name,
          userRole: micheleUser.role,
          action: 'LOGIN_SUCCESS',
          description: `Login realizado com sucesso como Gerente de 4 Estylos Mossoró.`
        });
        return;
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

  const loginWithBiometrics = async (username?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const bioCred = await BiometricService.authenticate(username);
      
      // Attempt to load full user details from Firestore
      let authenticatedUser: User = {
        id: bioCred.userId,
        name: bioCred.userName,
        username: bioCred.username,
        role: bioCred.userRole as any,
      };

      try {
        const usersRef = collection(db, 'users');
        const qUsers = query(usersRef, where('username', '==', bioCred.username.toLowerCase()), limit(1));
        const querySnapshot = await getDocs(qUsers);
        if (!querySnapshot.empty) {
          const docUser = querySnapshot.docs[0];
          const userData = docUser.data();
          authenticatedUser = {
            id: docUser.id,
            name: userData.name || bioCred.userName,
            username: userData.username || bioCred.username,
            role: userData.role || bioCred.userRole,
            email: userData.email,
          };
        }
      } catch (err) {
        console.warn('Could not refresh user details from Firestore during biometric login:', err);
      }

      setUser(authenticatedUser);
      localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('last_activity_timestamp', Date.now().toString());

      await AuditService.logAction({
        userId: authenticatedUser.id,
        userName: authenticatedUser.name,
        userRole: authenticatedUser.role,
        action: 'LOGIN_SUCCESS',
        description: `Login efetuado com sucesso via Autenticação Biométrica (Touch ID / Face ID).`
      });

      return authenticatedUser;
    } catch (error: any) {
      console.error('Biometric login error:', error);
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
    localStorage.removeItem('last_activity_timestamp');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithBiometrics, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

