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
import { INITIAL_HISTORICAL_NUTRITION_LOGS } from '../data/nutritionHistoryData.js';
import { getLocalDateString } from '../utils/dateUtils.js';

const LOCAL_STORAGE_KEY = 'fitness_duo_firebase_config';
const LOCAL_STORAGE_LOGS_KEY = 'fitness_duo_logs_prod';
const LOCAL_STORAGE_WEIGHT_KEY = 'fitness_duo_weight_prod';
const LOCAL_STORAGE_PANTRY_KEY = 'fitness_duo_pantry_items';
const LOCAL_STORAGE_MENU_KEY = 'fitness_duo_weekly_menu';
const LOCAL_STORAGE_NUTRITION_KEY = 'fitness_duo_nutrition_prod';

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading firebase config from localStorage', e);
  }
  return {
    apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyBuG-PiHWwQ8lLqVh5NTkruaPru_G1Ta0E',
    authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'fitness-app-e7a59.firebaseapp.com',
    projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'fitness-app-e7a59',
    storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'fitness-app-e7a59.firebasestorage.app',
    messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '265722878411',
    appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '1:265722878411:web:31aa1ba0945ec9d3bf3e4e',
    measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || 'G-PNX5P04F3Q',
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

export function notifyConnectionChange(status) {
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

// ==========================================
// Nutrition Logs (Diario Nutricional & Calorías)
// ==========================================
// Nutrition Logs (Diario Nutricional & Calorías)
// ==========================================

const LOCAL_STORAGE_DELETED_NUTRITION_KEY = 'fitness_duo_deleted_nutrition_ids';
const nutritionSubscribers = new Set();

export function getDeletedNutritionLogIds(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_DELETED_NUTRITION_KEY}_${householdId}`);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

export function markNutritionLogAsDeleted(logId, householdId = 'hogar-dionicio-paula') {
  try {
    const deleted = getDeletedNutritionLogIds(householdId);
    deleted.add(logId);
    localStorage.setItem(`${LOCAL_STORAGE_DELETED_NUTRITION_KEY}_${householdId}`, JSON.stringify(Array.from(deleted)));
  } catch (e) {}
}

export function notifyNutritionSubscribers(householdId = 'hogar-dionicio-paula') {
  const currentLogs = getLocalNutritionLogs(householdId);
  nutritionSubscribers.forEach(cb => {
    try { cb(currentLogs); } catch (e) {}
  });
}

export function getLocalNutritionLogs(householdId = 'hogar-dionicio-paula') {
  let stored = [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_NUTRITION_KEY}_${householdId}`);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local nutrition logs', e);
  }

  const deletedIds = getDeletedNutritionLogIds(householdId);

  // Fusionar registros históricos verificados con logs personalizados excluyendo eliminados
  const mergedMap = new Map();
  if (householdId === 'hogar-dionicio-paula' && Array.isArray(INITIAL_HISTORICAL_NUTRITION_LOGS)) {
    INITIAL_HISTORICAL_NUTRITION_LOGS.forEach(log => {
      if (!deletedIds.has(log.id)) {
        mergedMap.set(log.id, log);
      }
    });
  }
  const localToday = getLocalDateString();
  if (Array.isArray(stored)) {
    stored.forEach(log => {
      if (!deletedIds.has(log.id)) {
        // Corrección de registros guardados durante el desfase UTC de medianoche
        if (log.timestamp && log.date && log.date > localToday) {
          const actualLocalDate = getLocalDateString(log.timestamp);
          if (actualLocalDate <= localToday) {
            log.date = actualLocalDate;
          }
        }
        mergedMap.set(log.id, log);
      }
    });
  }

  // Deduplicación inteligente: evitar comidas idénticas en el mismo atleta, fecha y tipo con calorías similares
  const seenFingerprints = new Map();
  const sorted = Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
    const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
    return timeB - timeA;
  });

  const deduplicated = [];
  for (const item of sorted) {
    const dateStr = item.date || getLocalDateString(item.timestamp || Date.now());
    const userStr = item.userId || 'dionicio';
    const mType = (item.mealType || item.mealName || '').toLowerCase().replace(/[^a-z]/g, '');
    const calBucket = Math.round((Number(item.caloriesKcal) || 0) / 25);
    const fingerprint = `${userStr}_${dateStr}_${mType}_${calBucket}`;

    if (seenFingerprints.has(fingerprint)) {
      continue;
    }
    seenFingerprints.set(fingerprint, item.id);
    deduplicated.push(item);
  }

  return deduplicated;
}

