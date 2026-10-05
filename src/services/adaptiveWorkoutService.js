/**
 * Servicio de Entrenamiento Adaptativo en Pesas & Categorización Muscular
 * Adapta dinámicamente las cargas, series, repeticiones y RPE para Dionicio y Paula
 * en función de sus características antropométricas, modo metabólico y registros históricos.
 */

import { WORKOUT_DAYS, USERS } from '../data/workoutCatalog';
import { getAthleteBiometrics, calculateMifflinBMR } from './nutritionCalculator';

// Mapeo detallado de Categorías Musculares por Ejercicio
export const EXERCISE_MUSCLE_CATEGORIES = {
  floor_press: {
    category: 'Pectoral & Empuje Horizontal',
    shortCategory: 'Pectoral',
    primaryMuscle: 'Pectoral mayor, tríceps, deltoides anterior',
    type: 'compound',
    movementPattern: 'Empuje horizontal en suelo'
  },
  remo_unilateral: {
    category: 'Espalda & Tirón Unilateral',
    shortCategory: 'Espalda',
    primaryMuscle: 'Dorsal ancho, romboides, trapecio medio',
    type: 'compound',
    movementPattern: 'Tracción horizontal unilateral'
  },
  press_militar: {
    category: 'Hombros & Empuje Vertical',
    shortCategory: 'Hombros',
    primaryMuscle: 'Deltoides anterior y lateral, tríceps',
    type: 'compound',
    movementPattern: 'Empuje vertical'
  },
  curl_triceps: {
    category: 'Brazos & Aislamiento',
    shortCategory: 'Brazos',
    primaryMuscle: 'Bíceps braquial, tríceps (cabeza larga)',
    type: 'isolation',
    movementPattern: 'Flexión y extensión de codo'
  },
  goblet_squat: {
    category: 'Cuádriceps & Tren Inferior',
    shortCategory: 'Pierna / Cuádriceps',
    primaryMuscle: 'Cuádriceps, glúteo mayor, aductores',
    type: 'compound',
    movementPattern: 'Sentadilla dominante de rodilla'
  },
  peso_muerto_rumano: {
    category: 'Cadera & Cadena Posterior',
    shortCategory: 'Isquiotibiales / Glúteos',
    primaryMuscle: 'Isquiotibiales, glúteos, erectores espinales',
    type: 'compound',
    movementPattern: 'Bisagra de cadera'
  },
  puente_gluteos: {
    category: 'Glúteos & Estabilidad Pélvica',
    shortCategory: 'Glúteos',
    primaryMuscle: 'Glúteo mayor e isquiotibiales',
    type: 'isolation',
    movementPattern: 'Extensión pura de cadera'
  },
  plancha_abdominal: {
    category: 'Core & Anti-Extensión',
    shortCategory: 'Core',
    primaryMuscle: 'Recto abdominal, transverso del abdomen',
    type: 'isometric',
    movementPattern: 'Anti-extensión isométrica'
  }
};

/**
 * Calcula el gasto calórico de una sesión de pesas a partir del volumen movido,
 * peso corporal del atleta y duración.
 */
export function calculateStrengthCaloriesBurned(weightKg, durationMinutes = 25, totalVolumeKg = 0) {
  const w = Number(weightKg) || 75;
  const dur = Number(durationMinutes) || 25;
  // MET 4.5 para entrenamiento de fuerza moderado-intenso con mancuernas
  const met = 4.5;
  const baseBurn = ((met * 3.5 * w) / 200) * dur;
  
  // Gasto metabólico extra por trabajo mecánico real (volumen movido en kg)
  // ~0.035 kcal por cada kg levantado en trabajo muscular concéntrico y excéntrico
  const mechanicalBurn = (Number(totalVolumeKg) || 0) * 0.035;
  
  return Math.round(baseBurn + mechanicalBurn);
}

/**
 * Analiza el historial de un ejercicio para un atleta y genera la adaptación precisa.
 */
