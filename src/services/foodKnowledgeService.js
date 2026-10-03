import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isInitialized, ensureAnonymousAuth, notifyConnectionChange } from '../firebase/config.js';

const LOCAL_FOOD_KNOWLEDGE_KEY = 'fitness_duo_food_knowledge';

// Base de productos comerciales verificados chilenos y fitness
export const INITIAL_FOOD_CATALOG = [
  {
    id: 'loncoleche-full-pro',
    name: 'Leche Loncoleche Full Pro',
    brand: 'Loncoleche',
    keywords: ['loncoleche', 'full pro', 'leche full pro', 'loncoleche pro'],
    servingDesc: '1 vaso (200 ml)',
    servingUnit: 'ml',
    servingSize: 200,
    calories: 110,
    proteinG: 14,
    carbsG: 9,
    fatsG: 0.4,
    per100: { calories: 55, proteinG: 7.0, carbsG: 4.5, fatsG: 0.2 },
    category: 'Lácteos Proteicos',
    verified: true
  },
  {
    id: 'soprole-protein-leche',
    name: 'Leche Soprole Protein+',
    brand: 'Soprole',
    keywords: ['soprole protein', 'soprole proteina', 'protein+'],
    servingDesc: '1 vaso (200 ml)',
    servingUnit: 'ml',
    servingSize: 200,
    calories: 116,
    proteinG: 14,
    carbsG: 10,
    fatsG: 0.8,
    per100: { calories: 58, proteinG: 7.0, carbsG: 5.0, fatsG: 0.4 },
    category: 'Lácteos Proteicos',
    verified: true
  },
  {
    id: 'soprole-protein-yogurt',
    name: 'Yogurt Soprole Protein+ Pote',
    brand: 'Soprole',
    keywords: ['yogurt soprole protein', 'yogur protein+', 'yogurt protein'],
    servingDesc: '1 pote (150 g)',
    servingUnit: 'g',
    servingSize: 150,
    calories: 98,
    proteinG: 12,
    carbsG: 9,
    fatsG: 0.4,
    per100: { calories: 65, proteinG: 8.0, carbsG: 6.0, fatsG: 0.3 },
    category: 'Lácteos Proteicos',
    verified: true
  },
  {
    id: 'marraqueta-chilena',
    name: 'Marraqueta Chilena (1 Diente)',
    brand: 'Tradicional Chilena',
    keywords: ['marraqueta', 'diente de marraqueta', 'pan batido', 'pan frances'],
    servingDesc: '1 diente (media marraqueta / 55-60 g)',
    servingUnit: 'g',
    servingSize: 55,
    calories: 145,
    proteinG: 4.5,
    carbsG: 30,
    fatsG: 0.5,
    per100: { calories: 265, proteinG: 8.2, carbsG: 54.5, fatsG: 1.0 },
    category: 'Panadería',
    verified: true
  },
  {
    id: 'atun-san-jose-agua',
    name: 'Atún San José en Agua / Al Natural',
    brand: 'San José',
    keywords: ['atun san jose', 'atun al natural', 'lata de atun', 'san jose'],
    servingDesc: '1 lata drenada (110 g)',
    servingUnit: 'g',
    servingSize: 110,
    calories: 120,
    proteinG: 26,
    carbsG: 0,
    fatsG: 1.2,
    per100: { calories: 109, proteinG: 24, carbsG: 0, fatsG: 1.1 },
    category: 'Pescados y Conservas',
    verified: true
  },
  {
    id: 'whey-protein-standard',
    name: 'Proteína Whey Isolate / Concentrada',
    brand: 'Genérica / Gold Standard / Dymatize',
    keywords: ['whey', 'proteina en polvo', 'scoop de proteina', 'batido proteina'],
    servingDesc: '1 scoop (30 g)',
    servingUnit: 'g',
    servingSize: 30,
    calories: 120,
    proteinG: 24,
    carbsG: 2.5,
    fatsG: 1.2,
    per100: { calories: 400, proteinG: 80, carbsG: 8.3, fatsG: 4.0 },
    category: 'Suplementos',
    verified: true
  }
];

/**
 * Obtiene el catálogo de alimentos almacenado localmente
 */
