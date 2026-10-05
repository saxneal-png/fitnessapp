import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS, WORKOUT_DAYS } from '../data/workoutCatalog';
import { 
  askCoachWithFullContext, 
  analyzeCoachChatWithAction,
  buildHouseholdContext, 
  getStoredGeminiKey, 
  saveGeminiKey,
  getStoredGeminiModel,
  saveGeminiModel,
  GEMINI_AVAILABLE_MODELS
} from '../services/geminiService';
import { saveNutritionLog } from '../firebase/config';
import { calculateAthleteNutrition } from '../services/nutritionCalculator';
import { subscribeToFoodCatalog, saveFoodItemToKnowledgeBase } from '../services/foodKnowledgeService';
import { BiometricsModal } from './BiometricsModal';
import { MealSettingsModal } from './MealSettingsModal';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Send, 
  Key, 
  Bot, 
  User, 
  RefreshCw, 
  Zap, 
  Flame, 
  Utensils, 
  Dumbbell, 
  ShieldCheck, 
  Check, 
  Activity, 
  Layers, 
  ShoppingBag, 
  Scale, 
  PlusCircle, 
  Apple, 
  CheckCircle2, 
  BookmarkPlus, 
  Target, 
  Dna,
  Settings2,
  Database,
  Coffee
} from 'lucide-react';

