import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SESSION_SCHEDULE, WORKOUT_DAYS, TREADMILL_PROTOCOLS, USERS } from '../data/workoutCatalog';
import { soundEffects } from '../services/soundEffects';
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
  const { currentUser, householdId } = useAuth();
  
  // Who starts where? Default: Dionicio on Strength, Paula on Treadmill (or customizable)
  const [userAIsDionicio, setUserAIsDionicio] = useState(true);
  const [activeIntervalIndex, setActiveIntervalIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_SCHEDULE.intervals[0].durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTurbo, setIsTurbo] = useState(false); // 10x simulation speed
  const [selectedDayRoutine, setSelectedDayRoutine] = useState('torso'); // 'torso' or 'pierna_core'

  // Live In-Routine Coach Quick Assistant State
  const [showQuickCoach, setShowQuickCoach] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [coachResponse, setCoachResponse] = useState(null);
  const [isAskingCoach, setIsAskingCoach] = useState(false);

  const timerRef = useRef(null);
  const currentInterval = SESSION_SCHEDULE.intervals[activeIntervalIndex];
  const totalSessionSeconds = SESSION_SCHEDULE.intervals.reduce((acc, i) => acc + i.durationSeconds, 0);

  // Compute total elapsed time
  const elapsedSecondsInPastIntervals = SESSION_SCHEDULE.intervals
    .slice(0, activeIntervalIndex)
    .reduce((acc, i) => acc + i.durationSeconds, 0);
  const currentIntervalElapsed = currentInterval.durationSeconds - secondsRemaining;
  const totalElapsed = elapsedSecondsInPastIntervals + currentIntervalElapsed;
  const totalProgressPercent = Math.min(100, (totalElapsed / totalSessionSeconds) * 100);

  // Interval progress
  const intervalProgressPercent = ((currentInterval.durationSeconds - secondsRemaining) / currentInterval.durationSeconds) * 100;

  // Format seconds mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Tick Engine
  useEffect(() => {
    if (isRunning) {
      const stepMs = isTurbo ? 100 : 1000;
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleIntervalComplete();
            return 0;
          }

          // Countdown sound effects at 3, 2, 1
          if (soundEnabled && prev <= 4 && prev > 1) {
            soundEffects.playCountdownBeep();
          }

          return prev - 1;
        });
      }, stepMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activeIntervalIndex, isTurbo, soundEnabled]);

  const handleIntervalComplete = () => {
    const nextIdx = activeIntervalIndex + 1;
    if (nextIdx < SESSION_SCHEDULE.intervals.length) {
      setActiveIntervalIndex(nextIdx);
      const nextInterval = SESSION_SCHEDULE.intervals[nextIdx];
      setSecondsRemaining(nextInterval.durationSeconds);

      if (soundEnabled) {
        if (nextInterval.isTransition) {
          soundEffects.playRotationBuzzer();
        } else {
          soundEffects.playStartChime();
        }
      }
    } else {
      // Workout Finished!
      setIsRunning(false);
      if (soundEnabled) {
        soundEffects.playVictoryFanfare();
      }
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  };

  const togglePlay = () => {
    if (!isRunning && soundEnabled) {
      soundEffects.playStartChime();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setActiveIntervalIndex(0);
    setSecondsRemaining(SESSION_SCHEDULE.intervals[0].durationSeconds);
  };

  const jumpToInterval = (index) => {
    setActiveIntervalIndex(index);
    setSecondsRemaining(SESSION_SCHEDULE.intervals[index].durationSeconds);
  };

  // Quick In-Timer Coach Query
  const handleQuickCoachSubmit = async (e) => {
    e.preventDefault();
    if (!quickQuery.trim() || isAskingCoach) return;

    setIsAskingCoach(true);
    setCoachResponse(null);

    try {
      const apiKey = getStoredGeminiKey();
      const currentIntervalName = currentInterval.name;
      const enrichedPrompt = `Estamos en medio del entrenamiento (19:00 - 20:00), específicamente en el bloque "${currentIntervalName}". Consulta del atleta (${currentUser === 'dionicio' ? 'Dionicio' : 'Paula'}): ${quickQuery}`;
      
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
  const userA = userAIsDionicio ? 'Dionicio' : 'Paula';
  const userB = userAIsDionicio ? 'Paula' : 'Dionicio';
  const userAColor = userAIsDionicio ? 'text-sky-400' : 'text-pink-400';
  const userBColor = userAIsDionicio ? 'text-pink-400' : 'text-sky-400';
  const userABorder = userAIsDionicio ? 'border-sky-500/40 bg-sky-950/20' : 'border-pink-500/40 bg-pink-950/20';
  const userBBorder = userAIsDionicio ? 'border-pink-500/40 bg-pink-950/20' : 'border-sky-500/40 bg-sky-950/20';

  const selectedWorkout = WORKOUT_DAYS.find(d => d.id === selectedDayRoutine) || WORKOUT_DAYS[0];
  const liveCoachAdvice = getLiveTimerAdvice(currentInterval, userAIsDionicio, selectedDayRoutine);

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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDayRoutine === 'torso'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Torso (Lun/Jue)
              </button>
              <button
                onClick={() => setSelectedDayRoutine('pierna_core')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDayRoutine === 'pierna_core'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pierna & Core (Mar/Vie)
              </button>
            </div>

            <button
              onClick={() => setUserAIsDionicio(!userAIsDionicio)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gym-700/70 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Intercambiar quién inicia en Fuerza y quién en Trotadora"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Rotar Inicio</span>
            </button>

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
            <div className="font-mono text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-white select-none">
              {formatTime(secondsRemaining)}
            </div>

            {/* Progress bar inside interval */}
            <div className="w-full max-w-xl mt-4 bg-gym-950/80 rounded-full h-3 p-0.5 border border-gym-700/60 overflow-hidden">
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
            <div className="flex items-center justify-between w-full max-w-xl text-[11px] text-slate-400 font-mono mt-2">
              <span>Progreso Total: {Math.round(totalProgressPercent)}%</span>
              <span>{formatTime(totalElapsed)} / 60:00</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
              <button
                onClick={() => jumpToInterval(Math.max(0, activeIntervalIndex - 1))}
                disabled={activeIntervalIndex === 0}
                className="p-3 rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-300 disabled:opacity-30 border border-gym-700 transition-all"
                title="Bloque anterior"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className={`flex items-center justify-center gap-2 px-8 sm:px-10 py-4 rounded-2xl font-black text-lg sm:text-xl shadow-xl transition-all transform active:scale-95 ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-gym-900 shadow-amber-500/30'
                    : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 hover:opacity-95 text-white shadow-sky-500/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-6 h-6 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    <span>{totalElapsed > 0 ? 'Reanudar' : 'Iniciar Sesión (19:00)'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => jumpToInterval(Math.min(SESSION_SCHEDULE.intervals.length - 1, activeIntervalIndex + 1))}
                disabled={activeIntervalIndex === SESSION_SCHEDULE.intervals.length - 1}
                className="p-3 rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-300 disabled:opacity-30 border border-gym-700 transition-all"
                title="Siguiente bloque"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded-2xl bg-gym-800 hover:bg-gym-700 text-slate-400 hover:text-white border border-gym-700 transition-all"
                title="Reiniciar sesión"
              >
                <RotateCcw className="w-5 h-5" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-gym-950/60 p-3 rounded-xl border border-gym-800 text-slate-300 space-y-1">
              <span className="font-bold text-sky-400 block">👨‍💻 Indicación para Dionicio:</span>
              <p>{userAIsDionicio ? liveCoachAdvice.userATip : liveCoachAdvice.userBTip}</p>
            </div>
            <div className="bg-gym-950/60 p-3 rounded-xl border border-gym-800 text-slate-300 space-y-1">
              <span className="font-bold text-pink-400 block">👩‍💼 Indicación para Paula:</span>
              <p>{userAIsDionicio ? liveCoachAdvice.userBTip : liveCoachAdvice.userATip}</p>
            </div>
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

        {/* Live Station Assignment Display (Dionicio vs Paula) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* User A Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${userABorder}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{userA === 'Dionicio' ? '👨‍💻' : '👩‍💼'}</span>
                <span className={`font-black text-lg ${userAColor}`}>{userA}</span>
              </div>
              <span className="text-xs font-mono uppercase bg-gym-900/80 px-2.5 py-1 rounded-full text-slate-300 border border-gym-700">
                Estación Actual
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
                    ? 'Rotación a Trotadora + Hidratación'
                    : currentInterval.id === 'warmup'
                    ? 'Movilidad & Calentamiento'
                    : currentInterval.id === 'block1'
                    ? `Fuerza (${selectedWorkout.name.split(' ')[1]})`
                    : 'Cardio en Trotadora'}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentInterval.isTransition
                    ? 'Ajusta discos de mancuernas para la siguiente rotación.'
                    : currentInterval.id === 'warmup'
                    ? 'Movilidad de hombros, caderas y tobillos.'
                    : currentInterval.id === 'block1'
                    ? 'Mancuernas modulares 40kg con descansos de 45-60s.'
                    : 'Inclinación 8-11, velocidad 4.8 - 5.3 km/h.'}
                </p>
              </div>
            </div>
          </div>

          {/* User B Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${userBBorder}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{userB === 'Dionicio' ? '👨‍💻' : '👩‍💼'}</span>
                <span className={`font-black text-lg ${userBColor}`}>{userB}</span>
              </div>
              <span className="text-xs font-mono uppercase bg-gym-900/80 px-2.5 py-1 rounded-full text-slate-300 border border-gym-700">
                Estación Actual
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
                    : `Fuerza (${selectedWorkout.name.split(' ')[1]})`}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentInterval.isTransition
                    ? 'Coloca las cargas de tus series previas e hidrátate.'
                    : currentInterval.id === 'warmup'
                    ? 'Movilidad de hombros, caderas y tobillos.'
                    : currentInterval.id === 'block1'
                    ? 'Inclinación 8-11, velocidad 4.8 - 5.3 km/h.'
                    : 'Mancuernas modulares 40kg con descansos de 45-60s.'}
                </p>
              </div>
            </div>
          </div>
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
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Dionicio</span>
                    <span className="font-mono font-bold text-sky-400">~{exercise.defaultWeightDionicio} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Paula</span>
                    <span className="font-mono font-bold text-pink-400">~{exercise.defaultWeightPaula} kg</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  💡 {exercise.beginnerTips}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Treadmill Station Protocol Card (Differentiated for Dionicio & Paula) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-pink-400" />
              <h3 className="font-extrabold text-lg text-white">
                Trotadora ({currentUser === 'dionicio' ? 'Dionicio' : 'Paula'})
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
