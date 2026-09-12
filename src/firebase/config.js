// Firebase Client Configuration with dynamic localStorage support and fallback
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
const LOCAL_STORAGE_LOGS_KEY = 'fitness_duo_local_logs';
const LOCAL_STORAGE_WEIGHT_KEY = 'fitness_duo_local_weight';

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
      console.warn('Firebase initialization error, running in local fallback mode:', err);
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

// Local Fallback Storage Helpers (Ensures 100% functionality before or during Firebase setup)
export function getLocalLogs(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local logs', e);
  }
  
  // Seed with realistic demo logs if empty
  const defaultLogs = [
    {
      id: 'demo-1',
      userId: 'dionicio',
      date: '2026-09-08',
      timestamp: Date.now() - 4 * 86400000,
      type: 'strength',
      dayType: 'torso',
      exerciseId: 'floor_press',
      exerciseName: 'Floor press con mancuernas',
      sets: [
        { setNumber: 1, weightKg: 16, reps: 12, rpe: 7.5 },
        { setNumber: 2, weightKg: 18, reps: 10, rpe: 8 },
        { setNumber: 3, weightKg: 18, reps: 9, rpe: 8.5 }
      ],
      totalVolumeKg: 534,
      notes: 'Buena técnica, codos a 45 grados'
    },
    {
      id: 'demo-2',
      userId: 'paula',
      date: '2026-09-08',
      timestamp: Date.now() - 4 * 86400000,
      type: 'treadmill',
      durationMinutes: 25,
      incline: 10,
      avgSpeedKmH: 5.0,
      avgHeartRateBpm: 138,
      activeCaloriesKcal: 195,
      notes: 'Ritmo constante sin fatiga lumbar'
    },
    {
      id: 'demo-3',
      userId: 'paula',
      date: '2026-09-08',
      timestamp: Date.now() - 4 * 86400000,
      type: 'strength',
      dayType: 'torso',
      exerciseId: 'floor_press',
      exerciseName: 'Floor press con mancuernas',
      sets: [
        { setNumber: 1, weightKg: 6, reps: 12, rpe: 7 },
        { setNumber: 2, weightKg: 8, reps: 10, rpe: 8 },
        { setNumber: 3, weightKg: 8, reps: 10, rpe: 8.5 }
      ],
      totalVolumeKg: 232,
      notes: 'Sintió buena activación pectoral'
    },
    {
      id: 'demo-4',
      userId: 'dionicio',
      date: '2026-09-08',
      timestamp: Date.now() - 4 * 86400000,
      type: 'treadmill',
      durationMinutes: 25,
      incline: 11,
      avgSpeedKmH: 5.2,
      avgHeartRateBpm: 144,
      activeCaloriesKcal: 220,
      notes: 'Bloque de inclinación 11 completado'
    },
    {
      id: 'demo-5',
      userId: 'dionicio',
      date: '2026-09-10',
      timestamp: Date.now() - 2 * 86400000,
      type: 'strength',
      dayType: 'pierna_core',
      exerciseId: 'goblet_squat',
      exerciseName: 'Goblet squat (Sentadilla con copa)',
      sets: [
        { setNumber: 1, weightKg: 18, reps: 12, rpe: 8 },
        { setNumber: 2, weightKg: 20, reps: 10, rpe: 8.5 },
        { setNumber: 3, weightKg: 20, reps: 10, rpe: 9 }
      ],
      totalVolumeKg: 616,
      notes: 'Bajada controlada en 3s'
    },
    {
      id: 'demo-6',
      userId: 'paula',
      date: '2026-09-10',
      timestamp: Date.now() - 2 * 86400000,
      type: 'strength',
      dayType: 'pierna_core',
      exerciseId: 'goblet_squat',
      exerciseName: 'Goblet squat (Sentadilla con copa)',
      sets: [
        { setNumber: 1, weightKg: 8, reps: 12, rpe: 7.5 },
        { setNumber: 2, weightKg: 10, reps: 10, rpe: 8 },
        { setNumber: 3, weightKg: 10, reps: 10, rpe: 8 }
      ],
      totalVolumeKg: 276,
      notes: 'Excelente profundidad'
    }
  ];
  saveLocalLogs(defaultLogs, householdId);
  return defaultLogs;
}

export function saveLocalLogs(logs, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_LOGS_KEY}_${householdId}`, JSON.stringify(logs));
}

export function saveWorkoutLog(logData, householdId = 'hogar-dionicio-paula') {
  const allLogs = getLocalLogs(householdId);
  const newLog = {
    ...logData,
    id: logData.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: logData.timestamp || Date.now(),
  };
  allLogs.unshift(newLog);
  saveLocalLogs(allLogs, householdId);

  // If live Firebase is configured, push to Firestore
  if (db && isInitialized) {
    try {
      const docRef = doc(db, 'households', householdId, 'members', newLog.userId, 'logs', newLog.id);
      setDoc(docRef, newLog, { merge: true }).catch(err => {
        console.warn('Firestore sync background notice:', err);
      });
    } catch (e) {
      console.warn('Firestore write failed, stored locally:', e);
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
  const defaultWeights = [
    { id: 'w1', userId: 'dionicio', date: '2026-08-20', weightKg: 84.5 },
    { id: 'w2', userId: 'dionicio', date: '2026-08-27', weightKg: 84.0 },
    { id: 'w3', userId: 'dionicio', date: '2026-09-03', weightKg: 83.6 },
    { id: 'w4', userId: 'dionicio', date: '2026-09-10', weightKg: 83.2 },
    { id: 'w5', userId: 'paula', date: '2026-08-20', weightKg: 62.0 },
    { id: 'w6', userId: 'paula', date: '2026-08-27', weightKg: 61.6 },
    { id: 'w7', userId: 'paula', date: '2026-09-03', weightKg: 61.2 },
    { id: 'w8', userId: 'paula', date: '2026-09-10', weightKg: 60.8 },
  ];
  saveLocalWeightEntries(defaultWeights, householdId);
  return defaultWeights;
}

export function saveLocalWeightEntries(weights, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_WEIGHT_KEY}_${householdId}`, JSON.stringify(weights));
}
