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
  },
  {
    id: 'cascara-foods-protein',
    name: 'Proteína Cáscara Foods (con Magnesio)',
    brand: 'Cáscara Foods',
    keywords: ['cascara foods', 'cascara', 'proteina cascara', 'scoop cascara foods'],
    servingDesc: '1 scoop (30 g • Aporta 300 mg magnesio elemental)',
    servingUnit: 'g',
    servingSize: 30,
    calories: 100,
    proteinG: 20.0,
    carbsG: 2.5,
    fatsG: 1.0,
    per100: { calories: 333, proteinG: 66.7, carbsG: 8.3, fatsG: 3.3 },
    category: 'Suplementos',
    verified: true,
    clinicalNotes: 'Límite biológico estricto: máximo 1 scoop diario debido a su aporte de 300 mg de magnesio bioasimilable.'
  },
  {
    id: 'loncoleche-protein-plus',
    name: 'Leche Loncoleche Protein+',
    brand: 'Loncoleche',
    keywords: ['loncoleche protein', 'protein+', 'loncoleche protein+', 'leche loncoleche protein'],
    servingDesc: '1 vaso (200 ml)',
    servingUnit: 'ml',
    servingSize: 200,
    calories: 200,
    proteinG: 17.2,
    carbsG: 30.0,
    fatsG: 0.5,
    per100: { calories: 100, proteinG: 8.6, carbsG: 15.0, fatsG: 0.25 },
    category: 'Lácteos Proteicos',
    verified: true
  },
  {
    id: 'pan-amasado-aceite',
    name: 'Pan Amasado con Aceite Vegetal (Sin Manteca)',
    brand: 'Casero Saludable',
    keywords: ['pan amasado', 'pan amasado con aceite', 'amasado casero'],
    servingDesc: '1 pan mediano (~100-110 g)',
    servingUnit: 'g',
    servingSize: 105,
    calories: 330,
    proteinG: 8.0,
    carbsG: 52.0,
    fatsG: 10.0,
    per100: { calories: 314, proteinG: 7.6, carbsG: 49.5, fatsG: 9.5 },
    category: 'Panadería',
    verified: true,
    clinicalNotes: 'Elaborado con aceite vegetal en sustitución de manteca animal para mejor perfil lipídico.'
  },
  {
    id: 'posta-rosada-vacuna',
    name: 'Posta Rosada Vacuna Magra',
    brand: 'Vacuno Chileno',
    keywords: ['posta rosada', 'posta', 'carne vacuna magra', 'carne molida posta'],
    servingDesc: '1 porción cocida (150 g)',
    servingUnit: 'g',
    servingSize: 150,
    calories: 240,
    proteinG: 45.0,
    carbsG: 0,
    fatsG: 6.8,
    per100: { calories: 160, proteinG: 30.0, carbsG: 0, fatsG: 4.5 },
    category: 'Carnes Magras',
    verified: true
  },
  {
    id: 'pollo-ganso-cocido',
    name: 'Pollo Ganso Cocido Vacuno Magro',
    brand: 'Vacuno Tradicional',
    keywords: ['pollo ganso', 'pollo ganso cocido', 'carne pollo ganso'],
    servingDesc: '1 porción cocida (150 g)',
    servingUnit: 'g',
    servingSize: 150,
    calories: 290,
    proteinG: 46.5,
    carbsG: 0,
    fatsG: 9.8,
    per100: { calories: 195, proteinG: 31.0, carbsG: 0, fatsG: 6.5 },
    category: 'Carnes Magras',
    verified: true
  },
  {
    id: 'sardinas-al-agua-coliseo',
    name: 'Sardinas al Agua Drenadas (Coliseo)',
    brand: 'Coliseo',
    keywords: ['sardinas', 'sardinas al agua', 'sardina', 'sardinas coliseo'],
    servingDesc: '1 lata drenada (~100 g)',
    servingUnit: 'g',
    servingSize: 100,
    calories: 130,
    proteinG: 20.0,
    carbsG: 0,
    fatsG: 4.0,
    per100: { calories: 130, proteinG: 20.0, carbsG: 0, fatsG: 4.0 },
    category: 'Pescados y Conservas',
    verified: true
  },
  {
    id: 'queso-gauda-frutillar',
    name: 'Queso Gauda Frutillar',
    brand: 'Frutillar / Lácteos del Sur',
    keywords: ['queso gauda', 'gauda frutillar', 'gauda', 'laminas queso'],
    servingDesc: '2 láminas (~40 g)',
    servingUnit: 'g',
    servingSize: 40,
    calories: 145,
    proteinG: 10.0,
    carbsG: 0.5,
    fatsG: 12.0,
    per100: { calories: 362, proteinG: 25.0, carbsG: 1.2, fatsG: 30.0 },
    category: 'Lácteos',
    verified: true
  },
  {
    id: 'yogurt-griego-quillayes',
    name: 'Yogurt Griego Quillayes Proteico',
    brand: 'Quillayes',
    keywords: ['quillayes', 'yogurt quillayes', 'griego quillayes', 'yogur proteico quillayes'],
    servingDesc: '1 porción (80 g)',
    servingUnit: 'g',
    servingSize: 80,
    calories: 65,
    proteinG: 8.5,
    carbsG: 3.5,
    fatsG: 2.0,
    per100: { calories: 81, proteinG: 10.6, carbsG: 4.4, fatsG: 2.5 },
    category: 'Lácteos Proteicos',
    verified: true
  },
  {
    id: 'anticucho-posta-cerdo',
    name: 'Anticucho de Posta de Cerdo Magra',
    brand: 'Casero Parrillero',
    keywords: ['anticucho', 'anticuchos', 'posta de cerdo', 'anticucho de cerdo'],
    servingDesc: '1 anticucho grande (~100 g carne magra)',
    servingUnit: 'g',
    servingSize: 100,
    calories: 160,
    proteinG: 28.0,
    carbsG: 0,
    fatsG: 5.0,
    per100: { calories: 160, proteinG: 28.0, carbsG: 0, fatsG: 5.0 },
    category: 'Carnes Magras',
    verified: true
  },
  {
    id: 'longaniza-casera-artesanal',
    name: 'Longaniza Casera Artesanal (Consumo en Almuerzo)',
    brand: 'Tradicional',
    keywords: ['longaniza', 'longaniza casera', 'trozo longaniza'],
    servingDesc: '1 trozo mediano (~10 cm / 60 g)',
    servingUnit: 'g',
    servingSize: 60,
    calories: 215,
    proteinG: 12.0,
    carbsG: 1.0,
    fatsG: 18.0,
    per100: { calories: 358, proteinG: 20.0, carbsG: 1.6, fatsG: 30.0 },
    category: 'Carnes y Embutidos',
    verified: true,
    clinicalNotes: 'Regla clínica digestiva: Ingerir preferentemente al almuerzo para asegurar vaciamiento gástrico completo y evitar reflujo nocturno en la once.'
  },
  {
    id: 'salmon-plancha',
    name: 'Salmón a la Plancha (Omega-3)',
    brand: 'Pescado Fresco',
    keywords: ['salmon', 'salmon a la plancha', 'filete salmon'],
    servingDesc: '1 porción cocida (100 g)',
    servingUnit: 'g',
    servingSize: 100,
    calories: 200,
    proteinG: 22.0,
    carbsG: 0,
    fatsG: 12.0,
    per100: { calories: 200, proteinG: 22.0, carbsG: 0, fatsG: 12.0 },
    category: 'Pescados y Conservas',
    verified: true
  },
  {
    id: 'merluza-plancha',
    name: 'Merluza a la Plancha (Pescado Blanco Magro)',
    brand: 'Pescado Fresco',
    keywords: ['merluza', 'merluza a la plancha', 'pescado blanco'],
    servingDesc: '1 porción cocida (100 g)',
    servingUnit: 'g',
    servingSize: 100,
    calories: 85,
    proteinG: 18.0,
    carbsG: 0,
    fatsG: 1.5,
    per100: { calories: 85, proteinG: 18.0, carbsG: 0, fatsG: 1.5 },
    category: 'Pescados y Conservas',
    verified: true
  },
  {
    id: 'zapallo-italiano-cocido',
    name: 'Zapallo Italiano Cocido',
    brand: 'Verdura Fresca',
    keywords: ['zapallo italiano', 'zucchini', 'zapallo italiano cocido'],
    servingDesc: '1 porción cocida (150 g)',
    servingUnit: 'g',
    servingSize: 150,
    calories: 24,
    proteinG: 1.8,
    carbsG: 4.5,
    fatsG: 0.3,
    per100: { calories: 16, proteinG: 1.2, carbsG: 3.0, fatsG: 0.2 },
    category: 'Verduras',
    verified: true
  },
  {
    id: 'creatina-monohidrato',
    name: 'Creatina Monohidrato (5g Saturación Diaria)',
    brand: 'Creapure / Universal / Dymatize',
    keywords: ['creatina', 'creatina monohidrato', '5g creatina'],
    servingDesc: '1 porción (5 g)',
    servingUnit: 'g',
    servingSize: 5,
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatsG: 0,
    per100: { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 },
    category: 'Suplementos',
    verified: true,
    clinicalNotes: '5g diarios para Dionicio y Paula. Saturación de fosfocreatina muscular.'
  },
  {
    id: 'quesillo-colun',
    name: 'Quesillo Tradicional (Colun)',
    brand: 'Colun',
    keywords: ['quesillo', 'quesillo colun'],
    servingDesc: '1 porción (80 g)',
    servingUnit: 'g',
    servingSize: 80,
    calories: 72,
    proteinG: 9.6,
    carbsG: 2.0,
    fatsG: 3.2,
    per100: { calories: 90, proteinG: 12.0, carbsG: 2.5, fatsG: 4.0 },
    category: 'Lácteos Proteicos',
    verified: true,
    clinicalNotes: 'Alimento preferido por Paula para la once. No sugerir a Dionicio (dislike declarado).'
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
