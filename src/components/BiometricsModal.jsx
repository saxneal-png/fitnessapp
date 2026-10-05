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
  TrendingUp,
  HelpCircle,
  Apple,
  Zap,
  Dumbbell,
  Shield,
  Ruler,
  Award,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { USERS } from '../data/workoutCatalog';
import { getAllAthletes } from '../services/authService';
import { 
  getAthleteBiometrics, 
  saveAthleteBiometrics, 
  saveAthleteMode,
  toggleAthleteDigestiveProtection,
  calculateAthleteNutrition,
  evaluateAthleteModeRecommendation,
  ACTIVITY_MULTIPLIERS,
  FITNESS_MODES,
  GOAL_PRESETS 
} from '../services/nutritionCalculator';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export function BiometricsModal({ isOpen, onClose, householdId, initialAthlete = 'dionicio', onSaved }) {
  const { isDuoHousehold, currentUser: authUser, allUsers: householdUsers } = useAuth();
  const availableAthletes = isDuoHousehold 
    ? { dionicio: USERS.dionicio, paula: USERS.paula } 
    : householdUsers;
  const startAthlete = isDuoHousehold ? initialAthlete : (authUser || initialAthlete);

  const [selectedAthlete, setSelectedAthlete] = useState(startAthlete);
  const [formData, setFormData] = useState(() => getAthleteBiometrics(startAthlete, householdId));
  const [activePlan, setActivePlan] = useState(() => calculateAthleteNutrition(startAthlete, householdId));
  const [recommendation, setRecommendation] = useState(() => evaluateAthleteModeRecommendation(startAthlete, householdId));
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = isDuoHousehold ? initialAthlete : (authUser || initialAthlete);
      setSelectedAthlete(current);
      const bio = getAthleteBiometrics(current, householdId);
      setFormData(bio);
      setActivePlan(calculateAthleteNutrition(current, householdId));
      setRecommendation(evaluateAthleteModeRecommendation(current, householdId));
    }
  }, [isOpen, initialAthlete, householdId, isDuoHousehold, authUser]);

  const handleAthleteChange = (athleteId) => {
    setSelectedAthlete(athleteId);
    const bio = getAthleteBiometrics(athleteId, householdId);
    setFormData(bio);
    setActivePlan(calculateAthleteNutrition(athleteId, householdId));
    setRecommendation(evaluateAthleteModeRecommendation(athleteId, householdId));
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    // Recalcular dinámicamente el plan para visualización en vivo
    const tempPlan = calculateAthleteNutrition(selectedAthlete, householdId, updated.currentWeightKg);
    setActivePlan(tempPlan);
    setRecommendation(evaluateAthleteModeRecommendation(selectedAthlete, householdId));
  };

  const handleSelectMode = (modeId) => {
    const updated = { ...formData, activeMode: modeId };
    setFormData(updated);
    saveAthleteMode(selectedAthlete, modeId, householdId);
    setActivePlan(calculateAthleteNutrition(selectedAthlete, householdId, updated.currentWeightKg));
    setRecommendation(evaluateAthleteModeRecommendation(selectedAthlete, householdId));

    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.85 }
      });
    } catch (e) {}
  };

  const handleApplyRecommendation = () => {
    if (recommendation?.recommendedMode) {
      handleSelectMode(recommendation.recommendedMode);
    }
  };

  const handleToggleDigestive = (enabled) => {
    const updated = { ...formData, digestiveProtection: enabled };
    setFormData(updated);
    toggleAthleteDigestiveProtection(selectedAthlete, enabled, householdId);
    setActivePlan(calculateAthleteNutrition(selectedAthlete, householdId, updated.currentWeightKg));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveAthleteBiometrics(selectedAthlete, {
      age: Number(formData.age),
      heightCm: Number(formData.heightCm),
      baselineWeightKg: Number(formData.currentWeightKg),
      waistCm: formData.waistCm ? Number(formData.waistCm) : null,
      hipsCm: formData.hipsCm ? Number(formData.hipsCm) : null,
      activityLevel: formData.activityLevel,
      activeMode: formData.activeMode,
      goal: formData.activeMode === 'visceral_fat_loss' ? 'aggressive_fat_loss' : formData.activeMode,
      digestiveProtection: Boolean(formData.digestiveProtection),
      maxFatsCap: Number(formData.maxFatsCap) || (selectedAthlete === 'paula' ? 42 : 45),
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
  const currentModeInfo = FITNESS_MODES[formData.activeMode] || FITNESS_MODES.visceral_fat_loss;
  const isRecommendedActive = formData.activeMode === recommendation.recommendedMode;

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
                <span>Modos Fisiológicos & Perfil Biométrico</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Ajuste inteligente por medidas corporales, grasa visceral y objetivos del atleta.
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
          {/* Athlete Selector Tabs (Solo en hogar Dúo) */}
          {isDuoHousehold ? (
            <div className="flex gap-2 bg-gym-950/80 p-1.5 rounded-2xl border border-gym-800 overflow-x-auto scrollbar-none">
              {Object.values(availableAthletes).map((ath) => (
                <button
                  key={ath.uid}
                  type="button"
                  onClick={() => handleAthleteChange(ath.uid)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    selectedAthlete === ath.uid
                      ? 'bg-sky-500 text-gym-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white bg-gym-900/40'
                  }`}
                >
                  <span>{ath.avatar || '🏋️‍♂️'} {ath.name}</span>
                  <span className="text-[10px] opacity-80 font-normal">({ath.height || `${ath.heightCm || 175} cm`})</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gym-950/80 rounded-2xl border border-gym-800 text-xs font-bold text-slate-300">
              <span className="text-base">{availableAthletes[selectedAthlete]?.avatar || '🏋️‍♂️'}</span>
              <span>Perfil individual de <strong>{availableAthletes[selectedAthlete]?.name || 'Mi Perfil'}</strong></span>
            </div>
          )}

          {/* TARJETA 1: RECOMENDACIÓN INTELIGENTE SEGÚN MEDIDAS REALES */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isRecommendedActive
              ? 'bg-gradient-to-br from-gym-950 via-gym-900 to-gym-950 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
              : 'bg-gradient-to-br from-amber-950/30 via-gym-900 to-gym-950 border-amber-500/50 shadow-lg shadow-amber-500/10'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Recomendación del Asesor Deportivo
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-300 bg-gym-800/80 px-2 py-0.5 rounded-lg border border-gym-700">
                  Cintura: <strong className="text-white">{recommendation.waistCm} cm</strong> (Ratio: <strong className="text-amber-400">{recommendation.waistHeightRatio}</strong>)
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gym-800 text-slate-400 border border-gym-700">
                  {recommendation.riskLevel}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {recommendation.clinicalRationale}
            </p>

            {/* Aviso de Bloqueo Clínico si WHtR >= 0.50 */}
            {recommendation.isHypertrophyBlocked && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Aviso Clínico:</strong> El modo Aumento Muscular está bloqueado preventivamente por exceso de grasa visceral. Primero debes reducir la cintura a &lt; {recommendation.targetWaistGoalCm} cm.
                </span>
              </div>
            )}

            {/* Control Interactivo de Protección Digestiva según Atleta */}
            <div className={`mb-3 p-3 rounded-2xl border transition-all ${
              formData.digestiveProtection 
                ? 'bg-sky-950/40 border-sky-500/40' 
                : 'bg-gym-900/60 border-gym-750'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    formData.digestiveProtection 
                      ? 'bg-sky-500/20 text-sky-400' 
                      : 'bg-gym-800 text-slate-500'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-white">
                        Protección Digestiva Clínico-Intestinal
                      </strong>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        formData.digestiveProtection 
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                          : 'bg-gym-800 text-slate-400 border border-gym-700'
                      }`}>
                        {formData.digestiveProtection ? 'Activada' : 'Desactivada'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {formData.digestiveProtection ? (
                        <>
                          <strong>Techo estricto de grasa ({formData.maxFatsCap || (selectedAthlete === 'paula' ? 42 : 45)}g/día)</strong> para cuidar la vesícula biliar y prevenir reflujo o colon irritable. La energía adicional se financia con carbohidratos limpios.
                        </>
                      ) : (
                        <>
                          Límites liberados. Las grasas se calculan por ratio estándar del modo metabólico sin hard cap estricto.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleDigestive(!formData.digestiveProtection)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                    formData.digestiveProtection
                      ? 'bg-sky-500 hover:bg-sky-400 text-gym-950'
                      : 'bg-gym-800 hover:bg-gym-700 text-slate-300 border border-gym-700'
                  }`}
                >
                  <span>{formData.digestiveProtection ? 'Desactivar' : 'Activar'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-gym-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  <strong>Próximo Hito:</strong> {recommendation.milestoneToNextMode}
                </span>
              </div>

              {!isRecommendedActive && (
                <button
                  type="button"
                  onClick={handleApplyRecommendation}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-gym-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar Modo Recomendado ({recommendation.recommendedModeConfig?.shortName})</span>
                </button>
              )}

              {isRecommendedActive && (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Modo Óptimo Activo</span>
                </span>
              )}
            </div>
          </div>

          {/* TARJETA 2: SELECTOR INTERACTIVO DE MODOS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Modo de Enfoque Fisiológico Activo</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Selecciona tu objetivo metabólico actual
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(FITNESS_MODES).map(([modeKey, mode]) => {
                const isSelected = formData.activeMode === modeKey;
                const isRecommended = recommendation.recommendedMode === modeKey;
                const isBlocked = modeKey === 'hypertrophy_muscle_gain' && recommendation.isHypertrophyBlocked;

                return (
                  <button
                    key={modeKey}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => {
                      if (isBlocked) return;
                      handleSelectMode(modeKey);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isBlocked
                        ? 'bg-gym-950/40 border-rose-900/30 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'bg-gym-800/90 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                          : 'bg-gym-950/60 border-gym-800 hover:border-gym-700 hover:bg-gym-900/60'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>{mode.icon}</span>
                          <span>{mode.name}</span>
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-gym-950 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                        {isBlocked && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                            Bloqueado
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {isBlocked ? recommendation.hypertrophyBlockedReason : mode.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gym-800/80 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-300">
                        {mode.targetDeficitKcal[selectedAthlete] > 0
                          ? `Déficit -${mode.targetDeficitKcal[selectedAthlete]} kcal`
                          : (mode.targetDeficitKcal[selectedAthlete] < 0 
                              ? `Superávit +${Math.abs(mode.targetDeficitKcal[selectedAthlete])} kcal` 
                              : '0 kcal (Mantenimiento)')}
                      </span>

                      {isRecommended && !isBlocked && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                          Recomendado IA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TARJETA 3: DIAGNÓSTICO METABÓLICO EN VIVO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gym-950 to-gym-900 border border-gym-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Metas Calculadas para el Modo: {currentModeInfo.shortName}</span>
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
                  <span>Calibración Realista por Masa Magra & Antropometría</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                  {activePlan.formulaDetails.formulaName}: TMB calculada con Mifflin-St Jeor multiplicada por PAL realista de oficina (1.32 para Dionicio, 1.28 para Paula).
                </p>
                <div className="p-2.5 rounded-lg bg-gym-950 border border-gym-800 space-y-1 text-[11px]">
                  <div>• <strong>TMB Mifflin-St Jeor:</strong> {activePlan.bmr} kcal/día en reposo absoluto.</div>
                  <div>• <strong>TDEE Total ({activePlan.activityLabel}):</strong> ~{activePlan.tdee} kcal/día.</div>
                  <div>• <strong>Ajuste del Modo:</strong> {activePlan.formulaDetails.adjustment}.</div>
                  <div>• <strong>Meta Diaria:</strong> <strong className="text-emerald-400">{activePlan.targetCals} kcal</strong>.</div>
                  <div>• <strong>Proteína ({activePlan.targetProtein}g):</strong> {activePlan.formulaDetails.proteinTargetInfo}.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Tasa Basal (BMR)</span>
                <strong className="text-sm sm:text-base font-black text-white font-mono">{activePlan.bmr}</strong>
                <span className="text-[9px] text-slate-500 block">kcal/día reposo</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Gasto Total (TDEE)</span>
                <strong className="text-sm sm:text-base font-black text-amber-400 font-mono">{activePlan.tdee}</strong>
                <span className="text-[9px] text-slate-500 block">kcal con entreno</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-emerald-500/40 text-center bg-emerald-500/10">
                <span className="text-[10px] text-emerald-300 block uppercase font-bold">Meta Calórica</span>
                <strong className="text-sm sm:text-base font-black text-emerald-400 font-mono">{activePlan.targetCals}</strong>
                <span className="text-[9px] text-emerald-300/80 block">kcal objetivo</span>
              </div>
              <div className="bg-gym-900/80 p-2.5 rounded-xl border border-gym-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">IMC & Estado</span>
                <strong className="text-sm sm:text-base font-black text-sky-400 font-mono">{activePlan.bmi}</strong>
                <span className="text-[9px] text-slate-400 block truncate">{activePlan.bmiCategory}</span>
              </div>
            </div>

            {/* Target Macronutrient Breakdown */}
            <div className="pt-2 border-t border-gym-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30">
                <span className="text-[10px] text-sky-400 block font-bold">Proteína ({activePlan.macroPercentages.proteinPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetProtein}g</strong>
                <span className="text-[9px] text-slate-400 block">({(activePlan.targetProtein / activePlan.weightKg).toFixed(1)} g/kg)</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-[10px] text-amber-400 block font-bold">Carbohidratos ({activePlan.macroPercentages.carbsPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetCarbs}g</strong>
                <span className="text-[9px] text-slate-400 block">(energía entreno)</span>
              </div>
              <div className="p-2 rounded-xl bg-pink-950/40 border border-pink-500/30">
                <span className="text-[10px] text-pink-400 block font-bold">Grasas ({activePlan.macroPercentages.fatsPct}%)</span>
                <strong className="text-white text-sm">{activePlan.targetFats}g</strong>
                <span className="text-[9px] text-slate-400 block">({(activePlan.targetFats / activePlan.weightKg).toFixed(2)} g/kg)</span>
              </div>
            </div>
          </div>

          {/* FORMULARIO DE MEDIDAS & CALIBRACIÓN BIOMÉTRICA */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-t border-gym-800 pt-3">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-2">
                Medidas Corporales & Antropometría
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

                <div>
                  <label className="block text-[11px] font-bold text-pink-400 mb-1 flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    <span>Cintura (cm)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="50"
                    max="160"
                    placeholder="Ej: 92"
                    value={formData.waistCm || ''}
                    onChange={(e) => handleFieldChange('waistCm', e.target.value)}
                    className="w-full bg-gym-950 border border-pink-500/40 rounded-xl px-3 py-2 text-xs text-pink-300 font-mono font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>
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
                  Cadera Opcional (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="60"
                  max="160"
                  placeholder="Ej: 102"
                  value={formData.hipsCm || ''}
                  onChange={(e) => handleFieldChange('hipsCm', e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
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
                <span>Guardar Modos & Medidas</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
