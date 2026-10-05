/**
 * Servicio de Cálculo de Necesidades Nutricionales Clínicas y Biometría Deportiva de Precisión
 * Calibrado estrictamente contra la sobreestimación de factor de actividad (Anti-Sobrecálculo de Gimnasio).
 *
 * Fundamentación Clínica:
 * - Trabajo de escritorio/oficina con bajo NEAT + 1h de entrenamiento programado (Mancuernas + Trotadora)
 *   da un factor PAL real de 1.30 a 1.32 sobre la TMB (NO 1.55).
 * - La proteína se calcula sobre la masa magra (2.0 g/kg LBM) para saturación muscular sin inflación calórica.
 * - Las grasas se fijan en el piso biológico hormonal (0.65 a 0.70 g/kg de peso total).
 * - Los carbohidratos cubren el remanente glucolítico para rendir con fuerza.
 */

import { getLocalWeightEntries } from '../firebase/config.js';
import { HOUSEHOLD_NUTRITION_CONTEXT } from '../data/nutritionHistoryData.js';

export { HOUSEHOLD_NUTRITION_CONTEXT };
export const ATHLETE_FOOD_PREFERENCES = HOUSEHOLD_NUTRITION_CONTEXT.athletes;

export const DEFAULT_BIOMETRICS = {
  dionicio: {
    userId: 'dionicio',
    athleteName: 'Dionicio',
    gender: 'male',
    age: 40,
    heightCm: 180,
    baselineWeightKg: 86.0,
    bodyFatPct: 23.0, // ~23% grasa corporal estimada
    leanMassKg: 65.5, // ~65.5 kg masa magra
    activityLevel: 'desk_job_with_training', // PAL 1.32 real
    activeMode: 'visceral_fat_loss', // Modo predeterminado prioritario
    goal: 'aggressive_fat_loss', // Déficit real de grasa visceral
    deficitKcal: 760, // -760 kcal/día (~5.300 kcal/semana -> 0.7 kg grasa/semana)
    targetCals: 1600, // Rango clínico exacto: 1.600 kcal
    targetProtein: 130, // 2.0 g/kg de masa magra (130g = 520 kcal)
    targetFats: 55, // 0.64 g/kg de peso total (55g = 495 kcal)
    targetCarbs: 145, // Remanente glucolítico (145g = 580 kcal) -> 520+495+580 = 1595 ~ 1600 kcal
    digestiveProtection: false, // Configurable: techo estricto de grasas
    maxFatsCap: 45 // Límite cuando la protección está activa
  },
  paula: {
    userId: 'paula',
    athleteName: 'Paula',
    gender: 'female',
    age: 41,
    heightCm: 160,
    baselineWeightKg: 63.0, // Calibrado al peso real en ayunas (63 kg)
    bodyFatPct: 28.0, // ~28% grasa corporal
    leanMassKg: 45.4, // ~45.4 kg masa magra (63 * 0.72)
    activityLevel: 'desk_job_with_training', // PAL 1.28 real
    activeMode: 'visceral_fat_loss', // Modo predeterminado
    goal: 'fat_loss',
    deficitKcal: 400, // -400 kcal/día
    targetCals: 1220, // Rango clínico exacto: 1.200 a 1.250 kcal
    targetProtein: 82, // 80 a 85g óptimo (anti-distensión, sin colapso de colon)
    targetFats: 40, // Piso biológico y Techo Digestivo Estricto (Máx 42g/día)
    targetCarbs: 132, // Remanente con carbohidratos limpios (132g = 528 kcal)
    digestiveProtection: true, // Protección digestiva activa por defecto
    maxFatsCap: 42 // Techo duro estándar 42g
  }
};

