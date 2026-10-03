import React, { useState, useEffect } from 'react';
import { 
  X, 
  Dna, 
  Flame, 
  Scale, 
  Activity, 
  Target, 
  ShieldCheck, 
  Check, 
  Info, 
  Sparkles,
  TrendingDown,
  HelpCircle,
  Apple
} from 'lucide-react';
import { USERS } from '../data/workoutCatalog';
import { 
  getAthleteBiometrics, 
  saveAthleteBiometrics, 
  calculateAthleteNutrition,
  ACTIVITY_MULTIPLIERS,
  GOAL_PRESETS 
} from '../services/nutritionCalculator';
import confetti from 'canvas-confetti';

export function BiometricsModal({ isOpen, onClose, householdId, initialAthlete = 'dionicio', onSaved }) {
  const [selectedAthlete, setSelectedAthlete] = useState(initialAthlete);
  const [formData, setFormData] = useState(() => getAthleteBiometrics(initialAthlete, householdId));
  const [activePlan, setActivePlan] = useState(() => calculateAthleteNutrition(initialAthlete, householdId));
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedAthlete(initialAthlete);
      const bio = getAthleteBiometrics(initialAthlete, householdId);
      setFormData(bio);
      setActivePlan(calculateAthleteNutrition(initialAthlete, householdId));
    }
  }, [isOpen, initialAthlete, householdId]);

  const handleAthleteChange = (athleteId) => {
    setSelectedAthlete(athleteId);
    const bio = getAthleteBiometrics(athleteId, householdId);
    setFormData(bio);
    setActivePlan(calculateAthleteNutrition(athleteId, householdId));
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    // Recalcular dinámicamente el plan para visualización en vivo
    const tempPlan = calculateAthleteNutrition(selectedAthlete, householdId, updated.currentWeightKg);
    setActivePlan(tempPlan);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveAthleteBiometrics(selectedAthlete, {
      age: Number(formData.age),
      heightCm: Number(formData.heightCm),
      baselineWeightKg: Number(formData.currentWeightKg),
      activityLevel: formData.activityLevel,
      goal: formData.goal,
      deficitPct: Number(formData.deficitPct),
      proteinPerKg: Number(formData.proteinPerKg),
      fatPerKg: Number(formData.fatPerKg)
    }, householdId);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {}

    if (onSaved) onSaved();
    onClose();
  };

  if (!isOpen) return null;

  const isDionicio = selectedAthlete === 'dionicio';
  const athleteColor = isDionicio ? 'sky' : 'pink';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gym-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gym-900 border border-gym-700 rounded-3xl w-full max-w-2xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gym-800 flex items-center justify-between bg-gym-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                <span>Perfil Biométrico & Necesidades Científicas</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Fórmulas clínicas de Mifflin-St Jeor + TDEE. Sin números al azar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gym-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Athlete Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-gym-950/80 p-1 rounded-2xl border border-gym-800">
            <button
              type="button"
              onClick={() => handleAthleteChange('dionicio')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                isDionicio
                  ? 'bg-sky-500 text-gym-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👨‍💻 Dionicio</span>
              <span className="text-[10px] opacity-80">(180 cm)</span>
            </button>
            <button
              type="button"
              onClick={() => handleAthleteChange('paula')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                !isDionicio
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👩‍💼 Paula</span>
              <span className="text-[10px] opacity-80">(160 cm)</span>
            </button>
          </div>

          {/* Real-time Scientific Diagnosis Dashboard */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gym-950 to-gym-900 border border-gym-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Diagnóstico Metabólico Calculado</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showFormulaInfo ? 'Ocultar ecuación' : 'Ver fórmula clínica'}</span>
              </button>
            </div>

            {showFormulaInfo && (
              <div className="p-3.5 rounded-xl bg-gym-900/95 border border-amber-500/40 text-[11px] text-slate-300 space-y-2 font-mono">
                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Calibración Clínica Realista (Sin la Trampa del TDEE Inflado)</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                  Los algoritmos genéricos asumen factores de actividad inflados (&ge;1.55) sugiriendo 2.200 kcal, lo cual detiene la pérdida de grasa por el bajo NEAT de un trabajo de escritorio.
                </p>
                <div className="p-2.5 rounded-lg bg-gym-950 border border-gym-800 space-y-1 text-[11px]">
                  <div>• <strong>TMB Mifflin-St Jeor:</strong> {activePlan.bmr} kcal/día en reposo absoluto.</div>
                  <div>• <strong>TDEE Real (Oficina + 1h Dúo, PAL {activePlan.palMultiplier}):</strong> ~{activePlan.tdee} kcal/día.</div>
                  <div>• <strong>Déficit Real ({activePlan.deficitKcal} kcal/día):</strong> financiado por reservas de tejido adiposo.</div>
                  <div>• <strong>Meta Calórica Diaria:</strong> <strong className="text-emerald-400">{activePlan.targetCals} kcal</strong> (permite oxidar ~0.7 kg grasa pura/semana).</div>
                  <div>• <strong>Proteína ({activePlan.targetProtein}g):</strong> calculada sobre masa magra ({activePlan.leanMassKg} kg), no sobre tejido graso.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Tasa Basal (BMR)</span>
                <strong className="text-sm sm:text-base font-black text-white font-mono">{activePlan.bmr}</strong>
                <span className="text-[9px] text-slate-500 block">kcal/día en reposo</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Gasto Total (TDEE)</span>
                <strong className="text-sm sm:text-base font-black text-amber-400 font-mono">{activePlan.tdee}</strong>
                <span className="text-[9px] text-slate-500 block">kcal con entreno</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-emerald-500/40 text-center bg-emerald-500/10">
                <span className="text-[10px] text-emerald-300 block uppercase font-bold">Meta Calórica</span>
                <strong className="text-sm sm:text-base font-black text-emerald-400 font-mono">{activePlan.targetCals}</strong>
                <span className="text-[9px] text-emerald-300/80 block">kcal para cerrar</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">IMC Actual</span>
                <strong className="text-sm sm:text-base font-black text-sky-400 font-mono">{activePlan.bmi}</strong>
                <span className="text-[9px] text-slate-400 block truncate">{activePlan.bmiCategory}</span>
              </div>
            </div>

            {/* Target Macronutrient Breakdown */}
            <div className="pt-2 border-t border-gym-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30">
                <span className="text-[10px] text-sky-400 block font-bold">Proteína ({activePlan.macroPercentages.proteinPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetProtein}g</strong>
                <span className="text-[9px] text-slate-400 block">({formData.proteinPerKg} g/kg)</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-[10px] text-amber-400 block font-bold">Carbohidratos ({activePlan.macroPercentages.carbsPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetCarbs}g</strong>
                <span className="text-[9px] text-slate-400 block">(energía entreno)</span>
              </div>
              <div className="p-2 rounded-xl bg-pink-950/40 border border-pink-500/30">
                <span className="text-[10px] text-pink-400 block font-bold">Grasas ({activePlan.macroPercentages.fatsPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetFats}g</strong>
                <span className="text-[9px] text-slate-400 block">({formData.fatPerKg} g/kg)</span>
              </div>
            </div>
          </div>

          {/* Form to Edit Biometric Constants */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Edad (años)
                </label>
                <input
                  type="number"
                  min="18"
                  max="90"
                  value={formData.age}
                  onChange={(e) => handleFieldChange('age', e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  min="130"
                  max="220"
                  value={formData.heightCm}
                  onChange={(e) => handleFieldChange('heightCm', e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Peso Activo (kg)
                  {formData.isWeightFromLog && (
                    <span className="text-[10px] text-emerald-400 ml-1 font-normal">(de pesajes)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="40"
                  max="180"
                  value={formData.currentWeightKg}
                  onChange={(e) => handleFieldChange('currentWeightKg', e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nivel de Actividad Física (PAL)
                </label>
                <select
                  value={formData.activityLevel}
                  onChange={(e) => handleFieldChange('activityLevel', e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, opt]) => (
                    <option key={key} value={key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Objetivo Nutricional
                </label>
                <select
                  value={formData.goal}
                  onChange={(e) => {
                    const goal = e.target.value;
                    const defDeficit = GOAL_PRESETS[goal]?.defaultDeficit || 15;
                    setFormData(prev => ({ ...prev, goal, deficitPct: defDeficit }));
                    setActivePlan(calculateAthleteNutrition(selectedAthlete, householdId, formData.currentWeightKg));
                  }}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(GOAL_PRESETS).map(([key, opt]) => (
                    <option key={key} value={key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Macro Ratio Sliders */}
            <div className="p-3 rounded-2xl bg-gym-950/60 border border-gym-800 space-y-2 text-xs">
              <span className="font-bold text-slate-300 block text-[11px]">
                Ajuste Avanzado de Macronutrientes por Peso Corporal
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                    <span>Proteína: <strong className="text-sky-400">{formData.proteinPerKg} g/kg</strong></span>
                    <span>Total: ~{Math.round(formData.currentWeightKg * formData.proteinPerKg)}g</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.4"
                    step="0.1"
                    value={formData.proteinPerKg}
                    onChange={(e) => handleFieldChange('proteinPerKg', e.target.value)}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                    <span>Grasas Saludables: <strong className="text-pink-400">{formData.fatPerKg} g/kg</strong></span>
                    <span>Total: ~{Math.round(formData.currentWeightKg * formData.fatPerKg)}g</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.2"
                    step="0.05"
                    value={formData.fatPerKg}
                    onChange={(e) => handleFieldChange('fatPerKg', e.target.value)}
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-gym-800 hover:bg-gym-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-gym-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Biometría y Recalcular Metas</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
