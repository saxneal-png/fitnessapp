import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  saveCloudPantryItems, 
  subscribeToPantryItems, 
  saveCloudWeeklyMenu, 
  subscribeToWeeklyMenu,
  saveNutritionLog,
  deleteNutritionLog,
  subscribeToNutritionLogs
} from '../firebase/config';
import { generateStrictPantryMenu, getStoredGeminiKey, analyzeCoachChatWithAction } from '../services/geminiService';
import { subscribeToFoodCatalog } from '../services/foodKnowledgeService';
import { subscribeToMealSettings } from '../services/mealSettingsService';
import { calculateAthleteNutrition } from '../services/nutritionCalculator';
import { getLocalDateString } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

const PANTRY_STORAGE_KEY = 'fitness_duo_pantry_items';
const MENU_STORAGE_KEY = 'fitness_duo_weekly_menu';

export function usePantryNutrition(selectedAthlete = 'dionicio') {
  const { householdId, isCloudOnline } = useAuth();

  const [pantryItems, setPantryItems] = useState(() => {
    try {
      const saved = localStorage.getItem(PANTRY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Huevos', 'Pechuga de pollo', 'Arroz integral / blanco', 'Avena integral', 'Atún en lata / agua', 'Palta / Aguacate', 'Espinacas / Hojas verdes', 'Aceite de oliva'];
  });

  const [generatedMenu, setGeneratedMenu] = useState(() => {
    try {
      const saved = localStorage.getItem(MENU_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [learnedCatalog, setLearnedCatalog] = useState([]);
  const [mealConfig, setMealConfig] = useState(null);

  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [smartMealError, setSmartMealError] = useState('');
  const [lastAiMealResult, setLastAiMealResult] = useState(null);

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Suscripciones en tiempo real
  useEffect(() => {
    const unsubPantry = subscribeToPantryItems(householdId, (items) => {
      if (items && Array.isArray(items)) setPantryItems(items);
    });

    const unsubMenu = subscribeToWeeklyMenu(householdId, (menu) => {
      if (menu) setGeneratedMenu(menu);
    });

    const unsubNutrition = subscribeToNutritionLogs(householdId, (logs) => {
      if (logs && Array.isArray(logs)) setNutritionLogs(logs);
    });

    const unsubCatalog = subscribeToFoodCatalog(householdId, (catalog) => {
      if (catalog && Array.isArray(catalog)) setLearnedCatalog(catalog);
    });

    const unsubMealSettings = subscribeToMealSettings(householdId, (config) => {
      if (config) setMealConfig(config);
    });

    return () => {
      unsubPantry();
      unsubMenu();
      unsubNutrition();
      unsubCatalog();
      unsubMealSettings();
    };
  }, [householdId]);

  // Manejo de despensa
  const updatePantryAndSync = (newItems) => {
    setPantryItems(newItems);
    saveCloudPantryItems(newItems, householdId);
  };

  const togglePresetIngredient = (name) => {
    let updated;
    if (pantryItems.includes(name)) {
      updated = pantryItems.filter(i => i !== name);
    } else {
      updated = [...pantryItems, name];
    }
    updatePantryAndSync(updated);
  };

  const addCustomPantryItem = (item) => {
    const clean = item.trim();
    if (clean && !pantryItems.includes(clean)) {
      updatePantryAndSync([...pantryItems, clean]);
    }
  };

  const removePantryItem = (itemToRemove) => {
    updatePantryAndSync(pantryItems.filter(i => i !== itemToRemove));
  };

  // Generador de menú con IA
  const handleGenerateMenu = async () => {
    if (pantryItems.length === 0) {
      setMenuError('Selecciona al menos 2 o 3 ingredientes en tu despensa.');
      return;
    }
    setIsLoadingMenu(true);
    setMenuError('');

    try {
      const apiKey = getStoredGeminiKey();
      const menuText = await generateStrictPantryMenu(pantryItems, apiKey);
      const menuPayload = {
        generatedAt: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        ingredientsUsed: pantryItems,
        content: menuText,
        isAI: !!apiKey
      };
      setGeneratedMenu(menuPayload);
      await saveCloudWeeklyMenu(menuPayload, householdId);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err) {
      setMenuError(`Error al generar menú: ${err.message}`);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  // Procesar comida con NLP / IA
  const processSmartMeal = async (text) => {
    const query = text.trim();
    if (!query) return;

    setIsAnalyzingMeal(true);
    setSmartMealError('');

    try {
      const apiKey = getStoredGeminiKey();
      const response = await analyzeCoachChatWithAction(query, selectedAthlete, householdId, apiKey);

      if (response && response.detectedMeal) {
        const detected = response.detectedMeal;
        const entriesToSave = Array.isArray(detected.entries) && detected.entries.length > 0
          ? detected.entries
          : [{
              userId: detected.userId || selectedAthlete,
              mealType: detected.mealType || 'almuerzo',
              title: detected.title || 'Comida analizada por Coach IA',
              caloriesKcal: detected.caloriesKcal || 0,
              proteinG: detected.proteinG || 0,
              carbsG: detected.carbsG || 0,
              fatsG: detected.fatsG || 0,
              items: detected.items || [],
              coachFeedback: detected.summary || '',
              source: 'coach_ai'
            }];

        const mealSaveDate = selectedDate || getLocalDateString();
        for (const entry of entriesToSave) {
          // Blindaje estricto de Hard Cap para Paula si la IA o ingreso sobrepasara
          let cleanFats = Number(entry.fatsG) || 0;
          if (entry.userId === 'paula' && cleanFats > 42) {
            cleanFats = 42;
          }

          await saveNutritionLog({
            userId: entry.userId || selectedAthlete,
            date: entry.date || mealSaveDate,
            mealType: entry.mealType || 'almuerzo',
            title: entry.title || 'Comida analizada por Coach IA',
            caloriesKcal: entry.caloriesKcal || 0,
            proteinG: entry.proteinG || 0,
            carbsG: entry.carbsG || 0,
            fatsG: cleanFats,
            items: entry.items || [],
            coachFeedback: entry.coachFeedback || detected.summary || '',
            source: 'coach_ai'
          }, householdId);
        }

        setLastAiMealResult({
          text: response.text,
          detectedMeal: detected,
          savedEntriesCount: entriesToSave.length,
          timestamp: Date.now()
        });

        try {
          confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
        } catch (e) {}
      } else {
        setSmartMealError('No se detectaron alimentos en la descripción. Especifica cantidades o preparaciones.');
      }
    } catch (err) {
      setSmartMealError(`Error con Coach IA: ${err.message}`);
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  // Guardado manual
  const saveManualMeal = async (mealData) => {
    let cleanFats = Number(mealData.fatsG) || 0;
    if (selectedAthlete === 'paula' && cleanFats > 42) {
      cleanFats = 42;
    }

    await saveNutritionLog({
      userId: selectedAthlete,
      date: mealData.date || selectedDate || getLocalDateString(),
      mealType: mealData.mealType,
      title: mealData.title.trim(),
      caloriesKcal: Number(mealData.caloriesKcal) || 0,
      proteinG: Number(mealData.proteinG) || 0,
      carbsG: Number(mealData.carbsG) || 0,
      fatsG: cleanFats,
      source: 'manual'
    }, householdId);
  };

  const deleteMeal = async (logId) => {
    setNutritionLogs(prev => prev.filter(m => m.id !== logId));
    try {
      const updated = await deleteNutritionLog(logId, selectedAthlete, householdId);
      if (Array.isArray(updated)) setNutritionLogs(updated);
    } catch (err) {
      console.error('Error eliminando comida:', err);
    }
  };

  // Cálculos derivados
  const availableDates = useMemo(() => {
    return Array.from(new Set([
      todayStr,
      ...nutritionLogs.map(n => n.date || (n.timestamp ? getLocalDateString(n.timestamp) : '')).filter(Boolean)
    ])).sort().reverse();
  }, [nutritionLogs, todayStr]);

  const athleteMealsToday = useMemo(() => {
    return nutritionLogs.filter(
      n => n.userId === selectedAthlete && (n.date === selectedDate || (!n.date && getLocalDateString(n.timestamp) === selectedDate))
    );
  }, [nutritionLogs, selectedAthlete, selectedDate]);

  const duplicateIdsOnDate = useMemo(() => {
    const seen = new Map();
    const dups = [];
    athleteMealsToday.forEach(m => {
      const key = `${(m.mealType || m.mealName || '').toLowerCase()}_${Math.round((Number(m.caloriesKcal) || 0) / 20)}`;
      if (seen.has(key)) {
        dups.push(m.id);
      } else {
        seen.set(key, m.id);
      }
    });
    return dups;
  }, [athleteMealsToday]);

  const clearDuplicatesOnDate = async () => {
    if (duplicateIdsOnDate.length === 0) return;
    setNutritionLogs(prev => prev.filter(m => !duplicateIdsOnDate.includes(m.id)));
    for (const dupId of duplicateIdsOnDate) {
      await deleteNutritionLog(dupId, selectedAthlete, householdId);
    }
  };

  const totalCalsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.caloriesKcal) || 0), 0);
  const totalProteinToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.proteinG) || 0), 0);
  const totalCarbsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.carbsG) || 0), 0);
  const totalFatsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.fatsG) || 0), 0);

  const athletePlan = calculateAthleteNutrition(selectedAthlete, householdId);

  return {
    pantryItems,
    generatedMenu,
    nutritionLogs,
    learnedCatalog,
    mealConfig,
    isLoadingMenu,
    menuError,
    isAnalyzingMeal,
    smartMealError,
    lastAiMealResult,
    todayStr,
    selectedDate,
    setSelectedDate,
    availableDates,
    athleteMealsToday,
    duplicateIdsOnDate,
    clearDuplicatesOnDate,
    totalCalsToday,
    totalProteinToday,
    totalCarbsToday,
    totalFatsToday,
    athletePlan,
    togglePresetIngredient,
    addCustomPantryItem,
    removePantryItem,
    handleGenerateMenu,
    processSmartMeal,
    saveManualMeal,
    deleteMeal,
    householdId,
    isCloudOnline
  };
}
