import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { db, auth, usernameToEmail } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { AuditService } from '../services/AuditService';
import { useToast } from './ToastContext';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos em milissegundos

import { BiometricService } from '../services/BiometricService';
import { NotificationService } from '../services/NotificationService';

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

  // Clear user on mount to force login every time. The Firebase session itself stays persisted
  // so biometric unlock can reuse it; password login always works.
  useEffect(() => {
    localStorage.removeItem('auth_user');
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

  // Load the profile (name, role) stored at users/{uid} for a Firebase Auth account
  const loadProfile = async (uid: string): Promise<User> => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      throw new Error('Usuário sem perfil de acesso. Fale com o administrador.');
    }
    const userData = snap.data();
    return {
      id: uid,
      name: userData.name,
      username: userData.username,
      role: userData.role,
      email: userData.email,
      biometricEnabled: userData.biometricEnabled !== undefined ? userData.biometricEnabled : BiometricService.isBiometricEnabled(userData.username)
    };
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    const u = username?.trim().toLowerCase();
    const p = password?.trim();
    try {
      try {
        await signInWithEmailAndPassword(auth, usernameToEmail(u), p);
      } catch (authError: any) {
        const code = authError?.code || '';
        if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-email') {
          await AuditService.logAction({
            userId: 'anonymous',
            userName: u || 'unknown',
            userRole: 'NONE',
            action: 'LOGIN_FAILED',
            description: `Tentativa de login malsucedida para usuário '${u}'.`
          });
          throw new Error('Credenciais inválidas.');
        }
        if (code === 'auth/too-many-requests') {
          throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        }
        throw authError;
      }

      const newUser = await loadProfile(auth.currentUser!.uid);
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('last_activity_timestamp', Date.now().toString());
      await AuditService.logAction({
        userId: newUser.id,
        userName: newUser.name,
        userRole: newUser.role,
        action: 'LOGIN_SUCCESS',
        description: `Login realizado com sucesso.`
      });
    } catch (error: any) {
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

      // Biometrics only unlock a Firebase session this device already has for the same person
      const firebaseUser = auth.currentUser;
      const expectedEmail = usernameToEmail(bioCred.username);
      if (!firebaseUser || (firebaseUser.uid !== bioCred.userId && firebaseUser.email !== expectedEmail)) {
        throw new Error('Entre com usuário e senha uma vez neste aparelho para liberar o acesso por biometria.');
      }

      const authenticatedUser = await loadProfile(firebaseUser.uid);
      if (authenticatedUser.biometricEnabled === false) {
        throw new Error('A autenticação biométrica foi desativada nas configurações do seu perfil.');
      }
      authenticatedUser.biometricEnabled = true;

      setUser(authenticatedUser);
      localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('last_activity_timestamp', Date.now().toString());

      // Auto sync FCM device registration token for PWA push alerts
      NotificationService.initFCMToken(authenticatedUser).catch(err => 
        console.warn('Auto FCM token registration on biometric login failed:', err)
      );

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

  // Sync FCM token automatically when user logs in
  useEffect(() => {
    if (user) {
      NotificationService.initFCMToken(user).catch(err => 
        console.warn('Auto FCM token registration error:', err)
      );
    }
  }, [user]);

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
    // Sign out of Firebase only after the device token cleanup, which still needs the session
    NotificationService.unregisterFCMUser()
      .catch(err => console.warn('Error unregistering FCM user on logout:', err))
      .finally(() => signOut(auth).catch(err => console.warn('Error signing out of Firebase:', err)));
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

