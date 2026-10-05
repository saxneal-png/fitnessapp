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
  pushups: {
    category: 'Pectoral & Empuje Corporal',
    shortCategory: 'Pectoral / Core',
    primaryMuscle: 'Pectoral mayor, tríceps, serrato anterior',
    type: 'compound',
    movementPattern: 'Empuje horizontal con peso corporal'
  },
  remo_unilateral: {
    category: 'Espalda & Tirón Unilateral',
    shortCategory: 'Espalda',
    primaryMuscle: 'Dorsal ancho, romboides, trapecio medio',
    type: 'compound',
    movementPattern: 'Tracción horizontal unilateral'
  },
  pullups_dominadas: {
    category: 'Espalda & Tirón Vertical',
    shortCategory: 'Dorsal',
    primaryMuscle: 'Dorsal ancho, bíceps braquial, core',
    type: 'compound',
    movementPattern: 'Tracción vertical en barra'
  },
  remo_con_banda: {
    category: 'Espalda & Activación Escapular',
    shortCategory: 'Espalda / Postura',
    primaryMuscle: 'Romboides, deltoides posterior, dorsal',
    type: 'compound',
    movementPattern: 'Tracción horizontal con resistencia progresiva'
  },
  press_militar: {
    category: 'Hombros & Empuje Vertical',
    shortCategory: 'Hombros',
    primaryMuscle: 'Deltoides anterior y lateral, tríceps',
    type: 'compound',
    movementPattern: 'Empuje vertical'
  },
  elevaciones_laterales: {
    category: 'Hombros & Aislamiento',
    shortCategory: 'Deltoides',
    primaryMuscle: 'Deltoides lateral',
    type: 'isolation',
    movementPattern: 'Abducción de hombro'
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
  sentadillas_aire: {
    category: 'Cuádriceps & Movilidad',
    shortCategory: 'Pierna / Cadera',
    primaryMuscle: 'Cuádriceps, glúteo mayor',
    type: 'compound',
    movementPattern: 'Sentadilla con peso corporal'
  },
  peso_muerto_rumano: {
    category: 'Cadera & Cadena Posterior',
    shortCategory: 'Isquiotibiales / Glúteos',
    primaryMuscle: 'Isquiotibiales, glúteos, erectores espinales',
    type: 'compound',
    movementPattern: 'Bisagra de cadera'
  },
  zancadas_estaticas: {
    category: 'Pierna Unilateral & Estabilidad',
    shortCategory: 'Pierna / Glúteos',
    primaryMuscle: 'Cuádriceps, glúteo medio y mayor',
    type: 'compound',
    movementPattern: 'Zancada unilateral'
  },
  kettlebell_swing: {
    category: 'Cadena Posterior & Potencia',
    shortCategory: 'Glúteos / Cardio',
    primaryMuscle: 'Glúteos, isquiotibiales, core, cardiovascular',
    type: 'compound',
    movementPattern: 'Bisagra explosiva balística'
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

export const CUSTOM_PLAN_STORAGE_KEY = 'fitness_duo_custom_plan';

/**
 * Guarda el plan individualizado y focalizado diseñado para un atleta
 */
export function saveCustomWorkoutPlan(userId, plan, householdId = 'hogar-dionicio-paula') {
  try {
    const key = `${CUSTOM_PLAN_STORAGE_KEY}_${householdId}_${userId}`;
    localStorage.setItem(key, JSON.stringify(plan));
    return plan;
  } catch (e) {
    console.error('Error saving custom workout plan:', e);
    return null;
  }
}

/**
 * Obtiene el plan personalizado activo del atleta si existe
 */
export function getStoredCustomWorkoutPlan(userId, householdId = 'hogar-dionicio-paula') {
  try {
    const key = `${CUSTOM_PLAN_STORAGE_KEY}_${householdId}_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

/**
 * Elimina o resetea el plan personalizado para volver a la rutina base
 */
export function clearCustomWorkoutPlan(userId, householdId = 'hogar-dionicio-paula') {
  try {
    const key = `${CUSTOM_PLAN_STORAGE_KEY}_${householdId}_${userId}`;
    localStorage.removeItem(key);
  } catch (e) {}
}

/**
 * Generador determinístico de contingencia (Offline Fallback)
 * Diseña un plan individual y focalizado respetando el equipamiento, los minutos disponibles,
 * la edad, el modo fisiológico y los cuidados articulares del atleta.
 */
export function generateDeterministicWorkoutPlan(userId = 'dionicio', householdId = 'hogar-dionicio-paula') {
  const biometrics = getAthleteBiometrics(userId, householdId);
  const equip = biometrics.equipment || {};
  const sched = biometrics.schedule || {};
  const concerns = Array.isArray(biometrics.jointConcerns) ? biometrics.jointConcerns : [];
  const durationMin = Number(sched.sessionDurationMinutes) || 45;
  const daysCount = Number(sched.weeklyDaysTarget) || 4;
  const focus = sched.focusArea || 'balanced';
  const isDionicio = userId === 'dionicio';
  const userConfig = USERS[userId] || USERS.dionicio;

  const hasDumbbells = Boolean(equip.hasDumbbells);
  const maxDumbbellKg = equip.maxDumbbellWeightPerHandKg || (isDionicio ? 20 : 10);
  const hasPullUpBar = Boolean(equip.hasPullUpBar);
  const hasBands = Boolean(equip.hasResistanceBands);
  const hasKettlebell = Boolean(equip.hasKettlebell);
  const hasTreadmill = Boolean(equip.hasTreadmill);

  // Pool de ejercicios según equipamiento y restricciones articulares
  // 1. Ejercicios de Empuje Torso
  let chestExercise = {
    id: 'floor_press',
    name: 'Floor press con mancuernas modulares',
    targetSets: '3',
    targetReps: '10 - 12',
    restSeconds: 60,
    equipment: 'Mancuernas + Mat',
    instructions: ['Codos a 45° respecto al torso', 'Empuje vertical y descenso controlado de 2-3 seg.'],
    defaultWeightDionicio: 10,
    defaultWeightPaula: 4
  };

  if (!hasDumbbells) {
    chestExercise = {
      id: 'pushups',
      name: concerns.includes('shoulder_safe') ? 'Flexiones inclinadas seguras con manos elevadas' : 'Flexiones de brazos (Push-ups)',
      targetSets: '3',
      targetReps: '10 - 15',
      restSeconds: 60,
      equipment: 'Peso Corporal',
      instructions: ['Cuerpo recto en plancha activa', 'Pecho casi tocando el suelo o apoyo elevado'],
      defaultWeightDionicio: 0,
      defaultWeightPaula: 0
    };
  }

  // 2. Ejercicios de Tirón / Espalda
  let backExercise = {
    id: 'remo_unilateral',
    name: 'Remo unilateral con mancuerna',
    targetSets: '3',
    targetReps: '10 - 12 por brazo',
    restSeconds: 45,
    equipment: 'Mancuerna + Apoyo',
    instructions: ['Espalda alineada a 45°', 'Tira llevando el codo al bolsillo sin rotar el torso'],
    defaultWeightDionicio: 8,
    defaultWeightPaula: 4
  };

  if (hasPullUpBar && !concerns.includes('shoulder_safe')) {
    backExercise = {
      id: 'pullups_dominadas',
      name: 'Dominadas / Tracciones en barra fija (asistidas o libres)',
      targetSets: '3',
      targetReps: '6 - 10',
      restSeconds: 75,
      equipment: 'Barra de Dominadas',
      instructions: ['Agarre al ancho de hombros', 'Pecho hacia la barra retrayendo escápulas'],
      defaultWeightDionicio: 0,
      defaultWeightPaula: 0
    };
  } else if (!hasDumbbells && hasBands) {
    backExercise = {
      id: 'remo_con_banda',
      name: 'Remo horizontal sentado con banda elástica',
      targetSets: '3',
      targetReps: '12 - 15',
      restSeconds: 45,
      equipment: 'Bandas Elásticas',
      instructions: ['Espalda erguida, aprieta escápulas durante 1 segundo al final'],
      defaultWeightDionicio: 0,
      defaultWeightPaula: 0
    };
  }

  // 3. Ejercicio de Pierna (Dominante rodilla)
  let quadExercise = {
    id: 'goblet_squat',
    name: 'Goblet squat con mancuerna al pecho',
    targetSets: '3',
    targetReps: '10 - 12',
    restSeconds: 60,
    equipment: hasDumbbells ? 'Mancuerna' : (hasKettlebell ? 'Kettlebell' : 'Peso Corporal'),
    instructions: ['Pies al ancho de hombros, puntas ligeramente hacia afuera', 'Desciende en 3 segundos'],
    defaultWeightDionicio: hasDumbbells ? 10 : 0,
    defaultWeightPaula: hasDumbbells ? 6 : 0
  };

  if (concerns.includes('knee_friendly')) {
    quadExercise = {
      id: 'sentadillas_aire',
      name: 'Sentadilla en caja / banco (Box Squat rodillas seguras)',
      targetSets: '3',
      targetReps: '12',
      restSeconds: 60,
      equipment: 'Silla / Banco + Mat',
      instructions: ['Toca el asiento suavemente y sube empujando los talones', 'Cero impacto ni dolor en rótula'],
      defaultWeightDionicio: hasDumbbells ? 6 : 0,
      defaultWeightPaula: hasDumbbells ? 3 : 0
    };
  }

  // 4. Ejercicio de Cadena Posterior (Isquiotibiales & Glúteos)
  let posteriorExercise = {
    id: concerns.includes('lower_back_safe') ? 'puente_gluteos' : 'peso_muerto_rumano',
    name: concerns.includes('lower_back_safe') 
      ? 'Puente de glúteos con pausa isométrica (Espalda 100% protegida)' 
      : 'Peso muerto rumano con mancuernas (Bisagra de cadera)',
    targetSets: '3',
    targetReps: '10 - 12',
    restSeconds: 60,
    equipment: hasDumbbells ? 'Mancuernas + Mat' : 'Mat de suelo',
    instructions: concerns.includes('lower_back_safe') 
      ? ['Eleva la cadera contrayendo glúteos arriba', 'Sin forzar la columna lumbar']
      : ['Micro-flexión de rodillas', 'Lleva la cadera hacia atrás con espalda neutra'],
    defaultWeightDionicio: hasDumbbells ? (concerns.includes('lower_back_safe') ? 8 : 12) : 0,
    defaultWeightPaula: hasDumbbells ? (concerns.includes('lower_back_safe') ? 4 : 6) : 0
  };

  if (hasKettlebell && !concerns.includes('lower_back_safe') && focus === 'fat_loss_metabolic') {
    posteriorExercise = {
      id: 'kettlebell_swing',
      name: 'Kettlebell swing balístico (Cadena posterior & Quema calórica)',
      targetSets: '3',
      targetReps: '15',
      restSeconds: 45,
      equipment: 'Kettlebell',
      instructions: ['Bisagra potente de cadera', 'Los brazos son ganchos, la potencia sale de los glúteos'],
      defaultWeightDionicio: 12,
      defaultWeightPaula: 8
    };
  }

  // 5. Ejercicio de Core & Hombros/Brazos
  const coreExercise = {
    id: 'plancha_abdominal',
    name: 'Plancha abdominal isométrica anti-extensión',
    targetSets: '3',
    targetReps: '25 - 35 seg',
    restSeconds: 45,
    equipment: 'Mat de suelo',
    instructions: ['Cuerpo en línea recta desde nuca a talones', 'Activa abdomen y glúteos'],
    defaultWeightDionicio: 0,
    defaultWeightPaula: 0
  };

  const shoulderArmsExercise = {
    id: concerns.includes('shoulder_safe') ? 'elevaciones_laterales' : 'press_militar',
    name: concerns.includes('shoulder_safe')
      ? 'Elevaciones laterales con mancuernas / banda (Plano escapular)'
      : 'Press militar de hombros con mancuernas',
    targetSets: '3',
    targetReps: '10 - 12',
    restSeconds: 45,
    equipment: hasDumbbells ? 'Mancuernas' : 'Bandas',
    instructions: ['Codos ligeramente al frente del torso', 'Sin tirones de cuello'],
    defaultWeightDionicio: hasDumbbells ? 5 : 0,
    defaultWeightPaula: hasDumbbells ? 3 : 0
  };

  // Armar días de rutina según duración y días por semana
  // Si duración es corta (<= 35 min), menos ejercicios por día con alta densidad
  const maxExercisesPerDay = durationMin <= 25 ? 3 : (durationMin <= 35 ? 4 : (durationMin <= 45 ? 5 : 5));

  let day1Exercises = [chestExercise, backExercise, shoulderArmsExercise];
  let day2Exercises = [quadExercise, posteriorExercise, coreExercise];

  if (maxExercisesPerDay >= 4) {
    day1Exercises.push(coreExercise);
    day2Exercises.push(shoulderArmsExercise);
  }
  if (maxExercisesPerDay >= 5) {
    day1Exercises.push({
      id: 'curl_triceps',
      name: 'Curl bíceps & Extensión tríceps en superserie',
      targetSets: '2 - 3',
      targetReps: '10 - 12',
      restSeconds: 45,
      equipment: hasDumbbells ? 'Mancuernas' : 'Bandas',
      instructions: ['Control estricto en la bajada sin balancear la espalda'],
      defaultWeightDionicio: hasDumbbells ? 6 : 0,
      defaultWeightPaula: hasDumbbells ? 3 : 0
    });
    day2Exercises.push({
      id: 'zancadas_estaticas',
      name: 'Zancadas estáticas unilaterales (Split Squat)',
      targetSets: '2 - 3',
      targetReps: '10 por pierna',
      restSeconds: 45,
      equipment: hasDumbbells ? 'Mancuernas' : 'Peso Corporal',
      instructions: ['Paso amplio, baja la rodilla trasera hacia el suelo con torso erguido'],
      defaultWeightDionicio: hasDumbbells ? 8 : 0,
      defaultWeightPaula: hasDumbbells ? 4 : 0
    });
  }

  const generatedPlan = {
    userId,
    athleteName: userConfig.name,
    generatedAt: new Date().toISOString(),
    isCustomPlan: true,
    planTitle: `Plan Focalizado ${focus.replace('_', ' ').toUpperCase()} • ${durationMin} min`,
    durationMinutes: durationMin,
    weeklyDaysTarget: daysCount,
    focusArea: focus,
    equipmentSummary: Object.entries(equip).filter(([k, v]) => v === true).map(([k]) => k.replace('has', '')).join(', ') || 'Peso Corporal',
    jointConcernsApplied: concerns,
    days: [
      {
        id: 'custom_day_1',
        name: `Día 1: Torso, Empuje & Tirón (${durationMin} min)`,
        description: `Rutina focalizada para ${durationMin} minutos optimizada con ${hasDumbbells ? 'mancuernas' : 'equipamiento disponible'}.`,
        days: daysCount <= 3 ? ['Lunes'] : ['Lunes', 'Jueves'],
        exercises: day1Exercises
      },
      {
        id: 'custom_day_2',
        name: `Día 2: Pierna, Cadena Posterior & Core (${durationMin} min)`,
        description: `Estímulo de tren inferior y estabilidad central adaptado a ${userConfig.name} (${biometrics.age} años).`,
        days: daysCount <= 3 ? ['Miércoles'] : ['Martes', 'Viernes'],
        exercises: day2Exercises
      }
    ],
    cardioFinisher: hasTreadmill && durationMin >= 45 ? {
      name: 'Cardio Inclinado Zona 2',
      durationMinutes: durationMin >= 60 ? 20 : 10,
      protocol: 'Caminata en pendiente (inclinación 5-8%, 4.2 km/h) para quema de grasa visceral sin impacto'
    } : null
  };

  saveCustomWorkoutPlan(userId, generatedPlan, householdId);
  return generatedPlan;
}

/**
 * Genera el Plan de Entrenamiento Adaptativo Completo para un Atleta
 * Si el atleta tiene un plan individual y focalizado guardado, adapta sus ejercicios en vivo.
 */
export function getAdaptiveWorkoutPlan(userId = 'dionicio', logs = [], householdId = 'hogar-dionicio-paula') {
  const biometrics = getAthleteBiometrics(userId, householdId);
  const activeMode = biometrics.activeMode || 'visceral_fat_loss';
  const userConfig = USERS[userId] || USERS.dionicio;

  // 1. Revisar si el usuario tiene un Plan Personalizado Focalizado activo
  const customPlan = getStoredCustomWorkoutPlan(userId, householdId);
  const baseDays = (customPlan && Array.isArray(customPlan.days) && customPlan.days.length > 0)
    ? customPlan.days
    : WORKOUT_DAYS;

  const adaptedDays = baseDays.map(day => {
    const adaptedExercises = (day.exercises || []).map(exercise => {
      return getExerciseAdaptation(userId, exercise, logs, activeMode);
    });

    return {
      id: day.id,
      name: day.name,
      description: day.description,
      days: day.days || ['Lunes', 'Jueves'],
      exercises: adaptedExercises
    };
  });

  return {
    userId,
    athleteName: userConfig.name,
    activeMode,
    biometrics,
    isCustomPlan: Boolean(customPlan),
    customPlanTitle: customPlan?.planTitle || null,
    durationMinutes: customPlan?.durationMinutes || 60,
    weeklyDaysTarget: customPlan?.weeklyDaysTarget || 4,
    cardioFinisher: customPlan?.cardioFinisher || null,
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
