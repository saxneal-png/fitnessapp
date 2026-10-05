import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS as DEFAULT_USERS } from '../data/workoutCatalog';
import { auth, isInitialized, ensureAnonymousAuth, subscribeToConnectionStatus } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  verifyAndLogin, 
  registerAthlete as registerAthleteService,
  getAuthenticatedSession, 
  clearAuthenticatedSession,
  getAllAthletes,
  sendRecoveryOtp,
  verifyOtpAndResetPassword
} from '../services/authService';

const AuthContext = createContext(null);

const ACTIVE_USER_STORAGE = 'fitness_duo_active_user';
const SESSION_MODE_STORAGE = 'fitness_duo_session_mode';
const HOUSEHOLD_ID_STORAGE = 'fitness_duo_household_id';

export function AuthProvider({ children }) {
  const [allUsers, setAllUsers] = useState(() => getAllAthletes());

  const [currentUser, setCurrentUser] = useState(() => {
    const session = getAuthenticatedSession();
    if (session && session.uid) return session.uid;
    return localStorage.getItem(ACTIVE_USER_STORAGE) || 'dionicio';
  });

  const [sessionMode, setSessionMode] = useState(() => {
    return localStorage.getItem(SESSION_MODE_STORAGE) || 'single';
  });

  const [householdId, setHouseholdId] = useState(() => {
    const session = getAuthenticatedSession();
    if (session && session.householdId) return session.householdId;
    const active = localStorage.getItem(ACTIVE_USER_STORAGE) || 'dionicio';
    const users = getAllAthletes();
    if (users[active] && users[active].householdId) {
      return users[active].householdId;
    }
    return localStorage.getItem(HOUSEHOLD_ID_STORAGE) || 'hogar-dionicio-paula';
  });

  const [fbUser, setFbUser] = useState(null);
  const [authSession, setAuthSession] = useState(() => getAuthenticatedSession());
  const [authLoading, setAuthLoading] = useState(true);
  const [isCloudOnline, setIsCloudOnline] = useState(false);

  const refreshUsers = () => {
    const updated = getAllAthletes();
    setAllUsers(updated);
    return updated;
  };

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
          const currentAthletes = getAllAthletes();
          for (const [uid, athlete] of Object.entries(currentAthletes)) {
            if (user.uid === uid || (user.email && athlete.email && user.email.toLowerCase() === athlete.email.toLowerCase())) {
              switchUser(uid);
              break;
            }
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

  const isDuoHousehold = householdId === 'hogar-dionicio-paula' && (currentUser === 'dionicio' || currentUser === 'paula');

  const switchUser = (uid) => {
    // Si no es el hogar compartido de Dionicio y Paula, la cuenta es privada y no permite acceder a otros atletas
    if (!isDuoHousehold && uid !== currentUser) {
      console.warn('Acceso denegado: cuenta privada aislada.');
      return;
    }
    const currentAthletes = getAllAthletes();
    if (currentAthletes[uid]) {
      setCurrentUser(uid);
      localStorage.setItem(ACTIVE_USER_STORAGE, uid);
      
      const targetHousehold = currentAthletes[uid].householdId || (currentAthletes[uid].isCustomUser ? `privado_${uid}` : 'hogar-dionicio-paula');
      setHouseholdId(targetHousehold);
      localStorage.setItem(HOUSEHOLD_ID_STORAGE, targetHousehold);
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
   * Registro de un nuevo atleta con aislamiento de datos y API Key
   */
  const registerAthlete = async (userData) => {
    const result = await registerAthleteService(userData);
    refreshUsers();
    setAuthSession(result.session);
    switchUser(result.user);
    await ensureAnonymousAuth();
    return result;
  };

  /**
   * Inicio de sesión multi-usuario:
   * Valida criptográficamente las credenciales autorizadas del atleta y sincroniza con Firebase
   */
  const loginAthlete = async (email, password, selectedUser = null) => {
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
    refreshUsers();
    setAuthSession(vaultResult.session);
    switchUser(vaultResult.user);
    if (vaultResult.householdId) {
      changeHouseholdId(vaultResult.householdId);
    }
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
  const currentAthletes = allUsers || DEFAULT_USERS;

  // Aislamiento estricto: Si es el hogar de Dionicio y Paula, ven a ambos atletas.
  // Si es un usuario independiente en cuenta privada, solo ve su propio perfil en allUsers y en la UI.
  const householdAthletes = isDuoHousehold
    ? { dionicio: currentAthletes.dionicio || DEFAULT_USERS.dionicio, paula: currentAthletes.paula || DEFAULT_USERS.paula }
    : (currentAthletes[currentUser] ? { [currentUser]: currentAthletes[currentUser] } : { [currentUser]: { uid: currentUser, name: 'Atleta' } });

  const userProfile = householdAthletes[currentUser] || currentAthletes[currentUser] || Object.values(householdAthletes)[0];

  const value = {
    currentUser,
    userProfile,
    allUsers: householdAthletes,
    globalUsers: currentAthletes,
    isDuoHousehold,
    switchUser,
    refreshUsers,
    registerAthlete,
    sendRecoveryOtp,
    verifyOtpAndResetPassword,
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