export function GeminiCoach() {
  const { currentUser, userProfile, householdId } = useAuth();
  const [apiKey, setApiKey] = useState(() => getStoredGeminiKey(currentUser));
  const [selectedModel, setSelectedModel] = useState(() => getStoredGeminiModel(currentUser));
  const [showKeyInput, setShowKeyInput] = useState(() => !getStoredGeminiKey(currentUser));
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [showMealSettingsModal, setShowMealSettingsModal] = useState(false);
  const [learnedCatalog, setLearnedCatalog] = useState([]);
  const [tempKey, setTempKey] = useState(() => getStoredGeminiKey(currentUser));
  const [householdStats, setHouseholdStats] = useState(() => buildHouseholdContext(householdId, currentUser));
  const [savingMealIdx, setSavingMealIdx] = useState(null);
  const [autoSaveMeals, setAutoSaveMeals] = useState(() => {
    return localStorage.getItem('fitness_duo_auto_save_meals') !== 'false';
  });

  const isDuoHousehold = householdId === 'hogar-dionicio-paula' && (currentUser === 'dionicio' || currentUser === 'paula');

  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      content: isDuoHousehold
        ? `¡Hola Dionicio y Paula! Soy su Agente Fitness y Asesor Nutricional Autónomo para su programa "Dúo en Casa" (19:00 a 20:00).
🇨🇱 Adaptado a la estructura chilena: Desayuno, Almuerzo y Once / Once-Comida (¡sin cena!).
Tengo acceso en tiempo real a sus entrenamientos, su Despensa y la Base de Alimentos & Marcas del Hogar:
- 🥗 **Dime lo que comieron** en lenguaje natural y calcularé los nutrientes exactos para ambos.
- 🎯 **Te diré con exactitud clínica qué y cuánto les falta para cerrar el día**.
- 🥪 **Les sugeriré su Once Dúo Post-Entreno (20:00) usando EXCLUSIVAMENTE los alimentos de su despensa compartida.**`
        : `¡Hola ${userProfile?.name || 'Atleta'}! Soy tu Personal Trainer y Asesor Nutricional Autónomo Privado.
Estoy conectado en tiempo real a tus entrenamientos, series de pesas, cardio y tus metas calóricas personales:
- 🥗 **Dime lo que comiste en lenguaje natural** y calcularé calorías y macros exactos.
- 🎯 **Te diré con exactitud cuánto te falta para cerrar el día** según tu objetivo (${userProfile?.activeMode || 'Pérdida de Grasa'}).
- 🏋️‍♂️ **Recomendaré los pesos y series para tu sesión de hoy** con sobrecarga progresiva.

¿Qué comiste hoy o qué consulta tienes para tu entrenamiento?`
    }
  ]);

  // Actualizar apiKey y stats al cambiar de usuario
  useEffect(() => {
    const currentKey = getStoredGeminiKey(currentUser);
    setApiKey(currentKey);
    setTempKey(currentKey);
    setShowKeyInput(!currentKey);
    setSelectedModel(getStoredGeminiModel(currentUser));
    setHouseholdStats(buildHouseholdContext(householdId, currentUser));
  }, [currentUser, householdId]);

  // Suscripción al catálogo de marcas aprendidas del hogar
  useEffect(() => {
    const unsub = subscribeToFoodCatalog(householdId, (catalog) => {
      if (catalog && Array.isArray(catalog)) {
        setLearnedCatalog(catalog);
      }
    });
    return () => unsub();
  }, [householdId]);

  // Toggle auto-save setting
  const toggleAutoSave = () => {
    const nextVal = !autoSaveMeals;
    setAutoSaveMeals(nextVal);
    localStorage.setItem('fitness_duo_auto_save_meals', String(nextVal));
  };

  // Refresh household context stats periodically or on focus
  useEffect(() => {
    setHouseholdStats(buildHouseholdContext(householdId, currentUser));
  }, [householdId, currentUser, messages]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    const clean = tempKey.trim();
    setApiKey(clean);
    saveGeminiKey(clean, currentUser);
    saveGeminiModel(selectedModel, currentUser);
    setShowKeyInput(false);
  };

  const handleSaveDetectedMeal = async (mealData, messageIdx) => {
    if (!mealData) return;
    setSavingMealIdx(messageIdx);

    try {
      const entriesToSave = Array.isArray(mealData.entries) && mealData.entries.length > 0
        ? mealData.entries
        : [{
            userId: mealData.userId || currentUser,
            mealType: mealData.mealType || 'almuerzo',
            title: mealData.title || 'Comida registrada con Coach',
            caloriesKcal: mealData.caloriesKcal || 0,
            proteinG: mealData.proteinG || 0,
            carbsG: mealData.carbsG || 0,
            fatsG: mealData.fatsG || 0,
            items: mealData.items || [],
            coachFeedback: mealData.summary || '',
            source: 'coach_ai'
          }];

      for (const entry of entriesToSave) {
        await saveNutritionLog({
          userId: entry.userId || currentUser,
          mealType: entry.mealType || 'almuerzo',
          title: entry.title || 'Comida registrada con Coach',
          caloriesKcal: entry.caloriesKcal || 0,
          proteinG: entry.proteinG || 0,
          carbsG: entry.carbsG || 0,
          fatsG: entry.fatsG || 0,
          items: entry.items || [],
          coachFeedback: entry.coachFeedback || mealData.summary || '',
          source: 'coach_ai'
        }, householdId);
      }

      // Actualizar estado del mensaje para mostrar "Guardado"
      setMessages(prev => prev.map((msg, i) => {
        if (i === messageIdx) {
          return { ...msg, mealSaved: true };
        }
        return msg;
      }));

      // Efecto visual de logro
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {}

      // Actualizar métricas del hogar
      setHouseholdStats(buildHouseholdContext(householdId));
    } catch (err) {
      console.error('Error al guardar comida:', err);
      alert('Error al guardar la comida en la base de datos: ' + err.message);
    } finally {
      setSavingMealIdx(null);
    }
  };

  const executeCoachPrompt = async (promptText) => {
    const userMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await analyzeCoachChatWithAction(promptText, currentUser, householdId, apiKey);
      
      let wasAutoSaved = false;

      // Auto-guardado autónomo si está habilitado
      if (response.detectedMeal && autoSaveMeals) {
        try {
          const entriesToSave = Array.isArray(response.detectedMeal.entries) && response.detectedMeal.entries.length > 0
            ? response.detectedMeal.entries
            : [{
                userId: response.detectedMeal.userId || currentUser,
                mealType: response.detectedMeal.mealType || 'almuerzo',
                title: response.detectedMeal.title || 'Comida registrada con Coach',
                caloriesKcal: response.detectedMeal.caloriesKcal || 0,
                proteinG: response.detectedMeal.proteinG || 0,
                carbsG: response.detectedMeal.carbsG || 0,
                fatsG: response.detectedMeal.fatsG || 0,
                items: response.detectedMeal.items || [],
                coachFeedback: response.detectedMeal.summary || '',
                source: 'coach_autonomous'
              }];

          for (const entry of entriesToSave) {
            await saveNutritionLog({
              userId: entry.userId || currentUser,
              mealType: entry.mealType || 'almuerzo',
              title: entry.title || 'Comida registrada con Coach',
              caloriesKcal: entry.caloriesKcal || 0,
              proteinG: entry.proteinG || 0,
              carbsG: entry.carbsG || 0,
              fatsG: entry.fatsG || 0,
              items: entry.items || [],
              coachFeedback: entry.coachFeedback || response.detectedMeal.summary || '',
              source: 'coach_autonomous'
            }, householdId);
          }

          // Guardar también cualquier marca comercial aprendida por el Coach IA
          if (Array.isArray(response.detectedMeal.learnedFoods) && response.detectedMeal.learnedFoods.length > 0) {
            for (const food of response.detectedMeal.learnedFoods) {
              try {
                await saveFoodItemToKnowledgeBase(food, householdId);
                console.log(`✨ [Coach Chat] Alimento comercial aprendido: ${food.name}`);
              } catch (e) {
                console.warn('Error guardando alimento aprendido:', e);
              }
            }
          }

          wasAutoSaved = true;

          try {
            confetti({
              particleCount: 40,
              spread: 55,
              origin: { y: 0.85 }
            });
          } catch (e) {}

          setHouseholdStats(buildHouseholdContext(householdId));
        } catch (saveErr) {
          console.warn('Error en auto-guardado autónomo de comida:', saveErr);
        }
      }

      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: response.text,
          detectedMeal: response.detectedMeal,
          mealSaved: wasAutoSaved
        }
      ]);
    } catch (err) {
      console.error('Error with Gemini Coach:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error al conectar con Gemini: ${err.message || 'Verifica tu API Key de Google AI Studio y vuelve a intentar.'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    const q = inputQuery;
    setInputQuery('');
    executeCoachPrompt(q);
  };

  const handlePresetPrompt = (type) => {
    const isDionicio = currentUser === 'dionicio';
    const athleteName = isDionicio ? 'Dionicio' : 'Paula';

    if (type === 'closure_check') {
      executeCoachPrompt(`¿Qué y cuánto me falta exactamente para cerrar el día según mi meta calórica y proteica? Dime qué puedo preparar hoy con los alimentos que tenemos registrados en nuestra despensa.`);
    } else if (type === 'sync_dinner') {
      executeCoachPrompt(`Viendo lo que hemos comido hoy y los ingredientes de nuestra despensa (${householdStats.pantryItems.slice(0, 8).join(', ')}), ¿cuál es la Once / Once-Comida post-entreno perfecta para las 20:00 para ambos atletas?`);
    } else if (type === 'log_meal_lunch') {
      executeCoachPrompt(`Registra mi almuerzo de hoy: Comí 200g de pechuga de pollo a la plancha con una taza de arroz y ensalada de espinaca con una cucharadita de aceite de oliva.`);
    } else if (type === 'log_duo_day') {
      executeCoachPrompt(`Esto llevamos al día de hoy: yo al desayuno: un diente de marraqueta con 40 gramos de pechuga de pollo con un café endulzado con alulosa, de almuerzo comí 178 gramos de arroz con 57 gramos de salmón y 61 gramos de merluza a la plancha, y 190 gramos de zapallo italiano cocido. Mi esposa al desayuno: un diente de marraqueta con 40 gramos de pechuga de pollo con un café endulzado con alulosa, de almuerzo comí 80 gramos de arroz con 55 gramos de salmón y 45 gramos de merluza a la plancha, y 150 gramos de zapallo italiano cocido.`);
    } else if (type === 'log_chile_once') {
      executeCoachPrompt(`Registra nuestra Once post-entreno (20:00): Yo tomé 1 vaso de leche loncoleche full pro con un diente de marraqueta y 50g de pechuga de pollo. Mi esposa tomó 1 vaso de leche loncoleche full pro con medio diente de marraqueta y 40g de pechuga de pollo.`);
    } else if (type === 'live_session_briefing') {
      executeCoachPrompt(`Actúa como nuestro coach en vivo. Genera el Briefing Estratégico para la sesión de hoy (19:00 a 20:00). Analiza nuestras últimas series registradas, recomienda qué pesos debemos calibrar hoy en las mancuernas y cómo debemos coordinar la rotación de 25 min.`);
    } else if (type === 'evaluate_mode') {
      const modeName = householdStats.nutrition?.[currentUser]?.plan?.activeModeConfig?.name || 'Pérdida de Grasa Visceral';
      const wRatio = householdStats.nutrition?.[currentUser]?.plan?.recommendation?.waistHeightRatio || '0.51';
      executeCoachPrompt(`Analiza mis datos biométricos actuales: estoy en modo "${modeName}" con un ratio cintura/altura de ${wRatio}. Viendo mis registros de peso, medidas corporales y progreso de sobrecarga en mancuernas, ¿qué opinas de mi evolución? ¿Debo seguir en este modo o ya cumplo los criterios para cambiar a Recomposición Corporal o Hipertrofia? Dame tu veredicto experto y qué priorizar.`);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-black text-white">Centro de Inteligencia Gemini Coach</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Conectado en vivo con los registros de fuerza, trotadora, despensa y base de marcas del hogar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowMealSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 hover:bg-gym-700 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Configurar esquema de comidas en Chile (Desayuno, Almuerzo, Once)"
          >
            <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>🇨🇱 Horarios & Once</span>
          </button>

          <span className="text-[11px] font-mono text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2.5 py-1.5 rounded-xl hidden sm:flex items-center gap-1">
            <Database className="w-3 h-3 text-sky-400" />
            <span>{learnedCatalog.length} marcas</span>
          </span>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gym-800 hover:bg-gym-700 text-slate-300 border border-gym-700 rounded-xl text-xs font-semibold transition-all"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{apiKey ? 'API Key Configurada' : 'Ingresar API Key'}</span>
          </button>
        </div>
      </div>

      {/* 360° Live Household Context Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gym-800/90 border border-sky-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
            <Dumbbell className="w-4 h-4" />
            <span>Series del Hogar</span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {householdStats.totalLogsCount} <span className="text-xs font-normal text-slate-400">registros</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Sincronizados en Firestore</span>
        </div>

        <div className="bg-gym-800/90 border border-pink-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold">
            <Activity className="w-4 h-4" />
            <span>Atleta & Modo</span>
          </div>
          <div className="text-xl font-black text-white flex items-center justify-between">
            <span>{USERS[currentUser]?.name}</span>
            <span className="text-sm">
              {householdStats.nutrition?.[currentUser]?.plan?.activeModeConfig?.icon || '🔥'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBiometricsModal(true)}
            className="text-[10px] text-pink-300 hover:text-white underline block text-left truncate font-medium"
            title="Ver diagnóstico biométrico y cambiar de modo"
          >
            Modo: {householdStats.nutrition?.[currentUser]?.plan?.activeModeConfig?.shortName || 'Grasa Visceral'}
          </button>
        </div>

        <div className="bg-gym-800/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <ShoppingBag className="w-4 h-4" />
            <span>Despensa Activa</span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {householdStats.pantryItems.length} <span className="text-xs font-normal text-slate-400">ítems</span>
          </div>
          <span className="text-[10px] text-emerald-300 block">100% cocina compartida</span>
        </div>

        <div className="bg-gym-800/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <Utensils className="w-4 h-4" />
            <span>Menú Semanal</span>
          </div>
          <div className="text-xl font-black text-white">
            {householdStats.hasActiveMenu ? 'Activo' : 'Pendiente'}
          </div>
          <span className="text-[10px] text-slate-400 block">Once fijada a las 20:00</span>
        </div>
      </div>

      {/* Personal Trainer Telemetry Card */}
      {(() => {
        const metrics = currentUser === 'dionicio' ? householdStats.dionicioMetrics : householdStats.paulaMetrics;
        const prList = Object.entries(metrics?.exercisePRs || {});
        return (
          <div className="bg-gym-800/60 border border-gym-700/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Métricas de Personal Trainer ({USERS[currentUser]?.name})</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Volumen Semanal: <strong className="text-white font-mono">{metrics?.weeklyVolumeKg || 0} kg</strong> • RPE Promedio: <strong className="text-white font-mono">{metrics?.avgRpe || '8.0'}</strong>
              </span>
            </div>

            {prList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {prList.map(([exName, data]) => (
                  <div key={exName} className="bg-gym-900/80 border border-gym-700/50 rounded-xl p-2.5 text-xs space-y-1">
                    <div className="font-bold text-white truncate">{exName}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Récord: <strong className="text-amber-400">{data.maxWeightKg}kg</strong> (x{data.bestSetReps})</span>
                      <span>Último: {data.lastLoggedWeight}kg</span>
                    </div>
                    <div className="text-[10px] text-sky-400 leading-tight">
                      👉 {data.suggestedOverload}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-gym-900/40 rounded-xl p-3 border border-dashed border-gym-700">
                🎯 Fase de Calibración (Semana 0): Registra tus primeras series en el Registrador para que el Personal Trainer calcule tus récords de carga y sobrecarga progresiva.
              </div>
            )}
          </div>
        );
      })()}

      {/* API Key Modal / Banner */}
      {showKeyInput && (
        <div className="bg-gym-800/95 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Google Gemini API Key (Privada en tu Navegador)</h4>
            </div>
            {apiKey && (
              <button onClick={() => setShowKeyInput(false)} className="text-slate-400 hover:text-white text-xs">
                Cerrar
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu clave se guarda únicamente en el <code className="text-amber-300">localStorage</code> de este dispositivo y nunca se comparte.
            Puedes obtenerla gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline">Google AI Studio</a>.
          </p>

          <form onSubmit={handleSaveKey} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-gym-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Modelo de IA Activo
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  saveGeminiModel(e.target.value);
                }}
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
              >
                {GEMINI_AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>
      )}

      {/* 1-Click Smart Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => handlePresetPrompt('evaluate_mode')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
            <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🎯 Evaluar Modo & Avances</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Analiza ratio cintura/altura, medidas y decide si cambiar de fase.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('analyze_fatigue')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-sky-950/40 border border-sky-500/30 hover:border-sky-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
            <Dumbbell className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>📊 Analizar Fatiga & RPE</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Evalúa la sobrecarga real de las series de {USERS[currentUser]?.name}.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('sync_dinner')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Coffee className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🥪 Coordinar Once Dúo (20:00)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sincroniza la Once / Once-Comida compartida con el gasto de la sesión.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('joint_comfort')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-pink-950/40 border border-pink-500/30 hover:border-pink-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🛡️ Ajustes Biomecánicos</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Variantes seguras para cuidar hombros, rodillas y zona lumbar.
          </p>
        </button>
      </div>

      {/* Live Caloric & Macro Balance Today Bar */}
      {(() => {
        const nutData = householdStats.nutrition?.[currentUser] || { todayCals: 0, targetCals: 2000, todayProtein: 0, targetProtein: 140, todayMealsCount: 0 };
        const pct = Math.min(100, Math.round((nutData.todayCals / (nutData.targetCals || 1)) * 100));
        const isDionicio = currentUser === 'dionicio';

        return (
          <div className="bg-gradient-to-r from-gym-800 via-gym-800/90 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                    <span>Balance Calórico de Hoy</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isDionicio ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'}`}>
                      {USERS[currentUser]?.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {nutData.todayMealsCount} comidas registradas en la base de datos hoy
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowBiometricsModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="Ajusta tu edad, peso, altura, objetivo y revisa la fórmula clínica de Mifflin-St Jeor"
                >
                  <Dna className="w-3.5 h-3.5 text-sky-400" />
                  <span>🧬 Biometría ({nutData.plan?.weightKg || 80}kg • {nutData.plan?.goalLabel || 'Recomposición'})</span>
                </button>

                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                    autoSaveMeals
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-gym-900 text-slate-400 border-gym-700'
                  }`}
                  title="Guarda automáticamente en BD al calcular tus comidas sin clics extra"
                >
                  <span className={`w-2 h-2 rounded-full ${autoSaveMeals ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{autoSaveMeals ? '⚡ Auto-guardado Activo' : 'Guardado Manual'}</span>
                </button>

                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {nutData.todayCals} <span className="text-xs text-slate-400 font-normal">/ {nutData.targetCals} kcal</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">{pct}% del objetivo diario</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gym-900 rounded-full h-2.5 overflow-hidden border border-gym-700/60">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  pct > 105 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 to-sky-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Macro Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-gym-900/80 border border-gym-700 flex items-center gap-1.5 font-mono">
                <span className="text-sky-400 font-bold">Proteína:</span>
                <span className="text-white font-black">{nutData.todayProtein}g</span>
                <span className="text-[10px] text-slate-400">/ {nutData.targetProtein}g</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-gym-900/80 border border-gym-700 flex items-center gap-1.5 font-mono">
                <span className="text-amber-400 font-bold">Faltan hoy:</span>
                <span className="text-slate-200 font-bold">
                  {Math.max(0, nutData.targetCals - nutData.todayCals)} kcal
                </span>
                <span className="text-slate-400">({Math.max(0, nutData.targetProtein - nutData.todayProtein)}g prot)</span>
              </div>
              <span className="text-[11px] text-slate-400 italic ml-auto hidden sm:inline">
                💡 Cuéntale lo que comiste y el Coach calculará los macros y tu cena con la despensa.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Quick Coaching Actions & Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <button
          onClick={() => handlePresetPrompt('log_duo_day')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all group active:scale-95 sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>👥 Registrar Día Dúo</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Desglosa marraqueta, salmón, merluza y arroz para ambos a la vez.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('closure_check')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all group active:scale-95"
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Target className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🎯 ¿Qué falta para cerrar el día?</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Calcula el saldo calórico y qué preparar con tu despensa.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('sync_dinner')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group active:scale-95"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Utensils className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🥘 Cena Post-Entreno</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Receta 20:00 adaptando porciones para Dionicio y Paula.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('log_meal_lunch')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-sky-950/40 border border-sky-500/30 hover:border-sky-400 text-left transition-all group active:scale-95"
        >
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
            <BookmarkPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🥗 Registrar Almuerzo</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Calcula y guarda autónomamente pollo, arroz y ensalada.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('live_session_briefing')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-pink-950/40 border border-pink-500/30 hover:border-pink-400 text-left transition-all group active:scale-95"
        >
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
            <Dumbbell className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>⏱️ Briefing Sesión (19:00)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Recomienda pesos y rotación de mancuernas y trotadora.
          </p>
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 max-h-[550px] overflow-y-auto">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-sky-500 text-white'
                  : 'bg-gradient-to-br from-pink-500 to-indigo-600 text-white shadow-md'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] space-y-3 ${
                m.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-none'
                  : 'bg-gym-900/90 border border-gym-700 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{m.content}</div>

              {/* Tarjeta de Acción Nutricional Detectada por el Coach */}
              {m.detectedMeal && (
                <div className="mt-3 pt-3 border-t border-gym-700/80 bg-gym-950/70 rounded-xl p-3.5 space-y-3 border border-emerald-500/30">
                  {m.detectedMeal.isDuoLog || (Array.isArray(m.detectedMeal.entries) && m.detectedMeal.entries.length > 1) ? (
                    /* ================= VISTA DUAL (DIONICIO & PAULA) ================= */
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gym-800 pb-2">
                        <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <Apple className="w-4 h-4 text-emerald-400" />
                          <span>👥 Ingesta Dual Coordinada (Dionicio & Paula)</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-pink-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                          {m.detectedMeal.entries?.length || 2} Comidas Detectadas
                        </span>
                      </div>

                      {/* Tarjetas de Atletas: Dionicio y Paula */}
                      {/* Tarjetas de Atletas: Dionicio y Paula */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Dionicio */}
                        <div className="bg-gym-900/90 border border-sky-500/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                            <span>👨‍💻 Dionicio (180 cm)</span>
                            <span className="text-[10px] text-slate-400 font-mono">Meta: 1.600 kcal • 130g P</span>
                          </div>
                          
                          {/* Comidas de Dionicio */}
                          <div className="space-y-1.5">
                            {(m.detectedMeal.entries || []).filter(e => e.userId === 'dionicio').map((entry, eIdx) => (
                              <div key={eIdx} className="bg-gym-950/90 p-2 rounded-lg border border-gym-800 text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-white">
                                  <span className="truncate">{entry.title}</span>
                                  <span className="text-emerald-400 font-mono shrink-0 ml-1">{entry.caloriesKcal} kcal</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                  <span>P: <strong className="text-sky-300">{entry.proteinG}g</strong></span>
                                  <span>C: <strong className="text-amber-300">{entry.carbsG}g</strong></span>
                                  <span>G: <strong className="text-pink-300">{entry.fatsG}g</strong></span>
                                </div>
                                {Array.isArray(entry.items) && entry.items.length > 0 && (
                                  <div className="text-[10px] text-slate-400 pt-0.5">
                                    {entry.items.join(' • ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Cierre de Dionicio */}
                          {m.detectedMeal.dionicioClosure && (
                            <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/20 text-[10px] space-y-0.5 font-mono">
                              <div className="flex justify-between text-slate-300">
                                <span>Total hoy:</span>
                                <strong className="text-white">{m.detectedMeal.dionicioClosure.todayTotalCals} / {m.detectedMeal.dionicioClosure.targetCals || 1600} kcal</strong>
                              </div>
                              <div className="flex justify-between text-amber-300 font-bold">
                                <span>Faltan para cerrar:</span>
                                <span>{m.detectedMeal.dionicioClosure.remainingCals} kcal ({m.detectedMeal.dionicioClosure.remainingProtein}g prot)</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Paula */}
                        <div className="bg-gym-900/90 border border-pink-500/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-pink-400">
                            <span>👩‍💼 Paula (160 cm)</span>
                            <span className="text-[10px] text-slate-400 font-mono">Meta: 1.250 kcal • 95g P</span>
                          </div>
                          
                          {/* Comidas de Paula */}
                          <div className="space-y-1.5">
                            {(m.detectedMeal.entries || []).filter(e => e.userId === 'paula').map((entry, eIdx) => (
                              <div key={eIdx} className="bg-gym-950/90 p-2 rounded-lg border border-gym-800 text-[11px] space-y-1">
                                <div className="flex items-center justify-between font-bold text-white">
                                  <span className="truncate">{entry.title}</span>
                                  <span className="text-emerald-400 font-mono shrink-0 ml-1">{entry.caloriesKcal} kcal</span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                  <span>P: <strong className="text-sky-300">{entry.proteinG}g</strong></span>
                                  <span>C: <strong className="text-amber-300">{entry.carbsG}g</strong></span>
                                  <span>G: <strong className="text-pink-300">{entry.fatsG}g</strong></span>
                                </div>
                                {Array.isArray(entry.items) && entry.items.length > 0 && (
                                  <div className="text-[10px] text-slate-400 pt-0.5">
                                    {entry.items.join(' • ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Cierre de Paula */}
                          {m.detectedMeal.paulaClosure && (
                            <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-500/20 text-[10px] space-y-0.5 font-mono">
                              <div className="flex justify-between text-slate-300">
                                <span>Total hoy:</span>
                                <strong className="text-white">{m.detectedMeal.paulaClosure.todayTotalCals} / {m.detectedMeal.paulaClosure.targetCals || 1250} kcal</strong>
                              </div>
                              <div className="flex justify-between text-amber-300 font-bold">
                                <span>Faltan para cerrar:</span>
                                <span>{m.detectedMeal.paulaClosure.remainingCals} kcal ({m.detectedMeal.paulaClosure.remainingProtein}g prot)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Alimentos de Marcas Aprendidas */}
                      {Array.isArray(m.detectedMeal.learnedFoods) && m.detectedMeal.learnedFoods.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[11px] text-sky-200 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-sky-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Producto comercial aprendido y guardado en Firestore:</span>
                          </span>
                          {m.detectedMeal.learnedFoods.map((f, fIdx) => (
                            <div key={fIdx} className="text-slate-300">
                              • <strong>{f.name}</strong> ({f.brand || 'Marca'}): {f.servingDesc || `${f.servingSize}g`} ➔ <strong className="text-emerald-400">{f.calories} kcal</strong>, <strong className="text-sky-300">{f.proteinG}g P</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Once Dúo Coordinada con Despensa */}
                      {m.detectedMeal.sharedDinnerProposal && (
                        <div className="p-3 rounded-xl bg-gym-900 border border-amber-500/30 space-y-1.5 text-xs">
                          <div className="font-extrabold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-400" />
                            <span>{m.detectedMeal.sharedDinnerProposal.title || 'Once Dúo Post-Entreno (20:00) — Despensa'}</span>
                          </div>
                          <div className="text-[11px] text-slate-200 leading-relaxed bg-gym-950/80 p-2.5 rounded-lg border border-gym-800 space-y-1">
                            <div className="text-emerald-400 font-semibold">{m.detectedMeal.sharedDinnerProposal.recipe}</div>
                            {m.detectedMeal.sharedDinnerProposal.dionicioPortion && (
                              <div className="text-[10px] text-slate-300">
                                <strong className="text-sky-400">👨‍💻 Dionicio:</strong> {m.detectedMeal.sharedDinnerProposal.dionicioPortion}
                              </div>
                            )}
                            {m.detectedMeal.sharedDinnerProposal.paulaPortion && (
                              <div className="text-[10px] text-slate-300">
                                <strong className="text-pink-400">👩‍💼 Paula:</strong> {m.detectedMeal.sharedDinnerProposal.paulaPortion}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ================= VISTA INDIVIDUAL ================= */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <Apple className="w-4 h-4 text-emerald-400" />
                          <span>{m.detectedMeal.title}</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {m.detectedMeal.mealType || 'Comida'}
                        </span>
                      </div>

                      {/* Nutri Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                        <div className="bg-gym-900 p-1.5 rounded-lg border border-gym-800">
                          <span className="text-[10px] text-slate-400 block">Calorías</span>
                          <strong className="text-emerald-400 text-xs font-mono">{m.detectedMeal.caloriesKcal} kcal</strong>
                        </div>
                        <div className="bg-gym-900 p-1.5 rounded-lg border border-gym-800">
                          <span className="text-[10px] text-slate-400 block">Proteínas</span>
                          <strong className="text-sky-400 text-xs font-mono">{m.detectedMeal.proteinG}g</strong>
                        </div>
                        <div className="bg-gym-900 p-1.5 rounded-lg border border-gym-800">
                          <span className="text-[10px] text-slate-400 block">Carbohidratos</span>
                          <strong className="text-amber-400 text-xs font-mono">{m.detectedMeal.carbsG}g</strong>
                        </div>
                        <div className="bg-gym-900 p-1.5 rounded-lg border border-gym-800">
                          <span className="text-[10px] text-slate-400 block">Grasas</span>
                          <strong className="text-pink-400 text-xs font-mono">{m.detectedMeal.fatsG}g</strong>
                        </div>
                      </div>

                      {/* Desglose de Alimentos */}
                      {Array.isArray(m.detectedMeal.items) && m.detectedMeal.items.length > 0 && (
                        <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-gym-800">
                          <span className="font-semibold text-slate-300 text-[10px] uppercase">Desglose estimado:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {m.detectedMeal.items.map((it, iIdx) => (
                              <li key={iIdx}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Bloque Destacado: Orientación de Cierre del Día con Despensa */}
                      {m.detectedMeal.closureAdvice && (
                        <div className="mt-2.5 p-3 rounded-xl bg-gym-900 border border-amber-500/30 space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-extrabold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-amber-400" />
                              <span>Para Cerrar Tu Día</span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-300">
                              Faltan: <strong className="text-amber-400">{m.detectedMeal.closureAdvice.remainingCals} kcal</strong> • <strong className="text-sky-400">{m.detectedMeal.closureAdvice.remainingProtein}g prot</strong>
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-relaxed bg-gym-950/80 p-2.5 rounded-lg border border-gym-800">
                            <strong className="text-emerald-400 block mb-0.5">🥘 Propuesta con tu Despensa:</strong>
                            <span>{m.detectedMeal.closureAdvice.suggestedRecipe}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estado / Botón de Guardado en Base de Datos */}
                  <div className="pt-2">
                    {m.mealSaved ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {m.detectedMeal.isDuoLog || (Array.isArray(m.detectedMeal.entries) && m.detectedMeal.entries.length > 1)
                            ? `✅ Guardadas ${m.detectedMeal.entries?.length || 2} comidas en Firestore Cloud (Dionicio y Paula)`
                            : `✅ Guardada autónomamente en tu Base de Datos (+${m.detectedMeal.caloriesKcal} kcal)`}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSaveDetectedMeal(m.detectedMeal, idx)}
                        disabled={savingMealIdx === idx}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-gym-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        {savingMealIdx === idx ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando en Firestore Cloud & Local...</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-4 h-4" />
                            <span>
                              {m.detectedMeal.isDuoLog || (Array.isArray(m.detectedMeal.entries) && m.detectedMeal.entries.length > 1)
                                ? `Guardar las ${m.detectedMeal.entries?.length || 2} comidas en Firestore Cloud (Dionicio y Paula)`
                                : `Guardar esta comida en mi Base de Datos (+${m.detectedMeal.caloriesKcal} kcal)`}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}


        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-gym-900 border border-gym-700 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
              <span>El Coach Gemini está analizando los registros del hogar y preparando su respuesta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Pregúntale al Coach Gemini sobre comidas, técnica o cargas..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-gym-800 border border-gym-700 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 disabled:opacity-30 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Preguntar</span>
        </button>
      </form>

      {/* Modal de Configuración y Diagnóstico Biométrico */}
      <BiometricsModal
        isOpen={showBiometricsModal}
        onClose={() => setShowBiometricsModal(false)}
        householdId={householdId}
        initialAthlete={currentUser}
        onSaved={() => setHouseholdStats(buildHouseholdContext(householdId))}
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