export function getExerciseAdaptation(userId, exercise, logs = [], activeMode = 'visceral_fat_loss') {
  const isDionicio = userId === 'dionicio';
  const defaultWeight = isDionicio ? exercise.defaultWeightDionicio : exercise.defaultWeightPaula;
  
  // Filtrar logs de este ejercicio para este usuario
  const exerciseLogs = logs
    .filter(l => l.userId === userId && l.type === 'strength' && l.exerciseId === exercise.id)
    .sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });

  const muscleInfo = EXERCISE_MUSCLE_CATEGORIES[exercise.id] || {
    category: 'Fuerza General',
    shortCategory: 'Fuerza',
    primaryMuscle: 'Musculatura principal',
    type: 'compound'
  };

  // Sin registros previos: Retorna configuración base de calibración adaptada al modo
  if (exerciseLogs.length === 0) {
    let setsAdapted = exercise.targetSets;
    let targetRpeAdapted = isDionicio ? '6.5 - 7.5' : '6.0 - 7.0';
    let repsAdapted = exercise.targetReps;

    if (activeMode === 'hypertrophy_muscle_gain') {
      setsAdapted = '3 - 4';
      targetRpeAdapted = isDionicio ? '7.5 - 8.5' : '7.0 - 8.0';
    } else if (activeMode === 'body_recomposition') {
      setsAdapted = '3';
      targetRpeAdapted = isDionicio ? '7.0 - 8.0' : '6.5 - 7.5';
    }

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleCategory: muscleInfo.category,
      shortCategory: muscleInfo.shortCategory,
      primaryMuscle: muscleInfo.primaryMuscle,
      suggestedWeightKg: defaultWeight,
      targetSets: setsAdapted,
      targetReps: repsAdapted,
      targetRPE: targetRpeAdapted,
      restSeconds: exercise.restSeconds,
      status: 'INITIAL_BASELINE',
      badgeText: '🌱 Base Inicial',
      badgeColor: 'emerald',
      rationale: `Calibración inicial (${defaultWeight} kg). Enfócate en la técnica estricta y control excéntrico de 2-3 segundos.`,
      isAdapted: false,
      hasHistory: false,
      historyCount: 0,
      lastSession: null
    };
  }

  const lastLog = exerciseLogs[0];
  const lastSets = lastLog.sets || [];
  const lastMaxWeight = Math.max(...lastSets.map(s => Number(s.weightKg) || 0), defaultWeight);
  const avgRpe = lastSets.length > 0 
    ? lastSets.reduce((acc, s) => acc + (Number(s.rpe) || 7.5), 0) / lastSets.length 
    : 7.5;
  const avgReps = lastSets.length > 0
    ? lastSets.reduce((acc, s) => acc + (Number(s.reps) || 10), 0) / lastSets.length
    : 10;
  const lastVolume = lastLog.totalVolumeKg || lastSets.reduce((acc, s) => acc + ((Number(s.weightKg) || 0) * (Number(s.reps) || 0)), 0);

  // Reglas de adaptación progresiva según características del atleta:
  // Dionicio: incrementos de 1.5 - 2 kg con mancuernas modulares
  // Paula: incrementos de 0.5 - 1 kg (cuidado articular y cervical)
  const weightIncrementStep = isDionicio ? 2 : 1;
  const miniIncrementStep = isDionicio ? 1 : 0.5;

  let suggestedWeight = lastMaxWeight;
  let status = 'CONSOLIDATION';
  let badgeText = '🛡️ Consolidar Carga';
  let badgeColor = 'amber';
  let rationale = '';
  let adaptedSets = exercise.targetSets;
  let adaptedReps = exercise.targetReps;
  let adaptedRpe = isDionicio ? '7.5 - 8.5' : '7.0 - 8.0';

  if (avgRpe <= 7.0 && avgReps >= 10) {
    // Rendimiento holgado: Sobrecarga Progresiva en Peso
    suggestedWeight = lastMaxWeight + weightIncrementStep;
    status = 'PROGRESSION_WEIGHT';
    badgeText = `⚡ Sobrecarga +${weightIncrementStep}kg`;
    badgeColor = 'sky';
    rationale = `Completaste tu última sesión con RPE cómodo (${avgRpe.toFixed(1)}). Tu musculatura está lista para subir a ${suggestedWeight} kg (+${weightIncrementStep} kg).`;
  } else if (avgRpe <= 7.5) {
    // Zona intermedia: Sobrecarga Progresiva en Repeticiones o microcarga
    suggestedWeight = lastMaxWeight;
    status = 'PROGRESSION_REPS';
    badgeText = '📈 +1 Rep por Serie';
    badgeColor = 'indigo';
    rationale = `Carga bien tolerada (${lastMaxWeight} kg, RPE ${avgRpe.toFixed(1)}). Mantén el peso pero busca sumar 1 repetición más por serie antes de subir carga.`;
  } else if (avgRpe >= 8.8) {
    // Fatiga alta o riesgo de fallo técnico: Consolidación o micro-descarga
    if (avgReps < 8 && lastMaxWeight > defaultWeight) {
      suggestedWeight = Math.max(defaultWeight, lastMaxWeight - miniIncrementStep);
      status = 'ADAPT_DELOAD';
      badgeText = `🛡️ Ajuste Técnico -${miniIncrementStep}kg`;
      badgeColor = 'rose';
      rationale = `El RPE fue muy elevado (${avgRpe.toFixed(1)}) y cayeron las repeticiones. Reducir ligeramente a ${suggestedWeight} kg para recuperar rango completo y seguridad articular.`;
    } else {
      suggestedWeight = lastMaxWeight;
      status = 'CONSOLIDATION';
      badgeText = '⚖️ Afianzar Técnica';
      badgeColor = 'amber';
      rationale = `RPE alto (${avgRpe.toFixed(1)}). Mantén ${lastMaxWeight} kg, concéntrate en pausas de 1s en la contracción y descanso completo.`;
    }
  } else {
    // RPE 7.6 a 8.5: Carga óptima de estímulo sin fatiga extrema
    suggestedWeight = lastMaxWeight;
    status = 'OPTIMAL_STIMULUS';
    badgeText = '🔥 Carga Óptima';
    badgeColor = 'emerald';
    rationale = `Carga calibrada con precisión (${lastMaxWeight} kg, RPE ${avgRpe.toFixed(1)}). Estimula hipertrofia sin comprometer la recuperación.`;
  }

  // Ajuste según Modo Metabólico
  if (activeMode === 'visceral_fat_loss') {
    adaptedSets = '3';
    adaptedRpe = isDionicio ? '7.0 - 8.0' : '6.5 - 7.5';
  } else if (activeMode === 'hypertrophy_muscle_gain') {
    adaptedSets = '3 - 4';
    adaptedRpe = isDionicio ? '8.0 - 9.0' : '7.5 - 8.5';
  } else if (activeMode === 'metabolic_maintenance') {
    adaptedSets = '3';
    adaptedRpe = '7.0';
  }

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleCategory: muscleInfo.category,
    shortCategory: muscleInfo.shortCategory,
    primaryMuscle: muscleInfo.primaryMuscle,
    movementPattern: muscleInfo.movementPattern,
    suggestedWeightKg: suggestedWeight,
    targetSets: adaptedSets,
    targetReps: adaptedReps,
    targetRPE: adaptedRpe,
    restSeconds: exercise.restSeconds,
    status,
    badgeText,
    badgeColor,
    rationale,
    isAdapted: true,
    hasHistory: true,
    historyCount: exerciseLogs.length,
    lastSession: {
      date: lastLog.date,
      maxWeightKg: lastMaxWeight,
      avgRpe: Number(avgRpe.toFixed(1)),
      totalVolumeKg: lastVolume,
      setsCount: lastSets.length
    }
  };
}

