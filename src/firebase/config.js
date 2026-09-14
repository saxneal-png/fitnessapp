// Firebase Client Configuration & Production Firestore Sync
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'fitness_duo_firebase_config';
const LOCAL_STORAGE_LOGS_KEY = 'fitness_duo_logs_prod';
const LOCAL_STORAGE_WEIGHT_KEY = 'fitness_duo_weight_prod';
const LOCAL_STORAGE_PANTRY_KEY = 'fitness_duo_pantry_items';
const LOCAL_STORAGE_MENU_KEY = 'fitness_duo_weekly_menu';

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading firebase config from localStorage', e);
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBuG-PiHWwQ8lLqVh5NTkruaPru_G1Ta0E',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fitness-app-e7a59.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fitness-app-e7a59',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fitness-app-e7a59.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '265722878411',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:265722878411:web:31aa1ba0945ec9d3bf3e4e',
  };
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}

let app = null;
let auth = null;
let db = null;
let isInitialized = false;
let isCloudOnline = false;
const connectionListeners = new Set();

function notifyConnectionChange(status) {
  isCloudOnline = status;
  connectionListeners.forEach(cb => {
    try { cb(status); } catch (e) {}
  });
}

export function subscribeToConnectionStatus(callback) {
  connectionListeners.add(callback);
  callback(isCloudOnline);
  return () => connectionListeners.delete(callback);
}

export function getCloudConnectionStatus() {
  return isCloudOnline;
}

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (config && config.apiKey && config.apiKey.length > 5) {
    try {
      if (!getApps().length) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      auth = getAuth(app);
      db = getFirestore(app);

      // Activar persistencia offline nativa de Firestore (IndexedDB)
      try {
        enableIndexedDbPersistence(db).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Persistencia Firestore: Múltiples pestañas abiertas.');
          } else if (err.code === 'unimplemented') {
            console.warn('Persistencia Firestore no soportada en este navegador.');
          }
        });
      } catch (e) {}

      isInitialized = true;
      notifyConnectionChange(true);
    } catch (err) {
      console.warn('Firebase initialization notice:', err);
      isInitialized = false;
      notifyConnectionChange(false);
    }
  } else {
    isInitialized = false;
    notifyConnectionChange(false);
  }
  return { app, auth, db, isInitialized };
}

// Initial attempt
initFirebase();

export { app, auth, db, isInitialized };

// Seamless Anonymous Auth ensuring request.auth is never null for Firestore
export async function ensureAnonymousAuth() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth fallback notice:', err);
    return null;
  }
}

// Local Storage Fallback Helpers
export function getLocalLogs(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local logs', e);
  }
  return [];
}

export function saveLocalLogs(logs, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`, JSON.stringify(logs));
}

export function clearProductionData(householdId = 'hogar-dionicio-paula') {
  localStorage.removeItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`);
  localStorage.removeItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`);
  localStorage.removeItem(`fitness_duo_local_logs_${householdId}`);
  localStorage.removeItem(`fitness_duo_local_weight_${householdId}`);
}

export function getLocalWeightEntries(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local weight', e);
  }
  return [];
}

export function saveLocalWeightEntries(weights, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`, JSON.stringify(weights));
}

// Workout Log Cloud Writer
export async function saveWorkoutLog(logData, householdId = 'hogar-dionicio-paula') {
  const newLog = {
    ...logData,
    id: logData.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: logData.timestamp || Date.now(),
  };

  // Update local cache
  const allLogs = getLocalLogs(householdId);
  const existingIdx = allLogs.findIndex(l => l.id === newLog.id);
  if (existingIdx >= 0) {
    allLogs[existingIdx] = newLog;
  } else {
    allLogs.unshift(newLog);
  }
  saveLocalLogs(allLogs, householdId);

  // Write directly to Cloud Firestore
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'members', newLog.userId, 'logs', newLog.id);
      await setDoc(docRef, newLog, { merge: true });
      notifyConnectionChange(true);
      console.log('☁️ [Firestore Cloud] Workout log guardado con éxito:', newLog.id);
    } catch (e) {
      console.warn('⚠️ Error guardando en Firestore Cloud:', e);
      notifyConnectionChange(false);
    }
  }

  return newLog;
}

