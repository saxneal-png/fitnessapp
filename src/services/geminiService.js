// Servicio Centralizado de Gemini Coach para la App Dúo en Casa
import { GoogleGenerativeAI } from '@google/generative-ai';
import { USERS, WORKOUT_DAYS, TREADMILL_PROTOCOLS } from '../data/workoutCatalog';
import { getLocalLogs, getLocalWeightEntries, getLocalNutritionLogs } from '../firebase/config';

export const GEMINI_STORAGE_KEY = 'fitness_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'fitness_gemini_model';

export const GEMINI_AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Recomendado • Ultra Rápido)' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest' },
  { id: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash Lite Preview (02-05)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Bajo consumo)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export function getStoredGeminiKey() {
  return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
}

export function saveGeminiKey(key) {
  localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
}

export function getStoredGeminiModel() {
  return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || 'gemini-2.0-flash-lite';
}

export function saveGeminiModel(model) {
  localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
}

/**
 * Obtiene una instancia configurada de Gemini intentando con los modelos disponibles (Prioridad Flash Lite).
 */
async function callGemini(systemInstruction, userPrompt, apiKey, preferredModel) {
  const key = apiKey || getStoredGeminiKey();
  if (!key) throw new Error('API_KEY_MISSING');

  const selectedModel = preferredModel || getStoredGeminiModel();
  const genAI = new GoogleGenerativeAI(key);

  const modelCandidates = [
    selectedModel,
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.0-flash-lite-preview',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  // Remover duplicados manteniendo orden
  const uniqueCandidates = Array.from(new Set(modelCandidates));
  let lastErr = null;

  for (const mName of uniqueCandidates) {
    try {
      const modelConfig = { model: mName };
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }
      const model = genAI.getGenerativeModel(modelConfig);
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      lastErr = e;
      // Try fallback without systemInstruction if it was rejected by legacy models
      if (systemInstruction && (e.message?.includes('systemInstruction') || e.message?.includes('system_instruction'))) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const combinedPrompt = `${systemInstruction}\n\n---\n\n${userPrompt}`;
          const result = await model.generateContent(combinedPrompt);
          const text = result.response.text();
          if (text) return text;
        } catch (innerErr) {
          lastErr = innerErr;
        }
      }
      console.warn(`Gemini candidate model ${mName} notice:`, e.message);
    }
  }
  throw lastErr || new Error('No se pudo obtener respuesta de Gemini');
}

/**
 * Extrae métricas avanzadas de entrenamiento, PRs y sobrecarga progresiva para un atleta
 */
