/**
 * Servicio de Cálculo de Necesidades Nutricionales y Biometría Deportiva de Precisión
 * Implementa ecuaciones clínicas validadas (Mifflin-St Jeor, TDEE con factor PAL,
 * ratios de macronutrientes basados en evidencia para fuerza y recomposición corporal).
 */

import { getLocalWeightEntries } from '../firebase/config';

// Configuración por defecto de perfiles biométricos base
export const DEFAULT_BIOMETRICS = {
  dionicio: {
    userId: 'dionicio',
    athleteName: 'Dionicio',
    gender: 'male',
    age: 42,
    heightCm: 180,
    baselineWeightKg: 86.0,
    activityLevel: 'moderate', // PAL 1.45 (fuerza con mancuernas + trotadora 5 días/sem)
    goal: 'recomposition', // Recomposición corporal (quema de grasa preservando músculo)
    deficitPct: 14, // -14% de déficit moderado
    proteinPerKg: 2.0, // 2.0 g/kg (estándar para atletas de fuerza en déficit)
    fatPerKg: 0.85 // 0.85 g/kg (salud hormonal óptima)
  },
  paula: {
    userId: 'paula',
    athleteName: 'Paula',
    gender: 'female',
    age: 41,
    heightCm: 160,
    baselineWeightKg: 65.0,
    activityLevel: 'moderate', // PAL 1.45
    goal: 'fat_loss', // Pérdida de grasa saludable y tonificación
    deficitPct: 18, // -18% de déficit moderado
    proteinPerKg: 1.9, // 1.9 g/kg (saciedad y masa magra)
    fatPerKg: 0.8 // 0.8 g/kg
  }
};

// Factores de Actividad Física (PAL - Physical Activity Level)
export const ACTIVITY_MULTIPLIERS = {
  sedentary: { value: 1.20, label: 'Sedentario (Poco o ningún ejercicio)' },
  light: { value: 1.35, label: 'Ligero (1-2 días/sem ejercicio suave)' },
  moderate: { value: 1.45, label: 'Moderado (3-5 días/sem: Dúo Fuerza + Trotadora)' },
  heavy: { value: 1.65, label: 'Muy activo (6-7 días/sem alta intensidad)' }
};

// Objetivos y porcentajes de ajuste calórico recomendados
export const GOAL_PRESETS = {
  fat_loss: { label: 'Pérdida de Grasa (Déficit -18%)', defaultDeficit: 18 },
  recomposition: { label: 'Recomposición Corporal (Déficit suave -12% a -15%)', defaultDeficit: 14 },
  maintenance: { label: 'Mantenimiento de Peso (0%)', defaultDeficit: 0 },
  muscle_gain: { label: 'Ganancia Muscular Limpia (+10% Superávit)', defaultDeficit: -10 }
};

const LOCAL_STORAGE_BIOMETRICS_KEY = 'fitness_duo_athlete_biometrics';

/**
 * Obtiene la configuración biométrica de un atleta
 */
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

  // Buscar el peso corporal más reciente registrado en la base de datos de pesajes
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

/**
 * Guarda o actualiza la biometría de un atleta
 */
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

/**
 * Cálculo científico de Tasa Metabólica Basal (BMR) usando Mifflin-St Jeor
 * Varones: 10 * peso + 6.25 * altura - 5 * edad + 5
 * Mujeres: 10 * peso + 6.25 * altura - 5 * edad - 161
 */
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

/**
 * Categoría de IMC (Índice de Masa Corporal)
 */
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
 * Motor Principal de Cálculo Nutricional y Macronutrientes para un Atleta
 */
export function calculateAthleteNutrition(userId = 'dionicio', householdId = 'hogar-dionicio-paula', customWeight = null) {
  const profile = getAthleteBiometrics(userId, householdId);
  const weightKg = customWeight !== null ? Number(customWeight) : profile.currentWeightKg;
  const heightCm = Number(profile.heightCm) || 170;
  const age = Number(profile.age) || 40;
  const gender = profile.gender || 'male';

  // 1. Tasa Metabólica Basal (BMR / TMB)
  const bmr = calculateMifflinBMR(weightKg, heightCm, age, gender);

  // 2. Gasto Energético Total Diario (TDEE / GET)
  const palMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel]?.value || 1.45;
  const tdee = Math.round(bmr * palMultiplier);

  // 3. Ajuste Calórico por Objetivo (Déficit / Superávit)
  const deficitPct = Number(profile.deficitPct) !== undefined ? Number(profile.deficitPct) : 15;
  const targetCals = Math.round(tdee * (1 - (deficitPct / 100)));

  // 4. Distribución de Macronutrientes basada en Evidencia Deportiva
  // Proteína: 1.8 a 2.2 g por kg de peso
  const proteinFactor = Number(profile.proteinPerKg) || (gender === 'male' ? 2.0 : 1.9);
  const targetProteinG = Math.round(weightKg * proteinFactor);
  const proteinKcal = targetProteinG * 4;

  // Grasas: 0.8 a 1.0 g por kg de peso
  const fatFactor = Number(profile.fatPerKg) || 0.85;
  const targetFatsG = Math.round(weightKg * fatFactor);
  const fatsKcal = targetFatsG * 9;

  // Carbohidratos: Cubren el remanente calórico para dar energía al entrenamiento (19:00 - 20:00)
  const remainingKcalForCarbs = Math.max(0, targetCals - (proteinKcal + fatsKcal));
  const targetCarbsG = Math.max(30, Math.round(remainingKcalForCarbs / 4));

  // 5. Diagnóstico de IMC
  const bmiData = calculateBMI(weightKg, heightCm);

  return {
    userId,
    athleteName: profile.athleteName,
    gender,
    age,
    heightCm,
    weightKg,
    isWeightFromLog: profile.isWeightFromLog,
    lastWeightDate: profile.lastWeightDate,
    bmi: bmiData.bmi,
    bmiCategory: bmiData.category,
    bmr,
    tdee,
    palMultiplier,
    activityLabel: ACTIVITY_MULTIPLIERS[profile.activityLevel]?.label || 'Moderado',
    goal: profile.goal,
    goalLabel: GOAL_PRESETS[profile.goal]?.label || 'Recomposición',
    deficitPct,
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
      formulaName: 'Mifflin-St Jeor + TDEE',
      equation: `${gender === 'male' ? '10*w + 6.25*h - 5*edad + 5' : '10*w + 6.25*h - 5*edad - 161'}`,
      bmrResult: `${bmr} kcal/día (mantenimiento en reposo absoluto)`,
      tdeeResult: `${tdee} kcal/día (con factor PAL ${palMultiplier})`,
      adjustment: `${deficitPct > 0 ? `Déficit del ${deficitPct}% (-${tdee - targetCals} kcal)` : (deficitPct < 0 ? `Superávit del ${Math.abs(deficitPct)}%` : 'Mantenimiento exacto')}`,
      proteinTargetInfo: `${targetProteinG}g (${proteinFactor} g/kg de peso corporal)`,
      fatsTargetInfo: `${targetFatsG}g (${fatFactor} g/kg de peso corporal)`,
      carbsTargetInfo: `${targetCarbsG}g (remanente para energía glucolítica en trotadora/mancuernas)`
    }
  };
}
