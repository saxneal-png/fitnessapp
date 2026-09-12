import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  Key
} from 'lucide-react';
import confetti from 'canvas-confetti';

const PANTRY_STORAGE_KEY = 'fitness_duo_pantry_items';
const MENU_STORAGE_KEY = 'fitness_duo_weekly_menu';
const GEMINI_STORAGE_KEY = 'fitness_gemini_api_key';

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
  const { currentUser, householdId } = useAuth();
  
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

  useEffect(() => {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    if (generatedMenu) {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(generatedMenu));
    }
  }, [generatedMenu]);

  const togglePresetIngredient = (name) => {
    if (pantryItems.includes(name)) {
      setPantryItems(pantryItems.filter(i => i !== name));
    } else {
      setPantryItems([...pantryItems, name]);
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    const item = customItemInput.trim();
    if (item && !pantryItems.includes(item)) {
      setPantryItems([...pantryItems, item]);
      setCustomItemInput('');
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    setPantryItems(pantryItems.filter(i => i !== itemToRemove));
  };

  // Generate Menu via Gemini or Structured Intelligent Fallback
  const handleGenerateMenu = async () => {
    if (pantryItems.length === 0) {
      alert('Por favor selecciona o añade al menos 2 o 3 ingredientes disponibles en tu despensa.');
      return;
    }

    setIsLoading(true);
    const apiKey = localStorage.getItem(GEMINI_STORAGE_KEY);

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Actúa como un Nutricionista Deportivo de precisión. Diseña un plan de comidas de Lunes a Viernes para una pareja (Dionicio y Paula) que entrena de 19:00 a 20:00 con mancuernas y trotadora.

Ingredientes disponibles en su despensa/refrigerador:
${pantryItems.join(', ')}

Perfiles Nutricionales Estrictos:
- Dionicio (180 cm):
  * Horario: Ayuno matutino intermitente.
  * Almuerzo: 13:00 - 14:00 (Alto en proteínas y carbohidratos complejos para energía del entrenamiento).
  * Cena Post-Entreno: 20:00 en punto (Inmediatamente post-entreno: alto en proteínas para síntesis muscular y carbohidratos de reposición).
- Paula (41 años, 160 cm):
  * Desayuno: Liviano y proteico (ej: huevos con espinaca o avena proteica).
  * Almuerzo: Balanceado y nutritivo.
  * Cena Post-Entreno: 20:00 (Ligera pero saciante con proteína magra y vegetales).

Instrucciones de formato:
Devuelve un plan estructurado, apetitoso y fácil de preparar día por día (Lunes, Martes, Miércoles, Jueves, Viernes) con las porciones sugeridas para cada uno, además de 2 tips de meal-prep para ahorrar tiempo y una pequeña lista de compras de 3 o 4 ingredientes recomendados si hicieran falta.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        setGeneratedMenu({
          generatedAt: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          ingredientsUsed: pantryItems,
          content: text,
          isAI: true
        });

        try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
      } catch (err) {
        console.error('Gemini Menu generation error:', err);
        generateFallbackMenu();
      }
    } else {
      // Fallback structured menu
      generateFallbackMenu();
    }

    setIsLoading(false);
  };

  const generateFallbackMenu = () => {
    const fallbackText = `### 🥗 Plan Nutricional Semanal (Lunes a Viernes)

#### 📅 LUNES
- **👨‍💻 Dionicio:**
  - *Almuerzo (13:30):* Pechuga de pollo a la plancha (200g) con arroz integral (1.5 tazas), ensalada de hojas verdes y aceite de oliva.
  - *Cena Post-Entreno (20:00):* Omelette de 4 huevos con espinacas y 1 rebanada de pan integral con palta.
- **👩‍💼 Paula:**
  - *Desayuno:* Omelette de 2 claras y 1 huevo entero con espinacas y té/café sin azúcar.
  - *Almuerzo:* Pechuga de pollo (120g) con arroz (1/2 taza) y ensalada verde abundante con palta.
  - *Cena Post-Entreno (20:00):* Ensalada tibia de hojas verdes con atún al natural y cubos de huevo duro.

---

#### 📅 MARTES
- **👨‍💻 Dionicio:**
  - *Almuerzo (13:30):* Carne magra salteada con papas cocidas/al horno (250g) y tomate.
  - *Cena Post-Entreno (20:00):* Bowl de arroz blanco con atún (2 latas), palta y huevo pochado.
- **👩‍💼 Paula:**
  - *Desayuno:* Bowl de avena cocida con agua/leche y un toque de yogurt griego.
  - *Almuerzo:* Carne magra (130g) con ensalada de tomate, zanahoria y 1 papa pequeña.
  - *Cena Post-Entreno (20:00):* Atún con ensalada mixta y 1/4 de palta.

---

#### 📅 MIÉRCOLES
- **👨‍💻 Dionicio:**
  - *Almuerzo (13:30):* Pollo desmenuzado en salsa de tomate natural con arroz y palta.
  - *Cena Post-Entreno (20:00):* Revuelto de 4 huevos con atún y tostadas integrales.
- **👩‍💼 Paula:**
  - *Desayuno:* 2 huevos revueltos con tomate cherry y café.
  - *Almuerzo:* Pollo a la plancha (120g) con ensalada fresca de hojas verdes y aceite de oliva.
  - *Cena Post-Entreno (20:00):* Revuelto de 2 huevos con atún y espinacas salteadas.

---

#### 📅 JUEVES
- **👨‍💻 Dionicio:**
  - *Almuerzo (13:30):* Carne molida magra con arroz y brócoli al vapor con aceite de oliva.
  - *Cena Post-Entreno (20:00):* Pechuga de pollo marinada con papas al horno y ensalada verde.
- **👩‍💼 Paula:**
  - *Desayuno:* Yogurt griego con 2 cucharadas de avena y frutos secos.
  - *Almuerzo:* Carne magra con ensalada abundante de brócoli y tomate.
  - *Cena Post-Entreno (20:00):* Filete de pollo a la plancha con brócoli al vapor y limón.

---

#### 📅 VIERNES
- **👨‍💻 Dionicio:**
  - *Almuerzo (13:30):* Arroz salteado con pollo, verduras mixtas y huevo estilo wok.
  - *Cena Post-Entreno (20:00):* 4 huevos fritos en oliva con pan integral, palta y tomate.
- **👩‍💼 Paula:**
  - *Desayuno:* Pan integral con huevo pochado y palta.
  - *Almuerzo:* Wok de pollo con verduras abundantes y 1/3 taza de arroz.
  - *Cena Post-Entreno (20:00):* Omelette de espinacas y atún con ensalada fresca.

---

💡 **Consejo de Meal-Prep en Pareja:** Cocinen el arroz y horneen el pollo el domingo o lunes en la tarde para tener la base lista de toda la semana y solo armar los platos en 5 minutos al terminar a las 20:00.`;

    setGeneratedMenu({
      generatedAt: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      ingredientsUsed: pantryItems,
      content: fallbackText,
      isAI: false
    });
    try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
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
            <h2 className="text-2xl font-black text-white">Despensa & Menú Semanal (Lunes a Viernes)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Dinos qué ingredientes tienen en casa y la IA diseñará el menú exacto para el ayuno de <strong>Dionicio</strong> (almuerzo 13:30 y cena 20:00) y la nutrición de <strong>Paula</strong>.
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

      {/* Pantry Selector Box */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 no-print">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span>¿Qué tienen en su refrigerador / despensa hoy?</span>
          </h3>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
            {pantryItems.length} ingredientes listos
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
            placeholder="¿Otro ingrediente? Ej: Salmón, Champiñones, Quinoa, Lentejas..."
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
            Ingredientes activos para la planificación:
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
              <span>Diseñando menú personalizado con lo que tienen...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Generar Menú de Lunes a Viernes</span>
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
                <h3 className="text-xl font-black text-white">Menú Semanal Personalizado (Lunes a Viernes)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generado el {generatedMenu.generatedAt} para <strong>Dionicio</strong> y <strong>Paula</strong>.
              </p>
            </div>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              {generatedMenu.isAI ? '⚡ Diseñado con Gemini AI' : '📋 Plantilla Inteligente'}
            </span>
          </div>

          {/* Guidelines Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gym-900/80 p-4 rounded-2xl border border-gym-700/60">
            <div className="space-y-1">
              <span className="font-black text-sky-400 flex items-center gap-1.5">
                <span>👨‍💻 Dionicio (180 cm):</span>
              </span>
              <p className="text-slate-300 leading-relaxed">
                Ayuno en la mañana • Almuerzo 13:00-14:00 • <strong>Cena fuerte post-entreno a las 20:00</strong>.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-black text-pink-400 flex items-center gap-1.5">
                <span>👩‍💼 Paula (41 años, 160 cm):</span>
              </span>
              <p className="text-slate-300 leading-relaxed">
                Desayuno proteico liviano • Almuerzo balanceado • <strong>Cena post-entreno a las 20:00</strong>.
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
