import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS } from '../data/workoutCatalog';
import { auth, isInitialized, ensureAnonymousAuth, subscribeToConnectionStatus } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  verifyAndLogin, 
  getAuthenticatedSession, 
  clearAuthenticatedSession 
} from '../services/authService';

const AuthContext = createContext(null);

const ACTIVE_USER_STORAGE = 'fitness_duo_active_user';
const SESSION_MODE_STORAGE = 'fitness_duo_session_mode';
const HOUSEHOLD_ID_STORAGE = 'fitness_duo_household_id';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem(ACTIVE_USER_STORAGE) || 'dionicio';
  });

  const [sessionMode, setSessionMode] = useState(() => {
    return localStorage.getItem(SESSION_MODE_STORAGE) || 'single';
  });

  const [householdId, setHouseholdId] = useState(() => {
    return localStorage.getItem(HOUSEHOLD_ID_STORAGE) || 'hogar-dionicio-paula';
  });

  const [fbUser, setFbUser] = useState(null);
  const [authSession, setAuthSession] = useState(() => getAuthenticatedSession());
  const [authLoading, setAuthLoading] = useState(true);
  const [isCloudOnline, setIsCloudOnline] = useState(false);

  useEffect(() => {
    // 1. Subscribe to cloud connection changes
    const unsubConnection = subscribeToConnectionStatus((online) => {
      setIsCloudOnline(online);
    });

    // 2. Listen to Firebase Auth state
    if (auth && isInitialized) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFbUser(user);
        setAuthLoading(false);
        if (user) {
          if (user.uid === 'paula' || (user.email && user.email.toLowerCase().includes('paula'))) {
            switchUser('paula');
          } else if (user.uid === 'dionicio' || (user.email && (user.email.toLowerCase().includes('dionicio') || user.email.toLowerCase().includes('atleta1')))) {
            switchUser('dionicio');
          }
        }
      });

      // Ensure anonymous session for Firestore syncing
      ensureAnonymousAuth();

      return () => {
        unsubscribe();
        unsubConnection();
      };
    } else {
      setAuthLoading(false);
      return () => unsubConnection();
    }
  }, []);

  const switchUser = (uid) => {
    if (USERS[uid]) {
      setCurrentUser(uid);
      localStorage.setItem(ACTIVE_USER_STORAGE, uid);
    }
  };

  const changeSessionMode = (mode) => {
    setSessionMode(mode);
    localStorage.setItem(SESSION_MODE_STORAGE, mode);
  };

  const changeHouseholdId = (id) => {
    setHouseholdId(id);
    localStorage.setItem(HOUSEHOLD_ID_STORAGE, id);
  };

  /**
   * Inicio de sesión híbrido de producción:
   * Valida criptográficamente las credenciales autorizadas del hogar y sincroniza con Firebase
   */
  const loginAthlete = async (email, password, selectedUser = 'dionicio') => {
    // 1. Verificación segura con Vault Criptográfico
    const vaultResult = await verifyAndLogin(email, password, selectedUser);
    
    // 2. Intentar autenticar en Firebase si el endpoint está disponible
    if (auth && isInitialized && email && password) {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (fbErr) {
        console.warn('Firebase Auth notice (continuando con sesión criptográfica segura):', fbErr.message);
        // Si no está registrado en Firebase Auth, intentar registrarlo en segundo plano
        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email.trim(), password);
          } catch (regErr) {
            console.warn('Firebase Auto-Register notice:', regErr.message);
          }
        }
      }
    }

    // 3. Activar sesión
    setAuthSession(vaultResult.session);
    switchUser(vaultResult.user);
    await ensureAnonymousAuth();
    return vaultResult;
  };

  const logoutFirebase = async () => {
    clearAuthenticatedSession();
    setAuthSession(null);
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {}
      setFbUser(null);
      await ensureAnonymousAuth();
    }
  };

  const isAuthenticated = Boolean(fbUser || authSession);

  const value = {
    currentUser,
    userProfile: USERS[currentUser] || USERS.dionicio,
    allUsers: USERS,
    switchUser,
    sessionMode,
    changeSessionMode,
    householdId,
    changeHouseholdId,
    fbUser,
    authSession,
    isAuthenticated,
    authLoading,
    loginAthlete,
    logoutFirebase,
    isFirebaseConnected: isInitialized,
    isCloudOnline
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}