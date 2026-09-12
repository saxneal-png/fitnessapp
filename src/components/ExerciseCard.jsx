import React, { useState } from 'react';
import { Youtube, Dumbbell, AlertCircle, ChevronDown, ChevronUp, Check, ExternalLink } from 'lucide-react';

export function ExerciseCard({ exercise, userDefaultWeight, onSaveSet, isCompleted }) {
  const [expanded, setExpanded] = useState(false);

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=tecnica+correcta+${encodeURIComponent(exercise.name)}`;

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      isCompleted 
        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
        : 'bg-gym-800/90 border-gym-700/80 hover:border-gym-600 shadow-md'
    }`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-base sm:text-lg text-white">
                {exercise.name}
              </h4>
              {isCompleted && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Check className="w-3 h-3" /> Registrado
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="bg-gym-900 px-2 py-0.5 rounded border border-gym-700 text-sky-400 font-bold">
                🎯 {exercise.targetSets} series x {exercise.targetReps}
              </span>
              <span className="bg-gym-900 px-2 py-0.5 rounded border border-gym-700 text-slate-300">
                ⏱ {exercise.restSeconds}s descanso
              </span>
              <span className="bg-gym-900 px-2 py-0.5 rounded border border-gym-700 text-slate-300">
                ⚖ Sugerido: ~{userDefaultWeight || 0} kg
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* YouTube Technique Link */}
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all"
              title="Buscar video de técnica correcta en YouTube"
            >
              <Youtube className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Ver Técnica</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-xl bg-gym-700 hover:bg-gym-600 text-slate-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Beginner Tip Banner */}
        <div className="mt-3 p-3 rounded-xl bg-sky-950/30 border border-sky-500/20 text-xs text-sky-200/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-300">Tip de técnica: </span>
            {exercise.beginnerTips}
          </div>
        </div>

        {/* Collapsible Step-by-Step Instructions */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gym-700 space-y-3 animate-fadeIn">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Instrucciones paso a paso para principiantes:
            </h5>
            <ol className="space-y-1.5 text-xs text-slate-300 pl-4 list-decimal">
              {exercise.instructions.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-slate-400 bg-gym-900/60 p-2.5 rounded-lg border border-gym-700/50">
              <strong>Equipamiento requerido:</strong> {exercise.equipment}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
