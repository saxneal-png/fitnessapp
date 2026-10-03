import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isInitialized, ensureAnonymousAuth, notifyConnectionChange } from '../firebase/config.js';

const LOCAL_MEAL_SETTINGS_KEY = 'fitness_duo_meal_settings';

export const DEFAULT_CHILE_MEAL_CONFIG = {
  region: 'chile',
  structureName: 'Horario Chileno Tradicional (Desayuno • Almuerzo • Once)',
  includeCena: false, // En Chile no se cena habitualmente
  includeOnce: true,  // Se toma Once o Once-Comida
  includeSnack: false, // Colaciones opcionales
  meals: [
    {
      id: 'desayuno',
      name: 'Desayuno',
      defaultTime: '08:00',
      calorieSharePct: 25, // 25% del total diario
      description: 'Pan marraqueta o avena, proteína magra (pollo/huevos) y café con alulosa.',
      enabled: true
    },
    {
      id: 'almuerzo',
      name: 'Almuerzo',
      defaultTime: '13:30',
      calorieSharePct: 45, // 45% del total diario (comida principal)
      description: 'Proteína (pollo, salmón, merluza o atún), carbohidrato complejo (arroz o papas) y verduras abundantes.',
      enabled: true
    },
    {
      id: 'once',
      name: 'Once / Once-Comida (Post-Entreno)',
      defaultTime: '20:00',
      calorieSharePct: 30, // 30% del total diario
      description: 'Cierre del día tras el entrenamiento de 19:00 a 20:00. Marraqueta, huevos, palta o salteado con despensa.',
      enabled: true
    },
    {
      id: 'snack',
      name: 'Colación / Snack',
      defaultTime: '11:00',
      calorieSharePct: 0,
      description: 'Colación ligera si el apetito o horario de oficina lo requiere.',
      enabled: false
    },
    {
      id: 'cena',
      name: 'Cena Tradicional',
      defaultTime: '21:30',
      calorieSharePct: 0,
      description: 'Desactivada por defecto (en Chile se toma Once).',
      enabled: false
    }
  ]
};

export function getLocalMealSettings(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_MEAL_SETTINGS_KEY}_${householdId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.meals)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error cargando configuración de comidas:', e);
  }
  return DEFAULT_CHILE_MEAL_CONFIG;
}

export function saveLocalMealSettings(settings, householdId = 'hogar-dionicio-paula') {
  try {
    localStorage.setItem(`${LOCAL_MEAL_SETTINGS_KEY}_${householdId}`, JSON.stringify(settings));
  } catch (e) {
    console.error('Error guardando configuración local de comidas:', e);
  }
}

export async function saveMealSettingsToCloud(settings, householdId = 'hogar-dionicio-paula') {
  saveLocalMealSettings(settings, householdId);

  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'settings', 'meals_config');
      await setDoc(docRef, { ...settings, updatedAt: Date.now() }, { merge: true });
      notifyConnectionChange(true);
      console.log('🇨🇱 [Configuración Comidas] Guardada en Firestore Cloud para el hogar.');
    } catch (e) {
      console.warn('⚠️ Error guardando configuración de comidas en Firestore Cloud:', e);
    }
  }

  return settings;
}

export function subscribeToMealSettings(householdId = 'hogar-dionicio-paula', onUpdate) {
  const initial = getLocalMealSettings(householdId);
  onUpdate(initial);

  if (!db || !isInitialized) {
    return () => {};
  }

  try {
    const unsub = onSnapshot(
      doc(db, 'households', householdId, 'settings', 'meals_config'),
      (snap) => {
        if (snap.exists() && snap.data()) {
          const cloudConfig = snap.data();
          if (Array.isArray(cloudConfig.meals)) {
            saveLocalMealSettings(cloudConfig, householdId);
            onUpdate(cloudConfig);
          }
        }
      },
      (err) => console.warn('Meal settings listener notice:', err)
    );
    return unsub;
  } catch (e) {
    return () => {};
  }
}
