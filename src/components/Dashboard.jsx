import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalLogs, getLocalWeightEntries, saveLocalWeightEntries } from '../firebase/config';
import { WORKOUT_DAYS, USERS } from '../data/workoutCatalog';
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
  CartesianGrid,
  AreaChart,
  Area
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
  Activity
} from 'lucide-react';

export function Dashboard() {
  const { householdId, currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [selectedExerciseForTrend, setSelectedExerciseForTrend] = useState('floor_press');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState({ userId: 'dionicio', date: new Date().toISOString().split('T')[0], weightKg: 83.0 });

  useEffect(() => {
    setLogs(getLocalLogs(householdId));
    setWeightEntries(getLocalWeightEntries(householdId));
  }, [householdId]);

  // Aggregate Volume by Week / Date
  const volumeByDateMap = {};
  logs.filter(l => l.type === 'strength').forEach(l => {
    const d = l.date;
    if (!volumeByDateMap[d]) {
      volumeByDateMap[d] = { date: d, dionicioVolume: 0, paulaVolume: 0, totalVolume: 0 };
    }
    if (l.userId === 'dionicio') {
      volumeByDateMap[d].dionicioVolume += (l.totalVolumeKg || 0);
    } else {
      volumeByDateMap[d].paulaVolume += (l.totalVolumeKg || 0);
    }
    volumeByDateMap[d].totalVolume += (l.totalVolumeKg || 0);
  });

  const volumeChartData = Object.values(volumeByDateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Exercise Max Weight Progression Trend
  const exerciseLogs = logs.filter(l => l.type === 'strength' && l.exerciseId === selectedExerciseForTrend);
  const exerciseTrendMap = {};
  exerciseLogs.forEach(l => {
    const d = l.date;
    const maxWeight = Math.max(...(l.sets?.map(s => s.weightKg) || [0]));
    if (!exerciseTrendMap[d]) {
      exerciseTrendMap[d] = { date: d, dionicioMax: null, paulaMax: null };
    }
    if (l.userId === 'dionicio') {
      exerciseTrendMap[d].dionicioMax = maxWeight;
    } else {
      exerciseTrendMap[d].paulaMax = maxWeight;
    }
  });
  const exerciseTrendData = Object.values(exerciseTrendMap).sort((a, b) => a.date.localeCompare(b.date));

  // Treadmill Cardio Data
  const treadmillLogs = logs.filter(l => l.type === 'treadmill').map(l => ({
    date: l.date,
    user: l.userId === 'dionicio' ? 'Dionicio' : 'Paula',
    calories: l.activeCaloriesKcal,
    incline: l.incline,
    speed: l.avgSpeedKmH,
    hr: l.avgHeartRateBpm,
    label: `${l.date} (${l.userId === 'dionicio' ? 'D' : 'P'})`
  }));

  // Total KPIs
  const totalHouseholdVolume = logs.filter(l => l.type === 'strength').reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
  const totalCaloriesBurned = logs.filter(l => l.type === 'treadmill').reduce((acc, l) => acc + (l.activeCaloriesKcal || 0), 0);
  const totalSessions = logs.length;

  const handleAddWeight = (e) => {
    e.preventDefault();
    const updated = [...weightEntries, { ...newWeight, id: `w-${Date.now()}` }];
    setWeightEntries(updated);
    saveLocalWeightEntries(updated, householdId);
    setShowWeightModal(false);
  };

  // Combine weight entries by date
  const weightChartMap = {};
  weightEntries.forEach(w => {
    if (!weightChartMap[w.date]) {
      weightChartMap[w.date] = { date: w.date, dionicioWeight: null, paulaWeight: null };
    }
    if (w.userId === 'dionicio') {
      weightChartMap[w.date].dionicioWeight = w.weightKg;
    } else {
      weightChartMap[w.date].paulaWeight = w.weightKg;
    }
  });
  const weightChartData = Object.values(weightChartMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Header & Global Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <h2 className="text-2xl font-black text-white">Dashboard Combinado del Hogar</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Estadísticas consolidadas de <strong>Dionicio</strong> y <strong>Paula</strong> sin mezclar registros individuales.
          </p>
        </div>

        <button
          onClick={() => setShowWeightModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gym-800 hover:bg-gym-700 text-slate-200 border border-gym-700 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>Registrar Peso Corporal</span>
        </button>
      </div>

      {/* KPI Cards */}
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
          <p className="text-[11px] text-sky-400 mt-1">Volumen total movido por la pareja</p>
        </div>

        {/* Active Calories */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Calorías Trotadora</span>
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalCaloriesBurned.toLocaleString()} <span className="text-sm font-sans font-normal text-slate-400">kcal</span>
          </div>
          <p className="text-[11px] text-pink-400 mt-1">Apple Watch Series 8 sync</p>
        </div>

        {/* Sessions Completed */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Sesiones Registradas</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalSessions} <span className="text-sm font-sans font-normal text-slate-400">series/bloques</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Constancia 19:00 - 20:00</p>
        </div>

        {/* RPE & Intensity */}
        <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Sobrecarga Media</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            RPE 8.2 <span className="text-sm font-sans font-normal text-slate-400">/ 10</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1">Zona óptima de hipertrofia</p>
        </div>
      </div>

      {/* Chart 1: Combined Volume Over Time */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <span>Volumen de Entrenamiento por Sesión (kg x reps)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Comparativa de volumen total movido en cada fecha por Dionicio y Paula.
            </p>
          </div>
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
                <Bar dataKey="dionicioVolume" name="Dionicio (kg)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paulaVolume" name="Paula (kg)" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              Sin suficientes registros de fuerza para graficar.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Exercise Trend & Treadmill Stats */}
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
              <option value="floor_press">Floor press</option>
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
                  <Line type="monotone" dataKey="dionicioMax" name="Dionicio (kg)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="paulaMax" name="Paula (kg)" stroke="#f472b6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                Registra cargas en este ejercicio para ver la progresión.
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
            <span className="text-[11px] text-slate-400 font-mono">Últimas 4 semanas</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="dionicioWeight" name="Dionicio (kg)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="paulaWeight" name="Paula (kg)" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal for Bodyweight Entry */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gym-800 border border-gym-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
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
                <select
                  value={newWeight.userId}
                  onChange={(e) => setNewWeight({ ...newWeight, userId: e.target.value })}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="dionicio">👨‍💻 Dionicio</option>
                  <option value="paula">👩‍💼 Paula</option>
                </select>
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