export function saveLocalNutritionLogs(logs, householdId = 'hogar-dionicio-paula') {
  localStorage.setItem(`${LOCAL_STORAGE_NUTRITION_KEY}_${householdId}`, JSON.stringify(logs));
}

export async function saveNutritionLog(nutritionData, householdId = 'hogar-dionicio-paula') {
  const newEntry = {
    ...nutritionData,
    id: nutritionData.id || `nutri-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: nutritionData.date || getLocalDateString(nutritionData.timestamp || Date.now()),
    timestamp: nutritionData.timestamp || Date.now(),
    caloriesKcal: Number(nutritionData.caloriesKcal) || 0,
    proteinG: Number(nutritionData.proteinG) || 0,
    carbsG: Number(nutritionData.carbsG) || 0,
    fatsG: Number(nutritionData.fatsG) || 0,
  };

  // 1. Guardar de forma inmediata en local cache (inmune a fallos de red/permisos)
  const allEntries = getLocalNutritionLogs(householdId);
  const existingIdx = allEntries.findIndex(e => e.id === newEntry.id);
  if (existingIdx >= 0) {
    allEntries[existingIdx] = newEntry;
  } else {
    allEntries.unshift(newEntry);
  }
  saveLocalNutritionLogs(allEntries, householdId);
  notifyNutritionSubscribers(householdId);

  // 2. Persistir en Firestore Cloud
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'members', newEntry.userId, 'nutrition_logs', newEntry.id);
      await setDoc(docRef, newEntry, { merge: true });
      notifyConnectionChange(true);
      console.log('🥗 [Firestore Cloud] Ingesta nutricional guardada:', newEntry.id);
    } catch (e) {
      console.warn('⚠️ Error guardando nutrición en Firestore Cloud:', e);
      notifyConnectionChange(false);
    }
  }

  return newEntry;
}

export async function deleteNutritionLog(logId, userId, householdId = 'hogar-dionicio-paula') {
  // 1. Marcar persistentemente como eliminado para que nunca resucite
  markNutritionLogAsDeleted(logId, householdId);

  // 2. Filtrar de localStorage
  let stored = [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_NUTRITION_KEY}_${householdId}`);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}
  const filteredStored = stored.filter(e => e.id !== logId);
  saveLocalNutritionLogs(filteredStored, householdId);

  // 3. Notificar inmediatamente a observadores de la interfaz
  notifyNutritionSubscribers(householdId);

  // 4. Eliminar de Firestore Cloud si hay conexión
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'members', userId, 'nutrition_logs', logId);
      await deleteDoc(docRef);
      console.log('🗑️ [Firestore Cloud] Ingesta eliminada:', logId);
    } catch (e) {
      console.warn('⚠️ Error eliminando nutrición en Firestore Cloud:', e);
    }
  }

  return getLocalNutritionLogs(householdId);
}

