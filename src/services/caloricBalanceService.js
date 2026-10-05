/**
 * Servicio de Balance Calórico Diario & Semanal y Auditoría de Grasa Estimada
 * Calcula el gasto energético real (TDEE dinámico con pesas y trotadora),
 * balance neto de déficit/mantenimiento/superávit, y estimación de cambio de tejido adiposo.
 */

import { calculateAthleteNutrition, getAthleteBiometrics, calculateMifflinBMR } from './nutritionCalculator';
import { calculateStrengthCaloriesBurned, calculateDailyMuscleCategories } from './adaptiveWorkoutService';
import { getLocalDateString } from '../utils/dateUtils';
import { USERS } from '../data/workoutCatalog';

// Densidad calórica del tejido adiposo humano: ~7.700 kcal por 1 kg de grasa corporal pura
export const KCAL_PER_KG_FAT = 7700;

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Obtiene el resumen consolidado de un día para un atleta:
 * Nutrición ingerida + Gasto por entrenamiento de pesas/cardio + Balance calórico.
 */
export function getDailyAthleteSummary(userId, dateStr, logs = [], nutritionLogs = [], householdId = 'hogar-dionicio-paula') {
  const biometrics = getAthleteBiometrics(userId, householdId);
  const nutritionPlan = calculateAthleteNutrition(userId, householdId);
  const userConfig = USERS[userId] || USERS.dionicio;

  // 1. Ingesta de Nutrición del día
  const dailyNutrition = nutritionLogs.filter(n => {
    const d = n.date || (n.timestamp ? getLocalDateString(n.timestamp) : '');
    return n.userId === userId && d === dateStr;
  });

  const intakeTotals = dailyNutrition.reduce((acc, item) => {
    acc.calories += Number(item.caloriesKcal) || 0;
    acc.protein += Number(item.proteinG) || 0;
    acc.carbs += Number(item.carbsG) || 0;
    acc.fats += Number(item.fatsG) || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // 2. Registros de Entrenamiento de Pesas del día
  const strengthLogs = logs.filter(l => {
    return l.userId === userId && l.type === 'strength' && l.date === dateStr;
  });

  const totalVolumeKg = strengthLogs.reduce((acc, l) => acc + (Number(l.totalVolumeKg) || 0), 0);
  const totalSetsCount = strengthLogs.reduce((acc, l) => acc + (l.sets?.length || 0), 0);
  const strengthCaloriesBurned = strengthLogs.length > 0 
    ? calculateStrengthCaloriesBurned(biometrics.currentWeightKg, 25, totalVolumeKg)
    : 0;

  const muscleCategories = calculateDailyMuscleCategories(strengthLogs);

  // 3. Registros de Trotadora del día
  const treadmillLogs = logs.filter(l => {
    return l.userId === userId && l.type === 'treadmill' && l.date === dateStr;
  });

  const treadmillMinutes = treadmillLogs.reduce((acc, l) => acc + (Number(l.durationMinutes) || 0), 0);
  const treadmillCaloriesBurned = treadmillLogs.reduce((acc, l) => acc + (Number(l.activeCaloriesKcal) || 0), 0);
  const avgIncline = treadmillLogs.length > 0 
    ? (treadmillLogs.reduce((acc, l) => acc + (Number(l.incline) || 0), 0) / treadmillLogs.length).toFixed(1)
    : 0;

  // 4. Gasto de Entrenamiento Total del día
  const totalTrainingBurnKcal = strengthCaloriesBurned + treadmillCaloriesBurned;

  // 5. Gasto Energético Total Diario (TDEE Real Dinámico)
  // Base sedentaria de oficina (BMR * 1.18) + gasto real medido en la sesión
  const bmr = calculateMifflinBMR(biometrics.currentWeightKg, biometrics.heightCm, biometrics.age, biometrics.gender);
  const sedentaryNeatBaseline = Math.round(bmr * 1.18);
  
  // Si entrenó hoy, TDEE Real = Sedentario + Entrenamiento; si no, base según perfil
  const realTdeeKcal = totalTrainingBurnKcal > 0
    ? sedentaryNeatBaseline + totalTrainingBurnKcal
    : Math.round(bmr * (userId === 'dionicio' ? 1.30 : 1.25));

  // 6. Balance Calórico Neto del Día
  // Ingesta - Gasto Real
  const netBalanceKcal = intakeTotals.calories > 0 
    ? intakeTotals.calories - realTdeeKcal 
    : 0; // Si no hay comidas registradas aún ese día

  const targetDeficitKcal = nutritionPlan.deficitKcal || (userId === 'dionicio' ? 760 : 400);
  // La meta neta esperada: si es déficit es -targetDeficitKcal
  const expectedNetKcal = -targetDeficitKcal;

  let balanceStatus = 'mantenimiento';
  if (intakeTotals.calories > 0) {
    if (netBalanceKcal < -150) {
      balanceStatus = 'deficit';
    } else if (netBalanceKcal > 150) {
      balanceStatus = 'superavit';
    } else {
      balanceStatus = 'mantenimiento';
    }
  }

  // Estimación de Grasa Diaria
  const estimatedDailyFatLossGrams = netBalanceKcal < 0 
    ? Math.round((Math.abs(netBalanceKcal) / KCAL_PER_KG_FAT) * 1000)
    : 0;
  const estimatedDailyWeightGainGrams = netBalanceKcal > 0
    ? Math.round((netBalanceKcal / KCAL_PER_KG_FAT) * 1000)
    : 0;

  return {
    userId,
    athleteName: userConfig.name,
    date: dateStr,
    hasNutritionLogged: dailyNutrition.length > 0,
    hasTrainingLogged: strengthLogs.length > 0 || treadmillLogs.length > 0,
    intake: {
      caloriesKcal: Math.round(intakeTotals.calories),
      proteinG: Math.round(intakeTotals.protein),
      carbsG: Math.round(intakeTotals.carbs),
      fatsG: Math.round(intakeTotals.fats),
      mealsCount: dailyNutrition.length,
      targetCaloriesKcal: nutritionPlan.targetCals
    },
    training: {
      hasStrength: strengthLogs.length > 0,
      hasTreadmill: treadmillLogs.length > 0,
      totalVolumeKg,
      totalSetsCount,
      strengthCaloriesBurned,
      muscleCategories,
      treadmillMinutes,
      treadmillCaloriesBurned,
      avgIncline,
      totalTrainingBurnKcal
    },
    energy: {
      bmr,
      sedentaryNeatBaseline,
      realTdeeKcal,
      targetMaintenanceKcal: nutritionPlan.tdee
    },
    balance: {
      netBalanceKcal,
      balanceStatus, // 'deficit' | 'mantenimiento' | 'superavit'
      expectedNetKcal,
      targetDeficitKcal,
      varianceKcal: netBalanceKcal - expectedNetKcal,
      estimatedDailyFatLossGrams,
      estimatedDailyWeightGainGrams
    }
  };
}

/**
 * Construye la auditoría de balance calórico semanal (últimos 7 días o semana completa)
 * con acumulados de déficit, grasa estimada perdida y proyección hacia metas de peso.
 */
export function getWeeklyCaloricAudit(userId, referenceDateStr = null, logs = [], nutritionLogs = [], householdId = 'hogar-dionicio-paula') {
  const refDate = referenceDateStr ? new Date(referenceDateStr + 'T12:00:00') : new Date();
  const biometrics = getAthleteBiometrics(userId, householdId);
  const nutritionPlan = calculateAthleteNutrition(userId, householdId);
  const userConfig = USERS[userId] || USERS.dionicio;

  // Generar los 7 días terminando en refDate
  const daysArray = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayOfWeek = DAY_NAMES_ES[d.getDay()];
    
    const daySummary = getDailyAthleteSummary(userId, dateStr, logs, nutritionLogs, householdId);
    daysArray.push({
      date: dateStr,
      dayOfWeek,
      ...daySummary
    });
  }

  // Filtrar días que tienen ingesta o datos registrados para promedios justos
  const daysWithData = daysArray.filter(d => d.hasNutritionLogged || d.hasTrainingLogged);
  const dataCount = Math.max(1, daysWithData.length);

  const totalIntakeKcal = daysArray.reduce((acc, d) => acc + d.intake.caloriesKcal, 0);
  const totalBurnedKcal = daysArray.reduce((acc, d) => acc + d.energy.realTdeeKcal, 0);
  const totalTrainingBurnKcal = daysArray.reduce((acc, d) => acc + d.training.totalTrainingBurnKcal, 0);
  const totalVolumeKg = daysArray.reduce((acc, d) => acc + d.training.totalVolumeKg, 0);
  const totalTreadmillMinutes = daysArray.reduce((acc, d) => acc + d.training.treadmillMinutes, 0);

  // Balance Neto Acumulado en los días auditados
  // Considera la diferencia entre ingesta real y gasto real
  // Si en días no registrados se estima que comieron según su meta o se evalúan solo los días con registro:
  let accumulatedNetBalanceKcal = 0;
  daysArray.forEach(d => {
    if (d.hasNutritionLogged) {
      accumulatedNetBalanceKcal += d.balance.netBalanceKcal;
    } else {
      // Si no registró comida en un día, calculamos con la meta teórica de déficit
      accumulatedNetBalanceKcal += d.balance.expectedNetKcal;
    }
  });

  const targetDailyDeficit = nutritionPlan.deficitKcal || (userId === 'dionicio' ? 760 : 400);
  const targetWeeklyDeficitKcal = targetDailyDeficit * 7;
  const targetWeeklyExpectedNet = -targetWeeklyDeficitKcal;

  // Pérdida o Ganancia de Tejido Adiposo Estimada Acumulada
  let estimatedFatLossKg = 0;
  let estimatedFatLossGrams = 0;
  let estimatedWeightGainKg = 0;

  if (accumulatedNetBalanceKcal < 0) {
    const deficitAbs = Math.abs(accumulatedNetBalanceKcal);
    estimatedFatLossKg = Number((deficitAbs / KCAL_PER_KG_FAT).toFixed(2));
    estimatedFatLossGrams = Math.round((deficitAbs / KCAL_PER_KG_FAT) * 1000);
  } else if (accumulatedNetBalanceKcal > 0) {
    estimatedWeightGainKg = Number((accumulatedNetBalanceKcal / KCAL_PER_KG_FAT).toFixed(2));
  }

  // Porcentaje de cumplimiento de la meta semanal
  const targetDeficitAbs = Math.abs(targetWeeklyDeficitKcal);
  const currentDeficitAbs = accumulatedNetBalanceKcal < 0 ? Math.abs(accumulatedNetBalanceKcal) : 0;
  const goalAchievementPct = targetDeficitAbs > 0 
    ? Math.min(150, Math.round((currentDeficitAbs / targetDeficitAbs) * 100))
    : 100;

  // Proyección de Peso a Mantenimiento o Meta
  const currentWeight = Number(biometrics.currentWeightKg) || (userId === 'dionicio' ? 86 : 63);
  const targetGoalWeight = userId === 'dionicio' ? 80.0 : 58.0;
  const weightToLoseKg = Math.max(0, Number((currentWeight - targetGoalWeight).toFixed(1)));
  
  const weeklyRateKg = estimatedFatLossKg > 0.1 ? estimatedFatLossKg : (targetWeeklyDeficitKcal / KCAL_PER_KG_FAT);
  const projectedWeeksRemaining = weeklyRateKg > 0.05 
    ? Math.max(1, Math.round(weightToLoseKg / weeklyRateKg))
    : 0;

  // Diagnóstico clínico del balance semanal
  let weeklyVerdict = {
    status: 'OPTIMAL_DEFICIT',
    badgeText: '🔥 Déficit Clínico Óptimo',
    badgeColor: 'emerald',
    title: 'Oxidación Acelerada de Grasa Visceral',
    message: `Has acumulado un déficit de ~${Math.abs(accumulatedNetBalanceKcal).toLocaleString()} kcal esta semana. Representa una pérdida estimada de ~${estimatedFatLossGrams}g de adiposidad pura sin comprometer la masa magra.`
  };

  if (accumulatedNetBalanceKcal < -6500) {
    weeklyVerdict = {
      status: 'AGGRESSIVE_DEFICIT',
      badgeText: '⚠️ Déficit Muy Agresivo',
      badgeColor: 'amber',
      title: 'Vigilar Ingesta Proteica',
      message: `El déficit acumulado supera las 6.500 kcal (~${estimatedFatLossGrams}g de grasa). Asegúrate de no recortar la proteína mínima (${nutritionPlan.targetProtein}g) para proteger la musculatura.`
    };
  } else if (accumulatedNetBalanceKcal > -1000 && accumulatedNetBalanceKcal <= 500) {
    weeklyVerdict = {
      status: 'NEAR_MAINTENANCE',
      badgeText: '🛡️ En Mantenimiento',
      badgeColor: 'sky',
      title: 'Pausa Metabólica / Recomposición',
      message: `El balance neto semanal está cercano a cero (${accumulatedNetBalanceKcal > 0 ? '+' : ''}${accumulatedNetBalanceKcal} kcal). Excelente para diet break o consolidar adaptaciones de fuerza.`
    };
  } else if (accumulatedNetBalanceKcal > 500) {
    weeklyVerdict = {
      status: 'SURPLUS',
      badgeText: '⚡ Superávit Calórico',
      badgeColor: 'indigo',
      title: 'Estímulo de Hipertrofia',
      message: `Balance positivo de +${accumulatedNetBalanceKcal} kcal. Ideal si buscas construir tejido muscular, vigilando que la cintura no se expanda.`
    };
  }

  return {
    userId,
    athleteName: userConfig.name,
    currentWeightKg: currentWeight,
    targetGoalWeightKg: targetGoalWeight,
    weightToLoseKg,
    projectedWeeksRemaining,
    weeklyTotals: {
      totalIntakeKcal,
      totalBurnedKcal,
      totalTrainingBurnKcal,
      totalVolumeKg,
      totalTreadmillMinutes,
      accumulatedNetBalanceKcal,
      targetWeeklyDeficitKcal,
      targetWeeklyExpectedNet,
      goalAchievementPct
    },
    fatLossEstimation: {
      estimatedFatLossKg,
      estimatedFatLossGrams,
      estimatedWeightGainKg,
      kcalPerKgFat: KCAL_PER_KG_FAT
    },
    weeklyVerdict,
    days: daysArray
  };
}
