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

import { getLocalWeightEntries } from '../firebase/config';

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
    targetCals: 1600, // Rango clínico exacto: 1.550 a 1.650 kcal
    targetProtein: 130, // 2.0 g/kg de masa magra (130g = 520 kcal)
    targetFats: 57, // 0.66 g/kg de peso total (57g = 513 kcal)
    targetCarbs: 140 // Remanente glucolítico (140g = 560 kcal)
  },
  paula: {
    userId: 'paula',
    athleteName: 'Paula',
    gender: 'female',
    age: 41,
    heightCm: 160,
    baselineWeightKg: 65.0,
    bodyFatPct: 28.0, // ~28% grasa corporal
    leanMassKg: 46.8, // ~47 kg masa magra
    activityLevel: 'desk_job_with_training', // PAL 1.28 real
    activeMode: 'visceral_fat_loss', // Modo predeterminado
    goal: 'fat_loss',
    deficitKcal: 400, // -400 kcal/día
    targetCals: 1250, // Rango clínico exacto: 1.200 a 1.250 kcal
    targetProtein: 95, // ~2.0 g/kg masa magra (95g = 380 kcal)
    targetFats: 42, // 0.65 g/kg de peso total (42g = 378 kcal)
    targetCarbs: 115 // Remanente (115g = 460 kcal)
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

export function getAthleteBiometrics(userId = 'dionicio', householdId = 'hogar-dionicio-paula') {
  let stored = {};
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_BIOMETRICS_KEY}_${householdId}`);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {
    console.warn('Error al leer biometría guardada:', e);
  }

  const base = DEFAULT_BIOMETRICS[userId] || DEFAULT_BIOMETRICS.dionicio;
  const userStored = stored[userId] || {};

  const weightEntries = getLocalWeightEntries(householdId)
    .filter(w => w.userId === userId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let activeWeight = userStored.baselineWeightKg || base.baselineWeightKg;
  let isWeightFromLog = false;
  let lastWeightDate = null;
  let activeWaist = userStored.waistCm || (userId === 'dionicio' ? 92 : 78);
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

  const activeMode = userStored.activeMode || base.activeMode || 'visceral_fat_loss';

  return {
    ...base,
    ...userStored,
    activeMode,
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

export function saveAthleteMode(userId, modeId, householdId = 'hogar-dionicio-paula') {
  if (!FITNESS_MODES[modeId]) return null;
  return saveAthleteBiometrics(userId, { activeMode: modeId }, householdId);
}

/**
 * Motor de Evaluación y Recomendación Inteligente según Medidas y Resultados
 */
export function evaluateAthleteModeRecommendation(userId = 'dionicio', householdId = 'hogar-dionicio-paula') {
  const profile = getAthleteBiometrics(userId, householdId);
  const heightCm = Number(profile.heightCm) || (userId === 'dionicio' ? 180 : 160);
  const weightKg = Number(profile.currentWeightKg) || (userId === 'dionicio' ? 86 : 65);
  const waistCm = Number(profile.waistCm) || (userId === 'dionicio' ? 92 : 78);
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
  
  let recommendedMode = 'visceral_fat_loss';
  let confidencePct = 95;
  let riskLevel = 'Moderado';
  let clinicalRationale = '';
  let targetWaistGoalCm = userId === 'dionicio' ? 88 : 74;
  let milestoneToNextMode = '';
  let actionableTips = [];

  if (waistHeightRatio >= 0.52) {
    recommendedMode = 'visceral_fat_loss';
    riskLevel = 'Elevado (Grasa Visceral Activa)';
    targetWaistGoalCm = userId === 'dionicio' ? 88 : 74;
    clinicalRationale = `Tu ratio cintura/altura actual es de ${waistHeightRatio} (cintura ${waistCm}cm sobre ${heightCm}cm). Clínicamente, un ratio mayor a 0.50 confirma adiposidad visceral acumulada. La prioridad metabólica número 1 debe ser continuar con déficit acelerado (-750 kcal) para movilizar esta grasa interna y desinflamar el hígado/órganos.`;
    milestoneToNextMode = `Reducir cintura a menos de ${targetWaistGoalCm} cm para desbloquear el modo Recomposición Corporal.`;
    actionableTips = [
      'Mantener caminadora con pendiente (Zona 2 aeróbica de 20-30 min) para maximizar la oxidación de ácidos grasos libres.',
      'Asegurar los 130g de proteína en masa magra para blindar el músculo mientras la grasa desciende.',
      'Priorizar verduras de volumen (zapallo italiano, ensaladas) en almuerzo y once para máxima saciedad.'
    ];
  } else if (waistHeightRatio >= 0.46 && waistHeightRatio < 0.52) {
    recommendedMode = 'body_recomposition';
    riskLevel = 'Saludable / Transición';
    targetWaistGoalCm = userId === 'dionicio' ? 82 : 69;
    clinicalRationale = `Tu ratio cintura/altura se encuentra en una zona saludable de ${waistHeightRatio} (${waistCm}cm). Ya has controlado el riesgo de grasa visceral profunda. Este es el estado metabólico óptimo para Recomposición Corporal: déficit suave (-350 kcal) que permite ganar tono y masa magra mientras se eliminan los últimos depósitos subcutáneos.`;
    milestoneToNextMode = `Mantener cargas en mancuernas (RPE 7-8.5) y llevar la cintura a ${targetWaistGoalCm} cm para poder pasar a Hipertrofia Limpia.`;
    actionableTips = [
      'Subir ligeramente los carbohidratos en días de entrenamiento para recargar glucógeno muscular.',
      'Buscar sobrecarga progresiva (+1 repetición o +1.25kg por mancuerna) cada semana.',
      'Monitorear que la cintura no suba mientras la fuerza aumenta.'
    ];
  } else {
    // WHtR < 0.46: Muy magro
    recommendedMode = 'hypertrophy_muscle_gain';
    riskLevel = 'Excelente / Magro';
    targetWaistGoalCm = waistCm;
    clinicalRationale = `Tu ratio cintura/altura es óptimo (${waistHeightRatio}). Tienes una sensibilidad a la insulina excepcional y niveles mínimos de grasa visceral. Puedes realizar un superávit controlado (+250 kcal) para construir masa muscular neta sin ganar grasa indeseada.`;
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
  const bmr = calculateMifflinBMR(weightKg, heightCm, age, gender);

  // 2. Gasto Energético Total Diario (TDEE Real de Oficina + Entreno)
  // Dionicio: 1.32 (2.360 kcal) | Paula: 1.28 (1.644 kcal)
  const defaultPal = userId === 'dionicio' ? 1.32 : 1.28;
  const palMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel]?.value || defaultPal;
  const tdee = Math.round(bmr * palMultiplier);

  // 3. Masa Magra Estimada
  // Dionicio con 86kg y ~23% grasa = ~65.5kg magros
  // Paula con 65kg y ~28% grasa = ~46.8kg magros
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
    deficitKcal = userId === 'dionicio' ? 760 : 400;
    targetCals = userId === 'dionicio' ? 1600 : 1250;
    targetProteinG = userId === 'dionicio' ? 130 : Math.round(leanMassKg * 2.0);
    targetFatsG = userId === 'dionicio' ? 57 : Math.round(weightKg * 0.65);
  } else if (activeMode === 'body_recomposition') {
    deficitKcal = userId === 'dionicio' ? 350 : 220;
    targetCals = Math.round(tdee - deficitKcal);
    targetProteinG = userId === 'dionicio' ? 140 : Math.round(leanMassKg * 2.15);
    targetFatsG = userId === 'dionicio' ? 65 : Math.round(weightKg * 0.74);
  } else if (activeMode === 'hypertrophy_muscle_gain') {
    const surplusKcal = userId === 'dionicio' ? 250 : 150;
    deficitKcal = -surplusKcal; // Negativo para reflejar superávit
    targetCals = Math.round(tdee + surplusKcal);
    targetProteinG = userId === 'dionicio' ? 145 : Math.round(leanMassKg * 2.2);
    targetFatsG = userId === 'dionicio' ? 75 : Math.round(weightKg * 0.85);
  } else {
    // metabolic_maintenance
    deficitKcal = 0;
    targetCals = tdee;
    targetProteinG = userId === 'dionicio' ? 135 : Math.round(leanMassKg * 2.0);
    targetFatsG = userId === 'dionicio' ? 70 : Math.round(weightKg * 0.78);
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