export function subscribeToNutritionLogs(householdId = 'hogar-dionicio-paula', onUpdate) {
  // Suscribir callback local para cambios inmediatos (guardar, borrar, deduplicar)
  nutritionSubscribers.add(onUpdate);

  // Notificar estado local inicial de inmediato
  const initial = getLocalNutritionLogs(householdId);
  onUpdate(initial);

  if (!db || !isInitialized) {
    return () => {
      nutritionSubscribers.delete(onUpdate);
    };
  }

  const isDuoHousehold = householdId === 'hogar-dionicio-paula';
  const privateMemberUid = householdId.startsWith('privado_') ? householdId.replace('privado_', '') : householdId;

  let memberLogs = [];
  let logsDionicio = [];
  let logsPaula = [];

  const mergeAndEmit = () => {
    const deletedIds = getDeletedNutritionLogIds(householdId);
    const mergedMap = new Map();
    if (isDuoHousehold && Array.isArray(INITIAL_HISTORICAL_NUTRITION_LOGS)) {
      INITIAL_HISTORICAL_NUTRITION_LOGS.forEach(log => {
        if (!deletedIds.has(log.id)) mergedMap.set(log.id, log);
      });
    }

    if (isDuoHousehold) {
      [...logsDionicio, ...logsPaula].forEach(log => {
        if (!deletedIds.has(log.id)) mergedMap.set(log.id, log);
      });
    } else {
      memberLogs.forEach(log => {
        if (!deletedIds.has(log.id)) mergedMap.set(log.id, log);
      });
    }

    const combined = Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });
    saveLocalNutritionLogs(combined, householdId);
    notifyNutritionSubscribers(householdId);
  };

  try {
    if (isDuoHousehold) {
      const unsubD = onSnapshot(
        collection(db, 'households', householdId, 'members', 'dionicio', 'nutrition_logs'),
        (snap) => {
          logsDionicio = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeAndEmit();
        },
        (err) => console.warn('Nutrition listener Dionicio notice:', err.message)
      );

      const unsubP = onSnapshot(
        collection(db, 'households', householdId, 'members', 'paula', 'nutrition_logs'),
        (snap) => {
          logsPaula = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeAndEmit();
        },
        (err) => console.warn('Nutrition listener Paula notice:', err.message)
      );

      return () => {
        nutritionSubscribers.delete(onUpdate);
        unsubD();
        unsubP();
      };
    } else {
      const unsubMember = onSnapshot(
        collection(db, 'households', householdId, 'members', privateMemberUid, 'nutrition_logs'),
        (snap) => {
          memberLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeAndEmit();
        },
        (err) => console.warn(`Nutrition listener ${privateMemberUid} notice:`, err.message)
      );

      return () => {
        nutritionSubscribers.delete(onUpdate);
        unsubMember();
      };
    }
  } catch (err) {
    return () => {
      nutritionSubscribers.delete(onUpdate);
    };
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

// Test en vivo de permisos de Firestore Cloud
export async function testFirestorePermissions(householdId = 'hogar-dionicio-paula') {
  if (!db || !isInitialized) {
    return { ok: false, error: 'Firebase Firestore no está inicializado o la API Key no es válida.' };
  }

  try {
    await ensureAnonymousAuth();
    const testDocRef = doc(db, 'households', householdId, '_diagnostics', 'test_ping');
    await setDoc(testDocRef, { ping: Date.now(), client: 'fitness-duo-app' }, { merge: true });
    return { ok: true, message: '¡Conexión y permisos verificados con éxito en Firestore Cloud!' };
  } catch (err) {
    console.error('Error al probar permisos Firestore:', err);
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
      return {
        ok: false,
        isPermissionError: true,
        error: 'Permiso denegado (Missing or insufficient permissions). Las reglas de seguridad en Firebase Console de Google Cloud bloquearon la escritura. Debes publicar las reglas para el household.'
      };
    }
    return { ok: false, isPermissionError: false, error: err.message };
  }
}

