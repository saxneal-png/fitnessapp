import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getLocalLogs, 
  getLocalWeightEntries, 
  saveWeightEntry, 
  subscribeToHouseholdData, 
  subscribeToNutritionLogs 
} from '../firebase/config';

import { WORKOUT_DAYS, USERS } from '../data/workoutCatalog';
import { getLocalDateString, formatShortDate } from '../utils/dateUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  Flame, 
  Dumbbell, 
  Footprints, 
  Award, 
  Calendar, 
  Scale, 
  Plus, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Inbox, 
  Apple, 
  Utensils, 
  Dna, 
  Target, 
  TrendingDown, 
  Activity, 
  Layers, 
  Zap, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { calculateAthleteNutrition, getAthleteBiometrics } from '../services/nutritionCalculator';
import { BiometricsModal } from './BiometricsModal';
import { getWeeklyCaloricAudit, getDailyAthleteSummary } from '../services/caloricBalanceService';
import { EXERCISE_MUSCLE_CATEGORIES } from '../services/adaptiveWorkoutService';

export function Dashboard() {
  const { householdId, currentUser, isDuoHousehold, userProfile, allUsers } = useAuth();
  const [logs, setLogs] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [selectedExerciseForTrend, setSelectedExerciseForTrend] = useState('floor_press');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  const [newWeight, setNewWeight] = useState({ userId: currentUser || 'dionicio', date: getLocalDateString(), weightKg: 80.0 });

  // Estado para el Registro Semanal y Categorías Diarias
  const [balanceAthlete, setBalanceAthlete] = useState(currentUser || 'dionicio');
  const [selectedSummaryDate, setSelectedSummaryDate] = useState(() => getLocalDateString());

  useEffect(() => {
    // Real-time Firestore subscription with local fallback
    const unsubscribe = subscribeToHouseholdData(
      householdId,
      (updatedLogs) => setLogs(updatedLogs),
      (updatedWeights) => setWeightEntries(updatedWeights)
    );

    const unsubNutrition = subscribeToNutritionLogs(householdId, (updatedNutrition) => {
      setNutritionLogs(updatedNutrition);
    });

    return () => {
      unsubscribe();
      unsubNutrition();
    };
  }, [householdId]);

  useEffect(() => {
    if (currentUser) {
      setBalanceAthlete(currentUser);
    }
  }, [currentUser]);

  // Auditoría Semanal de Balance Calórico para el atleta seleccionado
  const weeklyAudit = getWeeklyCaloricAudit(balanceAthlete, selectedSummaryDate, logs, nutritionLogs, householdId);

  // Resumen del día seleccionado (Categorías musculares, gasto y balance)
  const dailySummary = getDailyAthleteSummary(balanceAthlete, selectedSummaryDate, logs, nutritionLogs, householdId);

  const relevantLogs = isDuoHousehold ? logs : logs.filter(l => l.userId === currentUser);
  const relevantWeights = isDuoHousehold ? weightEntries : weightEntries.filter(w => w.userId === currentUser);
  const relevantNutrition = isDuoHousehold ? nutritionLogs : nutritionLogs.filter(n => n.userId === currentUser);

  // Aggregate Volume by Date
  const volumeByDateMap = {};
  relevantLogs.filter(l => l.type === 'strength').forEach(l => {
    const d = l.date;
    if (!volumeByDateMap[d]) {
      volumeByDateMap[d] = { date: d, dionicioVolume: 0, paulaVolume: 0, userVolume: 0, totalVolume: 0 };
    }
    if (l.userId === 'dionicio') {
      volumeByDateMap[d].dionicioVolume += (l.totalVolumeKg || 0);
    } else if (l.userId === 'paula') {
      volumeByDateMap[d].paulaVolume += (l.totalVolumeKg || 0);
    }
    if (l.userId === currentUser) {
      volumeByDateMap[d].userVolume += (l.totalVolumeKg || 0);
    }
    volumeByDateMap[d].totalVolume += (l.totalVolumeKg || 0);
  });
  const volumeChartData = Object.values(volumeByDateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Exercise Max Weight Progression Trend
  const exerciseLogs = relevantLogs.filter(l => l.type === 'strength' && l.exerciseId === selectedExerciseForTrend);
  const exerciseTrendMap = {};
  exerciseLogs.forEach(l => {
    const d = l.date;
    const maxWeight = Math.max(...(l.sets?.map(s => s.weightKg) || [0]));
    if (!exerciseTrendMap[d]) {
      exerciseTrendMap[d] = { date: d, dionicioMax: null, paulaMax: null, userMax: null };
    }
    if (l.userId === 'dionicio') exerciseTrendMap[d].dionicioMax = maxWeight;
    if (l.userId === 'paula') exerciseTrendMap[d].paulaMax = maxWeight;
    if (l.userId === currentUser) exerciseTrendMap[d].userMax = maxWeight;
  });
  const exerciseTrendData = Object.values(exerciseTrendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate Nutrition / Calories by Date
  const caloriesByDateMap = {};
  relevantNutrition.forEach(n => {
    const d = n.date || (n.timestamp ? getLocalDateString(n.timestamp) : '');
    if (!d) return;
    if (!caloriesByDateMap[d]) {
      caloriesByDateMap[d] = { date: d, dionicioCals: 0, paulaCals: 0, userCals: 0, totalCals: 0 };
    }
    if (n.userId === 'dionicio') caloriesByDateMap[d].dionicioCals += (Number(n.caloriesKcal) || 0);
    if (n.userId === 'paula') caloriesByDateMap[d].paulaCals += (Number(n.caloriesKcal) || 0);
    if (n.userId === currentUser) caloriesByDateMap[d].userCals += (Number(n.caloriesKcal) || 0);
    caloriesByDateMap[d].totalCals += (Number(n.caloriesKcal) || 0);
  });
  const caloriesChartData = Object.values(caloriesByDateMap).sort((a, b) => a.date.localeCompare(b.date));
  const totalCaloriesLogged = relevantNutrition.reduce((acc, n) => acc + (Number(n.caloriesKcal) || 0), 0);

  // Total KPIs
  const totalHouseholdVolume = relevantLogs.filter(l => l.type === 'strength').reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  const totalCaloriesBurned = relevantLogs.filter(l => l.type === 'treadmill').reduce((acc, l) => acc + (l.activeCaloriesKcal || 0), 0);
  const totalSessions = relevantLogs.length;

  const handleAddWeight = async (e) => {
    e.preventDefault();
    await saveWeightEntry(newWeight, householdId);
    setShowWeightModal(false);
  };

  // Combine weight entries by date
  const weightChartMap = {};
  relevantWeights.forEach(w => {
    if (!weightChartMap[w.date]) {
      weightChartMap[w.date] = { date: w.date, dionicioWeight: null, paulaWeight: null, userWeight: null };
    }
    if (w.userId === 'dionicio') weightChartMap[w.date].dionicioWeight = w.weightKg;
    if (w.userId === 'paula') weightChartMap[w.date].paulaWeight = w.weightKg;
    if (w.userId === currentUser) weightChartMap[w.date].userWeight = w.weightKg;
  });
  const weightChartData = Object.values(weightChartMap).sort((a, b) => a.date.localeCompare(b.date));

  // Preparar datos para el gráfico de balance semanal
  const weeklyChartData = weeklyAudit.days.map(d => ({
    date: d.dayOfWeek,
    fullDate: d.date,
    ingesta: d.intake.caloriesKcal,
    gastoTotal: d.energy.realTdeeKcal,
    balanceNeto: d.balance.netBalanceKcal,
    entrenamiento: d.training.totalTrainingBurnKcal
  }));

  const isDionicio = balanceAthlete === 'dionicio';

  return (
    <div className="space-y-6">
      {/* Header & Global Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <h2 className="text-2xl font-black text-white">
              {isDuoHousehold ? 'Dashboard Combinado del Hogar' : 'Mi Dashboard Personal'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isDuoHousehold ? (
              <>Estadísticas consolidadas de <strong>Dionicio</strong> y <strong>Paula</strong> con cálculo de gasto real y balance calórico.</>
            ) : (
              <>Estadísticas de <strong>{userProfile?.name || 'tu cuenta'}</strong> con progreso y balance calórico individual.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBiometricsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gym-800 hover:bg-gym-700 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Diagnóstico metabólico clínico: Mifflin-St Jeor, TDEE y ajuste calórico"
          >
            <Dna className="w-4 h-4 text-sky-400" />
            <span>🧬 Perfil Biométrico & Metas</span>
          </button>

          <button
            onClick={() => setShowWeightModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gym-800 hover:bg-gym-700 text-slate-200 border border-gym-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Registrar Peso</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Carga Acumulada</span>
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalHouseholdVolume.toLocaleString()} <span className="text-sm font-sans font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[11px] text-sky-400 mt-1">
            {isDuoHousehold ? 'Volumen total movido por la pareja' : 'Volumen total acumulado'}
          </p>
        </div>

        {/* Active Calories Burned (Treadmill) */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Quemadas Cardio</span>
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalCaloriesBurned.toLocaleString()} <span className="text-sm font-sans font-normal text-slate-400">kcal</span>
          </div>
          <p className="text-[11px] text-pink-400 mt-1">Gasto activo en trotadora</p>
        </div>

        {/* Nutrition Logged Calories */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Calorías Ingeridas</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Apple className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalCaloriesLogged.toLocaleString()} <span className="text-sm font-sans font-normal text-slate-400">kcal</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">{nutritionLogs.length} comidas registradas en BD</p>
        </div>

        {/* Sessions Completed */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Sesiones Totales</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalSessions} <span className="text-sm font-sans font-normal text-slate-400">bloques</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1">Constancia dúo 19:00 - 20:00</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 1: AUDITORÍA SEMANAL DE BALANCE CALÓRICO & GRASA ESTIMADA */}
      {/* ============================================================== */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gym-700/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white">
                Registro Semanal: Déficit, Mantenimiento & Grasa Estimada
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Balance acumulado entre calorías ingeridas y gasto energético real diario (BMR + Pesas + Trotadora).
            </p>
          </div>

          {/* Selector de Atleta para la Auditoría */}
          <div className="flex items-center gap-2">
            {isDuoHousehold ? (
              <div className="bg-gym-900 border border-gym-700 rounded-xl p-1 flex items-center">
                <button
                  onClick={() => setBalanceAthlete('dionicio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    balanceAthlete === 'dionicio'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>👨‍💻 Dionicio</span>
                </button>
                <button
                  onClick={() => setBalanceAthlete('paula')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    balanceAthlete === 'paula'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>👩‍💼 Paula</span>
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-gym-900 border border-gym-700 text-xs font-bold text-sky-400 flex items-center gap-1.5 shadow-sm">
                <span>{userProfile?.avatar || '🏋️‍♂️'}</span>
                <span>{userProfile?.name || 'Mi Perfil'}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 KPIs Clave del Balance Semanal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Balance Neto Acumulado */}
          <div className="p-4 rounded-2xl bg-gym-900/80 border border-gym-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Balance Semanal</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${weeklyAudit.weeklyVerdict.badgeColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400'}`}>
                {weeklyAudit.weeklyTotals.accumulatedNetBalanceKcal < 0 ? 'Déficit' : 'Superávit'}
              </span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${weeklyAudit.weeklyTotals.accumulatedNetBalanceKcal < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {weeklyAudit.weeklyTotals.accumulatedNetBalanceKcal > 0 ? '+' : ''}
              {weeklyAudit.weeklyTotals.accumulatedNetBalanceKcal.toLocaleString()}
              <span className="text-sm font-sans font-normal text-slate-400 ml-1">kcal</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Meta semanal: <strong>{weeklyAudit.weeklyTotals.targetWeeklyExpectedNet.toLocaleString()} kcal</strong> ({weeklyAudit.weeklyTotals.goalAchievementPct}% cumplido)
            </p>
          </div>

          {/* 2. Pérdida de Grasa Estimada */}
          <div className="p-4 rounded-2xl bg-gym-900/80 border border-emerald-500/30 space-y-1 bg-gradient-to-br from-gym-900 via-gym-900 to-emerald-950/20">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                Grasa Estimada Perdida
              </span>
              <span className="text-[10px] font-mono text-emerald-400">7.700 kcal = 1kg</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              -{weeklyAudit.fatLossEstimation.estimatedFatLossKg}
              <span className="text-sm font-sans font-normal text-slate-300 ml-1">kg</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Equivalente a <strong>~{weeklyAudit.fatLossEstimation.estimatedFatLossGrams} g</strong> de adiposidad pura reducida
            </p>
          </div>

          {/* 3. Proyección a Peso Meta / Mantenimiento */}
          <div className="p-4 rounded-2xl bg-gym-900/80 border border-gym-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Meta de Peso</span>
              <span className="text-[10px] font-mono text-sky-400">Actual: {weeklyAudit.currentWeightKg} kg</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {weeklyAudit.targetGoalWeightKg}
              <span className="text-sm font-sans font-normal text-slate-400 ml-1">kg meta</span>
            </div>
            <p className="text-[11px] text-sky-400">
              Resta: <strong>{weeklyAudit.weightToLoseKg} kg</strong> • Ritmo: ~{weeklyAudit.projectedWeeksRemaining} semanas
            </p>
          </div>

          {/* 4. Gasto Total en Entrenamientos */}
          <div className="p-4 rounded-2xl bg-gym-900/80 border border-gym-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Gasto Entrenamientos</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {weeklyAudit.weeklyTotals.totalTrainingBurnKcal.toLocaleString()}
              <span className="text-sm font-sans font-normal text-slate-400 ml-1">kcal</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {weeklyAudit.weeklyTotals.totalVolumeKg.toLocaleString()} kg en pesas + {weeklyAudit.weeklyTotals.totalTreadmillMinutes}m trotadora
            </p>
          </div>
        </div>

        {/* Banner de Diagnóstico Semanal */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-gym-900 via-gym-800 to-gym-900 border border-gym-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm flex items-center gap-2">
                <span>{weeklyAudit.weeklyVerdict.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  {weeklyAudit.weeklyVerdict.badgeText}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                {weeklyAudit.weeklyVerdict.message}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Balance Diario Semanal: Ingesta vs Gasto Real vs Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-extrabold text-white flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Comparativa Diaria de la Semana (Ingesta vs Gasto Real vs Balance Neto)</span>
            </h4>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">Ingesta (kcal)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-slate-300">Gasto TDEE (kcal)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full bg-gym-900/60 rounded-2xl p-2 border border-gym-700/60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="ingesta" name="Comida Ingerida (kcal)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastoTotal" name="Gasto Total Real (kcal)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla Desglosada Día por Día de la Semana */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
            Detalle Diario de los Últimos 7 Días — {allUsers[balanceAthlete]?.name || userProfile?.name || 'Atleta'}
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-gym-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-gym-900/90 text-slate-400 font-bold border-b border-gym-700">
                <tr>
                  <th className="py-2.5 px-3">Día</th>
                  <th className="py-2.5 px-3">Ingesta (kcal)</th>
                  <th className="py-2.5 px-3">Gasto Real (kcal)</th>
                  <th className="py-2.5 px-3">Balance Neto</th>
                  <th className="py-2.5 px-3">Grasa Est.</th>
                  <th className="py-2.5 px-3">Pesas (kg)</th>
                  <th className="py-2.5 px-3">Trotadora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-700/60 font-mono text-[11px]">
                {weeklyAudit.days.map((d) => {
                  const isDeficit = d.balance.netBalanceKcal < 0;
                  return (
                    <tr 
                      key={d.date} 
                      className={`hover:bg-gym-700/30 transition-all ${
                        d.date === selectedSummaryDate ? 'bg-gym-700/50 text-white font-bold' : 'text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3 font-sans">
                        <button
                          onClick={() => setSelectedSummaryDate(d.date)}
                          className="hover:text-sky-400 flex items-center gap-1 text-left"
                        >
                          <span className="font-bold text-white">{d.dayOfWeek}</span>
                          <span className="text-slate-500 text-[10px]">({formatShortDate(d.date)})</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        {d.intake.caloriesKcal > 0 ? `${d.intake.caloriesKcal} kcal` : '—'}
                      </td>
                      <td className="py-2 px-3 text-rose-300">
                        {d.energy.realTdeeKcal} kcal
                      </td>
                      <td className={`py-2 px-3 font-bold ${isDeficit ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {d.balance.netBalanceKcal > 0 ? '+' : ''}{d.balance.netBalanceKcal} kcal
                      </td>
                      <td className="py-2 px-3 text-emerald-300">
                        {d.balance.estimatedDailyFatLossGrams > 0 ? `-${d.balance.estimatedDailyFatLossGrams} g` : '—'}
                      </td>
                      <td className="py-2 px-3 text-sky-300">
                        {d.training.totalVolumeKg > 0 ? `${d.training.totalVolumeKg} kg` : '—'}
                      </td>
                      <td className="py-2 px-3 text-pink-300">
                        {d.training.treadmillMinutes > 0 ? `${d.training.treadmillMinutes}m (${d.training.treadmillCaloriesBurned} kcal)` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 2: CATEGORÍAS TOTALES & GASTO DEL DÍA SELECCIONADO      */}
      {/* ============================================================== */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gym-700/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white">
                Categorías Totales del Día & Desglose Energético
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Grupos musculares trabajados, volumen por categoría y balance energético para la fecha seleccionada.
            </p>
          </div>

          {/* Selector de Fecha y Atleta */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedSummaryDate}
              onChange={(e) => setSelectedSummaryDate(e.target.value)}
              className="bg-gym-900 border border-gym-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
            />
            <button
              onClick={() => setSelectedSummaryDate(getLocalDateString())}
              className="px-2.5 py-1.5 bg-gym-700 hover:bg-gym-600 text-slate-200 text-xs font-bold rounded-xl transition-all"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Resumen del Día: Tarjetas de Categorías y Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna 1 y 2: Categorías Musculares Trabajadas */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-sky-400" />
                <span>Grupos Musculares & Categorías Trabajadas Hoy</span>
              </h4>
              <span className="text-xs font-mono text-slate-400">
                Volumen total: <strong className="text-white">{dailySummary.training.totalVolumeKg} kg</strong>
              </span>
            </div>

            {dailySummary.training.muscleCategories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dailySummary.training.muscleCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-gym-900/80 border border-gym-700/80 space-y-2 hover:border-sky-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-sky-400">
                        {cat.categoryName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                        {cat.totalSets} series
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black font-mono text-white">
                        {cat.totalVolumeKg.toLocaleString()} <span className="text-xs font-sans text-slate-400">kg</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Máx: {cat.maxWeightKg} kg
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-gym-800 pt-1.5 space-y-0.5">
                      {cat.exercises.map((ex, eIdx) => (
                        <div key={eIdx} className="flex justify-between text-[10px]">
                          <span className="text-slate-300 truncate">{ex.exerciseName}</span>
                          <span className="text-slate-400 font-mono">{ex.setsCount} series ({ex.volumeKg}kg)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-gym-900/50 border border-dashed border-gym-700 text-center space-y-2">
                <Dumbbell className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-slate-400 font-mono">
                  Sin ejercicios de fuerza registrados en {formatShortDate(selectedSummaryDate)}.
                </p>
                <p className="text-[11px] text-slate-500">
                  Registra tus series en la pestaña <strong>Entrenar</strong> para categorizar el volumen.
                </p>
              </div>
            )}

            {/* Fila Trotadora si existe ese día */}
            {dailySummary.training.hasTreadmill && (
              <div className="p-3.5 rounded-2xl bg-pink-950/20 border border-pink-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                    <Footprints className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Cardio Trotadora Zona 2</h5>
                    <p className="text-[11px] text-slate-300 font-mono">
                      {dailySummary.training.treadmillMinutes} min • Inclinación: {dailySummary.training.avgIncline}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-black text-pink-400 text-base">
                    {dailySummary.training.treadmillCaloriesBurned} kcal
                  </div>
                  <span className="text-[10px] text-slate-400">quemadas en cardio</span>
                </div>
              </div>
            )}
          </div>

          {/* Columna 3: Balance Energético del Día */}
          <div className="p-4 rounded-2xl bg-gym-900/90 border border-gym-700 space-y-4">
            <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Balance Energético de la Fecha</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gym-800">
                <span className="text-slate-400">Metabolismo Basal (BMR):</span>
                <span className="font-mono text-white font-bold">{dailySummary.energy.bmr} kcal</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gym-800">
                <span className="text-slate-400">Gasto Pesas ({dailySummary.training.totalVolumeKg}kg):</span>
                <span className="font-mono text-sky-400 font-bold">+{dailySummary.training.strengthCaloriesBurned} kcal</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gym-800">
                <span className="text-slate-400">Gasto Trotadora:</span>
                <span className="font-mono text-pink-400 font-bold">+{dailySummary.training.treadmillCaloriesBurned} kcal</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gym-800">
                <span className="text-white font-bold">Gasto Total Real (TDEE):</span>
                <span className="font-mono text-rose-400 font-bold">{dailySummary.energy.realTdeeKcal} kcal</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gym-800">
                <span className="text-slate-400">Comida Ingerida:</span>
                <span className="font-mono text-emerald-400 font-bold">{dailySummary.intake.caloriesKcal} kcal</span>
              </div>
            </div>

            {/* Resultado Neto */}
            <div className="p-3 rounded-xl bg-gym-800 border border-gym-700 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Neto del Día</span>
              <div className={`text-2xl font-black font-mono ${dailySummary.balance.netBalanceKcal < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {dailySummary.balance.netBalanceKcal > 0 ? '+' : ''}{dailySummary.balance.netBalanceKcal} kcal
              </div>
              {dailySummary.balance.estimatedDailyFatLossGrams > 0 && (
                <p className="text-[11px] text-emerald-400 font-bold">
                  🔥 ~{dailySummary.balance.estimatedDailyFatLossGrams}g grasa corporal oxidada hoy
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Clean State Welcome Card if 0 logs */}
      {totalSessions === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/40 via-gym-800 to-pink-950/40 border border-gym-700 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-pink-500 p-0.5 mx-auto">
            <div className="w-full h-full bg-gym-900 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <h3 className="text-lg font-extrabold text-white">
            {isDuoHousehold
              ? '¡Todo listo para su primer entrenamiento en vivo (19:00 a 20:00)!'
              : `¡Todo listo para tu primer entrenamiento, ${userProfile?.name || 'atleta'}!`}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            {isDuoHousehold
              ? 'La base de datos está lista para producción. Cuando completen su primera sesión de hoy con mancuernas o trotadora, los gráficos y métricas del hogar se sincronizarán aquí automáticamente.'
              : 'La base de datos está lista. En cuanto registres tu primera serie de pesas o sesión de cardio, tus métricas individuales y sobrecarga progresiva aparecerán aquí.'}
          </p>
        </div>
      )}

      {/* Chart 1: Combined Volume Over Time */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <span>Volumen de Entrenamiento por Sesión (kg x reps)</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isDuoHousehold
                ? 'Comparativa de volumen total movido en cada fecha por Dionicio y Paula.'
                : `Evolución del tonelaje movido en cada sesión por ${userProfile?.name || 'tu cuenta'}.`}
            </p>
          </div>
          {isDuoHousehold && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span className="text-slate-300">Dionicio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                <span className="text-slate-300">Paula</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-72 w-full">
          {volumeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                {isDuoHousehold ? (
                  <>
                    <Bar dataKey="dionicioVolume" name="Dionicio (kg)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paulaVolume" name="Paula (kg)" fill="#f472b6" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="userVolume" name={`${userProfile?.name || 'Mi Volumen'} (kg)`} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
              <Inbox className="w-8 h-8 opacity-40" />
              <span className="text-xs font-mono">Sin registros aún. ¡Aparecerán tras guardar su primera serie!</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Exercise Trend & Bodyweight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Exercise Max Weight Progression */}
        <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-sky-400" />
              <span>Sobrecarga en Ejercicio</span>
            </h3>
            <select
              value={selectedExerciseForTrend}
              onChange={(e) => setSelectedExerciseForTrend(e.target.value)}
              className="bg-gym-900 border border-gym-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="floor_press">Floor press con mancuernas</option>
              <option value="goblet_squat">Goblet squat</option>
              <option value="peso_muerto_rumano">Peso muerto rumano</option>
              <option value="remo_unilateral">Remo unilateral</option>
              <option value="press_militar">Press militar</option>
            </select>
          </div>

          <div className="h-64 w-full">
            {exerciseTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                  />
                  {isDuoHousehold ? (
                    <>
                      <Line type="monotone" dataKey="dionicioMax" name="Dionicio (kg)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="paulaMax" name="Paula (kg)" stroke="#f472b6" strokeWidth={3} dot={{ r: 5 }} />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="userMax" name={`${userProfile?.name || 'Carga Máx'} (kg)`} stroke="#38bdf8" strokeWidth={3} dot={{ r: 5 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                <Dumbbell className="w-7 h-7 opacity-30" />
                <span className="text-xs font-mono">El gráfico trazará la sobrecarga con sus primeros registros.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Bodyweight Progression */}
        <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Progreso de Peso Corporal (kg)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Registro Semanal</span>
          </div>

          <div className="h-64 w-full">
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                  />
                  {isDuoHousehold ? (
                    <>
                      <Line type="monotone" dataKey="dionicioWeight" name="Dionicio (kg)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                      <Line type="monotone" dataKey="paulaWeight" name="Paula (kg)" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="userWeight" name={`${userProfile?.name || 'Peso'} (kg)`} stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Scale className="w-7 h-7 opacity-30" />
                <span className="text-xs font-mono">Sin peso corporal registrado aún.</span>
                <button
                  onClick={() => setShowWeightModal(true)}
                  className="px-3 py-1 bg-gym-700 hover:bg-gym-600 text-slate-300 rounded-lg text-[11px] font-bold"
                >
                  + Registrar peso inicial
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart 4: Caloric Intake Comparison */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>Consumo Calórico Diario (kcal)</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isDuoHousehold
                ? 'Historial de calorías registradas por Dionicio y Paula'
                : `Historial de calorías registradas por ${userProfile?.name || 'tu cuenta'}`}
            </p>
          </div>
          {isDuoHousehold && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                <span className="text-slate-300">Dionicio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                <span className="text-slate-300">Paula</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-64 w-full">
          {caloriesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caloriesChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                {isDuoHousehold ? (
                  <>
                    <Bar dataKey="dionicioCals" name="Dionicio (kcal)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paulaCals" name="Paula (kcal)" fill="#f472b6" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <Bar dataKey="userCals" name={`${userProfile?.name || 'Calorías'} (kcal)`} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Apple className="w-8 h-8 opacity-30 text-amber-400" />
              <span className="text-xs font-mono">Sin comidas registradas en este período.</span>
              <span className="text-[11px] text-slate-400">
                Usa el diario en Nutrición o habla con el Coach Gemini para ingresar tus platos.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Bodyweight Entry */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-gym-800 border border-gym-700 rounded-2xl p-4 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Registrar Peso Corporal</span>
              </h4>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWeight} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usuario</label>
                {isDuoHousehold ? (
                  <select
                    value={newWeight.userId}
                    onChange={(e) => setNewWeight({ ...newWeight, userId: e.target.value })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="dionicio">👨‍💻 Dionicio</option>
                    <option value="paula">👩‍💼 Paula</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={userProfile?.name || 'Mi Perfil'}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-slate-300 font-bold opacity-80"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={newWeight.date}
                  onChange={(e) => setNewWeight({ ...newWeight, date: e.target.value })}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight.weightKg}
                  onChange={(e) => setNewWeight({ ...newWeight, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-2 rounded-xl bg-gym-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gym-900 text-xs font-black"
                >
                  Guardar en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuración y Diagnóstico Biométrico */}
      <BiometricsModal
        isOpen={showBiometricsModal}
        onClose={() => setShowBiometricsModal(false)}
        householdId={householdId}
        initialAthlete={currentUser || 'dionicio'}
        onSaved={() => {}}
      />
    </div>
  );
}
