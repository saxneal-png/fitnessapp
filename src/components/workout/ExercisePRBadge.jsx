import React from 'react';
import { Award, TrendingUp } from 'lucide-react';

/**
 * Componente modular para renderizar el récord personal (PR) y resumen de sobrecarga de un ejercicio.
 */
export function ExercisePRBadge({ prData, exerciseName }) {
  if (!prData) return null;

  return (
    <div className="bg-gym-900/90 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
          <Award className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
            Récord Personal (PR)
          </span>
          <span className="font-bold text-white text-sm">
            {prData.maxWeightKg} kg <span className="text-amber-400">({prData.bestSetReps} reps)</span>
          </span>
        </div>
      </div>

      {prData.prDate && (
        <span className="text-[10px] text-slate-400 bg-gym-800 px-2 py-0.5 rounded border border-gym-700">
          {prData.prDate}
        </span>
      )}
    </div>
  );
}