// Bodyweight Cloud Writer
export async function saveWeightEntry(weightData, householdId = 'hogar-dionicio-paula') {
  const newEntry = {
    ...weightData,
    id: weightData.id || `w-${Date.now()}`,
    timestamp: Date.now(),
  };

  // Update local cache
  const allWeights = getLocalWeightEntries(householdId);
  allWeights.unshift(newEntry);
  saveLocalWeightEntries(allWeights, householdId);

  // Write directly to Cloud Firestore
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'members', newEntry.userId, 'bodyweight', newEntry.id);
      await setDoc(docRef, newEntry, { merge: true });
      notifyConnectionChange(true);
      console.log('☁️ [Firestore Cloud] Peso guardado con éxito:', newEntry.id);
    } catch (e) {
      console.warn('⚠️ Error guardando peso en Firestore Cloud:', e);
      notifyConnectionChange(false);
    }
  }
  return newEntry;
}

export async function deleteWeightEntry(entryId, userId, householdId = 'hogar-dionicio-paula') {
  // Update local cache
  const allWeights = getLocalWeightEntries(householdId).filter(w => w.id !== entryId);
  saveLocalWeightEntries(allWeights, householdId);

  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'members', userId, 'bodyweight', entryId);
      await deleteDoc(docRef);
      console.log('🗑️ [Firestore Cloud] Registro de peso/medida eliminado:', entryId);
    } catch (e) {
      console.warn('⚠️ Error eliminando peso en Firestore Cloud:', e);
    }
  }
}

// Pantry Items Cloud Sync
export async function saveCloudPantryItems(items, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(LOCAL_STORAGE_PANTRY_KEY, JSON.stringify(items));
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'pantry', 'items');
      await setDoc(docRef, { items, updatedAt: Date.now() }, { merge: true });
      notifyConnectionChange(true);
    } catch (e) {
      console.warn('⚠️ Error guardando despensa en Firestore:', e);
    }
  }
}

export function subscribeToPantryItems(householdId, onPantryUpdate) {
  if (!db || !isInitialized) {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PANTRY_KEY);
      if (saved) onPantryUpdate(JSON.parse(saved));
    } catch (e) {}
    return () => {};
  }

  try {
    const unsub = onSnapshot(
      doc(db, 'households', householdId, 'pantry', 'items'),
      (snap) => {
        if (snap.exists() && snap.data()?.items) {
          const items = snap.data().items;
          localStorage.setItem(LOCAL_STORAGE_PANTRY_KEY, JSON.stringify(items));
          onPantryUpdate(items);
        }
      },
      (err) => console.warn('Pantry listener notice:', err)
    );
    return unsub;
  } catch (err) {
    return () => {};
  }
}

// Weekly Menu Cloud Sync
export async function saveCloudWeeklyMenu(menuData, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(menuData));
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'menu', 'current');
      await setDoc(docRef, { ...menuData, updatedAt: Date.now() }, { merge: true });
      notifyConnectionChange(true);
    } catch (e) {
      console.warn('⚠️ Error guardando menú en Firestore:', e);
    }
  }
}

export function subscribeToWeeklyMenu(householdId, onMenuUpdate) {
  if (!db || !isInitialized) {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
      if (saved) onMenuUpdate(JSON.parse(saved));
    } catch (e) {}
    return () => {};
  }

  try {
    const unsub = onSnapshot(
      doc(db, 'households', householdId, 'menu', 'current'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(data));
          onMenuUpdate(data);
        }
      },
      (err) => console.warn('Menu listener notice:', err)
    );
    return unsub;
  } catch (err) {
    return () => {};
  }
}

