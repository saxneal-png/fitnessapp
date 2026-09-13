import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { generateStrictPantryMenu, getStoredGeminiKey } from '../services/geminiService';
import { 
  saveCloudPantryItems, 
  subscribeToPantryItems, 
  saveCloudWeeklyMenu, 
  subscribeToWeeklyMenu 
} from '../firebase/config';
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
  Cloud
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

    return () => {
      unsubPantry();
      unsubMenu();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-black text-white">Despensa & Menú Dúo (Misma Receta)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Una sola preparación en la cocina para ambos. <strong>Receta idéntica</strong> con <strong>porciones y gramajes individuales</strong> basados 100% en su despensa.
          </p>
        </div>

        {generatedMenu && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMenu}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gym-800 hover:bg-gym-700 text-slate-200 border border-gym-700 rounded-xl text-xs font-bold transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handlePrintMenu}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Menú</span>
            </button>
          </div>
        )}
      </div>

      {/* Reglas Clave de la Cocina en Pareja */}
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
            <span className="text-slate-400">Solo se usan ingredientes de la lista que informen abajo.</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

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
                  onClick={() => togglePresetIngredient(item.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-gym-900 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-gym-900/80 text-slate-400 hover:text-white border border-gym-700 hover:border-slate-500'
                  }`}
                >
                  <span>{item.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Ingredient Input Form */}
        <form onSubmit={handleAddCustomItem} className="flex gap-2 pt-2 border-t border-gym-700/60">
          <input
            type="text"
            placeholder="¿Otro ingrediente en casa? Ej: Champiñones, Zapallo italiano, Lentejas, Salmón..."
            value={customItemInput}
            onChange={(e) => setCustomItemInput(e.target.value)}
            className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-gym-700 hover:bg-gym-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </form>

        {/* Active Items Badges */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ingredientes activos para la planificación estricta:
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {pantryItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gym-900 border border-gym-700 rounded-lg text-xs text-slate-200 font-medium"
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

        {/* Generate Button */}
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
              <span>Diseñar Menú Semanal (Lunes a Viernes)</span>
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
  );
}