// Migration Helper: Upload all local data to Cloud Firestore
export async function syncLocalDataToFirestore(householdId = 'hogar-dionicio-paula') {
  if (!db || !isInitialized) {
    throw new Error('Firebase Firestore no está inicializado.');
  }

  try {
    await ensureAnonymousAuth();
  } catch (e) {
    console.warn('Anonymous auth notice en sync:', e);
  }

  let uploadedLogs = 0;
  let uploadedWeights = 0;
  let uploadedNutrition = 0;

  try {
    // 1. Logs de fuerza y trotadora
    const localLogs = getLocalLogs(householdId);
    for (const log of localLogs) {
      if (log && log.userId) {
        const docRef = doc(db, 'households', householdId, 'members', log.userId, 'logs', log.id || `log-${Date.now()}`);
        await setDoc(docRef, log, { merge: true });
        uploadedLogs++;
      }
    }

    // 2. Pesos y medidas corporales
    const localWeights = getLocalWeightEntries(householdId);
    for (const w of localWeights) {
      if (w && w.userId) {
        const docRef = doc(db, 'households', householdId, 'members', w.userId, 'bodyweight', w.id || `w-${Date.now()}`);
        await setDoc(docRef, w, { merge: true });
        uploadedWeights++;
      }
    }

    // 3. Diario Nutricional y conteo de calorías
    const localNutrition = getLocalNutritionLogs(householdId);
    for (const n of localNutrition) {
      if (n && n.userId) {
        const docRef = doc(db, 'households', householdId, 'members', n.userId, 'nutrition_logs', n.id || `nutri-${Date.now()}`);
        await setDoc(docRef, n, { merge: true });
        uploadedNutrition++;
      }
    }

    // 4. Despensa
    try {
      const savedPantry = localStorage.getItem(LOCAL_STORAGE_PANTRY_KEY);
      if (savedPantry) {
        await saveCloudPantryItems(JSON.parse(savedPantry), householdId);
      }
    } catch (e) {}

    // 5. Menú
    try {
      const savedMenu = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
      if (savedMenu) {
        await saveCloudWeeklyMenu(JSON.parse(savedMenu), householdId);
      }
    } catch (e) {}

    notifyConnectionChange(true);
    return { uploadedLogs, uploadedWeights, uploadedNutrition };
  } catch (err) {
    if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
      const permError = new Error('Permisos insuficientes en Firebase: Revisa en la consola de Firebase > Firestore Database > Reglas (Rules) que esté permitida la lectura/escritura para hogar-dionicio-paula.');
      permError.code = 'permission-denied';
      throw permError;
    }
    throw err;
  }
}


// Real-time Firestore Listener for Household Sync (Dionicio & Paula)
export function subscribeToHouseholdData(householdId, onLogsUpdate, onWeightsUpdate) {
  if (!db || !isInitialized) {
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    notifyConnectionChange(false);
    return () => {};
  }

  const isDuoHousehold = householdId === 'hogar-dionicio-paula';
  const privateMemberUid = householdId.startsWith('privado_') ? householdId.replace('privado_', '') : householdId;

  let memberLogs = [];
  let memberWeights = [];
  let logsDionicio = [];
  let logsPaula = [];
  let weightsDionicio = [];
  let weightsPaula = [];

  const updateCombinedLogs = () => {
    const combined = isDuoHousehold
      ? [...logsDionicio, ...logsPaula].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      : [...memberLogs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    saveLocalLogs(combined, householdId);
    onLogsUpdate(combined);
  };

  const updateCombinedWeights = () => {
    const combined = isDuoHousehold
      ? [...weightsDionicio, ...weightsPaula].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      : [...memberWeights].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    saveLocalWeightEntries(combined, householdId);
    onWeightsUpdate(combined);
  };

  // Initial load from local cache while cloud listeners connect
  const initialLocalLogs = getLocalLogs(householdId);
  const initialLocalWeights = getLocalWeightEntries(householdId);
  if (initialLocalLogs.length > 0) onLogsUpdate(initialLocalLogs);
  if (initialLocalWeights.length > 0) onWeightsUpdate(initialLocalWeights);

  try {
    if (isDuoHousehold) {
      // Listen to Dionicio's logs in Firestore
      const unsubLogsD = onSnapshot(
        collection(db, 'households', householdId, 'members', 'dionicio', 'logs'),
        (snap) => {
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
    } else {
      // Listener privado aislado para el miembro único de este hogar
      const unsubLogs = onSnapshot(
        collection(db, 'households', householdId, 'members', privateMemberUid, 'logs'),
        (snap) => {
          memberLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          notifyConnectionChange(true);
          updateCombinedLogs();
        },
        (err) => {
          console.warn(`Firestore listener ${privateMemberUid} logs notice:`, err);
          notifyConnectionChange(false);
        }
      );

      const unsubWeight = onSnapshot(
        collection(db, 'households', householdId, 'members', privateMemberUid, 'bodyweight'),
        (snap) => {
          memberWeights = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          updateCombinedWeights();
        },
        (err) => console.warn(`Firestore listener ${privateMemberUid} weight notice:`, err)
      );

      return () => {
        unsubLogs();
        unsubWeight();
      };
    }
  } catch (err) {
    console.warn('Subscription error, using local fallback:', err);
    notifyConnectionChange(false);
    onLogsUpdate(getLocalLogs(householdId));
    onWeightsUpdate(getLocalWeightEntries(householdId));
    return () => {};
  }
}

