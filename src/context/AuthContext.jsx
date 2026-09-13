import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS } from '../data/workoutCatalog';
import { auth, isInitialized, getStoredFirebaseConfig, ensureAnonymousAuth, subscribeToConnectionStatus } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const AuthContext = createContext(null);

const ACTIVE_USER_STORAGE = 'fitness_duo_active_user';
const SESSION_MODE_STORAGE = 'fitness_duo_session_mode';
const HOUSEHOLD_ID_STORAGE = 'fitness_duo_household_id';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem(ACTIVE_USER_STORAGE) || 'dionicio';
  });

  const [sessionMode, setSessionMode] = useState(() => {
    return localStorage.getItem(SESSION_MODE_STORAGE) || 'duo'; // 'duo' (pantalla compartida) or 'single'
  });

  const [householdId, setHouseholdId] = useState(() => {
    return localStorage.getItem(HOUSEHOLD_ID_STORAGE) || 'hogar-dionicio-paula';
  });

  const [fbUser, setFbUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isCloudOnline, setIsCloudOnline] = useState(false);

  useEffect(() => {
    // Subscribe to cloud connection changes
    const unsubConnection = subscribeToConnectionStatus((online) => {
      setIsCloudOnline(online);
    });

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

      // Ensure anonymous session if no user is authenticated
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

  const loginWithFirebase = async (email, password) => {
    if (!auth) throw new Error('Firebase Auth no inicializado. Revisa la configuración.');
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithFirebase = async (email, password) => {
    if (!auth) throw new Error('Firebase Auth no inicializado. Revisa la configuración.');
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logoutFirebase = async () => {
    if (auth) {
      await fbSignOut(auth);
      setFbUser(null);
      // Re-enable anonymous session for seamless continued sync
      await ensureAnonymousAuth();
    }
  };

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
    authLoading,
    loginWithFirebase,
    registerWithFirebase,
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

