import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WORKOUT_DAYS, USERS } from '../data/workoutCatalog';
import { 
  getAdaptiveWorkoutPlan, 
  clearCustomWorkoutPlan, 
  EXERCISE_MUSCLE_CATEGORIES 
} from '../services/adaptiveWorkoutService';
import { generateAICoachCustomWorkoutPlan } from '../services/geminiService';
import { subscribeToHouseholdData } from '../firebase/config';
import { BiometricsModal } from './BiometricsModal';
import { 
  Printer, 
  Calendar, 
  Download, 
  ExternalLink, 
  Dumbbell, 
  Sparkles, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  Flame, 
  Layers,
  Clock,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function PrintablePlan() {
  const { currentUser, householdId, isDuoHousehold, userProfile, allUsers } = useAuth();
  const [selectedAthleteState, setSelectedAthleteState] = useState(currentUser || 'dionicio');
  const [logs, setLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBiometricsModal, setShowBiometricsModal] = useState(false);
  
  const selectedAthlete = isDuoHousehold ? selectedAthleteState : currentUser;

  // Suscribirse a logs de entrenamiento para cálculo adaptativo en vivo
  useEffect(() => {
    const unsub = subscribeToHouseholdData(
      householdId,
      (updatedLogs) => setLogs(updatedLogs),
      () => {}
    );
    return () => unsub();
  }, [householdId]);

  useEffect(() => {
    if (currentUser) {
      setSelectedAthleteState(currentUser);
    }
  }, [currentUser]);

  const user = allUsers[selectedAthlete] || userProfile || USERS.dionicio;
  const isDionicio = selectedAthlete === 'dionicio';
  const currentPlan = getAdaptiveWorkoutPlan(selectedAthlete, logs, householdId);

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateCustomPlan = async () => {
    setIsGenerating(true);
    try {
      await generateAICoachCustomWorkoutPlan({
        userId: selectedAthlete,
        householdId
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}
    } catch (err) {
      console.error('Error generando plan personalizado:', err);
      alert('Error al generar el plan: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToBaseline = () => {
    if (window.confirm('¿Deseas restablecer a la rutina base estándar?')) {
      clearCustomWorkoutPlan(selectedAthlete, householdId);
      window.location.reload();
    }
  };

  // Generate .ICS file for weekly workouts
  const handleDownloadICS = () => {
    const calendarTitle = currentPlan.isCustomPlan
      ? `Rutina Focalizada ${user?.name || ''} - ${currentPlan.durationMinutes} min`
      : (isDuoHousehold ? 'Rutina Dúo en Casa - Plan Adaptativo' : `Plan de Entrenamiento - ${user?.name || 'Personal'}`);

    const sessionDetails = `Plan adaptativo según RPE, equipamiento propio y sobrecarga progresiva.\\nDuración estimada: ${currentPlan.durationMinutes} minutos.`;

    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FitnessApp//PersonalTrainer//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarTitle}
X-WR-TIMEZONE:America/Santiago
BEGIN:VEVENT
SUMMARY:🏋️ Entrenamiento Focalizado: Día 1
DESCRIPTION:${sessionDetails}
DTSTART;TZID=America/Santiago:20260914T190000
DTEND;TZID=America/Santiago:20260914T19${currentPlan.durationMinutes}00
RRULE:FREQ=WEEKLY;BYDAY=MO,TH
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
SUMMARY:🦵 Entrenamiento Focalizado: Día 2
DESCRIPTION:${sessionDetails}
DTSTART;TZID=America/Santiago:20260915T190000
DTEND;TZID=America/Santiago:20260915T19${currentPlan.durationMinutes}00
RRULE:FREQ=WEEKLY;BYDAY=TU,FR
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Rutina_Plan_Focalizado_${selectedAthlete}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calTitle = encodeURIComponent(currentPlan.isCustomPlan ? `Entrenamiento Focalizado (${currentPlan.durationMinutes} min)` : 'Entrenamiento Dúo en Casa');
  const calDesc = encodeURIComponent(`Rutina personalizada adaptada a tu equipamiento y disponibilidad (${currentPlan.durationMinutes} min).`);
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDesc}&dates=20260914T220000Z/20260914T230000Z&recur=RRULE:FREQ%3DWEEKLY;BYDAY%3DMO,TU,TH,FR`;

  return (
    <div className="space-y-6">
      {/* Action Header - Hidden on Print */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Printer className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-black text-white">
              {currentPlan.isCustomPlan ? 'Plan Individualizado & Focalizado' : 'Plan de Entrenamiento Adaptativo'}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
              currentPlan.isCustomPlan 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              <Sparkles className="w-3 h-3" />
              {currentPlan.isCustomPlan ? 'Diseñado por Coach IA' : 'Rutina Base Adaptativa'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {currentPlan.isCustomPlan 
              ? `Ajustado a tu equipamiento real, ${currentPlan.durationMinutes} minutos por sesión y cuidados articulares.` 
              : 'Las cargas y series se recalculan analizando el RPE histórico de tus registros.'}
          </p>
        </div>

        {/* Athlete Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Athlete Selector Buttons (Duo) */}
          {isDuoHousehold ? (
            <div className="bg-gym-900 border border-gym-700 rounded-xl p-1 flex items-center gap-1">
              <button
                onClick={() => setSelectedAthleteState('dionicio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedAthlete === 'dionicio'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👨‍💻 Dionicio</span>
              </button>
              <button
                onClick={() => setSelectedAthleteState('paula')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedAthlete === 'paula'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👩‍💼 Paula</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gym-900 border border-gym-700 text-xs font-bold text-slate-200">
              <span>{user?.avatar || '🏋️‍♂️'}</span>
              <span>Plan de {user?.name || 'Mi Perfil'}</span>
            </div>
          )}

          {/* Generar Plan con Coach IA */}
          <button
            onClick={handleGenerateCustomPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-gym-950 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            title="Diseña o actualiza tu rutina con el Coach IA según tu equipamiento y minutos"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Diseñando Plan...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Diseñar Plan Focalizado</span>
              </>
            )}
          </button>

          {/* Configurar Equipamiento / Tiempos */}
          <button
            onClick={() => setShowBiometricsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gym-800 hover:bg-gym-700 text-slate-300 border border-gym-700 rounded-xl text-xs font-semibold transition-all"
            title="Modificar inventario de equipamiento, tiempos y medidas corporales"
          >
            <Settings2 className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Equipamiento & Tiempos</span>
          </button>

          {currentPlan.isCustomPlan && (
            <button
              onClick={handleResetToBaseline}
              className="p-2 bg-gym-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-gym-700 rounded-xl transition-all"
              title="Restablecer a la rutina base predeterminada"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir A4</span>
          </button>

          <button
            onClick={handleDownloadICS}
            className="flex items-center gap-2 px-3 py-2 bg-gym-700 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs font-bold transition-all"
            title="Descargar archivo .ics para Apple Calendar o Outlook"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>.ICS</span>
          </button>

          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gym-700 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs font-bold transition-all"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Cal</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* Adaptive Status Banner (Screen Only) */}
      <div className="no-print bg-gym-800/80 border border-gym-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${isDionicio ? 'text-sky-400' : 'text-pink-400'}`} />
          <div className="space-y-0.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span>Atleta: {user.name}</span>
              <span className="text-[10px] font-mono bg-gym-900 border border-gym-700 px-2 py-0.5 rounded text-slate-300">
                {currentPlan.durationMinutes} min / sesión
              </span>
              <span className="text-[10px] font-mono bg-gym-900 border border-gym-700 px-2 py-0.5 rounded text-slate-300">
                {currentPlan.weeklyDaysTarget} días / semana
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Modo Fisiológico: <strong className="text-emerald-400">{currentPlan.activeMode}</strong> • {currentPlan.customPlanTitle || 'Rutina Dúo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Registros analizados en BD: <strong className="text-white">{logs.filter(l => l.userId === selectedAthlete).length}</strong></span>
          <span>•</span>
          <span className="text-emerald-400">Sobrecarga adaptativa activa</span>
        </div>
      </div>

      {/* Printable Sheet Area (Styled for both Screen and High Quality Print) */}
      <div className="printable-page bg-white text-black p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto space-y-5">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
                📋 Pauta Semanal Adaptativa — {currentPlan.isCustomPlan ? 'Plan Individualizado' : 'Dúo en Casa'}
              </h1>
              <span className="border border-black px-2 py-0.5 text-xs font-bold uppercase rounded bg-gray-100">
                {currentPlan.durationMinutes} min
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold mt-1">
              Sesión: <strong>{currentPlan.durationMinutes} minutos</strong> • RPE Objetivo: <strong>{isDionicio ? '6.5 - 8.0' : '6.0 - 7.5'} / 10</strong>.
              Cargas ajustadas por historial real y equipamiento propio.
            </p>
          </div>
          <div className="text-right text-xs font-mono text-gray-800 border border-black px-3 py-1.5 rounded">
            <div><strong>Atleta:</strong> {user.name} ({user.height || `${currentPlan.biometrics?.heightCm} cm`})</div>
            <div><strong>Modo:</strong> {currentPlan.activeMode}</div>
            <div><strong>Frecuencia:</strong> {currentPlan.weeklyDaysTarget} días/sem</div>
          </div>
        </div>

        {/* Schedule Grid Overview */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border border-black rounded-lg p-2 bg-gray-50 print-card">
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Día 1</span>
            <span>{currentPlan.days[0]?.name?.split('(')[0] || 'Torso & Empuje'}</span>
          </div>
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Día 2</span>
            <span>{currentPlan.days[1]?.name?.split('(')[0] || 'Pierna & Core'}</span>
          </div>
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Día 3</span>
            <span>{currentPlan.weeklyDaysTarget >= 3 ? (currentPlan.days[0]?.name?.split('(')[0] || 'Torso') : 'Descanso Activo'}</span>
          </div>
          <div>
            <span className="text-gray-500 uppercase text-[10px] block">Día 4</span>
            <span>{currentPlan.weeklyDaysTarget >= 4 ? (currentPlan.days[1]?.name?.split('(')[0] || 'Pierna') : 'Descanso Activo'}</span>
          </div>
        </div>

        {/* Workouts Breakdown with Live Adapted Loads */}
        <div className="space-y-4">
          {currentPlan.days.map((workout) => (
            <div key={workout.id} className="border border-black rounded-xl p-3.5 space-y-2 print-card">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1.5">
                <h3 className="font-extrabold text-sm uppercase text-black flex items-center gap-2">
                  <span>🏋️ {workout.name}</span>
                </h3>
                <span className="text-[11px] font-semibold bg-gray-200 text-black px-2 py-0.5 rounded print-badge">
                  Días: {workout.days?.join(' y ') || 'Programados'}
                </span>
              </div>

              {/* Table of Adapted Exercises */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-gray-700">
                    <th className="py-1 font-bold">Ejercicio & Equipamiento</th>
                    <th className="py-1 font-bold">Series x Reps</th>
                    <th className="py-1 font-bold">Carga Adaptada</th>
                    <th className="py-1 font-bold">Estado Adaptación</th>
                    <th className="py-1 font-bold text-center">Registro Real Hoy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(workout.exercises || []).map((ex) => (
                    <tr key={ex.exerciseId} className="py-1.5">
                      <td className="py-1.5 text-black">
                        <div className="font-bold">{ex.exerciseName}</div>
                        <div className="text-[10px] text-gray-600 font-mono">
                          {ex.shortCategory} • {ex.movementPattern || 'Fuerza'}
                        </div>
                      </td>
                      <td className="py-1.5 font-mono text-gray-800">
                        {ex.targetSets} x {ex.targetReps}
                      </td>
                      <td className="py-1.5 font-mono font-bold text-black">
                        ~{ex.suggestedWeightKg} kg
                      </td>
                      <td className="py-1.5">
                        <span className="inline-block border border-gray-400 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">
                          {ex.badgeText}
                        </span>
                        {ex.lastSession && (
                          <div className="text-[9px] text-gray-500 font-mono">
                            Último: {ex.lastSession.maxWeightKg}kg (RPE {ex.lastSession.avgRpe})
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Cardio Finisher if defined */}
          {currentPlan.cardioFinisher && (
            <div className="border border-black rounded-xl p-3.5 space-y-1.5 print-card">
              <h3 className="font-extrabold text-sm uppercase text-black border-b border-gray-300 pb-1 flex items-center gap-2">
                <span>🏃 {currentPlan.cardioFinisher.name} ({currentPlan.cardioFinisher.durationMinutes} min)</span>
              </h3>
              <p className="text-xs text-gray-800 font-mono">
                {currentPlan.cardioFinisher.protocol}
              </p>
            </div>
          )}
        </div>

        {/* Footer Notes for Print */}
        <div className="border-t border-gray-300 pt-2.5 text-[10px] text-gray-600 flex items-center justify-between">
          <span>Plan adaptativo sincronizado con historial de RPE • Duración sesión: {currentPlan.durationMinutes} min</span>
          <span>Fitness App & Coach Personalizado</span>
        </div>
      </div>

      {/* Biometrics & Equipment Modal */}
      <BiometricsModal
        isOpen={showBiometricsModal}
        onClose={() => setShowBiometricsModal(false)}
        householdId={householdId}
        initialAthlete={selectedAthlete}
        onSaved={() => {
          handleGenerateCustomPlan();
        }}
      />
    </div>
  );
}