/**
 * Genera el Plan de Entrenamiento Adaptativo Completo para un Atleta
 * evaluando los días Torso y Pierna/Core.
 */
export function getAdaptiveWorkoutPlan(userId = 'dionicio', logs = [], householdId = 'hogar-dionicio-paula') {
  const biometrics = getAthleteBiometrics(userId, householdId);
  const activeMode = biometrics.activeMode || 'visceral_fat_loss';
  const userConfig = USERS[userId] || USERS.dionicio;

  const adaptedDays = WORKOUT_DAYS.map(day => {
    const adaptedExercises = day.exercises.map(exercise => {
      return getExerciseAdaptation(userId, exercise, logs, activeMode);
    });

    return {
      id: day.id,
      name: day.name,
      description: day.description,
      days: day.days,
      exercises: adaptedExercises
    };
  });

  return {
    userId,
    athleteName: userConfig.name,
    activeMode,
    biometrics,
    days: adaptedDays
  };
}

/**
 * Agrupa los registros de un día en categorías musculares trabajadas y calcula
 * totales de volumen y series.
 */
export function calculateDailyMuscleCategories(strengthLogs = []) {
  const categoriesMap = {};

  strengthLogs.forEach(log => {
    const meta = EXERCISE_MUSCLE_CATEGORIES[log.exerciseId] || {
      category: 'Fuerza General',
      shortCategory: 'General'
    };

    const catKey = meta.category;
    if (!categoriesMap[catKey]) {
      categoriesMap[catKey] = {
        categoryName: catKey,
        shortCategory: meta.shortCategory,
        exercises: [],
        totalSets: 0,
        totalVolumeKg: 0,
        maxWeightKg: 0
      };
    }

    const setsCount = log.sets?.length || 0;
    const vol = Number(log.totalVolumeKg) || 0;
    const maxW = Math.max(...(log.sets?.map(s => Number(s.weightKg) || 0) || [0]));

    categoriesMap[catKey].exercises.push({
      exerciseName: log.exerciseName,
      setsCount,
      volumeKg: vol,
      maxWeightKg: maxW
    });
    categoriesMap[catKey].totalSets += setsCount;
    categoriesMap[catKey].totalVolumeKg += vol;
    categoriesMap[catKey].maxWeightKg = Math.max(categoriesMap[catKey].maxWeightKg, maxW);
  });

  return Object.values(categoriesMap);
}
