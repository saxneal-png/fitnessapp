// Firebase Client Configuration & Production Firestore Sync
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot 
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'fitness_duo_firebase_config';
const LOCAL_STORAGE_LOGS_KEY = 'fitness_duo_logs_prod';
const LOCAL_STORAGE_WEIGHT_KEY = 'fitness_duo_weight_prod';

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
      isInitialized = true;
    } catch (err) {
      console.warn('Firebase initialization notice:', err);
      isInitialized = false;
    }
  } else {
    isInitialized = false;
  }
  return { app, auth, db, isInitialized };
}

// Initial attempt
initFirebase();

export { app, auth, db, isInitialized };

// Clean Production Storage Helpers (Starts at 0 / Clean Slate)
export function getLocalLogs(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local logs', e);
  }
  return []; // Clean slate for real production
}

export function saveLocalLogs(logs, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`, JSON.stringify(logs));
}

export function clearProductionData(householdId = 'hogar-dionicio-paula') {
  localStorage.removeItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`);
  localStorage.removeItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`);
  // Also clean any legacy keys
  localStorage.removeItem(`fitness_duo_local_logs_${householdId}`);
  localStorage.removeItem(`fitness_duo_local_weight_${householdId}`);
}

export async function saveWorkoutLog(logData, householdId = 'hogar-dionicio-paula') {
  const allLogs = getLocalLogs(householdId);
  const newLog = {
    ...logData,
    id: logData.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: logData.timestamp || Date.now(),
  };
  allLogs.unshift(newLog);
  saveLocalLogs(allLogs, householdId);

  // If live Firebase is configured, write to Firestore
  if (db && isInitialized) {
    try {
      const docRef = doc(db, 'households', householdId, 'members', newLog.userId, 'logs', newLog.id);
      await setDoc(docRef, newLog, { merge: true });
    } catch (e) {
      console.warn('Firestore sync notice:', e);
    }
  }

  return newLog;
}

export function getLocalWeightEntries(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local weight', e);
  }
  return []; // Clean slate for real production
}

export async function saveWeightEntry(weightData, householdId = 'hogar-dionicio-paula') {
  const allWeights = getLocalWeightEntries(householdId);
  const newEntry = {
    ...weightData,
    id: weightData.id || `w-${Date.now()}`,
    timestamp: Date.now(),
  };
  allWeights.unshift(newEntry);
  saveLocalWeightEntries(allWeights, householdId);

  if (db && isInitialized) {
    try {
      const docRef = doc(db, 'households', householdId, 'members', newEntry.userId, 'bodyweight', newEntry.id);
      await setDoc(docRef, newEntry, { merge: true });
    } catch (e) {
      console.warn('Firestore weight sync notice:', e);
    }
  }
  return newEntry;
}

export function saveLocalWeightEntries(weights, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`, JSON.stringify(weights));
}

// Real-time Firestore Listener for Household Sync
export function subscribeToHouseholdData(householdId, onLogsUpdate, onWeightsUpdate) {
  if (!db || !isInitialized) {
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    return () => {};
  }

  let logsDionicio = [];
  let logsPaula = [];
  let weightsDionicio = [];
  let weightsPaula = [];

  const updateCombinedLogs = () => {
    const combined = [...logsDionicio, ...logsPaula].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (combined.length > 0) {
      saveLocalLogs(combined, householdId);
      onLogsUpdate(combined);
    } else {
      onLogsUpdate(getLocalLogs(householdId));
    }
  };

  const updateCombinedWeights = () => {
    const combined = [...weightsDionicio, ...weightsPaula].sort((a, b) => a.date.localeCompare(b.date));
    if (combined.length > 0) {
      saveLocalWeightEntries(combined, householdId);
      onWeightsUpdate(combined);
    } else {
      onWeightsUpdate(getLocalWeightEntries(householdId));
    }
  };

  try {
    // Listen to Dionicio's logs
    const unsubLogsD = onSnapshot(
      collection(db, 'households', householdId, 'members', 'dionicio', 'logs'),
      (snap) => {
        logsDionicio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCombinedLogs();
      },
      (err) => console.warn('Firestore listener Dionicio logs notice:', err)
    );

    // Listen to Paula's logs
    const unsubLogsP = onSnapshot(
      collection(db, 'households', householdId, 'members', 'paula', 'logs'),
      (snap) => {
        logsPaula = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCombinedLogs();
      },
      (err) => console.warn('Firestore listener Paula logs notice:', err)
    );

    // Listen to Dionicio's weight
    const unsubWeightD = onSnapshot(
      collection(db, 'households', householdId, 'members', 'dionicio', 'bodyweight'),
      (snap) => {
        weightsDionicio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateCombinedWeights();
      },
      (err) => console.warn('Firestore listener Dionicio weight notice:', err)
    );

    // Listen to Paula's weight
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
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    return () => {};
  }
}