// Migration Helper: Upload all local data to Cloud Firestore
export async function syncLocalDataToFirestore(householdId = 'hogar-dionicio-paula') {
  if (!db || !isInitialized) {
    throw new Error('Firebase Firestore no está inicializado.');
  }

  await ensureAnonymousAuth();
  let uploadedLogs = 0;
  let uploadedWeights = 0;

  const localLogs = getLocalLogs(householdId);
  for (const log of localLogs) {
    if (log && log.userId) {
      const docRef = doc(db, 'households', householdId, 'members', log.userId, 'logs', log.id || `log-${Date.now()}`);
      await setDoc(docRef, log, { merge: true });
      uploadedLogs++;
    }
  }

  const localWeights = getLocalWeightEntries(householdId);
  for (const w of localWeights) {
    if (w && w.userId) {
      const docRef = doc(db, 'households', householdId, 'members', w.userId, 'bodyweight', w.id || `w-${Date.now()}`);
      await setDoc(docRef, w, { merge: true });
      uploadedWeights++;
    }
  }

  try {
    const savedPantry = localStorage.getItem(LOCAL_STORAGE_PANTRY_KEY);
    if (savedPantry) {
      await saveCloudPantryItems(JSON.parse(savedPantry), householdId);
    }
  } catch (e) {}

  try {
    const savedMenu = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
    if (savedMenu) {
      await saveCloudWeeklyMenu(JSON.parse(savedMenu), householdId);
    }
  } catch (e) {}

  return { uploadedLogs, uploadedWeights };
}

// Real-time Firestore Listener for Household Sync (Dionicio & Paula)
export function subscribeToHouseholdData(householdId, onLogsUpdate, onWeightsUpdate) {
  if (!db || !isInitialized) {
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    notifyConnectionChange(false);
    return () => {};
  }

  let logsDionicio = [];
  let logsPaula = [];
  let weightsDionicio = [];
  let weightsPaula = [];
  let hasReceivedFirstSnapshotD = false;
  let hasReceivedFirstSnapshotP = false;

  const updateCombinedLogs = () => {
    const combined = [...logsDionicio, ...logsPaula].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    saveLocalLogs(combined, householdId);
    onLogsUpdate(combined);
  };

  const updateCombinedWeights = () => {
    const combined = [...weightsDionicio, ...weightsPaula].sort((a, b) => a.date.localeCompare(b.date));
    saveLocalWeightEntries(combined, householdId);
    onWeightsUpdate(combined);
  };

  // Initial load from local cache while cloud listeners connect
  const initialLocalLogs = getLocalLogs(householdId);
  const initialLocalWeights = getLocalWeightEntries(householdId);
  if (initialLocalLogs.length > 0) onLogsUpdate(initialLocalLogs);
  if (initialLocalWeights.length > 0) onWeightsUpdate(initialLocalWeights);

  try {
    // Listen to Dionicio's logs in Firestore
    const unsubLogsD = onSnapshot(
      collection(db, 'households', householdId, 'members', 'dionicio', 'logs'),
      (snap) => {
        hasReceivedFirstSnapshotD = true;
        logsDionicio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyConnectionChange(true);
        updateCombinedLogs();
      },
      (err) => {
        console.warn('Firestore listener Dionicio logs notice:', err);
        notifyConnectionChange(false);
      }
    );

    // Listen to Paula's logs in Firestore
    const unsubLogsP = onSnapshot(
      collection(db, 'households', householdId, 'members', 'paula', 'logs'),
      (snap) => {
        hasReceivedFirstSnapshotP = true;
        logsPaula = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        notifyConnectionChange(true);
        updateCombinedLogs();
      },
      (err) => {
        console.warn('Firestore listener Paula logs notice:', err);
        notifyConnectionChange(false);
      }
    );

    // Listen to Dionicio's weight in Firestore
    const unsubWeightD = onSnapshot(
      collection(db, 'households', householdId, 'members', 'dionicio', 'bodyweight'),
      (snap) => {
        weightsDionicio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCombinedWeights();
      },
      (err) => console.warn('Firestore listener Dionicio weight notice:', err)
    );

    // Listen to Paula's weight in Firestore
    const unsubWeightP = onSnapshot(
      collection(db, 'households', householdId, 'members', 'paula', 'bodyweight'),
      (snap) => {
        weightsPaula = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCombinedWeights();
      },
      (err) => console.warn('Firestore listener Paula weight notice:', err)
    );

    return () => {
      unsubLogsD();
      unsubLogsP();
      unsubWeightD();
      unsubWeightP();
    };
  } catch (err) {
    console.warn('Subscription error, using local fallback:', err);
    notifyConnectionChange(false);
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    return () => {};
  }
}

