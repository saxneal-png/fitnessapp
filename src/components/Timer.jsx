import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SESSION_SCHEDULE, WORKOUT_DAYS, TREADMILL_PROTOCOLS, USERS } from '../data/workoutCatalog';
import { soundEffects } from '../services/soundEffects';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { getLiveTimerAdvice, getStoredGeminiKey, askCoachWithFullContext } from '../services/geminiService';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Zap, 
  ArrowRightLeft, 
  Flame, 
  Dumbbell, 
  Footprints, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Info,
  Bot,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function Timer({ onQuickLog }) {
  const { currentUser, householdId, isDuoHousehold, userProfile, allUsers } = useAuth();
  
  // Who starts where? Default: user A on Strength, user B on Treadmill
  const [userAStartsFirst, setUserAStartsFirst] = useState(true);
  const [selectedDayRoutine, setSelectedDayRoutine] = useState('torso'); // 'torso' | 'pierna_core'
  const [quickQuery, setQuickQuery] = useState('');
  const [isAskingCoach, setIsAskingCoach] = useState(false);
  const [coachResponse, setCoachResponse] = useState(null);
  const [showQuickCoach, setShowQuickCoach] = useState(false);
  const {
    activeIntervalIndex,
    currentInterval,
    secondsRemaining,
    isRunning,
    soundEnabled,
    setSoundEnabled,
    isTurbo,
    setIsTurbo,
    totalElapsed,
    totalProgressPercent,
    intervalProgressPercent,
    formatTime,
    togglePlay,
    handleReset,
    jumpToInterval,
  } = useWorkoutTimer();

  // Determine athletes
  const athleteKeys = Object.keys(allUsers || {});
  const firstAthleteKey = athleteKeys[0] || (currentUser === 'paula' ? 'paula' : 'dionicio');
  const secondAthleteKey = athleteKeys[1] || (firstAthleteKey === 'dionicio' ? 'paula' : 'dionicio');

  const athleteAObj = isDuoHousehold ? (allUsers[firstAthleteKey] || USERS.dionicio) : (userProfile || { name: 'Mi Perfil', avatar: '🏋️‍♂️' });
  const athleteBObj = isDuoHousehold ? (allUsers[secondAthleteKey] || USERS.paula) : null;

  // Quick In-Timer Coach Query
  const handleQuickCoachSubmit = async (e) => {
    e.preventDefault();
    if (!quickQuery.trim() || isAskingCoach) return;

    setIsAskingCoach(true);
    setCoachResponse(null);

    try {
      const apiKey = getStoredGeminiKey();
      const currentIntervalName = currentInterval.name;
      const currentAthleteName = userProfile?.name || USERS[currentUser]?.name || 'Atleta';
      const enrichedPrompt = `Estamos en medio del entrenamiento (19:00 - 20:00), específicamente en el bloque "${currentIntervalName}". Consulta del atleta (${currentAthleteName}): ${quickQuery}`;
      
      const res = await askCoachWithFullContext(enrichedPrompt, currentUser, householdId, apiKey);
      setCoachResponse(res);
      setQuickQuery('');
    } catch (err) {
      setCoachResponse(`💡 Coach: ${err.message === 'API_KEY_MISSING' ? 'Ingresa tu API Key en la pestaña Coach para respuestas completas con IA.' : 'Mantén la técnica estricta, respira profundo y no fuerces las articulaciones.'}`);
    } finally {
      setIsAskingCoach(false);
    }
  };

  // User station assignments
  const userA = isDuoHousehold
    ? (userAStartsFirst ? athleteAObj.name : athleteBObj.name)
    : (athleteAObj.name);
  const userB = isDuoHousehold
    ? (userAStartsFirst ? athleteBObj.name : athleteAObj.name)
    : 'Cardio / Accesorios';

  const userAColor = isDuoHousehold
    ? (userAStartsFirst ? 'text-sky-400' : 'text-pink-400')
    : 'text-sky-400';
  const userBColor = isDuoHousehold
    ? (userAStartsFirst ? 'text-pink-400' : 'text-sky-400')
    : 'text-emerald-400';

  const userABorder = isDuoHousehold
    ? (userAStartsFirst ? 'border-sky-500/40 bg-sky-950/20' : 'border-pink-500/40 bg-pink-950/20')
    : 'border-sky-500/40 bg-sky-950/20';
  const userBBorder = isDuoHousehold
    ? (userAStartsFirst ? 'border-pink-500/40 bg-pink-950/20' : 'border-sky-500/40 bg-sky-950/20')
    : 'border-emerald-500/40 bg-emerald-950/20';

  const selectedWorkout = WORKOUT_DAYS.find(d => d.id === selectedDayRoutine) || WORKOUT_DAYS[0];
  const liveCoachAdvice = getLiveTimerAdvice(
    currentInterval, 
    userAStartsFirst, 
    selectedDayRoutine, 
    athleteAObj, 
    athleteBObj, 
    isDuoHousehold
  );

  return (
    <div className="space-y-6">
      {/* Session Controls Header */}
      <div className="bg-gym-800/90 border border-gym-700/80 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Rutina en Vivo (19:00 - 20:00)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Ventana de 60 minutos con rotación coordinada de mancuernas y trotadora.
            </p>
          </div>

          {/* Routine Selector & Swap Stations */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-gym-900 border border-gym-700 rounded-xl p-1 flex">
              <button
                onClick={() => setSelectedDayRoutine('torso')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDayRoutine === 'torso'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Torso</span> <span className="hidden sm:inline">(Lun/Jue)</span>
              </button>
              <button
                onClick={() => setSelectedDayRoutine('pierna_core')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDayRoutine === 'pierna_core'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Pierna</span> <span className="hidden sm:inline">& Core (Mar/Vie)</span>
              </button>
            </div>

            {isDuoHousehold && (
              <button
                onClick={() => setUserAStartsFirst(!userAStartsFirst)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gym-700/70 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                title="Intercambiar quién inicia en Fuerza y quién en Trotadora"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Rotar</span>
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-gym-700 text-sky-400 border-sky-500/30'
                  : 'bg-gym-900 text-slate-500 border-gym-700'
              }`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsTurbo(!isTurbo)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                isTurbo
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse'
                  : 'bg-gym-900 text-slate-400 border-gym-700 hover:text-slate-200'
              }`}
              title="Modo Turbo: Acelera 10x para probar la alternancia de bloques rápidamente"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>10x Turbo</span>
            </button>
          </div>
        </div>

        {/* Big Digital Clock & Progress */}
        <div className={`p-6 sm:p-8 rounded-2xl border transition-all duration-500 ${
          currentInterval.isTransition
            ? 'bg-gradient-to-b from-amber-950/40 to-gym-900 border-amber-500/50 shadow-lg shadow-amber-500/10'
            : currentInterval.id === 'warmup'
            ? 'bg-gradient-to-b from-emerald-950/40 to-gym-900 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : currentInterval.id === 'block1'
            ? 'bg-gradient-to-b from-sky-950/40 to-gym-900 border-sky-500/40 shadow-lg shadow-sky-500/10'
            : currentInterval.id === 'block2'
            ? 'bg-gradient-to-b from-pink-950/40 to-gym-900 border-pink-500/40 shadow-lg shadow-pink-500/10'
            : 'bg-gym-900 border-gym-700'
        }`}>
          <div className="flex flex-col items-center justify-center text-center">
            {/* Interval Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                currentInterval.isTransition
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-bounce-soft'
                  : 'bg-gym-800 text-slate-300 border-gym-600'
              }`}>
                {currentInterval.timeDisplay} • {currentInterval.name}
              </span>
            </div>

            {/* Giant Countdown */}
            <div className="font-mono text-5xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-white select-none py-1">
              {formatTime(secondsRemaining)}
            </div>

            {/* Progress bar inside interval */}
            <div className="w-full max-w-xl mt-3 sm:mt-4 bg-gym-950/80 rounded-full h-2.5 sm:h-3 p-0.5 border border-gym-700/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentInterval.isTransition
                    ? 'bg-amber-400'
                    : currentInterval.id === 'warmup'
                    ? 'bg-emerald-400'
                    : currentInterval.id === 'block1'
                    ? 'bg-sky-400'
                    : currentInterval.id === 'block2'
                    ? 'bg-pink-400'
                    : 'bg-indigo-400'
                }`}
                style={{ width: `${intervalProgressPercent}%` }}
              ></div>
            </div>

            {/* Total 60 min session progress */}
            <div className="flex items-center justify-between w-full max-w-xl text-[10px] sm:text-[11px] text-slate-400 font-mono mt-1.5 sm:mt-2">
              <span>Progreso: {Math.round(totalProgressPercent)}%</span>
              <span>{formatTime(totalElapsed)} / 60:00</span>
            </div>

            {/* Action Buttons: Thumb-friendly and within screen boundary */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between sm:justify-center gap-1.5 sm:gap-4 mt-5 sm:mt-6">
              <button
                onClick={() => jumpToInterval(Math.max(0, activeIntervalIndex - 1))}
                disabled={activeIntervalIndex === 0}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-300 disabled:opacity-30 border border-gym-700 transition-all shrink-0 active:scale-95"
                title="Bloque anterior"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={togglePlay}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl shadow-xl transition-all transform active:scale-95 ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-gym-900 shadow-amber-500/30'
                    : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 hover:opacity-95 text-white shadow-sky-500/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                    <span>{totalElapsed > 0 ? 'Reanudar' : (<span>Iniciar <span className="hidden sm:inline">Sesión (19:00)</span></span>)}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => jumpToInterval(Math.min(SESSION_SCHEDULE.intervals.length - 1, activeIntervalIndex + 1))}
                disabled={activeIntervalIndex === SESSION_SCHEDULE.intervals.length - 1}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-300 disabled:opacity-30 border border-gym-700 transition-all shrink-0 active:scale-95"
                title="Siguiente bloque"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={handleReset}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-400 hover:text-white border border-gym-700 transition-all shrink-0 active:scale-95"
                title="Reiniciar sesión"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Coach Integrated Guidance Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-gym-900 via-indigo-950/30 to-gym-900 border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span className="font-extrabold text-white text-sm">
                Coach Gemini en Vivo: {liveCoachAdvice.headline}
              </span>
            </div>
            <button
              onClick={() => setShowQuickCoach(!showQuickCoach)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showQuickCoach ? 'Ocultar Asistente' : 'Pregunta Rápida al Coach'}</span>
              {showQuickCoach ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className={`grid grid-cols-1 ${isDuoHousehold ? 'md:grid-cols-2' : ''} gap-3 text-xs`}>
            <div className="bg-gym-950/60 p-3 rounded-xl border border-gym-800 text-slate-300 space-y-1">
              <span className="font-bold text-sky-400 block">
                {athleteAObj?.avatar || '🏋️‍♂️'} Indicación para {athleteAObj?.name || 'ti'}:
              </span>
              <p>{liveCoachAdvice.userATip}</p>
            </div>
            {isDuoHousehold && athleteBObj && (
              <div className="bg-gym-950/60 p-3 rounded-xl border border-gym-800 text-slate-300 space-y-1">
                <span className="font-bold text-pink-400 block">
                  {athleteBObj?.avatar || '👩‍💼'} Indicación para {athleteBObj?.name}:
                </span>
                <p>{liveCoachAdvice.userBTip}</p>
              </div>
            )}
          </div>

          {/* Inline Quick Coach Query Form */}
          {showQuickCoach && (
            <div className="pt-2 border-t border-gym-800 space-y-3 animate-fadeIn">
              <form onSubmit={handleQuickCoachSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="¿Molestia en hombro? ¿Duda con el peso? Pregunta aquí..."
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  disabled={isAskingCoach}
                  className="flex-1 bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAskingCoach || !quickQuery.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  {isAskingCoach ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Consultar</span>
                </button>
              </form>

              {coachResponse && (
                <div className="p-3 bg-gym-950/90 border border-indigo-500/30 rounded-xl text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {coachResponse}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Station Assignment Display */}
        <div className={`grid grid-cols-1 ${isDuoHousehold ? 'md:grid-cols-2' : ''} gap-4 mt-6`}>
          {/* Main User Station Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${userABorder}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{athleteAObj?.avatar || '🏋️‍♂️'}</span>
                <span className={`font-black text-lg ${userAColor}`}>{userA}</span>
              </div>
              <span className="text-xs font-mono uppercase bg-gym-900/80 px-2.5 py-1 rounded-full text-slate-300 border border-gym-700">
                {isDuoHousehold ? 'Estación Actual' : 'Tu Estación Activa'}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-3">
              {currentInterval.id === 'warmup' || currentInterval.id === 'cooldown' ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Flame className="w-6 h-6" />
                </div>
              ) : currentInterval.isTransition ? (
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 animate-pulse">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
              ) : (currentInterval.id === 'block1' || !isDuoHousehold) ? (
                <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400">
                  <Dumbbell className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400">
                  <Footprints className="w-6 h-6" />
                </div>
              )}

              <div>
                <h4 className="font-bold text-white text-base">
                  {currentInterval.isTransition
                    ? 'Transición / Descanso Activo + Hidratación'
                    : currentInterval.id === 'warmup'
                    ? 'Movilidad & Calentamiento Articular'
                    : currentInterval.id === 'block1'
                    ? `Fuerza (${selectedWorkout.name.split(' ')[1] || 'Principal'})`
                    : isDuoHousehold ? 'Cardio en Trotadora' : `Fuerza & Sobrecarga`}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentInterval.isTransition
                    ? 'Ajusta implementos e hidrátate para el siguiente bloque.'
                    : currentInterval.id === 'warmup'
                    ? 'Movilidad de hombros, columna, caderas y tobillos.'
                    : currentInterval.id === 'block1'
                    ? 'Ejecuta series controladas con descanso estricto de 45-60s.'
                    : isDuoHousehold ? 'Inclinación y velocidad en Zona 2 aeróbica.' : 'Mantén técnica limpia y control del descenso.'}
                </p>
              </div>
            </div>
          </div>

          {/* User B Card (Solo en Hogar Dúo) */}
          {isDuoHousehold && athleteBObj && (
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${userBBorder}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{athleteBObj?.avatar || '👩‍💼'}</span>
                  <span className={`font-black text-lg ${userBColor}`}>{userB}</span>
                </div>
                <span className="text-xs font-mono uppercase bg-gym-900/80 px-2.5 py-1 rounded-full text-slate-300 border border-gym-700">
                  Estación Compartida
                </span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                {currentInterval.id === 'warmup' || currentInterval.id === 'cooldown' ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Flame className="w-6 h-6" />
                  </div>
                ) : currentInterval.isTransition ? (
                  <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 animate-pulse">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                ) : (currentInterval.id === 'block1') ? (
                  <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400">
                    <Footprints className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-white text-base">
                    {currentInterval.isTransition
                      ? 'Rotación a Fuerza + Ajuste Pesas'
                      : currentInterval.id === 'warmup'
                      ? 'Movilidad & Calentamiento'
                      : currentInterval.id === 'block1'
                      ? 'Cardio en Trotadora'
                      : `Fuerza (${selectedWorkout.name.split(' ')[1] || 'Principal'})`}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {currentInterval.isTransition
                      ? 'Coloca las cargas de tus series previas e hidrátate.'
                      : currentInterval.id === 'warmup'
                      ? 'Movilidad de hombros, caderas y tobillos.'
                      : currentInterval.id === 'block1'
                      ? 'Inclinación 8-11, velocidad moderada en Zona 2.'
                      : 'Mancuernas con descansos de 45-60s.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Sequence Steps */}
        <div className="mt-6 pt-6 border-t border-gym-700/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Secuencia de la Sesión (19:00 - 20:00)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SESSION_SCHEDULE.intervals.map((step, idx) => {
              const isPast = idx < activeIntervalIndex;
              const isCurrent = idx === activeIntervalIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => jumpToInterval(idx)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isCurrent
                      ? 'bg-gym-700 border-sky-400 text-white shadow-md'
                      : isPast
                      ? 'bg-gym-900/50 border-emerald-500/30 text-slate-400'
                      : 'bg-gym-900/30 border-gym-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold">{step.timeDisplay}</span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-semibold truncate text-slate-200">
                    {step.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Routine Quick Reference Cards (Strength + Treadmill) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strength Station Routine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-sky-400" />
              <h3 className="font-extrabold text-lg text-white">
                Pauta de Fuerza: {selectedWorkout.name}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Equipamiento: Mancuernas 40kg + Mat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedWorkout.exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-4 shadow-sm hover:border-gym-600 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-mono text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-sm text-white leading-tight">
                      {exercise.name}
                    </h4>
                  </div>
                  <a
                    href={`https://www.youtube.com/results?search_query=tecnica+correcta+${encodeURIComponent(exercise.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    title="Ver técnica correcta en YouTube"
                  >
                    <span>▶ Video</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 my-2.5 bg-gym-900/60 p-2.5 rounded-xl border border-gym-700/50 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Series & Reps</span>
                    <span className="font-mono font-bold text-sky-300">{exercise.targetSets} x {exercise.targetReps}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Descanso</span>
                    <span className="font-mono text-slate-300">{exercise.restSeconds}s</span>
                  </div>
                  {isDuoHousehold ? (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{athleteAObj?.name || 'Dionicio'}</span>
                        <span className="font-mono font-bold text-sky-400">~{exercise.defaultWeightDionicio || 10} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{athleteBObj?.name || 'Paula'}</span>
                        <span className="font-mono font-bold text-pink-400">~{exercise.defaultWeightPaula || 6} kg</span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Carga Sugerida</span>
                      <span className="font-mono font-bold text-sky-400">
                        ~{userProfile?.gender === 'female' ? (exercise.defaultWeightPaula || 6) : (exercise.defaultWeightDionicio || 10)} kg
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  💡 {exercise.beginnerTips}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Treadmill Station Protocol Card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-pink-400" />
              <h3 className="font-extrabold text-lg text-white">
                Trotadora ({isDuoHousehold ? (currentUser === 'dionicio' ? 'Dionicio' : 'Paula') : (userProfile?.name || 'Cardio')})
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              Semana 0
            </span>
          </div>

          <div className="bg-gym-800/80 border border-gym-700/70 rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-xs text-slate-400">
              Protocolo adaptado a tu nivel principiante (cuidando articulaciones y elevando gasto calórico).
            </p>

            <div className="space-y-3">
              {(TREADMILL_PROTOCOLS[currentUser]?.phases || TREADMILL_PROTOCOLS.dionicio.phases).map((phase, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gym-900/70 border border-gym-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-pink-400">{phase.range}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-gym-800 px-2 py-0.5 rounded">
                      FC: {phase.targetHR}
                    </span>
                  </div>
                  <div className="font-bold text-white">{phase.title}</div>
                  <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
                    <span className="bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 text-pink-300">
                      Inclinación: <strong>{phase.incline}</strong>
                    </span>
                    <span className="bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-sky-300">
                      Vel: <strong>{phase.speedKmH} km/h</strong>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{phase.description}</p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-gym-900/90 border border-gym-700/80 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Monitorea en tu <strong>Apple Watch Series 8</strong> que la FC se mantenga en Zona 2 (charla posible sin ahogo).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