// Factores de Actividad Física Clínicamente Calibrados (Evita la trampa de inflar el gasto)
export const ACTIVITY_MULTIPLIERS = {
  desk_job_with_training: { 
    value: 1.32, 
    label: 'Oficina / Trabajo de Escritorio + 1h Entrenamiento Dúo (PAL 1.32 • Clínicamente Real)' 
  },
  sedentary: { 
    value: 1.18, 
    label: 'Sedentario Puro de Oficina (Sin ejercicio, PAL 1.18)' 
  },
  active_job_training: { 
    value: 1.45, 
    label: 'Trabajo de Pie Activo + Entrenamiento Dúo (PAL 1.45)' 
  },
  heavy_labor: { 
    value: 1.60, 
    label: 'Trabajo Físico Pesado / Faena 8h + Entrenamiento (PAL 1.60)' 
  }
};

/**
 * MODOS FISIOLÓGICOS Y METABÓLICOS
 */
export const FITNESS_MODES = {
  visceral_fat_loss: {
    id: 'visceral_fat_loss',
    name: 'Pérdida de Grasa Visceral & Abdominal',
    shortName: 'Grasa Visceral',
    icon: '🔥',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    colorTheme: 'rose',
    description: 'Déficit calórico clínico acelerado para movilizar adiposidad visceral profunda y reducir cintura sin perder tono muscular.',
    targetDeficitKcal: { dionicio: 760, paula: 400 },
    proteinGPerKgLean: 2.0,
    fatGPerKgTotal: 0.66,
    clinicalCriteria: 'Prioritario si el Ratio Cintura/Altura es ≥ 0.50 o % de grasa > 20% en hombres / > 27% en mujeres.'
  },
  body_recomposition: {
    id: 'body_recomposition',
    name: 'Recomposición Corporal (Pérdida Grasa + Ganancia Muscular)',
    shortName: 'Recomposición',
    icon: '⚡',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    colorTheme: 'sky',
    description: 'Déficit suave a moderado enfocado en progresión de cargas con mancuernas (RPE 7-9) y ganancia concurrente de firmeza.',
    targetDeficitKcal: { dionicio: 350, paula: 220 },
    proteinGPerKgLean: 2.2,
    fatGPerKgTotal: 0.72,
    clinicalCriteria: 'Recomendado cuando el Ratio Cintura/Altura está en zona saludable (0.46 a 0.50) y se busca maximizar fuerza.'
  },
  hypertrophy_muscle_gain: {
    id: 'hypertrophy_muscle_gain',
    name: 'Aumento de Masa Muscular (Hipertrofia Limpia)',
    shortName: 'Aumento Muscular',
    icon: '💪',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    colorTheme: 'emerald',
    description: 'Superávit calórico controlado (+200 a +350 kcal) para máxima síntesis miofibrilar vigilando que la cintura no crezca.',
    targetDeficitKcal: { dionicio: -250, paula: -150 }, // Negativo = superávit
    proteinGPerKgLean: 2.2,
    fatGPerKgTotal: 0.85,
    clinicalCriteria: 'Recomendado si la grasa visceral es óptima (Ratio Cintura/Altura < 0.46) y se busca desarrollo muscular puro.'
  },
  metabolic_maintenance: {
    id: 'metabolic_maintenance',
    name: 'Mantenimiento & Descanso Metabólico (Diet Break)',
    shortName: 'Mantenimiento',
    icon: '🛡️',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    colorTheme: 'amber',
    description: 'Calorías al 100% de TDEE (0 kcal déficit). Restaura leptina, tiroides y fatiga nerviosa tras varias semanas de déficit.',
    targetDeficitKcal: { dionicio: 0, paula: 0 },
    proteinGPerKgLean: 1.9,
    fatGPerKgTotal: 0.80,
    clinicalCriteria: 'Recomendado tras 8-12 semanas de déficit continuo o cuando el peso y medidas se estancan por fatiga adaptativa.'
  }
};

