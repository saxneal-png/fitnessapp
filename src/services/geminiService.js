import { GoogleGenerativeAI } from '@google/generative-ai';
import { USERS, WORKOUT_DAYS, TREADMILL_PROTOCOLS } from '../data/workoutCatalog';
import { getLocalLogs, getLocalWeightEntries, getLocalNutritionLogs, getLocalPantryItems, getLocalWeeklyMenu } from '../firebase/config';
import { calculateAthleteNutrition, getAthleteBiometrics, calculateNavyBodyFat } from './nutritionCalculator';
import { getLocalFoodCatalog, searchFoodInKnowledgeBase, saveFoodItemToKnowledgeBase } from './foodKnowledgeService';
import { saveCustomWorkoutPlan, generateDeterministicWorkoutPlan } from './adaptiveWorkoutService';
import { getLocalMealSettings } from './mealSettingsService';
import { getLocalDateString } from '../utils/dateUtils';


export const GEMINI_STORAGE_KEY = 'fitness_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'fitness_gemini_model';

export const GEMINI_AVAILABLE_MODELS = [
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest (Prioritario)' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Recomendado • Ultra Rápido)' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest' },
  { id: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash Lite Preview (02-05)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Bajo consumo)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

export function getStoredGeminiKey(userId = null) {
  if (userId) {
    const userKey = localStorage.getItem(`${GEMINI_STORAGE_KEY}_${userId}`);
    if (userKey) return userKey.trim();
  }
  try {
    const active = localStorage.getItem('fitness_duo_active_user');
    if (active) {
      const activeKey = localStorage.getItem(`${GEMINI_STORAGE_KEY}_${active}`);
      if (activeKey) return activeKey.trim();
    }
  } catch (e) {}
  return (localStorage.getItem(GEMINI_STORAGE_KEY) || '').trim();
}

export function saveGeminiKey(key, userId = null) {
  const cleanKey = (key || '').trim();
  if (userId) {
    localStorage.setItem(`${GEMINI_STORAGE_KEY}_${userId}`, cleanKey);
  }
  localStorage.setItem(GEMINI_STORAGE_KEY, cleanKey);
}

export function getStoredGeminiModel(userId = null) {
  if (userId) {
    const userModel = localStorage.getItem(`${GEMINI_MODEL_STORAGE_KEY}_${userId}`);
    if (userModel) return userModel.trim();
  }
  try {
    const active = localStorage.getItem('fitness_duo_active_user');
    if (active) {
      const activeModel = localStorage.getItem(`${GEMINI_MODEL_STORAGE_KEY}_${active}`);
      if (activeModel) return activeModel.trim();
    }
  } catch (e) {}
  return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || 'gemini-2.0-flash-lite';
}

export function saveGeminiModel(model, userId = null) {
  const cleanModel = (model || '').trim();
  if (userId) {
    localStorage.setItem(`${GEMINI_MODEL_STORAGE_KEY}_${userId}`, cleanModel);
  }
  localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, cleanModel);
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
    'gemini-flash-latest',
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

function getAthletesList() {
  let custom = {};
  try {
    const raw = localStorage.getItem('fitness_duo_custom_users');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}
  return {
    ...USERS,
    ...custom
  };
}

/**
 * Construye el contexto base del hogar o espacio privado para las consultas del coach
 */
export function buildHouseholdContext(householdId = 'hogar-dionicio-paula', targetUserId = null) {
  const allAthletes = getAthletesList();
  const activeUserId = targetUserId || localStorage.getItem('fitness_duo_active_user') || 'dionicio';
  const logs = getLocalLogs(householdId);
  const weights = getLocalWeightEntries(householdId);
  
  const pantry = getLocalPantryItems(householdId);
  const activeMenu = getLocalWeeklyMenu(householdId);

  // Extraer métricas para todos los atletas relevantes
  const dionicioMetrics = extractAthleteMetrics(logs, weights, 'dionicio');
  const paulaMetrics = extractAthleteMetrics(logs, weights, 'paula');
  const userMetrics = extractAthleteMetrics(logs, weights, activeUserId);

  const dionicioLogs = logs.filter(l => l.userId === 'dionicio');
  const paulaLogs = logs.filter(l => l.userId === 'paula');
  const userLogs = logs.filter(l => l.userId === activeUserId);

  const nutritionLogs = getLocalNutritionLogs(householdId);
  const todayStr = getLocalDateString();
  
  // Nutrición por atleta
  const nutritionMap = {};
  for (const uid of Object.keys(allAthletes)) {
    const uLogs = nutritionLogs.filter(n => n.userId === uid && (n.date === todayStr || (!n.date && getLocalDateString(n.timestamp) === todayStr)));
    const todayCals = uLogs.reduce((acc, n) => acc + (Number(n.caloriesKcal) || 0), 0);
    const todayProtein = uLogs.reduce((acc, n) => acc + (Number(n.proteinG) || 0), 0);
    const plan = calculateAthleteNutrition(uid, householdId);
    
    nutritionMap[uid] = {
      todayCals,
      targetCals: plan.targetCals,
      todayProtein,
      targetProtein: plan.targetProtein,
      targetCarbs: plan.targetCarbs,
      targetFats: plan.targetFats,
      plan,
      todayMealsCount: uLogs.length,
      todayMeals: uLogs
    };
  }

  return {
    athletes: allAthletes,
    activeUserId,
    totalLogsCount: logs.length,
    dionicioMetrics,
    paulaMetrics,
    userMetrics,
    recentLogs: logs.slice(0, 10),
    dionicioRecent: dionicioLogs.slice(0, 5),
    paulaRecent: paulaLogs.slice(0, 5),
    userRecent: userLogs.slice(0, 5),
    bodyweights: weights.filter(w => w.userId === activeUserId || !targetUserId).slice(0, 5),
    pantryItems: pantry,
    hasActiveMenu: !activeMenu,
    menuSnippet: activeMenu ? activeMenu.content?.substring(0, 300) : 'Sin menú generado aún',
    nutrition: {
      allLogs: nutritionLogs,
      todayDate: todayStr,
      ...nutritionMap,
      dionicio: nutritionMap.dionicio || { todayCals: 0, targetCals: 1600, todayProtein: 0, targetProtein: 130 },
      paula: nutritionMap.paula || { todayCals: 0, targetCals: 1220, todayProtein: 0, targetProtein: 82 }
    },
    mealSettings: getLocalMealSettings(householdId),
    foodCatalog: getLocalFoodCatalog(householdId)
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
export function getLiveTimerAdvice(interval, userAIsFirst, selectedDayRoutine, athleteA = null, athleteB = null, isDuo = true) {
  const userA = athleteA || USERS.dionicio;
  const userB = athleteB || USERS.paula;
  const routine = WORKOUT_DAYS.find(d => d.id === selectedDayRoutine) || WORKOUT_DAYS[0];

  if (!isDuo) {
    // Modo cuenta privada o atleta individual
    switch (interval.id) {
      case 'warmup':
        return {
          badge: 'Movilidad & Activación (19:00 - 19:07)',
          headline: '7 minutos de preparación articular',
          userATip: `${userA.name}: Círculos articulares, rotación de hombros, movilidad de cadera y sentadillas suaves sin peso.`,
          userBTip: `Respira profundamente, mantén postura erguida y eleva tu temperatura corporal de forma progresiva.`,
          generalTip: 'No uses cargas pesadas aún. El objetivo es preparar articulaciones y sistema nervioso.'
        };
      case 'block1':
        return {
          badge: `Bloque de Fuerza • ${routine.name.split('(')[0]}`,
          headline: `Estación Principal de Sobrecarga`,
          userATip: `${userA.name}: Inicia con ${routine.exercises[0].name}. Descansos de ${routine.exercises[0].restSeconds}s. Mantén técnica estricta.`,
          userBTip: `Asegura el control excéntrico (bajada en 2-3s) y no llegues al fallo en las primeras series.`,
          generalTip: 'Mantén hidratación constante y registra cada serie completada.'
        };
      case 'transition':
        return {
          badge: 'Pausa & Transición Activa',
          headline: '3 minutos de recuperación e hidratación',
          userATip: `${userA.name}: Hidrátate, respira hondo y prepara el siguiente ejercicio o máquina cardiovascular.`,
          userBTip: `Aprovecha de anotar tus cargas y calibrar los implementos para el siguiente bloque.`,
          generalTip: 'Recupera el ritmo cardíaco antes de comenzar el siguiente bloque.'
        };
      case 'block2':
        return {
          badge: `Bloque Cardiovascular o Accesorios`,
          headline: `Continuidad del Entrenamiento`,
          userATip: `${userA.name}: Mantén ritmo constante en Zona 2 aeróbica o ejecuta accesorios cuidando tu postura.`,
          userBTip: `Enfócate en la cadencia y estabilidad de la respiración.`,
          generalTip: '¡Último esfuerzo de la sesión! Mantén la técnica impecable.'
        };
      case 'cooldown':
      default:
        return {
          badge: 'Vuelta a la Calma & Recuperación',
          headline: '¡Sesión cumplida con éxito!',
          userATip: `${userA.name}: Estiramiento suave de los grupos musculares trabajados y respiraciones lentas.`,
          userBTip: `Hidrátate con agua y prepárate para tu comida post-entrenamiento según tus metas.`,
          generalTip: 'Gran trabajo hoy. La constancia es la clave del progreso.'
        };
    }
  }

  // Modo familiar Dúo
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
        userATip: `${userA.name} (Fuerza): Inicia con ${routine.exercises[0].name}. Descansos de ${routine.exercises[0].restSeconds}s. RPE ${userA.targetRPE || '7'}.`,
        userBTip: `${userB.name} (Cardio): Sube a inclinación 4-6% (min 3-20). Mantén FC en Zona 2 sin apoyarte en los pasamanos.`,
        generalTip: 'Ambos entrenan al mismo tiempo. Mantengan botellas de agua a mano.'
      };

    case 'transition':
      return {
        badge: 'Rotación & Ajuste de Discos (19:32 - 19:35)',
        headline: '3 minutos de cambio de estación e hidratación',
        userATip: `${userA.name}: Pasa a la trotadora. Inicia a velocidad suave (3.8 - 4.0 km/h) para normalizar el pulso.`,
        userBTip: `${userB.name}: Pasa a las mancuernas. Ajusta el peso de los discos a tu carga (${routine.exercises[0].defaultWeightPaula || 8}kg aprox).`,
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
 * Consulta general al Coach con contexto 360° individualizado y rol de Personal Trainer de Élite
 */
export async function askCoachWithFullContext(queryText, currentUser, householdId, apiKey) {
  const athletes = getAthletesList();
  const user = athletes[currentUser] || athletes.dionicio || Object.values(athletes)[0];
  const isDuoHousehold = householdId === 'hogar-dionicio-paula' && (currentUser === 'dionicio' || currentUser === 'paula');
  const partnerId = isDuoHousehold ? (currentUser === 'dionicio' ? 'paula' : 'dionicio') : null;
  const partner = partnerId ? athletes[partnerId] : null;

  const context = buildHouseholdContext(householdId, currentUser);
  const currentMetrics = extractAthleteMetrics(context.recentLogs, context.bodyweights, currentUser);
  const userKey = apiKey || getStoredGeminiKey(currentUser);

  const formatPRs = (metrics) => {
    const prEntries = Object.entries(metrics.exercisePRs || {});
    if (prEntries.length === 0) return 'Sin series registradas aún (Fase Calibración Semana 0).';
    return prEntries.map(([name, data]) => 
      `- ${name}: Max ${data.maxWeightKg}kg (x${data.bestSetReps} reps) | Última serie: ${data.lastLoggedWeight}kg (RPE ${data.lastLoggedRpe}) -> Sugerencia sobrecarga: ${data.suggestedOverload}`
    ).join('\n');
  };

  const userPlan = context.nutrition?.[currentUser]?.plan || calculateAthleteNutrition(currentUser, householdId);
  const userNut = context.nutrition?.[currentUser] || { todayCals: 0, targetCals: userPlan.targetCals, todayProtein: 0, targetProtein: userPlan.targetProtein };

  let systemInstruction = '';

  if (!isDuoHousehold) {
    // ================= MODO COACH INDIVIDUAL Y PRIVADO =================
    systemInstruction = `Eres el PERSONAL TRAINER DE ÉLITE Y NUTRICIONISTA DEPORTIVO EXCLUSIVO Y PRIVADO de ${user.name}.
Tu misión es guiar, corregir, motivar y ajustar las cargas de entrenamiento y nutrición de ${user.name} basándote ÚNICAMENTE en sus datos privados y la ciencia del ejercicio.
Trabajas exclusivamente para ${user.name} con su API Key personal. No mezclas ni haces referencia a datos de otras personas.

====================================================
📊 ESTADO Y MÉTRICAS EN TIEMPO REAL DE ${user.name.toUpperCase()}:
Atleta: ${user.name} (${user.level || 'Principiante'} • ${user.height || '175 cm'} • ${user.phase || 'Semana 0'})
- Edad: ${user.age || 30} años | Género: ${user.gender || 'male'}
- Volumen semanal levantado: ${currentMetrics.weeklyVolumeKg} kg (${currentMetrics.totalSetsCount} series en total)
- RPE promedio reciente: ${currentMetrics.avgRpe}/10 (Objetivo: ${user.targetRPE || '6 - 7.5 / 10'})
- Sesiones de Trotadora/Cardio: ${currentMetrics.cardio.sessionsCount} (${currentMetrics.cardio.totalMinutes} min, ~${currentMetrics.cardio.totalCalories} kcal)
- Peso corporal actual: ${currentMetrics.bodyweight.current ? `${currentMetrics.bodyweight.current} kg` : 'Sin registrar'} (Delta: ${currentMetrics.bodyweight.delta > 0 ? '+' : ''}${currentMetrics.bodyweight.delta} kg)

🏋️‍♂️ RÉCORDS PERSONALES Y PROGRESIÓN DE ${user.name.toUpperCase()}:
${formatPRs(currentMetrics)}

====================================================
🎯 MODO FISIOLÓGICO Y OBJETIVO METABÓLICO ACTIVO:
- Modo de ${user.name}: ${userPlan.activeModeConfig?.name || 'Pérdida de Grasa Visceral'}
- Meta Calórica Diaria: ${userPlan.targetCals} kcal/día (${userPlan.formulaDetails?.adjustment || 'Déficit Clínico'})
- Proteína Diaria: ${userPlan.targetProtein}g | Grasas: ${userPlan.targetFats}g | Carbohidratos: ${userPlan.targetCarbs}g
- Ingesta consumida hoy: ${userNut.todayCals} / ${userPlan.targetCals} kcal (${userNut.todayProtein}g / ${userPlan.targetProtein}g proteína)
- Faltan para cerrar el día: ${Math.max(0, userPlan.targetCals - userNut.todayCals)} kcal y ${Math.max(0, userPlan.targetProtein - userNut.todayProtein)}g de proteína.

====================================================
🥘 DESPENSA Y ALIMENTOS DISPONIBLES:
- Despensa: ${context.pantryItems.join(', ') || 'Sin ingredientes informados'}

DIRECTRICES DE TUS RESPUESTAS:
- Habla directamente a ${user.name} de forma motivadora, empática, técnica y concisa.
- Cita sus números o ejercicios registrados para fundamentar tus consejos.
- Si te piden sugerencia de cargas para hoy, revisa su historial y dale los kg exactos a levantar.
- Formato Markdown impecable con emojis deportivos, viñetas y pasos claros.`;
  } else {
    // ================= MODO COACH HOGAR DÚO (DIONICIO Y PAULA) =================
    const partnerMetrics = extractAthleteMetrics(context.recentLogs, context.bodyweights, partnerId);
    systemInstruction = `Eres el PERSONAL TRAINER DE ÉLITE Y NUTRICIONISTA DEPORTIVO EXCLUSIVO de Dionicio y Paula para su programa "Dúo en Casa" (19:00 a 20:00).
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

====================================================
🥗 CALORÍAS Y NUTRICIÓN DE HOY:
- ${user.name}: ${context.nutrition?.[currentUser]?.todayCals || 0} / ${context.nutrition?.[currentUser]?.targetCals || 1600} kcal (${context.nutrition?.[currentUser]?.todayProtein || 0}g proteína)
- ${partner.name}: ${context.nutrition?.[partnerId]?.todayCals || 0} / ${context.nutrition?.[partnerId]?.targetCals || 1220} kcal (${context.nutrition?.[partnerId]?.todayProtein || 0}g proteína)`;
  }

  return await callGemini(systemInstruction, queryText, userKey);
}

/**
 * Estimador heurístico determinístico de comidas y macronutrientes (offline / fallback)
 * Ahora calcula también cuánto falta para cerrar el día y propone qué preparar según la despensa
 */
/**
 * Estimador heurístico determinístico de comidas y macronutrientes (offline / fallback)
 * Capaz de procesar mensajes individuales o combinados ("yo..." y "mi esposa...")
 * y desglosar múltiples comidas (desayuno, almuerzo, cena) para Dionicio y Paula.
 */
export function estimateDeterministicMeal(text = '', currentUser = 'dionicio', householdId = 'hogar-dionicio-paula') {
  const lower = text.toLowerCase();

  // Catálogo dinámico aprendido del hogar (Firestore / LocalStorage)
  const householdCatalog = getLocalFoodCatalog(householdId);
  const learnedFoodsDetected = [];

  // Mapear el catálogo dinámico a formato procesable
  const dynamicCatalogItems = householdCatalog.map(item => ({
    keys: item.keywords || [item.name.toLowerCase()],
    per100g: item.per100 || {
      cal: Math.round(((item.calories || 0) / (item.servingSize || 100)) * 100),
      p: Number((((item.proteinG || 0) / (item.servingSize || 100)) * 100).toFixed(1)),
      c: Number((((item.carbsG || 0) / (item.servingSize || 100)) * 100).toFixed(1)),
      f: Number((((item.fatsG || 0) / (item.servingSize || 100)) * 100).toFixed(1))
    },
    defaultWeight: item.servingSize || 100,
    servingDesc: item.servingDesc || `${item.servingSize || 100}g`,
    servingCalories: item.calories,
    servingProtein: item.proteinG,
    servingCarbs: item.carbsG,
    servingFats: item.fatsG,
    name: item.name,
    brand: item.brand,
    isLearnedBrand: true
  }));

  // Diccionario base de alimentos con factores por gramo o porción típica
  const BASE_FOOD_DATABASE = [
    { keys: ['marraqueta', 'diente de marraqueta', 'pan'], per100g: { cal: 270, p: 9, c: 54, f: 1 }, defaultWeight: 55, name: 'Marraqueta (diente)' },
    { keys: ['pollo', 'pechuga'], per100g: { cal: 165, p: 31, c: 0, f: 3.6 }, defaultWeight: 120, name: 'Pechuga de pollo' },
    { keys: ['salmon', 'salmón'], per100g: { cal: 206, p: 20, c: 0, f: 13 }, defaultWeight: 100, name: 'Salmón a la plancha' },
    { keys: ['merluza', 'reineta', 'pescado'], per100g: { cal: 90, p: 18, c: 0, f: 1.5 }, defaultWeight: 100, name: 'Merluza a la plancha' },
    { keys: ['zapallo italiano', 'zucchini', 'calabacin', 'calabacín'], per100g: { cal: 17, p: 1.2, c: 3.1, f: 0.3 }, defaultWeight: 150, name: 'Zapallo italiano cocido' },
    { keys: ['arroz'], per100g: { cal: 130, p: 2.7, c: 28, f: 0.3 }, defaultWeight: 150, name: 'Arroz cocido' },
    { keys: ['huevo', 'huevos', 'omelette', 'revuelto', 'pochado'], per100g: { cal: 145, p: 12.6, c: 1, f: 10 }, defaultWeight: 100, name: 'Huevos' },
    { keys: ['atun', 'atún'], per100g: { cal: 130, p: 28, c: 0, f: 1.5 }, defaultWeight: 100, name: 'Atún al natural' },
    { keys: ['carne', 'vacuno', 'bistec', 'lomo', 'molida'], per100g: { cal: 215, p: 26, c: 0, f: 12 }, defaultWeight: 150, name: 'Carne magra' },
    { keys: ['avena'], per100g: { cal: 370, p: 13, c: 67, f: 7 }, defaultWeight: 40, name: 'Avena integral' },
    { keys: ['papa', 'papas', 'camote'], per100g: { cal: 85, p: 2, c: 20, f: 0.1 }, defaultWeight: 150, name: 'Papas cocidas' },
    { keys: ['palta', 'aguacate'], per100g: { cal: 160, p: 2, c: 8.5, f: 15 }, defaultWeight: 60, name: 'Palta / Aguacate' },
    { keys: ['espinaca', 'espinacas', 'ensalada', 'lechuga', 'hojas'], per100g: { cal: 23, p: 2.9, c: 3.6, f: 0.4 }, defaultWeight: 100, name: 'Espinacas / Ensalada fresca' },
    { keys: ['tomate'], per100g: { cal: 18, p: 0.9, c: 3.9, f: 0.2 }, defaultWeight: 120, name: 'Tomate fresco' },
    { keys: ['cafe', 'café', 'te', 'té', 'alulosa'], per100g: { cal: 4, p: 0.1, c: 0.8, f: 0.0 }, defaultWeight: 100, name: 'Café con alulosa' },
    { keys: ['yogurt', 'yogur', 'griego'], per100g: { cal: 95, p: 9, c: 4, f: 3 }, defaultWeight: 125, name: 'Yogurt griego' },
    { keys: ['aceite', 'oliva'], per100g: { cal: 884, p: 0, c: 0, f: 100 }, defaultWeight: 5, name: 'Aceite de oliva (1 cdta)' }
  ];

  // Priorizar catálogo dinámico aprendido por sobre base genérica
  const COMBINED_DATABASE = [...dynamicCatalogItems, ...BASE_FOOD_DATABASE];

  // Función interna para calcular macros de un fragmento de texto
  const parseMealFragment = (subText, targetUser) => {
    const sLower = subText.toLowerCase();
    const matched = [];
    let totCal = 0, totP = 0, totC = 0, totF = 0;
    const handledKeys = new Set();

    COMBINED_DATABASE.forEach(food => {
      const isMatch = food.keys.some(k => sLower.includes(k.toLowerCase()));
      if (isMatch) {
        // Evitar doble conteo si ya se procesó una coincidencia más específica
        const primaryKey = food.keys[0];
        if (handledKeys.has(primaryKey)) return;
        handledKeys.add(primaryKey);

        let grams = food.defaultWeight;
        let isDirectServing = false;
        let servingCount = 1;

        // Detectar si se menciona porciones comunes: "1 vaso", "un vaso", "2 vasos", "1 scoop", "1 lata", "1 pote", "1 diente"
        if (sLower.includes('un vaso') || sLower.includes('1 vaso')) {
          servingCount = 1;
          isDirectServing = true;
        } else if (sLower.match(/(\d+)\s*vasos?/)) {
          servingCount = parseInt(sLower.match(/(\d+)\s*vasos?/)[1]) || 1;
          isDirectServing = true;
        } else if (sLower.includes('un scoop') || sLower.includes('1 scoop')) {
          servingCount = 1;
          isDirectServing = true;
        } else if (sLower.includes('una lata') || sLower.includes('1 lata')) {
          servingCount = 1;
          isDirectServing = true;
        } else if (sLower.includes('un pote') || sLower.includes('1 pote')) {
          servingCount = 1;
          isDirectServing = true;
        } else if (sLower.includes('un diente') || sLower.includes('1 diente')) {
          servingCount = 1;
          isDirectServing = true;
        } else if (sLower.match(/(\d+)\s*dientes?/)) {
          servingCount = parseInt(sLower.match(/(\d+)\s*dientes?/)[1]) || 1;
          isDirectServing = true;
        }

        // Buscar patrón de gramaje explícito: "178gramos", "178 gramos", "178g", "40 gramos"
        const gRegex = new RegExp(`(\\d+)\\s*(?:gramos|gramo|gr|g|ml)?\\s*(?:de)?\\s*${food.keys[0]}`, 'i');
        const matchG = sLower.match(gRegex);

        const revRegex = new RegExp(`${food.keys[0]}[^\\d]{1,15}(\\d+)\\s*(?:gramos|gr|g|ml)`, 'i');
        const matchRev = sLower.match(revRegex);

        if (matchG && matchG[1]) {
          const val = parseInt(matchG[1]);
          if (val > 5 && val <= 1000) {
            grams = val;
            isDirectServing = false;
          }
        } else if (matchRev && matchRev[1]) {
          const val = parseInt(matchRev[1]);
          if (val > 5 && val <= 1000) {
            grams = val;
            isDirectServing = false;
          }
        }

        let cal = 0, p = 0, c = 0, f = 0;

        if (food.isLearnedBrand && isDirectServing && food.servingCalories !== undefined) {
          // Usar datos exactos por porción del producto comercial
          cal = Math.round(food.servingCalories * servingCount);
          p = Number(((food.servingProtein || 0) * servingCount).toFixed(1));
          c = Number(((food.servingCarbs || 0) * servingCount).toFixed(1));
          f = Number(((food.servingFats || 0) * servingCount).toFixed(1));
          grams = (food.defaultWeight || 100) * servingCount;
        } else {
          const factor = grams / 100;
          cal = Math.round(food.per100g.cal * factor);
          p = Number((food.per100g.p * factor).toFixed(1));
          c = Number((food.per100g.c * factor).toFixed(1));
          f = Number((food.per100g.f * factor).toFixed(1));
        }

        totCal += cal;
        totP += p;
        totC += c;
        totF += f;

        matched.push({
          name: `${grams}${food.name.toLowerCase().includes('leche') || food.name.toLowerCase().includes('agua') ? 'ml' : 'g'} ${food.name}`,
          calories: cal,
          protein: p,
          carbs: c,
          fats: f,
          isLearnedBrand: !!food.isLearnedBrand
        });
      }
    });

    if (matched.length === 0) {
      const isDio = targetUser === 'dionicio';
      totCal = isDio ? 480 : 320;
      totP = isDio ? 35 : 24;
      totC = isDio ? 45 : 30;
      totF = isDio ? 12 : 9;
      matched.push({ name: 'Comida balanceada estimada', calories: totCal, protein: totP, carbs: totC, fats: totF });
    }

    return {
      caloriesKcal: totCal,
      proteinG: Math.round(totP),
      carbsG: Math.round(totC),
      fatsG: Math.round(totF),
      items: matched.map(m => `${m.name}: ~${m.calories} kcal (${m.protein}g P)`),
      titleSummary: matched.slice(0, 3).map(m => m.name.replace(/^\d+(?:g|ml)\s*/, '')).join(' con ')
    };
  };

  const isDuoHousehold = householdId === 'hogar-dionicio-paula' && (currentUser === 'dionicio' || currentUser === 'paula');

  // Detección de Dual / Dúo (solo activo en el hogar de Dionicio y Paula)
  const hasDionicio = lower.includes('yo') || lower.includes('dionicio');
  const hasPaula = lower.includes('esposa') || lower.includes('paula') || lower.includes('ella') || lower.includes('mi mujer');
  const isDuoLog = isDuoHousehold && hasDionicio && hasPaula;

  const context = buildHouseholdContext(householdId);
  const pantry = context.pantryItems && context.pantryItems.length > 0 
    ? context.pantryItems 
    : ['Huevos', 'Pechuga de pollo', 'Salmón', 'Merluza', 'Atún en lata', 'Arroz', 'Zapallo italiano', 'Espinacas', 'Palta / Aguacate'];

  const dioPlan = isDuoHousehold ? (context.nutrition?.dionicio?.plan || calculateAthleteNutrition('dionicio', householdId)) : null;
  const pauPlan = isDuoHousehold ? (context.nutrition?.paula?.plan || calculateAthleteNutrition('paula', householdId)) : null;

  const dioTargetCals = dioPlan?.targetCals || 1600;
  const dioTargetProtein = dioPlan?.targetProtein || 140;
  const pauTargetCals = pauPlan?.targetCals || 1220;
  const pauTargetProtein = pauPlan?.targetProtein || 90;

  if (isDuoLog) {
    // Segmentar texto para Dionicio y para Paula
    const paulaIndex = lower.search(/(?:mi esposa|esposa|paula):?/i);
    let dioText = lower.substring(0, paulaIndex);
    let pauText = lower.substring(paulaIndex);

    // Identificar comidas en cada segmento (desayuno, almuerzo, etc.)
    const processSegment = (segmentText, userId, athleteName) => {
      const entries = [];
      const hasBreakfast = segmentText.includes('desayun');
      const hasLunch = segmentText.includes('almuerz');

      if (hasBreakfast && hasLunch) {
        const lunchIdx = segmentText.indexOf('almuerz');
        const bText = segmentText.substring(0, lunchIdx);
        const lText = segmentText.substring(lunchIdx);

        const bData = parseMealFragment(bText, userId);
        entries.push({
          userId,
          athleteName,
          mealType: 'desayuno',
          title: `Desayuno: ${bData.titleSummary || 'Marraqueta con pollo y café'}`,
          caloriesKcal: bData.caloriesKcal,
          proteinG: bData.proteinG,
          carbsG: bData.carbsG,
          fatsG: bData.fatsG,
          items: bData.items,
          coachFeedback: `Desayuno equilibrado para ${athleteName}.`
        });

        const lData = parseMealFragment(lText, userId);
        entries.push({
          userId,
          athleteName,
          mealType: 'almuerzo',
          title: `Almuerzo: ${lData.titleSummary || 'Arroz con pescado y vegetales'}`,
          caloriesKcal: lData.caloriesKcal,
          proteinG: lData.proteinG,
          carbsG: lData.carbsG,
          fatsG: lData.fatsG,
          items: lData.items,
          coachFeedback: `Excelente aporte proteico y de carbohidratos complejos para ${athleteName}.`
        });
      } else {
        let mType = 'almuerzo';
        if (hasBreakfast) mType = 'desayuno';
        else if (segmentText.includes('once') || segmentText.includes('cena') || segmentText.includes('tarde') || segmentText.includes('noche')) mType = 'once';

        const data = parseMealFragment(segmentText, userId);
        const displayTypeName = mType === 'once' ? 'Once / Once-Comida' : (mType.charAt(0).toUpperCase() + mType.slice(1));
        entries.push({
          userId,
          athleteName,
          mealType: mType,
          title: `${displayTypeName}: ${data.titleSummary}`,
          caloriesKcal: data.caloriesKcal,
          proteinG: data.proteinG,
          carbsG: data.carbsG,
          fatsG: data.fatsG,
          items: data.items,
          coachFeedback: `Comida (${displayTypeName}) registrada para ${athleteName}.`
        });
      }
      return entries;
    };

    const dioEntries = processSegment(dioText, 'dionicio', 'Dionicio');
    const pauEntries = processSegment(pauText, 'paula', 'Paula');
    const allEntries = [...dioEntries, ...pauEntries];

    const dioNewCals = (context.nutrition?.dionicio?.todayCals || 0) + dioEntries.reduce((a, b) => a + b.caloriesKcal, 0);
    const dioNewProtein = (context.nutrition?.dionicio?.todayProtein || 0) + dioEntries.reduce((a, b) => a + b.proteinG, 0);
    const pauNewCals = (context.nutrition?.paula?.todayCals || 0) + pauEntries.reduce((a, b) => a + b.caloriesKcal, 0);
    const pauNewProtein = (context.nutrition?.paula?.todayProtein || 0) + pauEntries.reduce((a, b) => a + b.proteinG, 0);

    const dioRemCals = Math.max(0, dioTargetCals - dioNewCals);
    const dioRemProt = Math.max(0, dioTargetProtein - dioNewProtein);
    const pauRemCals = Math.max(0, pauTargetCals - pauNewCals);
    const pauRemProt = Math.max(0, pauTargetProtein - pauNewProtein);

    const dinnerProposal = {
      title: 'Once Dúo Post-Entreno (20:00) con Despensa',
      recipe: 'Pechuga de pollo o merluza a la plancha con marraqueta o salteado de zapallo italiano, espinacas y toque de palta.',
      dionicioPortion: `220g proteína + 1 diente marraqueta o 150g papas + zapallo italiano abundante + 1/2 palta (~${dioRemCals > 600 ? 650 : dioRemCals} kcal, ~${Math.min(50, dioRemProt)}g prot)`,
      paulaPortion: `130g proteína + 1/2 diente marraqueta o 60g papas + zapallo italiano abundante + 1/4 palta (~${pauRemCals > 450 ? 450 : pauRemCals} kcal, ~${Math.min(32, pauRemProt)}g prot)`
    };

    return {
      isMealLog: true,
      isDuoLog: true,
      title: `Registro Nutricional Dúo: Dionicio (${dioEntries.length} comidas) y Paula (${pauEntries.length} comidas)`,
      entries: allEntries,
      caloriesKcal: allEntries.reduce((a, b) => a + b.caloriesKcal, 0),
      proteinG: allEntries.reduce((a, b) => a + b.proteinG, 0),
      carbsG: allEntries.reduce((a, b) => a + b.carbsG, 0),
      fatsG: allEntries.reduce((a, b) => a + b.fatsG, 0),
      items: allEntries.map(e => `${e.athleteName} - ${e.title}: ${e.caloriesKcal} kcal`),
      summary: `Procesadas ${allEntries.length} comidas en total para ambos atletas.`,
      dionicioClosure: {
        todayTotalCals: dioNewCals,
        targetCals: dioTargetCals,
        remainingCals: dioRemCals,
        todayTotalProtein: dioNewProtein,
        targetProtein: dioTargetProtein,
        remainingProtein: dioRemProt
      },
      paulaClosure: {
        todayTotalCals: pauNewCals,
        targetCals: pauTargetCals,
        remainingCals: pauRemCals,
        todayTotalProtein: pauNewProtein,
        targetProtein: pauTargetProtein,
        remainingProtein: pauRemProt
      },
      sharedDinnerProposal: dinnerProposal
    };
  }

  // Caso individual: resolver usuario atleta y plan según contexto
  let targetUser = currentUser;
  if (isDuoHousehold) {
    targetUser = lower.includes('paula') || (!lower.includes('dionicio') && currentUser === 'paula') ? 'paula' : 'dionicio';
  }
  const athletes = getAthletesList();
  const currentAthleteObj = athletes[targetUser] || athletes[currentUser] || { name: 'Atleta' };
  const athleteName = currentAthleteObj.name || (targetUser === 'dionicio' ? 'Dionicio' : targetUser === 'paula' ? 'Paula' : 'Atleta');
  
  const targetPlan = isDuoHousehold 
    ? (targetUser === 'dionicio' ? dioPlan : pauPlan)
    : (context.nutrition?.[targetUser]?.plan || calculateAthleteNutrition(targetUser, householdId));
  const targetCals = targetPlan.targetCals;
  const targetProtein = targetPlan.targetProtein;

  let mealType = 'almuerzo';
  if (lower.includes('desayun')) mealType = 'desayuno';
  else if (lower.includes('once') || lower.includes('cena') || lower.includes('tarde') || lower.includes('noche') || lower.includes('merienda')) mealType = 'once';
  else if (lower.includes('snack') || lower.includes('colacion') || lower.includes('colación')) mealType = 'snack';

  const data = parseMealFragment(text, targetUser);
  const currentTodayCals = context.nutrition?.[targetUser]?.todayCals || 0;
  const currentTodayProtein = context.nutrition?.[targetUser]?.todayProtein || 0;
  const newTotalCals = currentTodayCals + data.caloriesKcal;
  const newTotalProtein = currentTodayProtein + data.proteinG;
  const remainingCals = Math.max(0, targetCals - newTotalCals);
  const remainingProtein = Math.max(0, targetProtein - newTotalProtein);

  const displayTypeName = mealType === 'once' ? 'Once / Once-Comida' : (mealType.charAt(0).toUpperCase() + mealType.slice(1));
  const entry = {
    userId: targetUser,
    athleteName,
    mealType,
    title: `${displayTypeName}: ${data.titleSummary}`,
    caloriesKcal: data.caloriesKcal,
    proteinG: data.proteinG,
    carbsG: data.carbsG,
    fatsG: data.fatsG,
    items: data.items,
    coachFeedback: `Aporte calculado (${displayTypeName}) para ${athleteName}.`
  };

  return {
    isMealLog: true,
    isDuoLog: false,
    entries: [entry],
    mealType,
    title: entry.title,
    caloriesKcal: data.caloriesKcal,
    proteinG: data.proteinG,
    carbsG: data.carbsG,
    fatsG: data.fatsG,
    items: data.items,
    summary: `Aporte calculado con precisión para ${athleteName}.`,
    closureAdvice: {
      targetCals,
      targetProtein,
      newTotalCals,
      newTotalProtein,
      remainingCals,
      remainingProtein,
      suggestedRecipe: `Once / Once-Comida post-entreno (20:00): Combina tu fuente de proteína (${pantry[0] || 'pollo / pescado'}) con verduras o marraqueta para sumar ~${remainingCals} kcal y ~${remainingProtein}g de proteína.`,
      availablePantrySnippet: pantry.slice(0, 6).join(', ')
    }
  };
}

/**
 * ASESOR NUTRICIONAL Y FITNESS COMPLETO (Autónomo, Multi-Atleta y Exclusivo por Usuario)
 */
export async function analyzeCoachChatWithAction(queryText, currentUser, householdId, apiKey) {
  const athletes = getAthletesList();
  const user = athletes[currentUser] || athletes.dionicio || Object.values(athletes)[0];
  const isDuoHousehold = householdId === 'hogar-dionicio-paula' && (currentUser === 'dionicio' || currentUser === 'paula');
  const partnerId = isDuoHousehold ? (currentUser === 'dionicio' ? 'paula' : 'dionicio') : null;
  const partner = partnerId ? athletes[partnerId] : null;

  const context = buildHouseholdContext(householdId, currentUser);
  const key = apiKey || getStoredGeminiKey(currentUser);

  const userPlan = context.nutrition?.[currentUser]?.plan || calculateAthleteNutrition(currentUser, householdId);
  const userNut = context.nutrition?.[currentUser] || { todayCals: 0, targetCals: userPlan.targetCals, todayProtein: 0, targetProtein: userPlan.targetProtein };

  const dioPlan = context.nutrition?.dionicio?.plan || calculateAthleteNutrition('dionicio', householdId);
  const pauPlan = context.nutrition?.paula?.plan || calculateAthleteNutrition('paula', householdId);

  const dioNut = context.nutrition?.dionicio || { todayCals: 0, targetCals: dioPlan.targetCals, todayProtein: 0, targetProtein: dioPlan.targetProtein };
  const pauNut = context.nutrition?.paula || { todayCals: 0, targetCals: pauPlan.targetCals, todayProtein: 0, targetProtein: pauPlan.targetProtein };

  const pantryList = context.pantryItems && context.pantryItems.length > 0
    ? context.pantryItems
    : ['Huevos', 'Pechuga de pollo', 'Salmón', 'Merluza', 'Atún en lata', 'Arroz integral / blanco', 'Zapallo italiano', 'Avena integral', 'Espinacas / Hojas verdes', 'Palta / Aguacate', 'Aceite de oliva'];

  const lower = queryText.toLowerCase();
  const isFoodEatingQuery = [
    'comí', 'comi', 'almorcé', 'almorce', 'desayuné', 'desayune', 'cené', 'cene', 
    'tomé', 'tome', 'anota', 'registra', 'ingesta', 'calorias', 'calorías', 
    'huevo', 'pollo', 'arroz', 'avena', 'pan', 'marraqueta', 'salmon', 'salmón', 'merluza', 'zapallo',
    'atun', 'atún', 'merendé', 'snack', 'comida', 'plato', 'almuerzo', 'desayuno', 'cena', 'llevamos'
  ].some(k => lower.includes(k));

  const hasDuoMention = isDuoHousehold && (lower.includes('yo') || lower.includes('dionicio')) && (lower.includes('esposa') || lower.includes('paula') || lower.includes('ella'));

  const householdCatalog = getLocalFoodCatalog(householdId);
  const catalogSummary = householdCatalog.map(item => `- ${item.name} (${item.brand || 'Comercial'}): ${item.servingDesc || `${item.servingSize}g`} = ${item.calories} kcal, ${item.proteinG}g P, ${item.carbsG}g C, ${item.fatsG}g G`).join('\n');

  let systemInstruction = '';

  if (!isDuoHousehold) {
    // ================= PROMPT COACH 100% PRIVADO E INDIVIDUAL =================
    systemInstruction = `Eres el ASESOR NUTRICIONAL Y PERSONAL TRAINER EXCLUSIVO Y PRIVADO de ${user.name}.
Tu misión es guiar, calcular y motivar a ${user.name} usando ÚNICAMENTE sus datos personales y su API Key personal.
No mezclas datos con ningún otro usuario ni revelas información ajena.

====================================================
📊 PERFIL Y REGLAS METABÓLICAS DE ${user.name.toUpperCase()}:
- Nombre: ${user.name} | Edad: ${user.age || 30} años | Estatura: ${user.height || '175 cm'}
- Modo Activo: ${userPlan.activeModeConfig?.name || 'Pérdida de Grasa Visceral'}
- Meta Calórica Diaria: ${userPlan.targetCals} kcal/día
- Proteína Diaria: ${userPlan.targetProtein}g | Grasas: ${userPlan.targetFats}g | Carbohidratos: ${userPlan.targetCarbs}g
- Consumido hoy antes de este mensaje: ${userNut.todayCals} / ${userPlan.targetCals} kcal | ${userNut.todayProtein}g / ${userPlan.targetProtein}g proteína.
- Faltan para cerrar el día: ${Math.max(0, userPlan.targetCals - userNut.todayCals)} kcal y ${Math.max(0, userPlan.targetProtein - userNut.todayProtein)}g proteína.

====================================================
🥘 DESPENSA ACTIVA:
[ ${pantryList.join(', ')} ]

CATÁLOGO DE PRODUCTOS:
${catalogSummary}

REGLAS OBLIGATORIAS:
1. Calcula Calorías (kcal), Proteína (g), Carbohidratos (g) y Grasas (g) con total precisión para la comida informada por ${user.name}.
2. Informa cuánto lleva hoy y qué le falta para cerrar su día según sus metas.
3. Si el mensaje describe comida, DEBES INCLUIR AL FINAL de tu respuesta este bloque JSON exacto:

\`\`\`json:nutrition_action
{
  "isMealLog": true,
  "isDuoLog": false,
  "entries": [
    {
      "userId": "${currentUser}",
      "athleteName": "${user.name}",
      "mealType": "desayuno | almuerzo | once | snack",
      "title": "Nombre de la comida",
      "caloriesKcal": 350,
      "proteinG": 28,
      "carbsG": 30,
      "fatsG": 8,
      "items": ["100g pollo", "150g arroz"]
    }
  ],
  "closureAdvice": {
    "todayTotalCals": ${userNut.todayCals},
    "targetCals": ${userPlan.targetCals},
    "remainingCals": ${Math.max(0, userPlan.targetCals - userNut.todayCals)},
    "todayTotalProtein": ${userNut.todayProtein},
    "targetProtein": ${userPlan.targetProtein},
    "remainingProtein": ${Math.max(0, userPlan.targetProtein - userNut.todayProtein)}
  }
}
\`\`\``;
  } else {
    // ================= PROMPT COACH DÚO HOGAR (DIONICIO Y PAULA) =================
    systemInstruction = `Eres el ASESOR NUTRICIONAL Y FITNESS INTEGRAL EXCLUSIVO de Dionicio y Paula para su programa "Dúo en Casa".
No eres un chat pasivo; eres su AGENTE INTELIGENTE AUTÓNOMO DE NUTRICIÓN Y RENDIMIENTO.

👨‍💻 DIONICIO: Meta ${dioPlan.targetCals} kcal / ${dioPlan.targetProtein}g P. Llevaba: ${dioNut.todayCals} kcal (${dioNut.todayProtein}g P).
👩‍💼 PAULA: Meta ${pauPlan.targetCals} kcal / ${pauPlan.targetProtein}g P. Llevaba: ${pauNut.todayCals} kcal (${pauNut.todayProtein}g P).

INVENTARIO DESPENSA: [ ${pantryList.join(', ')} ]
CATÁLOGO DE MARCAS: ${catalogSummary}

Si el mensaje describe alimentos, incluye al final el bloque \`\`\`json:nutrition_action ... \`\`\``;
  }

  if (!key) {
    // Modo offline / heurístico
    const estimated = estimateDeterministicMeal(queryText, currentUser, householdId);
    let text = '';

    if (estimated.isDuoLog) {
      const d = estimated.dionicioClosure;
      const p = estimated.paulaClosure;
      const din = estimated.sharedDinnerProposal;

      text = `👥 **¡Registro Dual Procesado Exitosamente para Dionicio y Paula!**

He desglosado y calculado con precisión los nutrientes de cada comida para ambos:

👨‍💻 **Dionicio:**
${estimated.entries.filter(e => e.userId === 'dionicio').map(e => `- **${e.title}:** ${e.caloriesKcal} kcal | P: ${e.proteinG}g | C: ${e.carbsG}g | G: ${e.fatsG}g`).join('\n')}
*Total hoy:* **${d.todayTotalCals} / ${d.targetCals} kcal** (${d.todayTotalProtein}g / ${d.targetProtein}g prot).
*Te faltan para cerrar el día:* **${d.remainingCals} kcal** y **${d.remainingProtein}g de proteína**.

👩‍💼 **Paula:**
${estimated.entries.filter(e => e.userId === 'paula').map(e => `- **${e.title}:** ${e.caloriesKcal} kcal | P: ${e.proteinG}g | C: ${e.carbsG}g | G: ${e.fatsG}g`).join('\n')}
*Total hoy:* **${p.todayTotalCals} / ${p.targetCals} kcal** (${p.todayTotalProtein}g / ${p.targetProtein}g prot).
*Te faltan para cerrar el día:* **${p.remainingCals} kcal** y **${p.remainingProtein}g de proteína**.

---

🥘 **Propuesta de Cena Dúo Post-Entreno (20:00) con su Despensa:**
**${din.recipe}**
- **Porción Dionicio:** ${din.dionicioPortion}
- **Porción Paula:** ${din.paulaPortion}`;
    } else {
      const c = estimated.closureAdvice;
      text = `🥗 **¡Comida Calculada para ${user.name}!**
- **Aporte:** ~${estimated.caloriesKcal} kcal | ${estimated.proteinG}g P | ${estimated.carbsG}g C | ${estimated.fatsG}g G
- **Llevas hoy:** ${c.newTotalCals} / ${c.targetCals} kcal (${c.newTotalProtein}g / ${c.targetProtein}g proteína).
- **Te faltan:** **${c.remainingCals} kcal** y **${c.remainingProtein}g de proteína** para cerrar tu día.

🥘 **Propuesta con tu despensa:**
${c.suggestedRecipe}`;
    }

    return {
      text,
      detectedMeal: estimated
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
        if (isFoodEatingQuery) {
          detectedMeal = estimateDeterministicMeal(queryText, currentUser, householdId);
        }
      }
    } else if (isFoodEatingQuery) {
      detectedMeal = estimateDeterministicMeal(queryText, currentUser, householdId);
    }

    // Si la IA identificó marcas comerciales o nuevos alimentos, persistirlos en Firestore Cloud
    if (detectedMeal && Array.isArray(detectedMeal.learnedFoods) && detectedMeal.learnedFoods.length > 0) {
      for (const food of detectedMeal.learnedFoods) {
        try {
          await saveFoodItemToKnowledgeBase(food, householdId);
          console.log(`✨ [Coach IA] Nuevo alimento comercial guardado en el hogar: ${food.name}`);
        } catch (e) {
          console.warn('Error guardando alimento aprendido:', e);
        }
      }
    }

    return {
      text: cleanText,
      detectedMeal
    };
  } catch (err) {
    console.warn('Fallo en llamada a Gemini, usando estimador inteligente de respaldo:', err.message);
    const estimated = estimateDeterministicMeal(queryText, currentUser, householdId);

    // Si el estimador de respaldo detectó marcas nuevas, persistirlas
    if (estimated && Array.isArray(estimated.learnedFoods) && estimated.learnedFoods.length > 0) {
      for (const food of estimated.learnedFoods) {
        try {
          await saveFoodItemToKnowledgeBase(food, householdId);
        } catch (e) {}
      }
    }

    return {
      text: `🥗 **Registro procesado para ${user.name}:**
- Se calcularon las comidas con base en los gramajes provistos y catálogo comercial.
- Tu perfil privado fue actualizado con el aporte calórico y balance de cierre.`,
      detectedMeal: estimated
    };
  }
}

/**
 * Diseña un Plan de Entrenamiento 100% Individualizado y Focalizado mediante Gemini
 * integrando equipamiento propio, tiempo disponible, composición corporal, edad y cuidados articulares.
 */
export async function generateAICoachCustomWorkoutPlan({
  userId = 'dionicio',
  householdId = 'hogar-dionicio-paula',
  apiKey = null,
  preferredModel = null
}) {
  const biometrics = getAthleteBiometrics(userId, householdId);
  const equip = biometrics.equipment || {};
  const sched = biometrics.schedule || {};
  const concerns = Array.isArray(biometrics.jointConcerns) ? biometrics.jointConcerns : [];
  const durationMin = Number(sched.sessionDurationMinutes) || 45;
  const daysTarget = Number(sched.weeklyDaysTarget) || 4;
  const focusArea = sched.focusArea || 'balanced';

  const userKey = apiKey || getStoredGeminiKey(userId);
  const athletes = getAthletesList();
  const user = athletes[userId] || USERS[userId] || USERS.dionicio;

  // Si no hay API Key, retornar inmediatamente el generador determinístico inteligente de alta precisión
  if (!userKey) {
    console.log('Gemini API Key no provista. Diseñando plan con generador determinístico deportivo.');
    return generateDeterministicWorkoutPlan(userId, householdId);
  }

  const context = buildHouseholdContext(householdId, userId);
  const metrics = extractAthleteMetrics(context.recentLogs, context.bodyweights, userId);

  // Resumen de equipamiento disponible
  const equipList = [];
  if (equip.hasDumbbells) equipList.push(`Mancuernas modulares (hasta ${equip.maxDumbbellWeightPerHandKg || 20}kg por mano)`);
  if (equip.hasTreadmill) equipList.push('Trotadora eléctrica con inclinación');
  if (equip.hasPullUpBar) equipList.push('Barra de dominadas fija');
  if (equip.hasResistanceBands) equipList.push('Bandas elásticas de resistencia');
  if (equip.hasKettlebell) equipList.push('Kettlebell / Pesa rusa');
  if (equip.hasBench) equipList.push('Banco de entrenamiento');
  if (equip.hasBarbell) equipList.push('Barra con discos');
  if (equip.hasExerciseMat) equipList.push('Mat de suelo acolchado');
  if (equip.hasStationaryBike) equipList.push('Bicicleta estática');
  if (equip.bodyweightOnly || equipList.length === 0) equipList.push('Peso corporal (calistenia pura)');

  const systemInstruction = `Eres un ENTRENADOR DEPORTIVO DE ÉLITE Y ESPECIALISTA EN BIOMECÁNICA para ${user.name}.
Tu misión es diseñar un Plan de Entrenamiento Semanal de Fuerza y Acondicionamiento 100% INDIVIDUALIZADO, REALISTA Y FOCALIZADO.

REGLAS ESTRICTAS DE DISEÑO:
1. EXCLUSIVIDAD DE EQUIPAMIENTO: Usa ÚNICA Y EXCLUSIVAMENTE los implementos que el atleta posee:
   ${equipList.join(', ')}.
   NO inventes máquinas de gimnasio comercial (como poleas complejas o prensas de 45°) si no están listadas.
2. TIEMPO EXACTO: La sesión debe durar EXACTAMENTE ${durationMin} MINUTOS.
   - Si dura 25-35 min: Programa 3 a 4 ejercicios de alta densidad (superseries o pausas cortas).
   - Si dura 45 min: 4 a 5 ejercicios bien descansados.
   - Si dura 60 min: 5 ejercicios de fuerza + bloque cardio o movilidad final.
3. ADAPTACIÓN A EDAD Y COMPOSICIÓN CORPORAL:
   - Atleta: ${user.name}, ${biometrics.age} años, ${biometrics.gender}, ${biometrics.heightCm} cm, ${biometrics.currentWeightKg} kg.
   - Cintura: ${biometrics.waistCm || 85} cm (Ratio Cintura/Altura: ${Number(((biometrics.waistCm || 85) / biometrics.heightCm).toFixed(2))}).
   - Modo Activo: ${biometrics.activeMode || 'Pérdida de Grasa Visceral'}.
   - Si tiene > 40 años o reporta cuidados articulares, prioriza cadencia controlada (2-3s excéntrica), descansos adecuados y variantes amigables.
4. CUIDADOS ARTICULARES INFORMADOS: ${concerns.length > 0 ? concerns.join(', ') : 'Ninguna lesión reportada'}.
   - Si tiene cuidado lumbar: Prohíbe peso muerto con tirones bruscos; prefiere puente de glúteos o soporte.
   - Si tiene cuidado de hombros: Usa floor press con codos a 45° o agarre neutro; cero presses tras nuca.
   - Si tiene cuidado de rodillas: Sentadilla box squat controlada sin saltos ni impacto.
5. FRECUENCIA: Distribuir en ${daysTarget} días a la semana con área de enfoque prioritario: "${focusArea}".

FORMATO DE RESPUESTA OBLIGATORIO:
Debes proporcionar tu explicación motivadora y pedagógica en Markdown y AL FINAL incluir OBLIGATORIAMENTE un bloque de código JSON con este esquema exacto:
\`\`\`json:workout_plan
{
  "planTitle": "Título del Plan",
  "durationMinutes": ${durationMin},
  "weeklyDaysTarget": ${daysTarget},
  "focusArea": "${focusArea}",
  "coachRationale": "Explicación breve de por qué este plan se adapta a sus medidas y tiempo",
  "days": [
    {
      "id": "dia_1",
      "name": "Día 1: Nombre",
      "description": "Descripción",
      "days": ["Lunes", "Jueves"],
      "exercises": [
        {
          "id": "id_ejercicio",
          "name": "Nombre exacto del ejercicio",
          "targetSets": "3",
          "targetReps": "10 - 12",
          "restSeconds": 60,
          "equipment": "Mancuernas",
          "instructions": ["Paso 1", "Paso 2"],
          "defaultWeightDionicio": 10,
          "defaultWeightPaula": 4
        }
      ]
    }
  ],
  "cardioFinisher": {
    "name": "Cardio Final",
    "durationMinutes": 15,
    "protocol": "Inclinación 5-7%"
  }
}
\`\`\``;

  const userPrompt = `Por favor diseña mi nuevo Plan de Entrenamiento Semanal Focalizado para ${durationMin} minutos y ${daysTarget} días por semana.`;

  try {
    const rawResponse = await callGemini(systemInstruction, userPrompt, userKey, preferredModel);
    const jsonMatch = rawResponse.match(/```json:workout_plan\s*([\s\S]*?)\s*```/);

    if (jsonMatch && jsonMatch[1]) {
      const parsedPlan = JSON.parse(jsonMatch[1]);
      parsedPlan.userId = userId;
      parsedPlan.athleteName = user.name;
      parsedPlan.generatedAt = new Date().toISOString();
      parsedPlan.isCustomPlan = true;
      parsedPlan.rawCoachExplanation = rawResponse.replace(/```json:workout_plan\s*[\s\S]*?\s*```/, '').trim();

      saveCustomWorkoutPlan(userId, parsedPlan, householdId);
      return parsedPlan;
    }
  } catch (err) {
    console.warn('Error llamando a Gemini para plan personalizado:', err);
  }

  // Si falló el parseo o la llamada remota, usar el generador determinístico seguro
  return generateDeterministicWorkoutPlan(userId, householdId);
}


