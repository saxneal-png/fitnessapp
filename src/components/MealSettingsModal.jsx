import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings2, 
  Check, 
  Clock, 
  Percent, 
  Sparkles, 
  ShieldCheck, 
  Cloud, 
  Coffee, 
  Utensils, 
  Moon, 
  Flame,
  Info,
  RotateCcw
} from 'lucide-react';
import { 
  getLocalMealSettings, 
  saveMealSettingsToCloud, 
  DEFAULT_CHILE_MEAL_CONFIG 
} from '../services/mealSettingsService';

export function MealSettingsModal({ isOpen, onClose, householdId = 'hogar-dionicio-paula' }) {
  const [config, setConfig] = useState(() => getLocalMealSettings(householdId));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getLocalMealSettings(householdId));
      setSaveSuccess(false);
    }
  }, [isOpen, householdId]);

  if (!isOpen) return null;

  const handleToggleMeal = (mealId) => {
    setConfig(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.id === mealId ? { ...m, enabled: !m.enabled } : m)
    }));
  };

  const handleTimeChange = (mealId, newTime) => {
    setConfig(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.id === mealId ? { ...m, defaultTime: newTime } : m)
    }));
  };

  const handleShareChange = (mealId, newShare) => {
    const val = Math.max(0, Math.min(100, parseInt(newShare) || 0));
    setConfig(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.id === mealId ? { ...m, calorieSharePct: val } : m)
    }));
  };

  const handleResetToChile = () => {
    setConfig(DEFAULT_CHILE_MEAL_CONFIG);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveMealSettingsToCloud(config, householdId);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error guardando configuraciones:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPct = config.meals.filter(m => m.enabled).reduce((acc, m) => acc + (Number(m.calorieSharePct) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gym-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gym-850 border border-gym-700/80 w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gym-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-500 flex items-center justify-center text-gym-950 font-black shadow-lg">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Configuración del Esquema de Comidas</h3>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                  🇨🇱 Chile
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Define las comidas del día para Dionicio y Paula (En Chile: Desayuno, Almuerzo y Once. No hay cena).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-gym-750 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Informativo Cultural Chileno */}
        <div className="p-3.5 bg-sky-950/40 border border-sky-500/30 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-extrabold text-sky-200 block">Esquema Cultural Chileno Activo</span>
            <p className="text-slate-300 leading-relaxed">
              En los hogares chilenos la comida de la noche es la <strong>Once</strong> (u <strong>Once-Comida</strong> a las 20:00 hrs tras entrenar). La "Cena" tradicional está desactivada por defecto. El Coach IA y el planificador adaptan todas las recomendaciones a esta estructura.
            </p>
          </div>
        </div>

        {/* Lista de Comidas Configurables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Comidas del Día & Horarios:
            </label>
            <span className={`text-[11px] font-mono font-bold ${totalPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Distribución: {totalPct}% / 100%
            </span>
          </div>

          <div className="space-y-2.5">
            {config.meals.map((meal) => (
              <div 
                key={meal.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  meal.enabled 
                    ? 'bg-gym-900/90 border-gym-700 shadow-sm' 
                    : 'bg-gym-900/30 border-gym-800 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id={`chk-${meal.id}`}
                      checked={meal.enabled}
                      onChange={() => handleToggleMeal(meal.id)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-gym-800 border-gym-600"
                    />
                    <label htmlFor={`chk-${meal.id}`} className="font-bold text-xs text-white cursor-pointer select-none">
                      {meal.name}
                    </label>
                    {meal.id === 'once' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                        Post-Entreno 20:00
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gym-950 px-2 py-1 rounded-xl border border-gym-800 text-[11px] font-mono text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={meal.defaultTime}
                        disabled={!meal.enabled}
                        onChange={(e) => handleTimeChange(meal.id, e.target.value)}
                        className="bg-transparent w-16 text-center text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-gym-950 px-2 py-1 rounded-xl border border-gym-800 text-[11px] font-mono text-slate-300">
                      <Percent className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={meal.calorieSharePct}
                        disabled={!meal.enabled}
                        onChange={(e) => handleShareChange(meal.id, e.target.value)}
                        className="bg-transparent w-10 text-center text-emerald-400 font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-1.5 pl-6 leading-relaxed">
                  {meal.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="pt-3 border-t border-gym-700/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToChile}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer estándar chileno</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-gym-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-95 text-gym-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Guardado en Cloud!</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Guardar para Ambos Teléfonos</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
