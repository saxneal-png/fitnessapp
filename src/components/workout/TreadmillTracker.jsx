import React from 'react';
import { Save, Footprints } from 'lucide-react';

export function TreadmillTracker({
  treadmillData,
  onChange,
  onSubmit,
  isCoachAnalyzing,
  workoutDate,
  onDateChange
}) {
  return (
    <form onSubmit={onSubmit} className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-gym-700 pb-3">
        <div className="flex items-center gap-2">
          <Footprints className="w-5 h-5 text-pink-400" />
          <h3 className="font-extrabold text-white text-base">Protocolo de Caminata Inclinada (Zona 2)</h3>
        </div>
        {onDateChange && (
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-gym-900 border border-gym-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Duration */}
        <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Duración (min)</label>
          <input
            type="number"
            value={treadmillData.durationMinutes}
            onChange={(e) => onChange({ ...treadmillData, durationMinutes: parseInt(e.target.value) || 0 })}
            className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
          />
        </div>

        {/* Incline */}
        <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
          <label className="block text-[10px] uppercase font-bold text-pink-400 mb-1">Inclinación (%)</label>
          <input
            type="number"
            value={treadmillData.incline}
            onChange={(e) => onChange({ ...treadmillData, incline: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-pink-400 focus:outline-none"
          />
        </div>

        {/* Speed */}
        <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
          <label className="block text-[10px] uppercase font-bold text-sky-400 mb-1">Velocidad (km/h)</label>
          <input
            type="number"
            step="0.1"
            value={treadmillData.avgSpeedKmH}
            onChange={(e) => onChange({ ...treadmillData, avgSpeedKmH: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-sky-400 focus:outline-none"
          />
        </div>

        {/* Heart Rate */}
        <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
          <label className="block text-[10px] uppercase font-bold text-red-400 mb-1">FC Media (bpm)</label>
          <input
            type="number"
            value={treadmillData.avgHeartRateBpm}
            onChange={(e) => onChange({ ...treadmillData, avgHeartRateBpm: parseInt(e.target.value) || 0 })}
            className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
          />
        </div>

        {/* Calories */}
        <div className="bg-gym-900/80 p-3 rounded-xl border border-gym-700/60">
          <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">Calorías (kcal)</label>
          <input
            type="number"
            value={treadmillData.activeCaloriesKcal}
            onChange={(e) => onChange({ ...treadmillData, activeCaloriesKcal: parseInt(e.target.value) || 0 })}
            className="w-full bg-gym-800 border border-gym-700 rounded-lg px-2 py-1.5 text-base font-mono font-black text-white focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notas de la sesión</label>
        <input
          type="text"
          placeholder="Ej: Inclinación 8 sostenida en Zona 2 sin apoyo de manos"
          value={treadmillData.notes}
          onChange={(e) => onChange({ ...treadmillData, notes: e.target.value })}
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
  );
}
