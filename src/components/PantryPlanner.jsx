import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { generateStrictPantryMenu, getStoredGeminiKey } from '../services/geminiService';
import { 
  saveCloudPantryItems, 
  subscribeToPantryItems, 
  saveCloudWeeklyMenu, 
  subscribeToWeeklyMenu,
  saveNutritionLog,
  deleteNutritionLog,
  subscribeToNutritionLogs
} from '../firebase/config';
import { calculateAthleteNutrition } from '../services/nutritionCalculator';
import { BiometricsModal } from './BiometricsModal';
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
  X
} from 'lucide-react';

import confetti from 'canvas-confetti';

const PANTRY_STORAGE_KEY = 'fitness_duo_pantry_items';
const MENU_STORAGE_KEY = 'fitness_duo_weekly_menu';

const DEFAULT_COMMON_INGREDIENTS = [
  { id: 'p1', name: 'Huevos', category: 'Proteína' },
  { id: 'p2', name: 'Pechuga de pollo', category: 'Proteína' },
  { id: 'p3', name: 'Atún en lata / agua', category: 'Proteína' },
  { id: 'p4', name: 'Carne magra / molida', category: 'Proteína' },
  { id: 'p5', name: 'Yogurt griego natural', category: 'Proteína' },
  { id: 'c1', name: 'Arroz integral / blanco', category: 'Carbohidratos' },
  { id: 'c2', name: 'Avena integral', category: 'Carbohidratos' },
  { id: 'c3', name: 'Papas / Camote', category: 'Carbohidratos' },
  { id: 'c4', name: 'Pan integral', category: 'Carbohidratos' },
  { id: 'v1', name: 'Espinacas / Hojas verdes', category: 'Verduras' },
  { id: 'v2', name: 'Tomates', category: 'Verduras' },
  { id: 'v3', name: 'Brócoli / Zanahorias', category: 'Verduras' },
  { id: 'v4', name: 'Palta / Aguacate', category: 'Grasas' },
  { id: 'g1', name: 'Aceite de oliva', category: 'Grasas' },
  { id: 'g2', name: 'Frutos secos / Nueces', category: 'Grasas' },
];

