import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WORKOUT_DAYS, USERS } from '../data/workoutCatalog';
import { saveWorkoutLog, subscribeToHouseholdData } from '../firebase/config';
import { getPreExerciseAdvice, getLiveSetFeedback, getStoredGeminiKey } from '../services/geminiService';
import { 
  Dumbbell, 
  Footprints, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Clock, 
  Flame, 
  Heart, 
  Sparkles,
  ChevronRight,
  Bot,
  Zap,
  Info,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function WorkoutLogger() {
  const { currentUser, householdId } = useAuth();
  
  const [logType, setLogType] = useState('strength'); // 'strength' or 'treadmill'
  const [selectedDay, setSelectedDay] = useState('torso'); // 'torso' or 'pierna_core'
  const [selectedExerciseId, setSelectedExerciseId] = useState('floor_press');
  const [workoutDate, setWorkoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const currentWorkoutDay = WORKOUT_DAYS.find(d => d.id === selectedDay) || WORKOUT_DAYS[0];
  const currentExercise = currentWorkoutDay.exercises.find(e => e.id === selectedExerciseId) || currentWorkoutDay.exercises[0];

  const defaultWeight = currentUser === 'dionicio' ? currentExercise.defaultWeightDionicio : currentExercise.defaultWeightPaula;

  const [sets, setSets] = useState([
    { setNumber: 1, weightKg: defaultWeight, reps: 10, rpe: 7.5 },
    { setNumber: 2, weightKg: defaultWeight, reps: 10, rpe: 8 },
    { setNumber: 3, weightKg: defaultWeight, reps: 10, rpe: 8 }
  ]);

  // Treadmill Form State
  const [treadmillData, setTreadmillData] = useState({
    durationMinutes: 25,
    incline: 8,
    avgSpeedKmH: 4.8,
    avgHeartRateBpm: 135,
    activeCaloriesKcal: 190,
    notes: 'Sesión estándar de 25 min (min 3-20 en pendiente alta)'
  });

  const [strengthNotes, setStrengthNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  
  // Gemini AI In-Flow Feedback State
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [isCoachAnalyzing, setIsCoachAnalyzing] = useState(false);

  // Real-time logs subscription
  useEffect(() => {
    const unsubscribe = subscribeToHouseholdData(
      householdId,
      (updatedLogs) => setRecentLogs(updatedLogs),
      () => {}
    );
    return () => unsubscribe();
  }, [householdId]);

  // Dynamic pre-exercise recommendation based on previous logs
  const preExerciseAdvice = getPreExerciseAdvice(currentUser, selectedExerciseId, selectedDay, recentLogs);

  // Update default sets when exercise or user changes
  useEffect(() => {
    const initialWeight = preExerciseAdvice?.suggestedWeightKg || defaultWeight;
    setSets([
      { setNumber: 1, weightKg: initialWeight, reps: 10, rpe: 7.5 },
      { setNumber: 2, weightKg: initialWeight, reps: 10, rpe: 8 },
      { setNumber: 3, weightKg: initialWeight, reps: 9, rpe: 8 }
    ]);
  }, [selectedExerciseId, currentUser]);

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1] || { weightKg: defaultWeight, reps: 10, rpe: 8 };
    setSets([...sets, {
      setNumber: sets.length + 1,
      weightKg: lastSet.weightKg,
      reps: lastSet.reps,
      rpe: lastSet.rpe
    }]);
  };

  const handleRemoveSet = (index) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index).map((s, idx) => ({ ...s, setNumber: idx + 1 })));
    }
  };

  const handleSetChange = (index, field, value) => {
    const updated = [...sets];
    updated[index][field] = parseFloat(value) || 0;
    setSets(updated);
  };

  // Calculate volume
  const totalVolume = sets.reduce((acc, s) => acc + (s.weightKg * s.reps), 0);

  const handleSaveStrengthLog = async (e) => {
    e.preventDefault();
    const newLog = {
      userId: currentUser,
      date: workoutDate,
      type: 'strength',
      dayType: selectedDay,
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      sets: sets,
      totalVolumeKg: totalVolume,
      notes: strengthNotes,
    };

    await saveWorkoutLog(newLog, householdId);
    setSavedSuccess(true);
    
    // Trigger In-Flow AI Coach Analysis
    setIsCoachAnalyzing(true);
    try {
      const apiKey = getStoredGeminiKey();
      const lastSet = sets[sets.length - 1];
      const feedback = await getLiveSetFeedback({
        userId: currentUser,
        exerciseName: currentExercise.name,
        setNumber: sets.length,
        weightKg: lastSet.weightKg,
        reps: lastSet.reps,
        rpe: lastSet.rpe,
        notes: strengthNotes
      }, apiKey);
      setCoachFeedback(feedback);
    } catch (err) {
      console.warn('Micro feedback notice:', err);
    } finally {
      setIsCoachAnalyzing(false);
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {}
    
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleSaveTreadmillLog = async (e) => {
    e.preventDefault();
    const newLog = {
      userId: currentUser,
      date: workoutDate,
      type: 'treadmill',
      ...treadmillData,
    };

    await saveWorkoutLog(newLog, householdId);
    setSavedSuccess(true);

    // Trigger In-Flow AI Coach Analysis
    setIsCoachAnalyzing(true);
    try {
      const user = USERS[currentUser];
      const feedback = `🏃 ${user.name}: ¡Excelente bloque de 25 min en la trotadora! Quemaste ${treadmillData.activeCaloriesKcal} kcal en pendiente ${treadmillData.incline}%. Pasa ahora al enfriamiento y a la cena compartida de las 20:00.`;
      setCoachFeedback(feedback);
    } finally {
      setIsCoachAnalyzing(false);
    }

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err) {}
    
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>📝 Registro de Sobrecarga Progresiva</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Registrando como <strong className={currentUser === 'dionicio' ? 'text-sky-400' : 'text-pink-400'}>{USERS[currentUser]?.name}</strong> para el hogar compartido.
          </p>
        </div>

        {/* Strength vs Treadmill Selector */}
        <div className="flex bg-gym-800 p-1 rounded-xl border border-gym-700">
          <button
            onClick={() => setLogType('strength')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              logType === 'strength'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Fuerza / Mancuernas</span>
          </button>
          <button
            onClick={() => setLogType('treadmill')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              logType === 'treadmill'
                ? 'bg-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>Trotadora / Apple Watch</span>
          </button>
        </div>
      </div>

      {/* Real-Time Coach Micro-Feedback Card */}
      {coachFeedback && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-gym-800 border border-indigo-500/40 text-slate-200 flex items-start gap-3 shadow-xl animate-fadeIn">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-300 text-xs uppercase tracking-wider">
                Micro-Feedback del Coach Gemini
              </span>
              <button onClick={() => setCoachFeedback(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-white font-medium">
              {coachFeedback}
            </p>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="font-bold">¡Registro guardado exitosamente en el historial sincronizado del hogar!</span>
        </div>
      )}

      {/* Main Logging Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {logType === 'strength' ? (
            <form onSubmit={handleSaveStrengthLog} className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                {/* Day Routine */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Día de Rutina</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => {
                      setSelectedDay(e.target.value);
                      const day = WORKOUT_DAYS.find(d => d.id === e.target.value);
                      if (day && day.exercises.length) setSelectedExerciseId(day.exercises[0].id);
                    }}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="torso">Torso (Lun/Jue)</option>
                    <option value="pierna_core">Pierna & Core (Mar/Vie)</option>
                  </select>
                </div>

                {/* Exercise */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ejercicio</label>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {currentWorkoutDay.exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* In-Flow Pre-Set AI Advice Card */}
              {preExerciseAdvice && (
                <div className="bg-gym-900/90 border border-sky-500/30 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recomendación del Coach para esta serie</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-gym-800 px-2 py-0.5 rounded">
                      {preExerciseAdvice.isHistorical ? `Última sesión: ${preExerciseAdvice.lastLogDate}` : 'Semana 0 (Base)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-gym-950/60 p-2.5 rounded-lg border border-gym-800 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Carga Sugerida</span>
                      <span className="text-sky-300 font-bold font-sans">~{preExerciseAdvice.suggestedWeightKg} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rango Reps</span>
                      <span className="text-white font-bold">{preExerciseAdvice.targetReps}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">RPE Objetivo</span>
                      <span className="text-amber-300 font-bold">{preExerciseAdvice.targetRPE}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed italic">
                    💡 {preExerciseAdvice.coachTip}
                  </p>
                </div>
              )}

              {/* Sets Table */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Series Registradas (Sobrecarga)
                  </span>
                  <span className="text-xs font-mono text-sky-400 font-bold bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-500/30">
                    Volumen Total: {totalVolume} kg
                  </span>
                </div>

                <div className="space-y-2">
                  {sets.map((set, idx) => (
                    <div key={idx} className="flex items-center gap-2 sm:gap-4 bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
                      <span className="w-7 h-7 rounded-lg bg-gym-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        S{set.setNumber}
                      </span>

                      {/* Weight */}
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={set.weightKg}
                          onChange={(e) => handleSetChange(idx, 'weightKg', e.target.value)}
                          className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Reps */}
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Reps</label>
                        <input
                          type="number"
                          min="1"
                          value={set.reps}
                          onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
                          className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* RPE */}
                      <div className="w-20 sm:w-24">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5" title="Esfuerzo percibido del 1 al 10">
                          RPE (1-10)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="10"
                          value={set.rpe}
                          onChange={(e) => handleSetChange(idx, 'rpe', e.target.value)}
                          className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(idx)}
                        disabled={sets.length === 1}
                        className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-20 transition-colors"
                        title="Eliminar serie"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSet}
                  className="w-full py-2 bg-gym-900/60 hover:bg-gym-900 border border-dashed border-gym-700 hover:border-sky-500/50 rounded-xl text-xs font-bold text-slate-400 hover:text-sky-400 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Serie</span>
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notas / Sensaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Subí 2kg en la última serie, técnica limpia sin dolor de hombros"
                  value={strengthNotes}
                  onChange={(e) => setStrengthNotes(e.target.value)}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCoachAnalyzing}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                {isCoachAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Guardando y analizando con el Coach...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Guardar Serie & Obtener Feedback</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveTreadmillLog} className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duración (min)</label>
                  <input
                    type="number"
                    value={treadmillData.durationMinutes}
                    onChange={(e) => setTreadmillData({ ...treadmillData, durationMinutes: parseInt(e.target.value) || 25 })}
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Incline */}
                <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
                  <label className="block text-[10px] uppercase font-bold text-pink-400 mb-1">Inclinación (1-15)</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={treadmillData.incline}
                    onChange={(e) => setTreadmillData({ ...treadmillData, incline: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
                  />
                </div>

                {/* Speed */}
                <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
                  <label className="block text-[10px] uppercase font-bold text-sky-400 mb-1">Velocidad (km/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={treadmillData.avgSpeedKmH}
                    onChange={(e) => setTreadmillData({ ...treadmillData, avgSpeedKmH: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
                  />
                </div>

                {/* Heart Rate */}
                <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
                  <label className="block text-[10px] uppercase font-bold text-red-400 mb-1">FC Media (bpm)</label>
                  <input
                    type="number"
                    value={treadmillData.avgHeartRateBpm}
                    onChange={(e) => setTreadmillData({ ...treadmillData, avgHeartRateBpm: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
                  />
                </div>

                {/* Calories */}
                <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
                  <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={treadmillData.activeCaloriesKcal}
                    onChange={(e) => setTreadmillData({ ...treadmillData, activeCaloriesKcal: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notas de la sesión</label>
                <input
                  type="text"
                  placeholder="Ej: Inclinación 9 sostenida en Zona 2 sin apoyo de manos"
                  value={treadmillData.notes}
                  onChange={(e) => setTreadmillData({ ...treadmillData, notes: e.target.value })}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCoachAnalyzing}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
              >
                <Save className="w-5 h-5" />
                <span>Guardar Sesión de Trotadora</span>
              </button>
            </form>
          )}
        </div>

        {/* Recent Household Logs Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Últimos Registros del Hogar</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Total: {recentLogs.length}</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <div className="p-6 rounded-xl bg-gym-900/60 border border-dashed border-gym-700 text-center text-xs text-slate-500 space-y-1 font-mono">
                <p>Sin registros en la nube aún.</p>
                <p className="text-[11px] text-slate-600">Completa tu primera serie hoy para ver el historial y feedback.</p>
              </div>
            ) : (
              recentLogs.slice(0, 8).map((log) => {
                const isDionicio = log.userId === 'dionicio';
                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                      isDionicio
                        ? 'bg-sky-950/20 border-sky-500/30'
                        : 'bg-pink-950/20 border-pink-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black ${isDionicio ? 'text-sky-400' : 'text-pink-400'}`}>
                        {isDionicio ? '👨‍💻 Dionicio' : '👩‍💼 Paula'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{log.date}</span>
                    </div>

                    {log.type === 'strength' ? (
                      <div>
                        <div className="font-bold text-white text-xs">{log.exerciseName}</div>
                        <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                          {log.sets?.map(s => `${s.weightKg}kg x ${s.reps}`).join(' | ')}
                        </div>
                        <div className="text-[10px] text-sky-400 font-bold mt-1">
                          Volumen: {log.totalVolumeKg} kg
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-pink-300 text-xs">Trotadora ({log.durationMinutes} min)</div>
                        <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                          <span>Inc: {log.incline}</span>
                          <span>•</span>
                          <span>{log.avgSpeedKmH} km/h</span>
                          <span>•</span>
                          <span>{log.activeCaloriesKcal} kcal</span>
                        </div>
                      </div>
                    )}
                    {log.notes && <p className="text-[10px] text-slate-400 italic">"{log.notes}"</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