export const GOAL_PRESETS = {
  aggressive_fat_loss: { label: 'Pérdida de Grasa Visceral (Déficit Clínico ~750 kcal/día)', deficit: 750, mode: 'visceral_fat_loss' },
  moderate_fat_loss: { label: 'Pérdida de Grasa Moderada (Déficit ~450 kcal/día)', deficit: 450, mode: 'visceral_fat_loss' },
  recomposition: { label: 'Recomposición Corporal (Déficit Suave ~300-350 kcal/día)', deficit: 350, mode: 'body_recomposition' },
  hypertrophy: { label: 'Aumento Muscular Magro (Superávit ~200-300 kcal/día)', deficit: -250, mode: 'hypertrophy_muscle_gain' },
  maintenance: { label: 'Mantenimiento & Diet Break (0 kcal déficit)', deficit: 0, mode: 'metabolic_maintenance' }
};

const LOCAL_STORAGE_BIOMETRICS_KEY = 'fitness_duo_athlete_biometrics';

function getCustomAthletesLocal() {
  try {
    const raw = localStorage.getItem('fitness_duo_custom_users');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

export function getAthleteBiometrics(userId = 'dionicio', householdId = 'hogar-dionicio-paula') {
  let stored = {};
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_BIOMETRICS_KEY}_${householdId}`);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Error al leer biometría guardada:', e);
  }

  let base = DEFAULT_BIOMETRICS[userId];
  if (!base) {
    const customAthletes = getCustomAthletesLocal();
    const athlete = customAthletes[userId] || {};
    const isMale = (athlete.gender || 'male') === 'male';
    const bWeight = Number(athlete.baselineWeightKg || athlete.weightKg) || (isMale ? 75.0 : 60.0);
    const hCm = Number(athlete.heightCm) || (isMale ? 175 : 160);
    const age = Number(athlete.age) || 30;
    const bodyFat = isMale ? 20.0 : 26.0;
    const lean = Number((bWeight * (1 - (bodyFat / 100))).toFixed(1));

    base = {
      userId,
      athleteName: athlete.name || 'Atleta',
      gender: athlete.gender || (isMale ? 'male' : 'female'),
      age,
      heightCm: hCm,
      baselineWeightKg: bWeight,
      bodyFatPct: bodyFat,
      leanMassKg: lean,
      activityLevel: 'desk_job_with_training',
      activeMode: athlete.activeMode || 'visceral_fat_loss',
      goal: athlete.goal || 'fat_loss',
      digestiveProtection: !isMale,
      maxFatsCap: isMale ? 50 : 42
    };
  }

  const userStored = stored[userId] || {};

  const weightEntries = getLocalWeightEntries(householdId)
    .filter(w => w.userId === userId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let activeWeight = userStored.baselineWeightKg || base.baselineWeightKg;
  let isWeightFromLog = false;
  let lastWeightDate = null;
  const isMale = (userStored.gender || base.gender) === 'male';
  let activeWaist = userStored.waistCm || (isMale ? 88 : 78);
  let activeHips = userStored.hipsCm || null;

  if (weightEntries.length > 0) {
    if (weightEntries[0].weightKg) {
      activeWeight = Number(weightEntries[0].weightKg);
      isWeightFromLog = true;
      lastWeightDate = weightEntries[0].date;
    }
    const withWaist = weightEntries.find(w => w.waistCm);
    if (withWaist && withWaist.waistCm) {
      activeWaist = Number(withWaist.waistCm);
    }
    const withHips = weightEntries.find(w => w.hipsCm);
    if (withHips && withHips.hipsCm) {
      activeHips = Number(withHips.hipsCm);
    }
  }

  // Normalización clínica: Si Paula tenía el antiguo valor por defecto (65kg) y no proviene de un registro real de pesaje, fijar en 63.0 kg
  if (userId === 'paula' && !isWeightFromLog && (activeWeight === 65.0 || !userStored.baselineWeightKg)) {
    activeWeight = 63.0;
  }

  const activeMode = userStored.activeMode || base.activeMode || 'visceral_fat_loss';
  const digestiveProtection = userStored.digestiveProtection !== undefined 
    ? Boolean(userStored.digestiveProtection) 
    : Boolean(base.digestiveProtection);
  const maxFatsCap = Number(userStored.maxFatsCap) || Number(base.maxFatsCap) || (userId === 'paula' ? 42 : 45);

  return {
    ...base,
    ...userStored,
    activeMode,
    digestiveProtection,
    maxFatsCap,
    currentWeightKg: activeWeight,
    waistCm: activeWaist,
    hipsCm: activeHips,
    isWeightFromLog,
    lastWeightDate
  };
}

export function saveAthleteBiometrics(userId, data, householdId = 'hogar-dionicio-paula') {
  let stored = {};
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_BIOMETRICS_KEY}_${householdId}`);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}

  stored[userId] = {
    ...(stored[userId] || {}),
    ...data
  };

  try {
    localStorage.setItem(`${LOCAL_STORAGE_BIOMETRICS_KEY}_${householdId}`, JSON.stringify(stored));
  } catch (e) {}

  return getAthleteBiometrics(userId, householdId);
}

