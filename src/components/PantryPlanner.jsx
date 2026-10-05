import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { generateStrictPantryMenu, getStoredGeminiKey, analyzeCoachChatWithAction } from '../services/geminiService';
import { 
  saveCloudPantryItems, 
  subscribeToPantryItems, 
  saveCloudWeeklyMenu, 
  subscribeToWeeklyMenu,
  saveNutritionLog,
  deleteNutritionLog,
  subscribeToNutritionLogs,
  getLocalPantryItems,
  getLocalWeeklyMenu,
  DUO_DEFAULT_PANTRY
} from '../firebase/config';
import { calculateAthleteNutrition } from '../services/nutritionCalculator';
import { subscribeToFoodCatalog, saveFoodItemToKnowledgeBase } from '../services/foodKnowledgeService';
import { subscribeToMealSettings } from '../services/mealSettingsService';
import { getLocalDateString, formatShortDate } from '../utils/dateUtils';
import { BiometricsModal } from './BiometricsModal';
import { MealSettingsModal } from './MealSettingsModal';
import { PantryList } from './pantry/PantryList';
import { PantryNLPInput } from './pantry/PantryNLPInput';
import { NutritionHistoryPills } from './pantry/NutritionHistoryPills';
import { AIRecipeCard } from './pantry/AIRecipeCard';
import { 
  Utensils, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Printer, 
  Copy, 
  Calendar, 
  ShoppingBag, 
  RefreshCw, 
  ChefHat, 
  Clock, 
  Info, 
  Key, 
  ShieldCheck, 
  Scale,
  Cloud,
  Apple,
  Flame,
  Dna,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  X,
  Database,
  Search,
  Bot,
  Zap,
  BookOpen
} from 'lucide-react';

import confetti from 'canvas-confetti';

const PANTRY_STORAGE_KEY = 'fitness_duo_pantry_items';
const MENU_STORAGE_KEY = 'fitness_duo_weekly_menu';

const DEFAULT_COMMON_INGREDIENTS = [
  { id: 'p1', name: 'Huevos', category: 'Proteína' },
  { id: 'p2', name: 'Pechuga de pollo', category: 'Proteína' },
  { id: 'p3', name: 'Salmón', category: 'Proteína' },
  { id: 'p4', name: 'Merluza', category: 'Proteína' },
  { id: 'p5', name: 'Atún en lata / agua', category: 'Proteína' },
  { id: 'p6', name: 'Carne magra / Posta rosada', category: 'Proteína' },
  { id: 'p7', name: 'Yogurt griego natural', category: 'Proteína' },
  { id: 'c1', name: 'Arroz integral / blanco', category: 'Carbohidratos' },
  { id: 'c2', name: 'Avena integral', category: 'Carbohidratos' },
  { id: 'c3', name: 'Marraqueta', category: 'Carbohidratos' },
  { id: 'c4', name: 'Papas / Camote', category: 'Carbohidratos' },
  { id: 'c5', name: 'Pan integral', category: 'Carbohidratos' },
  { id: 'v1', name: 'Zapallo italiano', category: 'Verduras' },
  { id: 'v2', name: 'Espinacas / Hojas verdes', category: 'Verduras' },
  { id: 'v3', name: 'Tomates', category: 'Verduras' },
  { id: 'v4', name: 'Brócoli / Zanahorias', category: 'Verduras' },
  { id: 'g1', name: 'Palta / Aguacate', category: 'Grasas' },
  { id: 'g2', name: 'Aceite de oliva', category: 'Grasas' },
  { id: 'g3', name: 'Frutos secos / Nueces', category: 'Grasas' },
];