export function getLocalFoodCatalog(householdId = 'hogar-dionicio-paula') {
  try {
    const raw = localStorage.getItem(`${LOCAL_FOOD_KNOWLEDGE_KEY}_${householdId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error cargando catalogo local de alimentos:', e);
  }
  return INITIAL_FOOD_CATALOG;
}

/**
 * Guarda el catálogo de alimentos en localStorage
 */
export function saveLocalFoodCatalog(catalog, householdId = 'hogar-dionicio-paula') {
  try {
    localStorage.setItem(`${LOCAL_FOOD_KNOWLEDGE_KEY}_${householdId}`, JSON.stringify(catalog));
  } catch (e) {
    console.error('Error guardando catalogo local de alimentos:', e);
  }
}

/**
 * Guarda o actualiza un alimento en la base de datos compartida (Firestore + LocalStorage)
 */
export async function saveFoodItemToKnowledgeBase(foodItem, householdId = 'hogar-dionicio-paula') {
  if (!foodItem || !foodItem.name) return null;

  const currentCatalog = getLocalFoodCatalog(householdId);
  const normalizedId = foodItem.id || foodItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const enrichedItem = {
    id: normalizedId,
    name: foodItem.name.trim(),
    brand: foodItem.brand?.trim() || 'Comercial',
    keywords: Array.isArray(foodItem.keywords) 
      ? foodItem.keywords.map(k => k.toLowerCase()) 
      : [foodItem.name.toLowerCase(), foodItem.brand?.toLowerCase()].filter(Boolean),
    servingDesc: foodItem.servingDesc || `${foodItem.servingSize || 100} ${foodItem.servingUnit || 'g'}`,
    servingUnit: foodItem.servingUnit || 'g',
    servingSize: Number(foodItem.servingSize) || 100,
    calories: Math.round(Number(foodItem.calories) || 0),
    proteinG: Number(Number(foodItem.proteinG || 0).toFixed(1)),
    carbsG: Number(Number(foodItem.carbsG || 0).toFixed(1)),
    fatsG: Number(Number(foodItem.fatsG || 0).toFixed(1)),
    per100: foodItem.per100 || {
      calories: Math.round(((Number(foodItem.calories) || 0) / (Number(foodItem.servingSize) || 100)) * 100),
      proteinG: Number((((Number(foodItem.proteinG) || 0) / (Number(foodItem.servingSize) || 100)) * 100).toFixed(1)),
      carbsG: Number((((Number(foodItem.carbsG) || 0) / (Number(foodItem.servingSize) || 100)) * 100).toFixed(1)),
      fatsG: Number((((Number(foodItem.fatsG) || 0) / (Number(foodItem.servingSize) || 100)) * 100).toFixed(1))
    },
    category: foodItem.category || 'Alimento Aprendido',
    verified: foodItem.verified ?? false,
    learnedAt: foodItem.learnedAt || Date.now(),
    source: foodItem.source || 'gemini_coach_ai'
  };

  const existingIdx = currentCatalog.findIndex(item => item.id === enrichedItem.id || item.name.toLowerCase() === enrichedItem.name.toLowerCase());
  let updatedCatalog;
  if (existingIdx >= 0) {
    updatedCatalog = [...currentCatalog];
    updatedCatalog[existingIdx] = { ...updatedCatalog[existingIdx], ...enrichedItem };
  } else {
    updatedCatalog = [enrichedItem, ...currentCatalog];
  }

  saveLocalFoodCatalog(updatedCatalog, householdId);

  // Sincronizar en Firestore Cloud
  if (db && isInitialized) {
    try {
      await ensureAnonymousAuth();
      const docRef = doc(db, 'households', householdId, 'food_knowledge_base', 'catalog');
      await setDoc(docRef, { items: updatedCatalog, lastUpdated: Date.now() }, { merge: true });
      notifyConnectionChange(true);
      console.log(`🧠 [Food Knowledge] Alimento guardado en la nube: "${enrichedItem.name}" (${enrichedItem.calories} kcal, ${enrichedItem.proteinG}g P)`);
    } catch (err) {
      console.warn('⚠️ No se pudo guardar alimento en Firestore Cloud:', err);
    }
  }

  return enrichedItem;
}

/**
 * Busca un alimento o marca en el catálogo inteligente
 */
export function searchFoodInKnowledgeBase(queryText, householdId = 'hogar-dionicio-paula') {
  if (!queryText) return null;
  const q = queryText.toLowerCase().trim();
  const catalog = getLocalFoodCatalog(householdId);

  // 1. Coincidencia exacta por nombre
  const exact = catalog.find(item => item.name.toLowerCase() === q);
  if (exact) return exact;

  // 2. Coincidencia por palabras clave
  const byKeyword = catalog.find(item => {
    if (item.keywords && item.keywords.some(k => q.includes(k.toLowerCase()))) return true;
    if (item.brand && q.includes(item.brand.toLowerCase())) return true;
    return false;
  });

  return byKeyword || null;
}

/**
 * Suscripción en tiempo real al catálogo de alimentos del hogar
 */
export function subscribeToFoodCatalog(householdId = 'hogar-dionicio-paula', onUpdate) {
  const initial = getLocalFoodCatalog(householdId);
  onUpdate(initial);

  if (!db || !isInitialized) {
    return () => {};
  }

  try {
    const unsub = onSnapshot(
      doc(db, 'households', householdId, 'food_knowledge_base', 'catalog'),
      (snap) => {
        if (snap.exists() && snap.data()?.items && Array.isArray(snap.data().items)) {
          const cloudItems = snap.data().items;
          // Fusionar con el catálogo inicial asegurando que no se pierdan items esenciales
          const merged = [...cloudItems];
          INITIAL_FOOD_CATALOG.forEach(initItem => {
            if (!merged.some(m => m.id === initItem.id)) {
              merged.push(initItem);
            }
          });
          saveLocalFoodCatalog(merged, householdId);
          onUpdate(merged);
        }
      },
      (err) => console.warn('Food catalog listener notice:', err)
    );
    return unsub;
  } catch (e) {
    return () => {};
  }
}