export function toggleAthleteDigestiveProtection(userId, enabled, householdId = 'hogar-dionicio-paula') {
  return saveAthleteBiometrics(userId, { digestiveProtection: Boolean(enabled) }, householdId);
}

export function saveAthleteMode(userId, modeId, householdId = 'hogar-dionicio-paula') {
  if (!FITNESS_MODES[modeId]) return null;
  return saveAthleteBiometrics(userId, { activeMode: modeId }, householdId);
}

/**
 * Motor de Evaluación y Recomendación Inteligente según Medidas y Resultados
 */
export function evaluateAthleteModeRecommendation(userId = 'dionicio', householdId = 'hogar-dionicio-paula') {
  const profile = getAthleteBiometrics(userId, householdId);
  const isMale = (profile.gender || 'male') === 'male';
  const heightCm = Number(profile.heightCm) || (isMale ? 175 : 160);
  const weightKg = Number(profile.currentWeightKg) || (isMale ? 75 : 60);
  const waistCm = Number(profile.waistCm) || (isMale ? 88 : 78);
  const currentMode = profile.activeMode || 'visceral_fat_loss';

  // Historial de medidas y pesajes
  const entries = getLocalWeightEntries(householdId)
    .filter(w => w.userId === userId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let waistDelta = 0;
  let weightDelta = 0;
  if (entries.length >= 2) {
    const latest = entries[0];
    const prev = entries[1];
    if (latest.waistCm && prev.waistCm) {
      waistDelta = Number((Number(latest.waistCm) - Number(prev.waistCm)).toFixed(1));
    }
    if (latest.weightKg && prev.weightKg) {
      weightDelta = Number((Number(latest.weightKg) - Number(prev.weightKg)).toFixed(2));
    }
  }

  // 1. Ratio Cintura / Altura (WHtR - Indicador Clínico Oro de Grasa Visceral)
  // WHtR >= 0.50 indica riesgo cardiovascular y acumulación visceral significativa
  const waistHeightRatio = Number((waistCm / heightCm).toFixed(2));
  
  // Regla de Oro Clínica: Si WHtR >= 0.50 (Grasa Visceral activa), el modo Aumento Muscular (Hipertrofia) queda bloqueado
  const isHypertrophyBlocked = waistHeightRatio >= 0.50;
  const targetWaistGoalCm = isMale ? Math.round(heightCm * 0.49) : Math.round(heightCm * 0.48);
  const hypertrophyBlockedReason = isHypertrophyBlocked
    ? `⛔ Bloqueo Clínico Activo: Tu ratio cintura/altura es ${waistHeightRatio} (≥ 0.50 con cintura ${waistCm}cm). Iniciar un superávit en este punto expandiría la grasa visceral y empeoraría la sensibilidad a la insulina. Debes reducir cintura bajo ${targetWaistGoalCm} cm antes de autorizar aumento muscular.`
    : null;

  let recommendedMode = 'visceral_fat_loss';
  let confidencePct = 95;
  let riskLevel = 'Moderado';
  let clinicalRationale = '';
  let milestoneToNextMode = '';
  let actionableTips = [];

  // Rangos de Ashwell (WHtR - Ratio Cintura / Altura):
  // - >= 0.52: Pérdida de Grasa Visceral prioritaria (Riesgo metabólico / abdominal)
  // - 0.48 - 0.51: Recomposición Corporal (Zona de transición atlética segura)
  // - < 0.48: Hipertrofia Limpia (Sensibilidad a la insulina óptima, masa magra pura)
  if (waistHeightRatio >= 0.52) {
    recommendedMode = 'visceral_fat_loss';
    riskLevel = 'Elevado (Grasa Visceral Activa)';
    clinicalRationale = `Tu ratio cintura/altura actual es de ${waistHeightRatio} (cintura ${waistCm}cm sobre ${heightCm}cm). Clínicamente (rango Ashwell ≥ 0.52), confirma adiposidad visceral activa. La prioridad metabólica número 1 debe ser continuar con déficit acelerado (-760 kcal) para movilizar esta grasa profunda y desinflamar órganos. El modo Aumento Muscular está bloqueado preventivamente.`;
    milestoneToNextMode = `Reducir cintura a menos de ${targetWaistGoalCm} cm para desbloquear el modo Recomposición Corporal.`;
    actionableTips = [
      'Mantener caminadora con pendiente (Zona 2 aeróbica de 20-30 min) para maximizar la oxidación de ácidos grasos libres.',
      'Asegurar la proteína diaria calculada sobre masa magra para blindar el músculo mientras la grasa desciende.',
      'Priorizar verduras de volumen (zapallo italiano, ensaladas) en almuerzo y once para máxima saciedad.'
    ];
  } else if (waistHeightRatio >= 0.48 && waistHeightRatio < 0.52) {
    recommendedMode = 'body_recomposition';
    riskLevel = 'Saludable / Transición';
    clinicalRationale = `Tu ratio cintura/altura se encuentra en una zona de recomposición de ${waistHeightRatio} (${waistCm}cm, rango Ashwell 0.48 - 0.51). Has controlado el riesgo de grasa visceral profunda. Este es el estado metabólico óptimo para Recomposición Corporal: déficit suave (-350 kcal) que permite ganar tono y fuerza mientras se eliminan los últimos depósitos subcutáneos.`;
    milestoneToNextMode = `Mantener cargas en mancuernas (RPE 7-8.5) y llevar la cintura a ${targetWaistGoalCm} cm para poder pasar a Hipertrofia Limpia.`;
    actionableTips = [
      'Subir ligeramente los carbohidratos en días de entrenamiento para recargar glucógeno muscular.',
      'Buscar sobrecarga progresiva (+1 repetición o +1.25kg por mancuerna) cada semana.',
      'Monitorear que la cintura no suba mientras la fuerza aumenta.'
    ];
  } else {
    // WHtR < 0.48: Hipertrofia limpia
    recommendedMode = 'hypertrophy_muscle_gain';
    riskLevel = 'Excelente / Magro (Ashwell < 0.48)';
    clinicalRationale = `Tu ratio cintura/altura es óptimo (${waistHeightRatio} < 0.48). Tienes una sensibilidad a la insulina excepcional y niveles mínimos de grasa visceral. Puedes realizar un superávit controlado (+250 kcal) para construir masa muscular neta sin ganar grasa indeseada.`;
    milestoneToNextMode = `Monitorear perímetro de cintura quincenalmente: si sube más de 2 cm sin aumento proporcional de fuerza, ajustar a recomposición.`;
    actionableTips = [
      'Aumentar la ingesta calórica principalmente en carbohidratos complejos (arroz, avena, papas).',
      'Entrenar con alta intensidad técnica (RPE 8-9) en ejercicios multiarticulares.',
      'Descansar 60 a 75 segundos entre series pesadas de mancuernas.'
    ];
  }

  // Detección de fatiga o estancamiento de déficit prolongado (> 6 semanas con peso y cintura congelados)
  if (currentMode === 'visceral_fat_loss' && entries.length >= 4) {
    const last3 = entries.slice(0, 3);
    const weightStalled = last3.every(e => Math.abs(Number(e.weightKg) - weightKg) < 0.3);
    const waistStalled = last3.every(e => e.waistCm && Math.abs(Number(e.waistCm) - waistCm) < 0.5);
    if (weightStalled && waistStalled) {
      recommendedMode = 'metabolic_maintenance';
      confidencePct = 88;
      clinicalRationale = `Has mantenido el déficit de manera constante pero tus medidas de cintura (${waistCm}cm) y peso se han estabilizado en los últimos chequeos. Tu organismo probablemente ha adaptado su gasto tiroideo y leptina. Se recomienda 1 a 2 semanas en modo Mantenimiento & Descanso Metabólico (Diet Break a TDEE pleno) para reactivar tu metabolismo antes de reanudar el déficit.`;
      milestoneToNextMode = '10 a 14 días de calorías de mantenimiento para normalizar leptina y reanudar oxidación de grasa.';
      actionableTips = [
        'Comer a nivel de mantenimiento (~2.350 kcal para Dionicio, ~1.650 kcal para Paula) sin temor a engordar.',
        'Mantener la intensidad en el entrenamiento con mancuernas para aprovechar la recarga de energía.',
        'Regresar al modo Pérdida de Grasa Visceral tras el reset metabólico.'
      ];
    }
  }

  const isCurrentOptimal = currentMode === recommendedMode;

  return {
    userId,
    athleteName: profile.athleteName,
    currentMode,
    currentModeConfig: FITNESS_MODES[currentMode] || FITNESS_MODES.visceral_fat_loss,
    recommendedMode,
    recommendedModeConfig: FITNESS_MODES[recommendedMode],
    isCurrentOptimal,
    confidencePct,
    waistCm,
    heightCm,
    weightKg,
    waistHeightRatio,
    waistDelta,
    weightDelta,
    riskLevel,
    targetWaistGoalCm,
    clinicalRationale,
    milestoneToNextMode,
    isHypertrophyBlocked,
    hypertrophyBlockedReason,
    actionableTips
  };
}

export function calculateMifflinBMR(weightKg, heightCm, age, gender) {
  const w = Number(weightKg) || 70;
  const h = Number(heightCm) || 170;
  const a = Number(age) || 40;

  if (gender === 'female') {
    return Math.round((10 * w) + (6.25 * h) - (5 * a) - 161);
  } else {
    return Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
  }
}

export function calculateBMI(weightKg, heightCm) {
  const hM = heightCm / 100;
  if (!hM || hM <= 0) return { bmi: 0, category: 'N/A' };
  const bmi = Number((weightKg / (hM * hM)).toFixed(1));

  let category = 'Normal';
  if (bmi < 18.5) category = 'Bajo peso';
  else if (bmi < 25) category = 'Peso Normal';
  else if (bmi < 30) category = 'Sobrepeso';
  else if (bmi < 35) category = 'Obesidad Grado I';
  else category = 'Obesidad Grado II+';

  return { bmi, category };
}

/**
 * Motor Clínico de Nutrición de Precisión (Sin Trampa de Factor Inflado)
 */
export function calculateAthleteNutrition(userId = 'dionicio', householdId = 'hogar-dionicio-paula', customWeight = null) {
  const profile = getAthleteBiometrics(userId, householdId);
  const weightKg = customWeight !== null ? Number(customWeight) : profile.currentWeightKg;
  const heightCm = Number(profile.heightCm) || (userId === 'dionicio' ? 180 : 160);
  const age = Number(profile.age) || (userId === 'dionicio' ? 40 : 41);
  const gender = profile.gender || (userId === 'dionicio' ? 'male' : 'female');

  // 1. Tasa Metabólica Basal (BMR) con Mifflin-St Jeor
  // Dionicio: 10*86 + 6.25*180 - 5*40 + 5 = 1790 kcal
  // Paula (63kg): 10*63 + 6.25*160 - 5*41 - 161 = 630 + 1000 - 205 - 161 = 1264 kcal
  const bmr = calculateMifflinBMR(weightKg, heightCm, age, gender);

  // 2. Gasto Energético Total Diario (TDEE Real de Oficina + Entreno)
  // Dionicio: PAL 1.32 (~2.360 kcal) | Paula: PAL 1.28 (~1.618 kcal)
  const defaultPal = userId === 'dionicio' ? 1.32 : 1.28;
  const palMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel]?.value || defaultPal;
  const tdee = Math.round(bmr * palMultiplier);

  // 3. Masa Magra Estimada
  // Dionicio con 86kg y ~23% grasa = ~65.5kg magros
  // Paula con 63kg y ~28% grasa = ~45.4kg magros
  const bodyFatPct = Number(profile.bodyFatPct) || (gender === 'male' ? 23.0 : 28.0);
  const leanMassKg = Number((weightKg * (1 - (bodyFatPct / 100))).toFixed(1));

  const activeMode = profile.activeMode || 'visceral_fat_loss';
  const modeConfig = FITNESS_MODES[activeMode] || FITNESS_MODES.visceral_fat_loss;
  const recommendation = evaluateAthleteModeRecommendation(userId, householdId);

  // 4. Déficit o Superávit Calórico según el Modo Activo
  let targetCals = tdee;
  let deficitKcal = 0;
  let targetProteinG = 130;
  let targetFatsG = 57;

  if (activeMode === 'visceral_fat_loss') {
    if (userId === 'dionicio') {
      deficitKcal = 760;
      targetCals = 1600;
      targetProteinG = 130;
      targetFatsG = 55;
    } else if (userId === 'paula') {
      deficitKcal = 400;
      targetCals = 1220;
      targetProteinG = 82;
      targetFatsG = profile.digestiveProtection ? 40 : 48;
    } else {
      deficitKcal = Math.round(Math.min(550, Math.max(300, tdee * 0.22)));
      const minFloor = gender === 'male' ? 1500 : 1200;
      targetCals = Math.max(minFloor, tdee - deficitKcal);
      targetProteinG = Math.round(weightKg * (gender === 'male' ? 1.8 : 1.6));
      targetFatsG = Math.round(weightKg * 0.7);
    }
  } else if (activeMode === 'body_recomposition') {
    if (userId === 'dionicio') {
      deficitKcal = 350;
      targetCals = Math.round(tdee - 350);
      targetProteinG = 140;
      targetFatsG = 65;
    } else if (userId === 'paula') {
      deficitKcal = 200;
      targetCals = Math.round(tdee - 200);
      targetProteinG = 85;
      targetFatsG = profile.digestiveProtection ? 42 : 52;
    } else {
      deficitKcal = Math.round(Math.min(350, Math.max(200, tdee * 0.12)));
      targetCals = Math.round(tdee - deficitKcal);
      targetProteinG = Math.round(weightKg * (gender === 'male' ? 2.0 : 1.7));
      targetFatsG = Math.round(weightKg * 0.8);
    }
  } else if (activeMode === 'hypertrophy_muscle_gain') {
    if (userId === 'dionicio') {
      const surplusKcal = 250;
      deficitKcal = -surplusKcal;
      targetCals = Math.round(tdee + surplusKcal);
      targetProteinG = 145;
      targetFatsG = 75;
    } else if (userId === 'paula') {
      const surplusKcal = 150;
      deficitKcal = -surplusKcal;
      targetCals = Math.round(tdee + surplusKcal);
      targetProteinG = 88;
      targetFatsG = profile.digestiveProtection ? 42 : 56;
    } else {
      const surplusKcal = gender === 'male' ? 250 : 150;
      deficitKcal = -surplusKcal;
      targetCals = Math.round(tdee + surplusKcal);
      targetProteinG = Math.round(weightKg * (gender === 'male' ? 1.9 : 1.7));
      targetFatsG = Math.round(weightKg * 0.9);
    }
  } else {
    // metabolic_maintenance
    deficitKcal = 0;
    targetCals = tdee;
    if (userId === 'dionicio') {
      targetProteinG = 135;
      targetFatsG = 70;
    } else if (userId === 'paula') {
      targetProteinG = 82;
      targetFatsG = profile.digestiveProtection ? 42 : 54;
    } else {
      targetProteinG = Math.round(weightKg * (gender === 'male' ? 1.8 : 1.5));
      targetFatsG = Math.round(weightKg * 0.8);
    }
  }

  // PROTECCIÓN DIGESTIVA (Techo Estricto de Grasas / Vesícula y Colon Sensible)
  // Si está activada para el atleta, aplica el hard cap definido (ej: 42g para Paula, o 45g para Dionicio)
  const isDigestiveProtectionActive = Boolean(profile.digestiveProtection);
  if (isDigestiveProtectionActive) {
    const hardCap = profile.maxFatsCap || (userId === 'paula' ? 42 : 45);
    targetFatsG = Math.min(targetFatsG, hardCap);
  }

  // 5. Reparto Bioquímico de Macronutrientes
  const proteinKcal = targetProteinG * 4;
  const fatsKcal = targetFatsG * 9;
  const remainingKcal = Math.max(0, targetCals - (proteinKcal + fatsKcal));
  const targetCarbsG = Math.max(30, Math.round(remainingKcal / 4));

  const bmiData = calculateBMI(weightKg, heightCm);

  return {
    userId,
    athleteName: profile.athleteName,
    gender,
    age,
    heightCm,
    weightKg,
    waistCm: profile.waistCm,
    hipsCm: profile.hipsCm,
    bodyFatPct,
    leanMassKg,
    isWeightFromLog: profile.isWeightFromLog,
    lastWeightDate: profile.lastWeightDate,
    bmi: bmiData.bmi,
    bmiCategory: bmiData.category,
    bmr,
    tdee,
    palMultiplier,
    activityLabel: ACTIVITY_MULTIPLIERS[profile.activityLevel]?.label || 'Oficina + Entreno Dúo (PAL 1.32)',
    activeMode,
    activeModeConfig: modeConfig,
    recommendation,
    goal: profile.goal,
    goalLabel: modeConfig.name,
    deficitKcal,
    targetCals,
    targetProtein: targetProteinG,
    targetCarbs: targetCarbsG,
    targetFats: targetFatsG,
    digestiveProtection: isDigestiveProtectionActive,
    maxFatsCap: profile.maxFatsCap || (userId === 'paula' ? 42 : 45),
    foodPreferences: HOUSEHOLD_NUTRITION_CONTEXT.athletes[userId]?.foodPreferences || null,
    supplementation: HOUSEHOLD_NUTRITION_CONTEXT.athletes[userId]?.supplementation || null,
    clinicalConstraints: HOUSEHOLD_NUTRITION_CONTEXT.athletes[userId]?.clinicalConstraints || null,
    macroPercentages: {
      proteinPct: Math.round((proteinKcal / targetCals) * 100),
      carbsPct: Math.round(((targetCarbsG * 4) / targetCals) * 100),
      fatsPct: Math.round((fatsKcal / targetCals) * 100)
    },
    formulaDetails: {
      formulaName: `Mifflin-St Jeor + Modo ${modeConfig.shortName}`,
      equation: `${gender === 'male' ? '10*(86kg) + 6.25*(180cm) - 5*(40a) + 5 = 1790 kcal' : '10*(65kg) + 6.25*(160cm) - 5*(41a) - 161 = 1284 kcal'}`,
      bmrResult: `${bmr} kcal/día en reposo absoluto`,
      tdeeResult: `${tdee} kcal/día (gasto real de oficina sedentaria + 1h de entreno)`,
      adjustment: deficitKcal > 0 ? `Déficit de -${deficitKcal} kcal/día` : (deficitKcal < 0 ? `Superávit de +${Math.abs(deficitKcal)} kcal/día` : 'Calorías de Mantenimiento (0 déficit)'),
      proteinTargetInfo: `${targetProteinG}g sobre masa magra de ${leanMassKg}kg`,
      fatsTargetInfo: `${targetFatsG}g (${(targetFatsG / weightKg).toFixed(2)} g/kg)`,
      carbsTargetInfo: `${targetCarbsG}g (remanente para energía en trotadora y mancuernas)`
    }
  };
}