export function PantryPlanner() {
  const { currentUser, householdId, isCloudOnline } = useAuth();
  
  const [pantryItems, setPantryItems] = useState(() => {
    try {
      const saved = localStorage.getItem(PANTRY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Huevos', 'Pechuga de pollo', 'Arroz integral / blanco', 'Avena integral', 'Atún en lata / agua', 'Palta / Aguacate', 'Espinacas / Hojas verdes', 'Aceite de oliva'];
  });

  const [customItemInput, setCustomItemInput] = useState('');
  const [generatedMenu, setGeneratedMenu] = useState(() => {
    try {
      const saved = localStorage.getItem(MENU_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [activeSection, setActiveSection] = useState('diary'); // 'diary' | 'pantry' | 'menu'
  const [selectedAthlete, setSelectedAthlete] = useState(currentUser || 'dionicio');
  const [showAddMealForm, setShowAddMealForm] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    title: '',
    mealType: 'almuerzo',
    caloriesKcal: 450,
    proteinG: 35,
    carbsG: 40,
    fatsG: 12,
    date: new Date().toISOString().split('T')[0]
  });

  // Real-time Cloud Subscriptions
  useEffect(() => {
    const unsubPantry = subscribeToPantryItems(householdId, (items) => {
      if (items && Array.isArray(items)) {
        setPantryItems(items);
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

    return () => {
      unsubPantry();
      unsubMenu();
      unsubNutrition();
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

  const handleSaveManualMeal = async (e) => {
    e.preventDefault();
    if (!newMeal.title.trim()) return;

    try {
      await saveNutritionLog({
        userId: selectedAthlete,
        date: newMeal.date,
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
        date: new Date().toISOString().split('T')[0]
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
    if (!window.confirm('¿Seguro de que deseas eliminar este registro de comida?')) return;
    try {
      await deleteNutritionLog(logId, selectedAthlete, householdId);
    } catch (err) {
      console.error('Error eliminando comida:', err);
    }
  };

  // Cálculos Nutricionales de Hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const athleteMealsToday = nutritionLogs.filter(
    n => n.userId === selectedAthlete && (n.date === todayStr || (!n.date && new Date(n.timestamp).toISOString().split('T')[0] === todayStr))
  );

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
            </div>

            <button
              onClick={() => setShowAddMealForm(!showAddMealForm)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-95 text-gym-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md"
            >
              {showAddMealForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{showAddMealForm ? 'Cancelar' : '+ Agregar Comida Rápida'}</span>
            </button>
          </div>

          {/* Formulario de Comida Rápida Manual */}
          {showAddMealForm && (
            <form onSubmit={handleSaveManualMeal} className="bg-gym-800 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gym-700 pb-2">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Apple className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Comida para {USERS[selectedAthlete]?.name}</span>
                </h4>
                <span className="text-[11px] text-slate-400">Guarda en Firestore Cloud y LocalStorage</span>
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
                    <option value="once">Once / Merienda</option>
                    <option value="cena">Cena (20:00)</option>
                    <option value="snack">Snack / Colación</option>
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
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gym-950 font-black text-xs transition-all shadow-md"
              >
                Guardar Comida en la Base de Datos
              </button>
            </form>
          )}

          {/* Caloric & Macro Overview Card */}
          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Consumo Acumulado Hoy</span>
                  <button
                    type="button"
                    onClick={() => setShowBiometricsModal(true)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all"
                    title="Ver y calibrar fórmula clínica de Mifflin-St Jeor"
                  >
                    <Dna className="w-3 h-3" />
                    <span>Mifflin: {athletePlan.bmr} kcal • {athletePlan.weightKg}kg</span>
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
                <span className="text-[9px] text-sky-300/80 block mt-0.5 font-mono">{athletePlan.formulaDetails.proteinTargetInfo}</span>
              </div>
              <div className="bg-gym-900/80 border border-amber-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Carbohidratos</span>
                <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5">
                  {totalCarbsToday}g <span className="text-[10px] text-slate-400 font-normal">/ {targetCarbs}g</span>
                </div>
                <span className="text-[9px] text-amber-300/80 block mt-0.5 font-mono">Energía 19:00</span>
              </div>
              <div className="bg-gym-900/80 border border-pink-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Grasas</span>
                <div className="text-base sm:text-lg font-black text-pink-400 font-mono mt-0.5">
                  {totalFatsToday}g <span className="text-[10px] text-slate-400 font-normal">/ {targetFats}g</span>
                </div>
                <span className="text-[9px] text-pink-300/80 block mt-0.5 font-mono">{athletePlan.formulaDetails.fatsTargetInfo}</span>
              </div>
            </div>
          </div>

          {/* Listado de Comidas Registradas Hoy */}
          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-gym-700 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Comidas Registradas Hoy ({athleteMealsToday.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {athleteMealsToday.length === 0 ? 'Sin registros aún' : 'Sincronizadas'}
              </span>
            </div>

            {athleteMealsToday.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gym-900 border border-gym-700 flex items-center justify-center mx-auto text-slate-500">
                  <Apple className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300 font-semibold">No hay comidas registradas hoy para {USERS[selectedAthlete]?.name}.</p>
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
                        <span className="font-black text-xs text-white truncate">{meal.title}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gym-800 text-slate-300 border border-gym-700">
                          {meal.mealType}
                        </span>
                        {meal.source === 'coach_ai' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            Coach AI
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
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-gym-800 transition-all shrink-0"
                      title="Eliminar registro de comida"
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
                <span className="font-extrabold text-white block">1 Sola Cocinada</span>
                <span className="text-slate-400">Mismo plato/receta para ambos en almuerzos y cenas (20:00).</span>
              </div>
            </div>

            <div className="bg-gym-800/80 border border-sky-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-white block">Porciones Diferenciadas</span>
                <span className="text-slate-400">Gramajes exactos para Dionicio (180 cm) y Paula (160 cm).</span>
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
          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 no-print">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span>¿Qué tienen en su refrigerador / despensa hoy?</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {pantryItems.length} ingredientes informados
              </span>
            </div>

            {/* Preset Category Chips */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Selección rápida de ingredientes comunes (haz clic para activar/desactivar):
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COMMON_INGREDIENTS.map((item) => {
                  const isSelected = pantryItems.includes(item.name);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePresetIngredient(item.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-gym-950 font-bold shadow-md shadow-emerald-500/20 border border-emerald-400'
                          : 'bg-gym-900/90 text-slate-300 border border-gym-700 hover:border-slate-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Ingredient Form */}
            <form onSubmit={handleAddCustomItem} className="pt-2 border-t border-gym-700 flex gap-2">
              <input
                type="text"
                value={customItemInput}
                onChange={(e) => setCustomItemInput(e.target.value)}
                placeholder="Otro ingrediente (ej: Quesillo, Ajo, Zapallito italiano)..."
                className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!customItemInput.trim()}
                className="px-4 py-2.5 bg-gym-700 hover:bg-gym-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir</span>
              </button>
            </form>

            {/* Active Pantry Tags */}
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ingredientes activos en despensa ({pantryItems.length}):
              </label>
              <div className="flex flex-wrap gap-2">
                {pantryItems.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gym-900 border border-gym-700 text-slate-200 text-xs font-medium"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item)}
                      className="text-slate-500 hover:text-red-400"
                      title="Quitar ingrediente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
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

          <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-emerald-400" />
                  <span>Diseñador Estricto de Menú Semanal</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Genera una planificación de Lunes a Viernes usando estrictamente los {pantryItems.length} ingredientes de la despensa.
                </p>
              </div>

              {generatedMenu && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMenu}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gym-900 hover:bg-gym-700 text-slate-200 border border-gym-700 rounded-xl text-xs font-bold transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={handlePrintMenu}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateMenu}
              disabled={isLoading || pantryItems.length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:opacity-95 text-gym-900 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Diseñando menú con recetas compartidas y porciones exactas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span>Diseñar / Actualizar Menú Semanal (Lunes a Viernes)</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Menu Display Sheet */}
          {generatedMenu && (
            <div className="printable-page bg-gym-800/90 border border-gym-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gym-700 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-xl font-black text-white">Menú Dúo: Receta Compartida & Porciones Diferenciadas</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generado el {generatedMenu.generatedAt} para <strong>Dionicio</strong> y <strong>Paula</strong>.
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  {generatedMenu.isAI ? '⚡ Diseñado con Gemini AI' : '📋 Plantilla de Despensa Estricta'}
                </span>
              </div>

              {/* Guidelines Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gym-900/80 p-4 rounded-2xl border border-gym-700/60">
                <div className="space-y-1">
                  <span className="font-black text-sky-400 flex items-center gap-1.5">
                    <span>👨‍💻 Dionicio (180 cm):</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Ayuno matutino • Almuerzo 13:30 (Porción grande) • <strong>Cena fuerte post-entreno a las 20:00</strong>.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-black text-pink-400 flex items-center gap-1.5">
                    <span>👩‍💼 Paula (41 años, 160 cm):</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Desayuno liviano proteico • Almuerzo balanceado • <strong>Cena post-entreno a las 20:00 (Porción ajustada)</strong>.
                  </p>
                </div>
              </div>

              {/* Menu Markdown / Text Rendering */}
              <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-gym-900/60 p-5 rounded-2xl border border-gym-700/50">
                {generatedMenu.content}
              </div>
            </div>
          )}
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
    </div>
  );
}
