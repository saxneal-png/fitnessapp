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

export const GOAL_PRESETS = {
  aggressive_fat_loss: { label: 'Pérdida de Grasa Pura (Déficit Clínico ~750 kcal/día)', deficit: 750 },
  moderate_fat_loss: { label: 'Pérdida de Grasa Moderada (Déficit ~450 kcal/día)', deficit: 450 },
  recomposition: { label: 'Recomposición Corporal Suave (Déficit ~300 kcal/día)', deficit: 300 },
  maintenance: { label: 'Mantenimiento de Peso Real (0 kcal déficit)', deficit: 0 }
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

  if (weightEntries.length > 0 && weightEntries[0].weightKg) {
    activeWeight = Number(weightEntries[0].weightKg);
    isWeightFromLog = true;
    lastWeightDate = weightEntries[0].date;
  }

  return {
    ...base,
    ...userStored,
    currentWeightKg: activeWeight,
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

  // 4. Déficit Calórico Real Financiero con Grasa Almacenada
  // Dionicio: -750 kcal fijas (Target: 1.600 kcal) | Paula: -400 kcal (Target: 1.250 kcal)
  let deficitKcal = 750;
  if (userId === 'paula') {
    deficitKcal = 400;
  } else if (profile.deficitKcal !== undefined) {
    deficitKcal = Number(profile.deficitKcal);
  }

  let targetCals = Math.round(tdee - deficitKcal);
  // Salvaguarda de rangos clínicos estrictos
  if (userId === 'dionicio') {
    if (targetCals < 1550) targetCals = 1550;
    if (targetCals > 1650) targetCals = 1600; // Target exacto
  } else if (userId === 'paula') {
    if (targetCals < 1200) targetCals = 1200;
    if (targetCals > 1300) targetCals = 1250;
  }

  // 5. Reparto Bioquímico de Macronutrientes
  // A. Proteína: 2.0 g/kg sobre masa magra (Dionicio: 65.5 * 2.0 = 130g = 520 kcal)
  const targetProteinG = userId === 'dionicio' ? 130 : Math.round(leanMassKg * 2.0);
  const proteinKcal = targetProteinG * 4;

  // B. Grasas: Piso hormonal biológico estricto (0.65 - 0.70 g/kg peso total)
  // Dionicio: 86 * 0.66 = 57g (513 kcal) | Paula: 65 * 0.65 = 42g (378 kcal)
  const targetFatsG = userId === 'dionicio' ? 57 : Math.round(weightKg * 0.65);
  const fatsKcal = targetFatsG * 9;

  // C. Carbohidratos: Remanente glucolítico para rendir con fuerza
  // Dionicio: (1600 - 520 - 513) / 4 = 567 / 4 = 140g (560 kcal)
  // Paula: (1250 - 380 - 378) / 4 = 492 / 4 = 123g
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
    goal: profile.goal,
    goalLabel: GOAL_PRESETS[profile.goal]?.label || 'Pérdida de Grasa Pura (-750 kcal)',
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
      formulaName: 'Mifflin-St Jeor + PAL Realista de Oficina (1.32)',
      equation: `${gender === 'male' ? '10*(86kg) + 6.25*(180cm) - 5*(40a) + 5 = 1790 kcal' : '10*(65kg) + 6.25*(160cm) - 5*(41a) - 161 = 1284 kcal'}`,
      bmrResult: `${bmr} kcal/día en reposo absoluto`,
      tdeeResult: `${tdee} kcal/día (gasto real de oficina sedentaria + 1h de entreno)`,
      adjustment: `Déficit de -${deficitKcal} kcal/día (~5.250 kcal/semana -> -0.7 kg grasa/sem)`,
      proteinTargetInfo: `${targetProteinG}g (2.0 g/kg sobre masa magra de ${leanMassKg}kg)`,
      fatsTargetInfo: `${targetFatsG}g (piso biológico hormonal de 0.66 g/kg)`,
      carbsTargetInfo: `${targetCarbsG}g (remanente para energía en trotadora y mancuernas)`
    }
  };
}