export function extractAthleteMetrics(logs = [], weights = [], userId = 'dionicio') {
  const userLogs = logs.filter(l => l.userId === userId);
  const userWeights = weights.filter(w => w.userId === userId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  
  const strengthLogs = userLogs.filter(l => l.type === 'strength');
  const treadmillLogs = userLogs.filter(l => l.type === 'treadmill');

  // PRs y Progresión por ejercicio
  const exercisePRs = {};
  let totalSetsCount = 0;
  let totalVolumeKg = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  // 7 days ago timestamp
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let weeklyVolumeKg = 0;

  strengthLogs.forEach(log => {
    const exName = log.exerciseName || log.exerciseId || 'Ejercicio';
    if (!exercisePRs[exName]) {
      exercisePRs[exName] = {
        maxWeightKg: 0,
        bestSetReps: 0,
        lastLoggedWeight: 0,
        lastLoggedRpe: 0,
        lastDate: log.date,
        totalSets: 0,
        history: []
      };
    }

    if (Array.isArray(log.sets)) {
      log.sets.forEach(s => {
        const w = Number(s.weightKg) || 0;
        const r = Number(s.reps) || 0;
        const rpe = Number(s.rpe) || 8;
        const vol = w * r;

        totalSetsCount++;
        totalVolumeKg += vol;
        rpeSum += rpe;
        rpeCount++;

        if (log.timestamp && log.timestamp >= sevenDaysAgo) {
          weeklyVolumeKg += vol;
        }

        exercisePRs[exName].totalSets++;
        exercisePRs[exName].lastLoggedWeight = w;
        exercisePRs[exName].lastLoggedRpe = rpe;

        if (w > exercisePRs[exName].maxWeightKg || (w === exercisePRs[exName].maxWeightKg && r > exercisePRs[exName].bestSetReps)) {
          exercisePRs[exName].maxWeightKg = w;
          exercisePRs[exName].bestSetReps = r;
          exercisePRs[exName].prDate = log.date;
        }
      });
    }
  });

  // Calcular recomendaciones de sobrecarga progresiva por ejercicio
  Object.keys(exercisePRs).forEach(ex => {
    const pr = exercisePRs[ex];
    const lastRpe = pr.lastLoggedRpe || 8;
    const lastWeight = pr.lastLoggedWeight || pr.maxWeightKg;

    if (lastRpe < 7) {
      pr.suggestedOverload = `Subir a ${lastWeight + (userId === 'dionicio' ? 2 : 1)} kg (RPE previo suave: ${lastRpe.toFixed(1)})`;
    } else if (lastRpe <= 8) {
      pr.suggestedOverload = `Mantener ${lastWeight} kg y buscar +1 o +2 repeticiones (Zona óptima de estímulo, RPE: ${lastRpe.toFixed(1)})`;
    } else {
      pr.suggestedOverload = `Consolidar en ${lastWeight} kg con pausas y control excéntrico (RPE alto: ${lastRpe.toFixed(1)})`;
    }
  });

  // Métricas de Cardio / Trotadora
  const totalTreadmillMinutes = treadmillLogs.reduce((acc, t) => acc + (Number(t.durationMinutes) || 0), 0);
  const totalCaloriesBurned = treadmillLogs.reduce((acc, t) => acc + (Number(t.activeCaloriesKcal) || 0), 0);
  const avgIncline = treadmillLogs.length > 0
    ? (treadmillLogs.reduce((acc, t) => acc + (Number(t.incline) || 0), 0) / treadmillLogs.length).toFixed(1)
    : 0;

  // Métricas de Peso Corporal
  const currentWeight = userWeights.length > 0 ? userWeights[0].weightKg : null;
  const initialWeight = userWeights.length > 0 ? userWeights[userWeights.length - 1].weightKg : null;
  const weightDelta = (currentWeight && initialWeight && userWeights.length > 1)
    ? (currentWeight - initialWeight).toFixed(1)
    : 0;

  return {
    userId,
    athleteName: USERS[userId]?.name || userId,
    totalLogs: userLogs.length,
    strengthSessions: strengthLogs.length,
    treadmillSessions: treadmillLogs.length,
    totalSetsCount,
    totalVolumeKg: Math.round(totalVolumeKg),
    weeklyVolumeKg: Math.round(weeklyVolumeKg),
    avgRpe: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '8.0',
    exercisePRs,
    cardio: {
      totalMinutes: totalTreadmillMinutes,
      totalCalories: totalCaloriesBurned,
      avgIncline,
      sessionsCount: treadmillLogs.length
    },
    bodyweight: {
      current: currentWeight,
      initial: initialWeight,
      delta: weightDelta,
      historyCount: userWeights.length
    }
  };
}

/**
 * Construye el contexto base del hogar para las consultas del coach
 */
export function buildHouseholdContext(householdId = 'hogar-dionicio-paula') {
  const logs = getLocalLogs(householdId);
  const weights = getLocalWeightEntries(householdId);
  
  let pantry = [];
  try {
    const rawPantry = localStorage.getItem('fitness_duo_pantry_items');
    if (rawPantry) pantry = JSON.parse(rawPantry);
  } catch (e) {}

  let activeMenu = null;
  try {
    const rawMenu = localStorage.getItem('fitness_duo_weekly_menu');
    if (rawMenu) activeMenu = JSON.parse(rawMenu);
  } catch (e) {}

  const dionicioMetrics = extractAthleteMetrics(logs, weights, 'dionicio');
  const paulaMetrics = extractAthleteMetrics(logs, weights, 'paula');

  const dionicioLogs = logs.filter(l => l.userId === 'dionicio');
  const paulaLogs = logs.filter(l => l.userId === 'paula');

  const nutritionLogs = getLocalNutritionLogs(householdId);
  const todayStr = new Date().toISOString().split('T')[0];
  
  const dionicioTodayNutrition = nutritionLogs.filter(n => n.userId === 'dionicio' && (n.date === todayStr || (!n.date && new Date(n.timestamp).toISOString().split('T')[0] === todayStr)));
  const paulaTodayNutrition = nutritionLogs.filter(n => n.userId === 'paula' && (n.date === todayStr || (!n.date && new Date(n.timestamp).toISOString().split('T')[0] === todayStr)));

  const dionicioTodayCals = dionicioTodayNutrition.reduce((acc, n) => acc + (Number(n.caloriesKcal) || 0), 0);
  const paulaTodayCals = paulaTodayNutrition.reduce((acc, n) => acc + (Number(n.caloriesKcal) || 0), 0);

  const dionicioTodayProtein = dionicioTodayNutrition.reduce((acc, n) => acc + (Number(n.proteinG) || 0), 0);
  const paulaTodayProtein = paulaTodayNutrition.reduce((acc, n) => acc + (Number(n.proteinG) || 0), 0);

  return {
    athletes: USERS,
    totalLogsCount: logs.length,
    dionicioMetrics,
    paulaMetrics,
    recentLogs: logs.slice(0, 10),
    dionicioRecent: dionicioLogs.slice(0, 5),
    paulaRecent: paulaLogs.slice(0, 5),
    bodyweights: weights.slice(0, 5),
    pantryItems: pantry,
    hasActiveMenu: !activeMenu,
    menuSnippet: activeMenu ? activeMenu.content?.substring(0, 300) : 'Sin menú generado aún',
    nutrition: {
      allLogs: nutritionLogs,
      todayDate: todayStr,
      dionicio: {
        todayCals: dionicioTodayCals,
        targetCals: 2300,
        todayProtein: dionicioTodayProtein,
        targetProtein: 150,
        todayMealsCount: dionicioTodayNutrition.length,
        todayMeals: dionicioTodayNutrition
      },
      paula: {
        todayCals: paulaTodayCals,
        targetCals: 1600,
        todayProtein: paulaTodayProtein,
        targetProtein: 100,
        todayMealsCount: paulaTodayNutrition.length,
        todayMeals: paulaTodayNutrition
      }
    }
  };
}


/**
 * Genera una recomendación de carga previa antes de realizar un ejercicio
 */
export function getPreExerciseAdvice(userId, exerciseId, dayType = 'torso', logs = []) {
  const user = USERS[userId] || USERS.dionicio;
  const day = WORKOUT_DAYS.find(d => d.id === dayType) || WORKOUT_DAYS[0];
  const exercise = day.exercises.find(e => e.id === exerciseId);

  if (!exercise) return null;

  const userDefaultWeight = userId === 'dionicio' ? exercise.defaultWeightDionicio : exercise.defaultWeightPaula;
  
  // Buscar historial previo de este ejercicio para este usuario
  const prevLogs = logs.filter(l => l.userId === userId && l.type === 'strength' && l.exerciseId === exerciseId);
  
  if (prevLogs.length === 0) {
    return {
      suggestedWeightKg: userDefaultWeight,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetRPE: user.targetRPE,
      coachTip: `Semana 0 (Calibración): Inicia con ~${userDefaultWeight} kg. Enfócate en aprender la trayectoria limpia, descansando ${exercise.restSeconds}s entre series.`,
      isHistorical: false
    };
  }

  const lastLog = prevLogs[0];
  const lastMaxWeight = Math.max(...(lastLog.sets?.map(s => s.weightKg) || [userDefaultWeight]));
  const avgRpe = (lastLog.sets?.reduce((acc, s) => acc + (s.rpe || 8), 0) || 8) / (lastLog.sets?.length || 1);

  let suggested = lastMaxWeight;
  let tip = '';

  if (avgRpe < 7) {
    suggested = lastMaxWeight + (userId === 'dionicio' ? 2 : 1);
    tip = `En tu última sesión completaste las series con RPE suave (~${avgRpe.toFixed(1)}). Hoy puedes probar subir a ${suggested} kg con buena técnica.`;
  } else if (avgRpe >= 8.5) {
    suggested = lastMaxWeight;
    tip = `La última sesión tuvo RPE exigente (~${avgRpe.toFixed(1)}). Mantén ${suggested} kg y busca consolidar el control y la pausa isométrica.`;
  } else {
    suggested = lastMaxWeight;
    tip = `Carga calibrada correctamente en ${suggested} kg (RPE ${avgRpe.toFixed(1)}). Busca completar ${exercise.targetReps} reps con técnica impecable.`;
  }

  return {
    suggestedWeightKg: suggested,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetRPE: user.targetRPE,
    coachTip: tip,
    isHistorical: true,
    lastLogDate: lastLog.date
  };
}

/**
 * Micro-feedback instantáneo después de guardar una serie en el Logger
 */
export async function getLiveSetFeedback({ userId, exerciseName, setNumber, weightKg, reps, rpe, notes }, apiKey) {
  const user = USERS[userId] || USERS.dionicio;

  // Si no hay API key o llamada rápida, generamos un feedback heurístico deportivo inmediato de alta calidad
  const key = apiKey || getStoredGeminiKey();
  if (!key) {
    if (rpe <= 6.5) {
      return `✅ Serie ${setNumber} (${weightKg}kg x ${reps} reps): Esfuerzo controlado (RPE ${rpe}). Para la próxima serie puedes mantener o subir +1 repetición sin perder técnica.`;
    } else if (rpe <= 8) {
      return `🔥 Serie ${setNumber} (${weightKg}kg x ${reps} reps): ¡Zona ideal de estímulo para ${user.name}! Descansa 45-60s e hidrátate antes de la siguiente serie.`;
    } else {
      return `⚠️ Serie ${setNumber} (${weightKg}kg x ${reps} reps): RPE ${rpe} (cerca del fallo). En Semana 0 mantén reserva; descansa 75s y considera no subir peso en la serie que sigue.`;
    }
  }

  try {
    const system = `Eres el Coach deportivo de IA de ${user.name} (principiante en casa, set mancuernas 40kg). Da un micro-feedback de exactamente 1 o 2 oraciones muy directas, motivadoras y técnicas tras la serie que acaba de registrar.`;
    const prompt = `Atleta: ${user.name}. Ejercicio: ${exerciseName}. Serie #${setNumber}: ${weightKg} kg x ${reps} reps con RPE ${rpe}/10. Notas: "${notes || 'Ninguna'}".`;
    return await callGemini(system, prompt, key);
  } catch (err) {
    if (rpe <= 7) {
      return `💪 Excelente serie ${setNumber} (${weightKg}kg x ${reps} reps). Mantén el control de la respiración para la siguiente serie.`;
    } else {
      return `🔥 Serie ${setNumber} completada con ${weightKg}kg. Buen estímulo, descansa bien antes de la siguiente.`;
    }
  }
}

/**
 * Guía contextual del Coach durante el temporizador en vivo (19:00 - 20:00)
 */
export function getLiveTimerAdvice(interval, userAIsDionicio, selectedDayRoutine) {
  const userA = userAIsDionicio ? USERS.dionicio : USERS.paula;
  const userB = userAIsDionicio ? USERS.paula : USERS.dionicio;
  const routine = WORKOUT_DAYS.find(d => d.id === selectedDayRoutine) || WORKOUT_DAYS[0];

  switch (interval.id) {
    case 'warmup':
      return {
        badge: 'Movilidad Conjunta (19:00 - 19:07)',
        headline: '7 minutos de preparación articular en pareja',
        userATip: `${userA.name}: Círculos de brazos, rotación torácica y sentadillas suaves sin peso.`,
        userBTip: `${userB.name}: Movilidad de tobillos, apertura de caderas y elevaciones de talones.`,
        generalTip: 'No usar peso aún. El objetivo es elevar la temperatura corporal y lubricar articulaciones.'
      };

    case 'block1':
      return {
        badge: `Bloque 1 (19:07 - 19:32) • ${routine.name.split('(')[0]}`,
        headline: `${userA.name} en Mancuernas / ${userB.name} en Trotadora`,
        userATip: `${userA.name} (Fuerza): Inicia con ${routine.exercises[0].name}. Descansos de ${routine.exercises[0].restSeconds}s. RPE ${userA.targetRPE}.`,
        userBTip: `${userB.name} (Cardio): Sube a inclinación 4-6% (min 3-20). Mantén FC en Zona 2 sin apoyarte en los pasamanos.`,
        generalTip: 'Ambos entrenan al mismo tiempo. Mantengan botellas de agua a mano.'
      };

    case 'transition':
      return {
        badge: 'Rotación & Ajuste de Discos (19:32 - 19:35)',
        headline: '3 minutos de cambio de estación e hidratación',
        userATip: `${userA.name}: Pasa a la trotadora. Inicia a velocidad suave (3.8 - 4.0 km/h) para normalizar el pulso.`,
        userBTip: `${userB.name}: Pasa a las mancuernas. Ajusta el peso de los discos a tu carga (${routine.exercises[0].defaultWeightPaula}kg aprox).`,
        generalTip: 'Aprovechen de beber 200ml de agua y registrar las series del Bloque 1.'
      };

    case 'block2':
      return {
        badge: `Bloque 2 (19:35 - 20:00) • ${routine.name.split('(')[0]}`,
        headline: `${userB.name} en Mancuernas / ${userA.name} en Trotadora`,
        userATip: `${userA.name} (Cardio): Mantén ritmo constante en pendiente (Zona 2 aeróbica).`,
        userBTip: `${userB.name} (Fuerza): Ejecuta ${routine.exercises[0].name} y ${routine.exercises[1]?.name || 'ejercicios del día'} cuidando la postura lumbar.`,
        generalTip: '¡Último esfuerzo de la sesión! Mantengan la técnica estricta.'
      };

    case 'cooldown':
    default:
      return {
        badge: 'Vuelta a la Calma & Cena (20:00+)',
        headline: '¡Entrenamiento cumplido! Hora de la cena compartida',
        userATip: `${userA.name}: Estiramiento de pectorales/dorsales. ¡A comer tu porción a las 20:00!`,
        userBTip: `${userB.name}: Estiramiento de cuádriceps y glúteos. Hidrátate con agua fría.`,
        generalTip: 'Diríjanse a la cocina para su cena basada en la despensa del hogar.'
      };
  }
}

/**
 * Generador Estricto de Menú Semanal con Recetas Idénticas y Porciones Diferenciadas
 */
export async function generateStrictPantryMenu(pantryItems, apiKey) {
  const key = apiKey || getStoredGeminiKey();
  
  if (pantryItems.length === 0) {
    throw new Error('Debes seleccionar o ingresar al menos 2 o 3 ingredientes disponibles en tu despensa.');
  }

  const systemInstruction = `Eres un Nutricionista Deportivo de precisión para Dionicio y Paula.
REGLAS OBLIGATORIAS Y ESTRICTAS:
1. RECETAS 100% IDÉNTICAS PARA AMBOS: Dionicio y Paula comen EXACTAMENTE EL MISMO PLATO/RECETA en cada Almuerzo (13:30) y en cada Cena Post-Entreno (20:00). Se cocina 1 sola preparación compartida por comida para simplificar la vida del hogar.
2. PORCIONES Y GRAMAJES DIFERENCIADOS POR ATLETA: En cada comida, especifica con total claridad el gramaje exacto de la porción para Dionicio y para Paula según sus perfiles:
   - Dionicio (180 cm, ayuno intermitente en la mañana): Porciones mayores de proteína y carbohidratos (ej: 200-220g proteína, 150-200g carbohidratos cocidos, vegetales abundantes, 1 cda aceite).
   - Paula (41 años, 160 cm): Porciones ajustadas a su gasto calórico (ej: 120-140g proteína, 70-100g carbohidratos cocidos, vegetales abundantes, 1 cdta aceite). Desayuno proteico liviano solo para ella (Dionicio no desayuna por ayuno).
3. EXCLUSIVIDAD TOTAL DE DESPENSA: Usa ÚNICA Y EXCLUSIVAMENTE los ingredientes que están en la lista proporcionada. NO inventes ingredientes no listados (solo se asume agua, sal y pimienta de cocina básica). Si falta un grupo de alimentos, adáptalo con lo que haya.
4. ESTRUCTURA DE LUNES A VIERNES: Desglosa día por día (Lunes a Viernes) con Almuerzo (13:30) y Cena Post-Entreno (20:00), más el desayuno de Paula.
5. Formato Markdown limpio, claro y fácil de leer con emojis y viñetas.`;

  const userPrompt = `Diseña el Plan Nutricional Semanal (Lunes a Viernes) cumpliendo estrictamente que la receta sea la misma para ambos y solo varíen las porciones.

LISTA ESTRICTA DE INGREDIENTES DISPONIBLES EN NUESTRA DESPENSA:
${pantryItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Genera el menú completo ahora.`;

  if (key) {
    return await callGemini(systemInstruction, userPrompt, key);
  }

  // Fallback Inteligente Estricto si no hay API Key
  return generateDeterministicStrictMenu(pantryItems);
}

/**
 * Fallback determinístico con la misma receta y porciones diferenciadas basadas en la despensa
 */
export function generateDeterministicStrictMenu(pantryItems) {
  const hasChicken = pantryItems.some(i => i.toLowerCase().includes('pollo'));
  const hasEggs = pantryItems.some(i => i.toLowerCase().includes('huevo'));
  const hasTuna = pantryItems.some(i => i.toLowerCase().includes('atún') || i.toLowerCase().includes('atun'));
  const hasMeat = pantryItems.some(i => i.toLowerCase().includes('carne'));
  const hasRice = pantryItems.some(i => i.toLowerCase().includes('arroz'));
  const hasOats = pantryItems.some(i => i.toLowerCase().includes('avena'));
  const hasPotatoes = pantryItems.some(i => i.toLowerCase().includes('papa') || i.toLowerCase().includes('camote'));
  const hasSpinach = pantryItems.some(i => i.toLowerCase().includes('espinaca') || i.toLowerCase().includes('hojas'));
  const hasAvocado = pantryItems.some(i => i.toLowerCase().includes('palta') || i.toLowerCase().includes('aguacate'));
  const hasTomato = pantryItems.some(i => i.toLowerCase().includes('tomate'));

  const protein1 = hasChicken ? 'Pechuga de pollo a la plancha' : (hasTuna ? 'Atún al natural' : (hasEggs ? 'Huevos revueltos/cocidos' : 'Proteína disponible'));
  const protein2 = hasMeat ? 'Carne magra salteada' : (hasEggs ? 'Omelette proteico' : protein1);
  const carb1 = hasRice ? 'Arroz cocido' : (hasPotatoes ? 'Papas al horno/cocidas' : (hasOats ? 'Avena cocida' : 'Carbohidrato disponible'));
  const veg1 = hasSpinach ? 'Ensalada de espinacas y hojas verdes' : (hasTomato ? 'Ensalada de tomates frescos' : 'Vegetales frescos');
  const fat1 = hasAvocado ? 'Palta/Aguacate' : 'Aceite de oliva (toque)';

  return `### 🥗 Plan Nutricional Semanal Dúo (Misma Receta • Porciones Diferenciadas)
*Basado estrictamente en los ingredientes activos de su despensa (${pantryItems.length} ingredientes informados).*

---

#### 📅 LUNES
- **🥣 Desayuno (Solo Paula - Dionicio en Ayuno):**
  - **Paula:** ${hasEggs ? '2 huevos revueltos con espinacas' : 'Porción ligera de avena con agua/té'} + infusión sin azúcar.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein1} con ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio (180 cm):** 220g de ${protein1} + 1.5 tazas de ${carb1} + ${veg1} abundante + ${fat1}.
  - **👩‍💼 Paula (160 cm):** 130g de ${protein1} + 0.5 taza de ${carb1} + ${veg1} abundante + 1/4 ${fat1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *${hasEggs ? 'Revuelto de huevos con vegetales y palta' : `${protein1} con ensalada tibia`}*
  - **👨‍💻 Dionicio:** 4 huevos enteros + 2 tostadas integrales + 1/2 palta.
  - **👩‍💼 Paula:** 2 huevos enteros + 1 clara + ensalada de espinaca + 1/4 palta.

---

#### 📅 MARTES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** ${hasOats ? 'Bowl de avena cocida (30g) con canela' : '1 huevo duro con té verde'}.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein2} acompañado de ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio:** 220g de ${protein2} + 1.5 tazas de ${carb1} + ${veg1}.
  - **👩‍💼 Paula:** 130g de ${protein2} + 0.5 taza de ${carb1} + ${veg1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Bowl proteico de ${hasTuna ? 'Atún en lata' : protein1} con ${veg1}*
  - **👨‍💻 Dionicio:** 2 latas de atún (o 200g) + 1 taza de arroz/papas + hojas verdes.
  - **👩‍💼 Paula:** 1 lata de atún (120g) + ensalada verde abundante con tomate y limón.

---

#### 📅 MIÉRCOLES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** Omelette de 2 huevos con hojas verdes.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *Wok o salteado de ${protein1} con ${carb1} y verduras*
  - **👨‍💻 Dionicio:** 230g de ${protein1} salteado + 1.5 tazas de ${carb1}.
  - **👩‍💼 Paula:** 130g de ${protein1} salteado + 0.5 taza de ${carb1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *${hasEggs ? 'Tortilla de huevos y espinacas al sartén' : `${protein2} con ensalada fresca`}*
  - **👨‍💻 Dionicio:** 4 huevos en tortilla + 1 papa mediana cocida + palta.
  - **👩‍💼 Paula:** 2 huevos en tortilla + ensalada de tomate con limón.

---

#### 📅 JUEVES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** ${hasOats ? 'Avena cocida liviana con café' : '2 claras y 1 huevo revuelto'}.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein2} con ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio:** 220g de ${protein2} + 1.5 tazas de ${carb1} + aceite de oliva.
  - **👩‍💼 Paula:** 120g de ${protein2} + 0.5 taza de ${carb1} + ensalada fresca.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Ensalada tibia de ${protein1} con palta y huevo duro*
  - **👨‍💻 Dionicio:** 200g de ${protein1} + 2 huevos duros + 1/2 palta + pan integral.
  - **👩‍💼 Paula:** 120g de ${protein1} + 1 huevo duro + 1/4 palta + hojas verdes.

---

#### 📅 VIERNES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** 2 huevos pochados o pasados por agua con té.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *Arroz o papas salteadas con ${protein1} y verduras*
  - **👨‍💻 Dionicio:** 220g de ${protein1} + 1.5 tazas de arroz + ensalada.
  - **👩‍💼 Paula:** 130g de ${protein1} + 0.5 taza de arroz + ensalada abundante.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Revuelto proteico de cierre de semana*
  - **👨‍💻 Dionicio:** 4 huevos revueltos con ${hasTuna ? 'atún' : 'pollo'} + 1 rebanada de pan/papa.
  - **👩‍💼 Paula:** 2 huevos revueltos con ${hasTuna ? 'atún' : 'pollo'} + ensalada de hojas verdes.

---

💡 **Regla de Cocina en Pareja:** Se prepara una sola tanda de cocción (ej. todo el pollo y arroz a la vez) y al momento de servir en los platos se aplican los gramajes individuales indicados arriba.`;
}

/**
 * Consulta general al Coach con contexto 360° de la aplicación y rol de Personal Trainer de Élite
 */
export async function askCoachWithFullContext(queryText, currentUser, householdId, apiKey) {
  const context = buildHouseholdContext(householdId);
  const user = USERS[currentUser] || USERS.dionicio;
  const partnerId = currentUser === 'dionicio' ? 'paula' : 'dionicio';
  const partner = USERS[partnerId];

  const currentMetrics = currentUser === 'dionicio' ? context.dionicioMetrics : context.paulaMetrics;
  const partnerMetrics = currentUser === 'dionicio' ? context.paulaMetrics : context.dionicioMetrics;

  const formatPRs = (metrics) => {
    const prEntries = Object.entries(metrics.exercisePRs || {});
    if (prEntries.length === 0) return 'Sin series registradas aún (Fase Calibración Semana 0).';
    return prEntries.map(([name, data]) => 
      `- ${name}: Max ${data.maxWeightKg}kg (x${data.bestSetReps} reps) | Última serie: ${data.lastLoggedWeight}kg (RPE ${data.lastLoggedRpe}) -> Sugerencia sobrecarga: ${data.suggestedOverload}`
    ).join('\n');
  };

  const systemInstruction = `Eres el PERSONAL TRAINER DE ÉLITE Y NUTRICIONISTA DEPORTIVO EXCLUSIVO de Dionicio y Paula para su programa "Dúo en Casa" (19:00 a 20:00).
Tu misión es guiar, corregir, motivar y ajustar sus cargas de entrenamiento con base en sus datos reales y la ciencia del ejercicio.

====================================================
📊 ESTADO Y MÉTRICAS EN TIEMPO REAL DEL ATLETA CONSULTANTE:
Atleta: ${user.name} (${user.level} • ${user.height} • ${user.phase})
- Volumen semanal levantado: ${currentMetrics.weeklyVolumeKg} kg (${currentMetrics.totalSetsCount} series en total)
- RPE promedio reciente: ${currentMetrics.avgRpe}/10 (Objetivo: ${user.targetRPE})
- Sesiones de Trotadora acumuladas: ${currentMetrics.cardio.sessionsCount} (${currentMetrics.cardio.totalMinutes} min, ~${currentMetrics.cardio.totalCalories} kcal)
- Peso corporal actual: ${currentMetrics.bodyweight.current ? `${currentMetrics.bodyweight.current} kg` : 'Sin registrar'} (Delta: ${currentMetrics.bodyweight.delta > 0 ? '+' : ''}${currentMetrics.bodyweight.delta} kg)

🏋️‍♂️ RÉCORDS PERSONALES Y PROGRESIÓN DE ${user.name.toUpperCase()}:
${formatPRs(currentMetrics)}

====================================================
👥 MÉTRICAS DE SU PAREJA (${partner.name}):
- Volumen semanal: ${partnerMetrics.weeklyVolumeKg} kg | RPE promedio: ${partnerMetrics.avgRpe}/10
${formatPRs(partnerMetrics)}

====================================================
🥘 DESPENSA Y NUTRICIÓN COMPARTIDA:
- Despensa: ${context.pantryItems.join(', ') || 'Sin ingredientes informados'}
- Menú Semanal: ${context.hasActiveMenu ? 'Generado y activo' : 'Pendiente de generar'}
- Protocolo: Cena compartida a las 20:00 con MISMA receta y porciones adaptadas (${user.name}: ${user.nutrition}).

====================================================
⚙️ EQUIPAMIENTO Y REGLAS DEL HOGAR:
1. Mancuernas modulares de 40kg en total (discos de 1.25kg, 2.5kg y 5kg).
2. Trotadora eléctrica (19:00 a 20:00 rotando cada 25 min: un atleta en fuerza y el otro en cardio).
3. Enfoque Semana 0: Calibración técnica, descansos controlados (45-60s) y RPE 6-7 sin llegar al fallo muscular prematuro.

DIRECTRICES DE TUS RESPUESTAS:
- Habla como un entrenador personal experto, motivador, empático y directo.
- Cita SIEMPRE sus números o ejercicios registrados para fundamentar tus consejos.
- Si te piden sugerencia de cargas para hoy, revisa su historial y dale los kg exactos a configurar en las mancuernas.
- Formato Markdown impecable con emojis deportivos, viñetas y pasos claros.

====================================================
🥗 CALORÍAS Y NUTRICIÓN DE HOY:
- ${user.name}: ${context.nutrition?.[currentUser]?.todayCals || 0} / ${context.nutrition?.[currentUser]?.targetCals || 2000} kcal (${context.nutrition?.[currentUser]?.todayProtein || 0}g proteína)
- ${partner.name}: ${context.nutrition?.[partnerId]?.todayCals || 0} / ${context.nutrition?.[partnerId]?.targetCals || 1600} kcal`;

  return await callGemini(systemInstruction, queryText, apiKey);
}

/**
 * Estimador heurístico determinístico de comidas y macronutrientes (offline / fallback)
 * Ahora calcula también cuánto falta para cerrar el día y propone qué preparar según la despensa
 */
export function estimateDeterministicMeal(text = '', currentUser = 'dionicio', householdId = 'hogar-dionicio-paula') {
  const lower = text.toLowerCase();

  // Diccionario de alimentos y valores típicos por porción común
  const FOOD_DATABASE = [
    { keys: ['huevo', 'huevos', 'omelette', 'revuelto', 'pochado'], calPerUnit: 75, p: 6.5, c: 0.5, f: 5.0, defaultUnits: 2, name: 'Huevos' },
    { keys: ['pollo', 'pechuga'], calPerUnit: 165, p: 31, c: 0, f: 3.6, defaultUnits: 1.5, name: 'Pechuga de pollo (150g)' },
    { keys: ['atun', 'atún'], calPerUnit: 130, p: 28, c: 0, f: 1.5, defaultUnits: 1, name: 'Atún en lata' },
    { keys: ['carne', 'vacuno', 'bistec', 'lomo', 'molida'], calPerUnit: 220, p: 26, c: 0, f: 12, defaultUnits: 1, name: 'Carne magra (150g)' },
    { keys: ['arroz'], calPerUnit: 180, p: 3.5, c: 40, f: 0.5, defaultUnits: 1, name: 'Arroz cocido' },
    { keys: ['avena'], calPerUnit: 150, p: 5.0, c: 27, f: 2.5, defaultUnits: 1, name: 'Avena integral (40g)' },
    { keys: ['papa', 'papas', 'camote'], calPerUnit: 130, p: 3.0, c: 30, f: 0.2, defaultUnits: 1, name: 'Papas / Camote cocido' },
    { keys: ['pan', 'tostada', 'marraqueta'], calPerUnit: 120, p: 4.0, c: 24, f: 1.0, defaultUnits: 1.5, name: 'Pan integral / Marraqueta' },
    { keys: ['palta', 'aguacate'], calPerUnit: 160, p: 2.0, c: 8.5, f: 15.0, defaultUnits: 0.5, name: 'Palta / Aguacate (1/2 unid)' },
    { keys: ['tomate', 'ensalada', 'lechuga', 'espinaca', 'espinacas'], calPerUnit: 35, p: 1.5, c: 7.0, f: 0.3, defaultUnits: 1, name: 'Espinacas / Ensalada fresca' },
    { keys: ['manzana', 'fruta', 'platano', 'plátano'], calPerUnit: 90, p: 1.0, c: 22, f: 0.3, defaultUnits: 1, name: 'Fruta fresca' },
    { keys: ['yogurt', 'yogur', 'griego'], calPerUnit: 110, p: 10.0, c: 8.0, f: 3.0, defaultUnits: 1, name: 'Yogurt griego natural' },
    { keys: ['frutos secos', 'nueces', 'almendras'], calPerUnit: 170, p: 5.0, c: 5.0, f: 15.0, defaultUnits: 1, name: 'Frutos secos / Nueces' },
    { keys: ['aceite', 'oliva'], calPerUnit: 90, p: 0, c: 0, f: 10.0, defaultUnits: 1, name: 'Aceite de oliva (1 cdta)' },
    { keys: ['proteina', 'batido', 'whey'], calPerUnit: 120, p: 24.0, c: 2.0, f: 1.5, defaultUnits: 1, name: 'Batido de proteína' },
    { keys: ['cafe', 'café', 'te', 'té'], calPerUnit: 20, p: 0.5, c: 3.0, f: 0.5, defaultUnits: 1, name: 'Café / Té' }
  ];

  // Determinar tipo de comida
  let mealType = 'almuerzo';
  if (lower.includes('desayun') || lower.includes('mañana')) mealType = 'desayuno';
  else if (lower.includes('almuerz') || lower.includes('tarde') || lower.includes('mediodia') || lower.includes('mediodía')) mealType = 'almuerzo';
  else if (lower.includes('cena') || lower.includes('noche') || lower.includes('20:00') || lower.includes('post-entreno')) mealType = 'cena';
  else if (lower.includes('once') || lower.includes('merienda')) mealType = 'once';
  else if (lower.includes('snack') || lower.includes('colacion') || lower.includes('colación')) mealType = 'snack';

  // Buscar alimentos consumidos
  const matched = [];
  let totalCals = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  FOOD_DATABASE.forEach(food => {
    if (food.keys.some(k => lower.includes(k))) {
      let qty = food.defaultUnits;
      const regexNumber = new RegExp(`(\\d+)\\s*(?:unidades|u|rebanadas|tazas|huevos|gramos|g)?\\s*(?:de)?\\s*${food.keys[0]}`, 'i');
      const matchNum = lower.match(regexNumber);
      if (matchNum && matchNum[1]) {
        const parsed = parseInt(matchNum[1]);
        if (parsed > 0 && parsed <= 500) {
          if (parsed > 30) qty = parsed / 100;
          else qty = parsed;
        }
      }

      if (currentUser === 'dionicio' && !matchNum) {
        qty *= 1.2;
      }

      const cal = Math.round(food.calPerUnit * qty);
      const p = Math.round(food.p * qty);
      const c = Math.round(food.c * qty);
      const f = Math.round(food.f * qty);

      totalCals += cal;
      totalP += p;
      totalC += c;
      totalF += f;

      matched.push({
        name: food.name,
        calories: cal,
        protein: p,
        carbs: c,
        fats: f
      });
    }
  });

  if (matched.length === 0) {
    const isDionicio = currentUser === 'dionicio';
    totalCals = isDionicio ? 520 : 380;
    totalP = isDionicio ? 40 : 28;
    totalC = isDionicio ? 48 : 34;
    totalF = isDionicio ? 15 : 12;
    matched.push({ name: 'Comida balanceada estimada', calories: totalCals, protein: totalP, carbs: totalC, fats: totalF });
  }

  // Leer estado de nutrición y despensa para orientar el cierre del día
  const context = buildHouseholdContext(householdId);
  const targetCals = currentUser === 'dionicio' ? 2300 : 1600;
  const targetProtein = currentUser === 'dionicio' ? 150 : 100;

  const currentTodayCals = context.nutrition?.[currentUser]?.todayCals || 0;
  const currentTodayProtein = context.nutrition?.[currentUser]?.todayProtein || 0;

  const newTotalCals = currentTodayCals + totalCals;
  const newTotalProtein = currentTodayProtein + totalP;

  const remainingCals = Math.max(0, targetCals - newTotalCals);
  const remainingProtein = Math.max(0, targetProtein - newTotalProtein);

  // Evaluar qué alimentos de la despensa pueden usarse para la cena/cierre
  const pantry = context.pantryItems && context.pantryItems.length > 0 
    ? context.pantryItems 
    : ['Huevos', 'Pechuga de pollo', 'Atún en lata / agua', 'Arroz integral / blanco', 'Espinacas / Hojas verdes', 'Palta / Aguacate'];

  let suggestedClosureRecipe = '';
  const hasChicken = pantry.some(i => i.toLowerCase().includes('pollo'));
  const hasEggs = pantry.some(i => i.toLowerCase().includes('huevo'));
  const hasTuna = pantry.some(i => i.toLowerCase().includes('atun') || i.toLowerCase().includes('atún'));
  const hasAvocado = pantry.some(i => i.toLowerCase().includes('palta') || i.toLowerCase().includes('aguacate'));
  const hasGreens = pantry.some(i => i.toLowerCase().includes('espinaca') || i.toLowerCase().includes('verde'));
  const hasRice = pantry.some(i => i.toLowerCase().includes('arroz'));

  if (remainingCals <= 200) {
    suggestedClosureRecipe = `Estás prácticamente en tu meta. Te recomiendo cerrar con una infusión relajante o un puñado pequeño de frutos secos si tienes hambre nocturna.`;
  } else if (hasChicken && hasGreens) {
    suggestedClosureRecipe = `Cena post-entreno recomendada (20:00): 180g de Pechuga de pollo a la plancha con ensalada abundante de Espinacas / Hojas verdes y ${hasAvocado ? '1/4 de palta' : '1 cdta de aceite de oliva'}. Aportará aprox ~${Math.min(500, remainingCals)} kcal y ~38g de proteína.`;
  } else if (hasEggs && hasTuna) {
    suggestedClosureRecipe = `Cena post-entreno recomendada (20:00): Omelette de 2 huevos con 1 lata de atún al agua y hojas verdes de tu despensa. Aportará aprox ~350 kcal y ~35g de proteína magra.`;
  } else if (hasEggs) {
    suggestedClosureRecipe = `Cena recomendada (20:00): 3 huevos revueltos con espinacas y ${hasRice ? '1/2 taza de arroz' : 'acompañamiento liviano'} de tu despensa para sumar ~${remainingCals} kcal y ~22g de proteína.`;
  } else {
    suggestedClosureRecipe = `Cena sugerida (20:00): Combina tu fuente de proteína de despensa (${pantry[0] || 'proteína magra'}) con verduras para cubrir tus ${remainingProtein}g de proteína restantes sin pasarte de las ${remainingCals} kcal faltantes.`;
  }

  return {
    isMealLog: true,
    mealType,
    title: matched.map(m => m.name.split('(')[0].trim()).slice(0, 3).join(' con '),
    caloriesKcal: Math.round(totalCals),
    proteinG: Math.round(totalP),
    carbsG: Math.round(totalC),
    fatsG: Math.round(totalF),
    items: matched.map(m => `${m.name}: ~${m.calories} kcal (${m.protein}g P)`),
    summary: `Detectados ${matched.length} componentes nutricionales clave.`,
    closureAdvice: {
      targetCals,
      targetProtein,
      newTotalCals,
      newTotalProtein,
      remainingCals,
      remainingProtein,
      suggestedRecipe: suggestedClosureRecipe,
      availablePantrySnippet: pantry.slice(0, 6).join(', ')
    }
  };
}

/**
 * ASESOR NUTRICIONAL Y FITNESS COMPLETO (Autónomo, Cierre de Día y Despensa)
 */
export async function analyzeCoachChatWithAction(queryText, currentUser, householdId, apiKey) {
  const user = USERS[currentUser] || USERS.dionicio;
  const partnerId = currentUser === 'dionicio' ? 'paula' : 'dionicio';
  const partner = USERS[partnerId] || USERS.paula;
  const context = buildHouseholdContext(householdId);
  const key = apiKey || getStoredGeminiKey();

  const userNut = context.nutrition?.[currentUser] || { todayCals: 0, targetCals: 2000, todayProtein: 0, targetProtein: 140 };
  const currentTodayCals = userNut.todayCals || 0;
  const currentTodayProtein = userNut.todayProtein || 0;
  const targetCals = userNut.targetCals || (currentUser === 'dionicio' ? 2300 : 1600);
  const targetProtein = userNut.targetProtein || (currentUser === 'dionicio' ? 150 : 100);

  const pantryList = context.pantryItems && context.pantryItems.length > 0
    ? context.pantryItems
    : ['Huevos', 'Pechuga de pollo', 'Atún en lata / agua', 'Arroz integral / blanco', 'Avena integral', 'Espinacas / Hojas verdes', 'Palta / Aguacate', 'Aceite de oliva'];

  const lower = queryText.toLowerCase();
  const isFoodEatingQuery = [
    'comí', 'comi', 'almorcé', 'almorce', 'desayuné', 'desayune', 'cené', 'cene', 
    'tomé', 'tome', 'anota', 'registra', 'ingesta', 'calorias', 'calorías', 
    'huevo', 'pollo', 'arroz', 'avena', 'pan', 'atun', 'atún', 'merendé', 'snack',
    'comida', 'plato', 'almuerzo', 'desayuno', 'cena'
  ].some(k => lower.includes(k));

  const isClosureQuery = [
    'falta', 'cerrar', 'cierre', 'dia', 'día', 'que ceno', 'qué ceno', 
    'despensa', 'siguiente comida', 'cuanto me queda', 'cuánto me queda'
  ].some(k => lower.includes(k));

  const systemInstruction = `Eres el ASESOR NUTRICIONAL Y FITNESS INTEGRAL EXCLUSIVO de ${user.name} y ${partner.name} en su programa "Dúo en Casa".
No eres un chat aislado o pasivo; eres su AGENTE INTELIGENTE AUTÓNOMO DE NUTRICIÓN Y RENDIMIENTO.

====================================================
DATOS CLÍNICOS Y METAS DEL ATLETA (${user.name}):
- Nombre: ${user.name} (${currentUser === 'dionicio' ? '180 cm, ayuno matutino, almuerzo 13:00-14:00, entrena 19:00-20:00, cena post-entreno 20:00' : '41 años, 160 cm, desayuno proteico liviano, entrena 19:00-20:00, cena compartida 20:00'})
- META CALÓRICA DIARIA: ${targetCals} kcal
- META PROTEICA DIARIA: ${targetProtein} g de proteína
- INGERIDO HOY HASTA AHORA: ${currentTodayCals} kcal / ${targetCals} kcal | ${currentTodayProtein}g / ${targetProtein}g proteína.
- SALDO ACTUAL ANTES DE ESTE MENSAJE: Faltan ${Math.max(0, targetCals - currentTodayCals)} kcal y ${Math.max(0, targetProtein - currentTodayProtein)}g de proteína para cerrar el día.

====================================================
INVENTARIO REAL DE ALIMENTOS EN SU DESPENSA ACTIVA:
[ ${pantryList.join(', ')} ]

====================================================
REGLAS MANDATORIAS DE TU COMPORTAMIENTO:
1. CÁLCULO AUTÓNOMO DE NUTRIENTES:
   Si el usuario describe lo que ha comido (o pregunta sobre una comida):
   - Estima con precisión profesional: Calorías totales (kcal), Proteína (g), Carbohidratos (g) y Grasas (g).
   - Explica brevemente el beneficio fisiológico del plato para su recuperación o masa muscular.

2. CÁLCULO EXACTO PARA "CERRAR EL DÍA":
   - Suma la comida reportada al acumulado de hoy.
   - Informa con exactitud matemática cuántas calorías y cuántos gramos de proteína LE FALTAN PARA CERRAR EL DÍA:
     Ej: "Con este almuerzo sumas X kcal. Llevas Y kcal y Zg de proteína. Te faltan exactamente A kcal y Bg de proteína para tu meta de ${targetCals} kcal."

3. PROPUESTA DIRECTA BASADA EN SU DESPENSA REAL:
   - Revisa EXCLUSIVAMENTE los alimentos disponibles en su lista de Despensa arriba.
   - Diseña de inmediato la siguiente comida o la CENA compartida (20:00 post-entreno) usando ingredientes de esa despensa con porciones sugeridas para cubrir el déficit restante sin pasarse.
   - Si no le falta casi nada, recomiéndale un cierre liviano para no acumular exceso calórico.

4. OBLIGATORIO - BLOQUE DE PERSISTENCIA AUTOMÁTICA EN BASE DE DATOS:
   Si el mensaje describe alimentos consumidos o pide registrarlos, INCLUYE AL FINAL de tu respuesta este bloque JSON exacto para que el sistema actualice Firestore y LocalStorage:

\`\`\`json:nutrition_action
{
  "isMealLog": true,
  "mealType": "desayuno | almuerzo | cena | once | snack",
  "title": "Nombre corto de la comida",
  "caloriesKcal": 480,
  "proteinG": 38,
  "carbsG": 42,
  "fatsG": 14,
  "items": ["Detalle de ingrediente 1 con porción", "Ingrediente 2"],
  "summary": "Breve balance nutricional",
  "closureAdvice": {
    "remainingCals": 540,
    "remainingProtein": 42,
    "suggestedMealTitle": "Cena post-entreno sugerida con despensa",
    "suggestedIngredients": ["Pechuga de pollo", "Espinacas", "Palta"],
    "suggestedRecipe": "180g de pechuga de pollo a la plancha con espinacas y 1/4 palta."
  }
}
\`\`\`

5. Si es una consulta sobre "¿Qué ceno hoy?", "¿Qué me falta para cerrar el día?" o sobre ejercicios:
   - Responde con tono experto, usando sus métricas reales y su despensa, sin inventar ingredientes que no tengan.`;

  if (!key) {
    // Modo offline / heurístico
    const estimated = estimateDeterministicMeal(queryText, currentUser, householdId);
    const closure = estimated.closureAdvice;

    let text = '';
    if (isFoodEatingQuery) {
      text = `🥗 **¡Comida Calculada y Analizada para ${user.name}!**

He calculado el aporte nutricional de lo que consumiste:
- **Calorías:** ~${estimated.caloriesKcal} kcal
- **Proteínas:** ${estimated.proteinG} g
- **Carbohidratos:** ${estimated.carbsG} g
- **Grasas:** ${estimated.fatsG} g

---

🎯 **Estado para Cerrar tu Día:**
- **Llevas hoy:** ${closure.newTotalCals} / ${closure.targetCals} kcal (${closure.newTotalProtein}g / ${closure.targetProtein}g proteína).
- **Te faltan:** **${closure.remainingCals} kcal** y **${closure.remainingProtein}g de proteína** para completar tu meta.

---

🥘 **Orientación según tu Despensa Actual:**
${closure.suggestedRecipe}
*(Ingredientes detectados en casa: ${closure.availablePantrySnippet})*`;
    } else {
      text = `📊 **Balance de Cierre de Día para ${user.name}:**

- **Consumo actual hoy:** ${currentTodayCals} / ${targetCals} kcal (${currentTodayProtein}g / ${targetProtein}g proteína).
- **Te faltan para cerrar el día:** **${Math.max(0, targetCals - currentTodayCals)} kcal** y **${Math.max(0, targetProtein - currentTodayProtein)}g de proteína**.

🥘 **Propuesta con tu Despensa (${pantryList.slice(0, 4).join(', ')}):**
${closure.suggestedRecipe}`;
    }

    return {
      text,
      detectedMeal: isFoodEatingQuery ? estimated : null
    };
  }

  try {
    const rawResponse = await callGemini(systemInstruction, queryText, key);

    let detectedMeal = null;
    const jsonActionMatch = rawResponse.match(/```json:nutrition_action\s*([\s\S]*?)\s*```/);
    let cleanText = rawResponse;

    if (jsonActionMatch && jsonActionMatch[1]) {
      try {
        detectedMeal = JSON.parse(jsonActionMatch[1]);
        cleanText = rawResponse.replace(/```json:nutrition_action\s*[\s\S]*?\s*```/, '').trim();
      } catch (parseErr) {
        console.warn('Error al parsear bloque de acción nutricional:', parseErr);
      }
    } else if (isFoodEatingQuery) {
      detectedMeal = estimateDeterministicMeal(queryText, currentUser, householdId);
    }

    return {
      text: cleanText,
      detectedMeal
    };
  } catch (err) {
    console.warn('Fallo en llamada a Gemini, usando estimador inteligente de respaldo:', err.message);
    const estimated = estimateDeterministicMeal(queryText, currentUser, householdId);
    const closure = estimated.closureAdvice;

    return {
      text: `🥗 **Registro procesado para ${user.name}:**
- Aporte: ~${estimated.caloriesKcal} kcal y ${estimated.proteinG}g de proteína.
- Te faltan **${closure.remainingCals} kcal** y **${closure.remainingProtein}g de proteína** para cerrar el día.
- **Sugerencia con tu despensa:** ${closure.suggestedRecipe}`,
      detectedMeal: estimated
    };
  }
}


