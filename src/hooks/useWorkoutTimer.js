import { useState, useEffect, useRef } from 'react';
import { SESSION_SCHEDULE } from '../data/workoutCatalog';
import { soundEffects } from '../services/soundEffects';
import confetti from 'canvas-confetti';

/**
 * Custom Hook para encapsular la máquina de estados del cronómetro de rotación en pareja.
 * Desacopla la lógica de intervalos, efectos de sonido y progresión del componente visual.
 */
export function useWorkoutTimer() {
  const [activeIntervalIndex, setActiveIntervalIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_SCHEDULE.intervals[0].durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTurbo, setIsTurbo] = useState(false); // 10x simulation speed
  const timerRef = useRef(null);

  const currentInterval = SESSION_SCHEDULE.intervals[activeIntervalIndex];
  const totalSessionSeconds = SESSION_SCHEDULE.intervals.reduce((acc, i) => acc + i.durationSeconds, 0);

  const elapsedSecondsInPastIntervals = SESSION_SCHEDULE.intervals
    .slice(0, activeIntervalIndex)
    .reduce((acc, i) => acc + i.durationSeconds, 0);
  const currentIntervalElapsed = currentInterval.durationSeconds - secondsRemaining;
  const totalElapsed = elapsedSecondsInPastIntervals + currentIntervalElapsed;
  const totalProgressPercent = Math.min(100, (totalElapsed / totalSessionSeconds) * 100);
  const intervalProgressPercent = ((currentInterval.durationSeconds - secondsRemaining) / currentInterval.durationSeconds) * 100;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  useEffect(() => {
    if (isRunning) {
      const stepMs = isTurbo ? 100 : 1000;
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleIntervalComplete();
            return 0;
          }

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

  return {
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
  };
}