export function PantryPlanner() {
  const { currentUser, householdId, isCloudOnline, isDuoHousehold, userProfile } = useAuth();
  
  const [pantryItems, setPantryItems] = useState(() => {
    return getLocalPantryItems(householdId || 'hogar-dionicio-paula');
  });

  const [customItemInput, setCustomItemInput] = useState('');
  const [generatedMenu, setGeneratedMenu] = useState(() => {
    return getLocalWeeklyMenu(householdId || 'hogar-dionicio-paula');
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [activeSection, setActiveSection] = useState('diary'); // 'diary' | 'pantry' | 'menu'
  const [selectedAthlete, setSelectedAthlete] = useState(currentUser || 'dionicio');
  const [showAddMealForm, setShowAddMealForm] = useState(false);
  const [showManualNumberForm, setShowManualNumberForm] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [showMealSettingsModal, setShowMealSettingsModal] = useState(false);
  const [mealConfig, setMealConfig] = useState(null);
  
  // Estados para Registro Asistido por Coach IA (Lenguaje Natural)
  const [smartMealText, setSmartMealText] = useState('');
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [lastAiMealResult, setLastAiMealResult] = useState(null);
  const [smartMealError, setSmartMealError] = useState('');

  // Estados para Base de Conocimiento de Marcas y Alimentos del Hogar
  const [learnedCatalog, setLearnedCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showLearnedCatalog, setShowLearnedCatalog] = useState(false);
  const [pantrySyncStatus, setPantrySyncStatus] = useState('syncing');

  const [newMeal, setNewMeal] = useState({
    title: '',
    mealType: 'almuerzo',
    caloriesKcal: 450,
    proteinG: 35,
    carbsG: 40,
    fatsG: 12,
    date: getLocalDateString()
  });

  // Real-time Cloud Subscriptions
  useEffect(() => {
    const unsubPantry = subscribeToPantryItems(householdId, (items) => {
      if (items && Array.isArray(items)) {
        setPantryItems(items);
        setPantrySyncStatus('synced');
      }
    });

    const unsubMenu = subscribeToWeeklyMenu(householdId, (menu) => {
      if (menu && menu.content) {
        setGeneratedMenu(menu);
      }
    });

    const unsubNutrition = subscribeToNutritionLogs(householdId, (logs) => {
      if (logs && Array.isArray(logs)) {
        setNutritionLogs(logs);
      }
    });

    const unsubCatalog = subscribeToFoodCatalog(householdId, (catalog) => {
      if (catalog && Array.isArray(catalog)) {
        setLearnedCatalog(catalog);
      }
    });

    const unsubMealSettings = subscribeToMealSettings(householdId, (config) => {
      if (config) {
        setMealConfig(config);
      }
    });

    return () => {
      unsubPantry();
      unsubMenu();
      unsubNutrition();
      unsubCatalog();
      unsubMealSettings();
    };
  }, [householdId]);


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

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    const item = customItemInput.trim();
    if (item && !pantryItems.includes(item)) {
      const updated = [...pantryItems, item];
      updatePantryAndSync(updated);
      setCustomItemInput('');
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    const updated = pantryItems.filter(i => i !== itemToRemove);
    updatePantryAndSync(updated);
  };

  // Generate Menu via Gemini Strict Pantry Engine
  const handleGenerateMenu = async () => {
    if (pantryItems.length === 0) {
      setErrorMessage('Por favor selecciona o añade al menos 2 o 3 ingredientes disponibles en tu despensa.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

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
      console.error('Menu generation error:', err);
      setErrorMessage(`Error al generar el menú: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMenu = () => {
    if (!generatedMenu) return;
    navigator.clipboard.writeText(generatedMenu.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintMenu = () => {
    window.print();
  };

  const handleProcessSmartMeal = async (e) => {
    if (e) e.preventDefault();
    const query = smartMealText.trim();
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

        // Persistir en Firestore Cloud y LocalStorage para cada atleta
        const mealSaveDate = selectedDate || getLocalDateString();
        for (const entry of entriesToSave) {
          await saveNutritionLog({
            userId: entry.userId || selectedAthlete,
            date: entry.date || mealSaveDate,
            mealType: entry.mealType || 'almuerzo',
            title: entry.title || 'Comida analizada por Coach IA',
            caloriesKcal: entry.caloriesKcal || 0,
            proteinG: entry.proteinG || 0,
            carbsG: entry.carbsG || 0,
            fatsG: entry.fatsG || 0,
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

        setSmartMealText('');

        try {
          confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 } });
        } catch (e) {}
      } else {
        setSmartMealError('El Coach no detectó alimentos en la descripción. Prueba especificando qué comieron y porciones aproximadas.');
      }
    } catch (err) {
      console.error('Error al procesar comida inteligente:', err);
      setSmartMealError(`Error al procesar con Coach IA: ${err.message}`);
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  const handleSaveManualMeal = async (e) => {
    e.preventDefault();
    if (!newMeal.title.trim()) return;

    try {
      await saveNutritionLog({
        userId: selectedAthlete,
        date: newMeal.date || selectedDate || getLocalDateString(),
        mealType: newMeal.mealType,
        title: newMeal.title.trim(),
        caloriesKcal: Number(newMeal.caloriesKcal) || 0,
        proteinG: Number(newMeal.proteinG) || 0,
        carbsG: Number(newMeal.carbsG) || 0,
        fatsG: Number(newMeal.fatsG) || 0,
        source: 'manual'
      }, householdId);

      setShowAddMealForm(false);
      setNewMeal({
        title: '',
        mealType: 'almuerzo',
        caloriesKcal: 450,
        proteinG: 35,
        carbsG: 40,
        fatsG: 12,
        date: getLocalDateString()
      });

      try {
        confetti({ particleCount: 40, spread: 50 });
      } catch (e) {}
    } catch (err) {
      console.error('Error guardando comida manual:', err);
      alert('Error al guardar la comida: ' + err.message);
    }
  };

  const handleDeleteMeal = async (logId) => {
    // 1. Actualización optimista inmediata en la UI (desaparece al instante)
    setNutritionLogs(prev => prev.filter(m => m.id !== logId));
    try {
      const updated = await deleteNutritionLog(logId, selectedAthlete, householdId);
      if (Array.isArray(updated)) {
        setNutritionLogs(updated);
      }
    } catch (err) {
      console.error('Error eliminando comida:', err);
    }
  };

  // Cálculos Nutricionales y Selección de Fecha (Historial Diario)
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const availableDates = Array.from(new Set([
    todayStr,
    ...nutritionLogs.map(n => n.date || (n.timestamp ? getLocalDateString(n.timestamp) : '')).filter(Boolean)
  ])).sort().reverse();

  const athleteMealsToday = nutritionLogs.filter(
    n => n.userId === selectedAthlete && (n.date === selectedDate || (!n.date && getLocalDateString(n.timestamp) === selectedDate))
  );

  // Detección de comidas duplicadas en la fecha activa
  const duplicateIdsOnDate = (() => {
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
  })();

  const handleClearDuplicatesOnDate = async () => {
    if (duplicateIdsOnDate.length === 0) return;
    setNutritionLogs(prev => prev.filter(m => !duplicateIdsOnDate.includes(m.id)));
    for (const dupId of duplicateIdsOnDate) {
      await deleteNutritionLog(dupId, selectedAthlete, householdId);
    }
  };

  const selectedDateClinicalNote = athleteMealsToday.find(m => m.notes)?.notes || null;

  const totalCalsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.caloriesKcal) || 0), 0);
  const totalProteinToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.proteinG) || 0), 0);
  const totalCarbsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.carbsG) || 0), 0);
  const totalFatsToday = athleteMealsToday.reduce((acc, m) => acc + (Number(m.fatsG) || 0), 0);

  // Plan Nutricional Científico (Mifflin-St Jeor + Factor PAL + Historial de Peso)
  const athletePlan = calculateAthleteNutrition(selectedAthlete, householdId);
  const targetCals = athletePlan.targetCals;
  const targetProtein = athletePlan.targetProtein;
  const targetCarbs = athletePlan.targetCarbs;
  const targetFats = athletePlan.targetFats;
  const calsPct = Math.min(100, Math.round((totalCalsToday / targetCals) * 100));

  return (

    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-black text-white">Centro Nutricional & Despensa Dúo</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Registro diario de calorías, macros en tiempo real, despensa compartida y menú con porciones adaptadas.
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center bg-gym-800 p-1 rounded-2xl border border-gym-700 gap-1">
          <button
            onClick={() => setActiveSection('diary')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'diary'
                ? 'bg-emerald-500 text-gym-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Apple className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Diario</span>
            <span className="hidden sm:inline">& Calorías ({athleteMealsToday.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('pantry')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'pantry'
                ? 'bg-emerald-500 text-gym-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Despensa</span>
            <span className="hidden sm:inline">({pantryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('menu')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'menu'
                ? 'bg-emerald-500 text-gym-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Menú</span>
            <span className="hidden sm:inline">Semanal</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: DIARIO NUTRICIONAL & CALORÍAS */}
      {activeSection === 'diary' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Athlete Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gym-800/80 border border-gym-700 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Viendo ingesta de:</span>
              {isDuoHousehold ? (
                <div className="flex items-center gap-1 bg-gym-900 p-1 rounded-xl border border-gym-700">
                  <button
                    onClick={() => setSelectedAthlete('dionicio')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedAthlete === 'dionicio'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-sky-300'
                    }`}
                  >
                    👨‍💻 Dionicio
                  </button>
                  <button
                    onClick={() => setSelectedAthlete('paula')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedAthlete === 'paula'
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-pink-300'
                    }`}
                  >
                    👩‍💼 Paula
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gym-900 border border-gym-700 text-xs font-bold text-sky-400 shadow-sm">
                  <span>{userProfile?.avatar || '🏋️‍♂️'}</span>
                  <span>{userProfile?.name || 'Mi Perfil'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMealSettingsModal(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all"
                title="Configuración de horarios y comidas chilenas (Desayuno, Almuerzo, Once)"
              >
                <span>🇨🇱 Horarios & Once</span>
              </button>
              <button
                onClick={() => setShowManualNumberForm(!showManualNumberForm)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-all"
              >
                {showManualNumberForm ? 'Ocultar ingreso manual' : 'Modo numérico manual'}
              </button>
            </div>
          </div>

          {/* Formulario Principal: Registro Asistido por Coach IA (Lenguaje Natural) */}
          <div className="bg-gradient-to-br from-gym-800 via-gym-850 to-gym-900 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gym-700/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 flex items-center justify-center text-gym-950 font-black shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>Coach IA: Registro Nutricional en Lenguaje Natural</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Zero Digitación Manual
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Escribe lo que comiste (o lo de ambos). El Coach consulta la base de datos del hogar, investiga marcas comerciales y calcula cuánto falta para cerrar el día.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleProcessSmartMeal} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  value={smartMealText}
                  onChange={(e) => setSmartMealText(e.target.value)}
                  placeholder="Ej: Yo al desayuno un diente de marraqueta con 40g de pechuga de pollo y café con alulosa. De almuerzo 178g de arroz con 57g de salmón y zapallo italiano. O: Tomé un vaso de leche loncoleche full pro..."
                  className="w-full bg-gym-900/90 border border-gym-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 leading-relaxed font-sans"
                />
              </div>

              {/* Botones de sugerencias rápidas */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Prueba rápida (clic para cargar ejemplo):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSmartMealText('Tomé un vaso de leche loncoleche full pro')}
                    className="text-[10px] bg-gym-900 hover:bg-gym-750 text-slate-300 hover:text-emerald-300 border border-gym-700/80 px-2.5 py-1 rounded-lg transition-all text-left"
                  >
                    🥛 1 vaso leche Loncoleche Full Pro
                  </button>
                  {isDuoHousehold ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSmartMealText('Yo al desayuno: 1 diente de marraqueta con 40g de pollo y café con alulosa. Almuerzo: 178g de arroz con 57g de salmón, 61g de merluza y 190g de zapallo italiano')}
                        className="text-[10px] bg-gym-900 hover:bg-gym-750 text-slate-300 hover:text-sky-300 border border-gym-700/80 px-2.5 py-1 rounded-lg transition-all text-left"
                      >
                        👨‍💻 Día Dionicio (Desayuno + Almuerzo pesados)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmartMealText('Paula al desayuno: 1 diente de marraqueta con 40g de pollo y café. Almuerzo: 80g de arroz con 55g de salmón, 45g de merluza y 150g de zapallo')}
                        className="text-[10px] bg-gym-900 hover:bg-gym-750 text-slate-300 hover:text-pink-300 border border-gym-700/80 px-2.5 py-1 rounded-lg transition-all text-left"
                      >
                        👩‍💼 Día Paula (Gramajes adaptados)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmartMealText('Esto llevamos al dia de hoy: yo al desayuno: un diente de marraqueta con 40 gramos de pechuga de pollo con un café endulzado con alulosa, de almuerzo comí 178gramos de arroz con 57 gramos de salmón y 61 gramos de merluza a la plancha, y 190 gramos de zapallo italiano cocido. Mi esposa al desayuno: un diente de marraqueta con 40 gramos de pechuga de pollo con un café endulzado con alulosa, de almuerzo comí 80 gramos de arroz con 55 gramos de salmón y 45 gramos de merluza a la plancha, y 150 gramos de zapallo italiano cocido')}
                        className="text-[10px] bg-gym-900 hover:bg-gym-750 text-slate-300 hover:text-amber-300 border border-gym-700/80 px-2.5 py-1 rounded-lg transition-all text-left"
                      >
                        👥 Registro Dual Completo (Ambos juntos)
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSmartMealText('Al desayuno: 1 diente de marraqueta con 50g de pechuga de pollo y un café con alulosa. De almuerzo: 150g de arroz con 180g de pechuga de pollo y ensalada de espinacas.')}
                      className="text-[10px] bg-gym-900 hover:bg-gym-750 text-slate-300 hover:text-emerald-300 border border-gym-700/80 px-2.5 py-1 rounded-lg transition-all text-left"
                    >
                      🍽️ Día Completo (Desayuno + Almuerzo)
                    </button>
                  )}
                </div>
              </div>

              {smartMealError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs">
                  {smartMealError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAnalyzingMeal || !smartMealText.trim()}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:opacity-95 text-gym-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {isAnalyzingMeal ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Investigando marcas, calculando macros y actualizando Firestore...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>⚡ Interpretar Nutrientes y Registrar con Coach IA</span>
                  </>
                )}
              </button>
            </form>

            {/* Resultado del Último Análisis de Comida IA */}
            {lastAiMealResult && (
              <div className="mt-4 pt-4 border-t border-gym-700/80 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡{lastAiMealResult.savedEntriesCount} comida(s) calculada(s) y guardada(s) en Firestore Cloud!</span>
                  </span>
                  <span className="text-[10px] text-slate-400">En sincronía para ambos celulares</span>
                </div>

                {/* Si aprendió marcas comerciales */}
                {lastAiMealResult.detectedMeal?.learnedFoods && lastAiMealResult.detectedMeal.learnedFoods.length > 0 && (
                  <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-xl space-y-1">
                    <span className="text-[11px] font-black text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Nuevo producto comercial aprendido y guardado en la base del hogar:</span>
                    </span>
                    {lastAiMealResult.detectedMeal.learnedFoods.map((food, idx) => (
                      <p key={idx} className="text-[11px] text-slate-200">
                        • <strong>{food.name}</strong> ({food.brand || 'Comercial'}): {food.servingDesc || `${food.servingSize}g`} ➔ <strong className="text-emerald-400">{food.calories} kcal</strong>, <strong className="text-sky-300">{food.proteinG}g proteína</strong>.
                      </p>
                    ))}
                  </div>
                )}

                {/* Tarjetas de Cierre del Día */}
                {isDuoHousehold ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lastAiMealResult.detectedMeal?.dionicioClosure && (
                      <div className="p-3 bg-gym-900/90 border border-sky-500/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-400">👨‍💻 Cierre Día Dionicio</span>
                          <span className="text-[10px] font-mono text-slate-400">Meta: 1.600 kcal</span>
                        </div>
                        <p className="text-xs text-white font-mono">
                          Lleva: <strong>{lastAiMealResult.detectedMeal.dionicioClosure.todayTotalCals} kcal</strong> ({lastAiMealResult.detectedMeal.dionicioClosure.todayTotalProtein}g P)
                        </p>
                        <p className="text-xs text-emerald-400 font-bold font-mono">
                          👉 Faltan: {lastAiMealResult.detectedMeal.dionicioClosure.remainingCals} kcal y {lastAiMealResult.detectedMeal.dionicioClosure.remainingProtein}g de proteína
                        </p>
                      </div>
                    )}

                    {lastAiMealResult.detectedMeal?.paulaClosure && (
                      <div className="p-3 bg-gym-900/90 border border-pink-500/30 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-pink-400">👩‍💼 Cierre Día Paula</span>
                          <span className="text-[10px] font-mono text-slate-400">Meta: 1.250 kcal</span>
                        </div>
                        <p className="text-xs text-white font-mono">
                          Lleva: <strong>{lastAiMealResult.detectedMeal.paulaClosure.todayTotalCals} kcal</strong> ({lastAiMealResult.detectedMeal.paulaClosure.todayTotalProtein}g P)
                        </p>
                        <p className="text-xs text-emerald-400 font-bold font-mono">
                          👉 Faltan: {lastAiMealResult.detectedMeal.paulaClosure.remainingCals} kcal y {lastAiMealResult.detectedMeal.paulaClosure.remainingProtein}g de proteína
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  lastAiMealResult.detectedMeal?.closureAdvice && (
                    <div className="p-3 bg-gym-900/90 border border-sky-500/30 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-400">🎯 Cierre de Día ({userProfile?.name || 'Mi Perfil'})</span>
                        <span className="text-[10px] font-mono text-slate-400">Meta: {lastAiMealResult.detectedMeal.closureAdvice.targetCals} kcal</span>
                      </div>
                      <p className="text-xs text-white font-mono">
                        Lleva: <strong>{lastAiMealResult.detectedMeal.closureAdvice.newTotalCals} kcal</strong> ({lastAiMealResult.detectedMeal.closureAdvice.newTotalProtein}g P)
                      </p>
                      <p className="text-xs text-emerald-400 font-bold font-mono">
                        👉 Faltan: {lastAiMealResult.detectedMeal.closureAdvice.remainingCals} kcal y {lastAiMealResult.detectedMeal.closureAdvice.remainingProtein}g de proteína
                      </p>
                    </div>
                  )
                )}

                {/* Propuesta de Once Dúo 20:00 con despensa (si es Duo) */}
                {isDuoHousehold && lastAiMealResult.detectedMeal?.sharedDinnerProposal && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1 text-xs">
                    <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{lastAiMealResult.detectedMeal.sharedDinnerProposal.title || 'Once Dúo Post-Entreno (20:00) con su Despensa'}:</span>
                    </span>
                    <p className="text-slate-200">{lastAiMealResult.detectedMeal.sharedDinnerProposal.recipe}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="text-sky-300">
                        <strong>Dionicio:</strong> {lastAiMealResult.detectedMeal.sharedDinnerProposal.dionicioPortion}
                      </div>
                      <div className="text-pink-300">
                        <strong>Paula:</strong> {lastAiMealResult.detectedMeal.sharedDinnerProposal.paulaPortion}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formulario Secundario / Opcional de Entrada Numérica Manual */}
          {showManualNumberForm && (
            <form onSubmit={handleSaveManualMeal} className="bg-gym-800 border border-gym-700 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gym-700 pb-2">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Apple className="w-4 h-4 text-emerald-400" />
                  <span>Ingreso Manual Numérico para {isDuoHousehold ? (USERS[selectedAthlete]?.name || selectedAthlete) : (userProfile?.name || 'mi perfil')}</span>
                </h4>
                <span className="text-[11px] text-slate-400">Opcional para ajustes finos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nombre del plato o alimento</label>
                  <input
                    type="text"
                    required
                    value={newMeal.title}
                    onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
                    placeholder="Ej: Pechuga con arroz y ensalada"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Tipo de Comida</label>
                  <select
                    value={newMeal.mealType}
                    onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="desayuno">Desayuno</option>
                    <option value="almuerzo">Almuerzo</option>
                    <option value="once">Once / Once-Comida (20:00)</option>
                    <option value="snack">Colación / Snack</option>
                    <option value="cena">Cena (Opcional)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={newMeal.caloriesKcal}
                    onChange={(e) => setNewMeal({ ...newMeal, caloriesKcal: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 uppercase mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={newMeal.proteinG}
                    onChange={(e) => setNewMeal({ ...newMeal, proteinG: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs font-mono text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 uppercase mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={newMeal.carbsG}
                    onChange={(e) => setNewMeal({ ...newMeal, carbsG: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-pink-400 uppercase mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={newMeal.fatsG}
                    onChange={(e) => setNewMeal({ ...newMeal, fatsG: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs font-mono text-pink-400 font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gym-700 hover:bg-gym-600 text-white font-bold text-xs transition-all"
              >
                Guardar Manualmente
              </button>
            </form>
          )}

          {/* Selector de Fechas del Diario Nutricional */}
          {availableDates.length > 0 && (
            <div className="bg-gym-800/80 border border-gym-700/80 rounded-2xl p-3 shadow-md flex items-center justify-between gap-2">
              <NutritionHistoryPills
                availableDates={availableDates}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                todayStr={todayStr}
              />
            </div>
          )}

          {/* Nota Clínica del Día si existe */}
          {selectedDateClinicalNote && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white mb-0.5">Nota Clínica & Observación del Día:</strong>
                <span className="text-slate-300 leading-relaxed">{selectedDateClinicalNote}</span>
              </div>
            </div>
          )}

          {/* Caloric & Macro Overview Card */}
          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    Consumo Acumulado {selectedDate === todayStr ? 'Hoy' : `(${selectedDate})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBiometricsModal(true)}
                    className="text-[10px] text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all"
                    title="Modo metabólico activo y diagnóstico del asesor"
                  >
                    <span>{athletePlan.activeModeConfig?.icon || '🔥'} Modo: {athletePlan.activeModeConfig?.shortName || 'Grasa Visceral'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBiometricsModal(true)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all"
                    title="Ver y calibrar fórmula clínica de Mifflin-St Jeor"
                  >
                    <Dna className="w-3 h-3" />
                    <span>Mifflin: {athletePlan.bmr} kcal • {athletePlan.weightKg}kg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMealSettingsModal(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all"
                    title="Configurar horarios y porcentajes de comida chilena"
                  >
                    <span>🇨🇱 Once: {mealConfig?.meals?.once?.time || '20:00'} ({mealConfig?.meals?.once?.targetCaloriesPercent || 30}%)</span>
                  </button>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-white font-mono">{totalCalsToday}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {targetCals} kcal objetivo</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${calsPct > 105 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {calsPct}% completado
                </span>
                <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                  Restante: {Math.max(0, targetCals - totalCalsToday)} kcal
                </span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-gym-900 rounded-full h-3 overflow-hidden border border-gym-700/80">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  calsPct > 105 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400'
                }`}
                style={{ width: `${calsPct}%` }}
              />
            </div>

            {/* 3 Macro Cards */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-gym-900/80 border border-sky-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Proteínas</span>
                <div className="text-base sm:text-lg font-black text-sky-400 font-mono mt-0.5">
                  {totalProteinToday}g <span className="text-[10px] text-slate-400 font-normal">/ {targetProtein}g</span>
                </div>
                <span className="text-[9px] text-sky-300/80 block mt-0.5 font-mono">
                  {selectedAthlete === 'paula' ? '80-85g liviano (antidistensión)' : athletePlan.formulaDetails.proteinTargetInfo}
                </span>
              </div>
              <div className="bg-gym-900/80 border border-amber-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Carbohidratos</span>
                <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5">
                  {totalCarbsToday}g <span className="text-[10px] text-slate-400 font-normal">/ {targetCarbs}g</span>
                </div>
                <span className="text-[9px] text-amber-300/80 block mt-0.5 font-mono">
                  {selectedAthlete === 'paula' ? 'Carbos limpios para energía' : 'Energía 19:00'}
                </span>
              </div>
              <div className="bg-gym-900/80 border border-pink-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Grasas</span>
                <div className="text-base sm:text-lg font-black text-pink-400 font-mono mt-0.5">
                  {totalFatsToday}g <span className="text-[10px] text-slate-400 font-normal">/ {targetFats}g</span>
                </div>
                <span className="text-[9px] text-pink-300/80 block mt-0.5 font-mono">
                  {athletePlan.digestiveProtection 
                    ? `🛡️ Techo digestivo máx ${athletePlan.maxFatsCap || 42}g` 
                    : athletePlan.formulaDetails.fatsTargetInfo}
                </span>
              </div>
            </div>
          </div>

          {/* Listado de Comidas Registradas */}
          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-gym-700 pb-3 gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Comidas Registradas {selectedDate === todayStr ? 'Hoy' : `(${selectedDate})`} ({athleteMealsToday.length})</span>
              </h3>
              
              <div className="flex items-center gap-2">
                {duplicateIdsOnDate.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDuplicatesOnDate}
                    className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    title="Eliminar automáticamente las comidas duplicadas de esta fecha"
                  >
                    <span>🧹 Limpiar {duplicateIdsOnDate.length} Duplicados</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  {athleteMealsToday.length === 0 ? 'Sin registros' : 'Sincronizadas'}
                </span>
              </div>
            </div>

            {athleteMealsToday.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gym-900 border border-gym-700 flex items-center justify-center mx-auto text-slate-500">
                  <Apple className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300 font-semibold">No hay comidas registradas para {USERS[selectedAthlete]?.name} en {selectedDate === todayStr ? 'el día de hoy' : selectedDate}.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Escribe en el <strong>Coach Gemini</strong> (ej: "Comí 2 huevos y pan integral") o usa el botón <strong>"+ Agregar Comida Rápida"</strong> arriba.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {athleteMealsToday.map((meal) => (
                  <div key={meal.id} className="p-3.5 bg-gym-900/90 border border-gym-700/80 rounded-xl flex items-center justify-between gap-3 hover:border-gym-600 transition-all">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-white truncate">{meal.title || meal.mealName}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gym-800 text-slate-300 border border-gym-700">
                          {meal.mealType === 'once' ? '🥪 Once' : (meal.mealType || 'Comida')}
                        </span>
                        {meal.source === 'coach_ai' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            Coach AI
                          </span>
                        )}
                        {meal.isVerifiedHistorical && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Verificado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span className="text-emerald-400 font-bold">{meal.caloriesKcal} kcal</span>
                        <span>•</span>
                        <span>Prot: <strong className="text-sky-300">{meal.proteinG}g</strong></span>
                        <span>•</span>
                        <span>Carb: <strong className="text-amber-300">{meal.carbsG}g</strong></span>
                        <span>•</span>
                        <span>Grasa: <strong className="text-pink-300">{meal.fatsG}g</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeal(meal.id);
                      }}
                      className="p-2.5 text-slate-400 hover:text-red-400 active:scale-90 hover:bg-rose-500/10 rounded-xl transition-all shrink-0 cursor-pointer"
                      title="Eliminar este plato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN 2: DESPENSA ACTIVA */}
      {activeSection === 'pantry' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Reglas Clave */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
            <div className="bg-gym-800/80 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-white block">{isDuoHousehold ? '1 Sola Cocinada' : 'Planificación Eficiente'}</span>
                <span className="text-slate-400">{isDuoHousehold ? 'Mismo plato/receta para ambos en almuerzos y en la Once (20:00).' : 'Cocina lotes optimizados para almuerzos y tu Once.'}</span>
              </div>
            </div>

            <div className="bg-gym-800/80 border border-sky-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-white block">Porciones Claras</span>
                <span className="text-slate-400">{isDuoHousehold ? 'Gramajes exactos y diferenciados para cada atleta.' : 'Gramajes exactos y pesaje según tus metas metabólicas.'}</span>
              </div>
            </div>

            <div className="bg-gym-800/80 border border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-white block">Despensa Estricta</span>
                <span className="text-slate-400">Solo se usan ingredientes de la lista informada abajo.</span>
              </div>
            </div>
          </div>

          {/* Pantry Selector Box */}
          <PantryList
            pantryItems={pantryItems}
            onTogglePreset={togglePresetIngredient}
            onRemoveItem={handleRemoveItem}
            onAddCustom={handleAddCustomItem}
            customInput={customItemInput}
            onCustomInputChange={setCustomItemInput}
            presetIngredients={DEFAULT_COMMON_INGREDIENTS}
            isDuoHousehold={isDuoHousehold}
          />

          {/* BASE DE CONOCIMIENTO DE MARCAS Y ALIMENTOS APRENDIDOS (FIRESTORE) */}
          <div className="bg-gym-800/90 border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gym-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>Base de Conocimiento de Alimentos & Marcas</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      {learnedCatalog.length} productos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Productos que el Coach IA ha aprendido e investigado para el hogar (Loncoleche, Soprole, San José, etc.).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLearnedCatalog(!showLearnedCatalog)}
                className="px-3.5 py-1.5 rounded-xl bg-gym-900 border border-gym-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                {showLearnedCatalog ? 'Ocultar Catálogo' : 'Explorar Catálogo de Marcas'}
              </button>
            </div>

            {showLearnedCatalog && (
              <div className="space-y-4 animate-fadeIn">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar marca o producto (ej: Loncoleche, Atún, Marraqueta, Soprole)..."
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {learnedCatalog
                    .filter(item => {
                      if (!catalogSearch) return true;
                      const q = catalogSearch.toLowerCase();
                      return item.name.toLowerCase().includes(q) || (item.brand && item.brand.toLowerCase().includes(q));
                    })
                    .map((item) => (
                      <div key={item.id} className="p-3 bg-gym-900/90 border border-gym-700/80 rounded-xl space-y-1.5 hover:border-sky-500/50 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-white leading-tight">{item.name}</span>
                          <span className="text-[9px] bg-gym-800 text-slate-300 px-1.5 py-0.5 rounded border border-gym-700 shrink-0 font-mono">
                            {item.brand || 'Marca'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Porción: <span className="text-slate-200 font-semibold">{item.servingDesc || `${item.servingSize}g`}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono border-t border-gym-800 pt-1">
                          <span className="text-emerald-400 font-bold">{item.calories} kcal</span>
                          <span>•</span>
                          <span className="text-sky-300 font-bold">P: {item.proteinG}g</span>
                          <span>•</span>
                          <span className="text-amber-300">C: {item.carbsG}g</span>
                          <span>•</span>
                          <span className="text-pink-300">G: {item.fatsG}g</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN 3: MENÚ SEMANAL PERSONALIZADO */}
      {activeSection === 'menu' && (
        <div className="space-y-5 animate-fadeIn">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <AIRecipeCard
            generatedMenu={generatedMenu}
            isLoading={isLoading}
            onGenerate={handleGenerateMenu}
            onCopy={handleCopyMenu}
            onPrint={handlePrintMenu}
            copied={copied}
            pantryItemsCount={pantryItems.length}
          />
        </div>
      )}

      {/* Modal de Diagnóstico y Calibración Biométrico */}
      <BiometricsModal
        isOpen={showBiometricsModal}
        onClose={() => setShowBiometricsModal(false)}
        householdId={householdId}
        initialAthlete={selectedAthlete}
        onSaved={() => {}}
      />

      {/* Modal de Configuración de Horarios & Once Chilenos */}
      <MealSettingsModal
        isOpen={showMealSettingsModal}
        onClose={() => setShowMealSettingsModal(false)}
        householdId={householdId}
      />
    </div>
  );
}
