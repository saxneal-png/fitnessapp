import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Heart
} from 'lucide-react';
import { USERS } from '../data/workoutCatalog';
import { 
  EQUIPMENT_ITEMS, 
  DURATION_OPTIONS, 
  WEEKLY_FREQUENCY_OPTIONS, 
  FOCUS_AREAS, 
  JOINT_CONCERNS 
} from '../data/equipmentCatalog';
import { 
  getAthleteBiometrics, 
  saveAthleteBiometrics, 
  saveAthleteMode,
  toggleAthleteDigestiveProtection,
  calculateAthleteNutrition,
  evaluateAthleteModeRecommendation,
  calculateNavyBodyFat,
  ACTIVITY_MULTIPLIERS,
  FITNESS_MODES 
} from '../services/nutritionCalculator';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export function BiometricsModal({ isOpen, onClose, householdId, initialAthlete = 'dionicio', onSaved }) {
  const { isDuoHousehold, currentUser: authUser, allUsers: householdUsers } = useAuth();
  const availableAthletes = isDuoHousehold 
    ? { dionicio: USERS.dionicio, paula: USERS.paula } 
    : householdUsers;
  const startAthlete = isDuoHousehold ? initialAthlete : (authUser || initialAthlete);

  const [activeTab, setActiveTab] = useState('biometrics'); // 'biometrics' | 'equipment' | 'schedule'
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
    const tempPlan = calculateAthleteNutrition(selectedAthlete, householdId, updated.currentWeightKg);
    setActivePlan(tempPlan);
    setRecommendation(evaluateAthleteModeRecommendation(selectedAthlete, householdId));
  };

  const handleExtendedMeasurementChange = (field, value) => {
    const updatedMeasurements = {
      ...(formData.extendedMeasurements || {}),
      [field]: value ? Number(value) : null
    };
    handleFieldChange('extendedMeasurements', updatedMeasurements);
  };

  const handleEquipmentToggle = (equipmentId) => {
    const currentEquip = { ...(formData.equipment || {}) };
    const key = `has${equipmentId.charAt(0).toUpperCase() + equipmentId.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}`;
    currentEquip[key] = !currentEquip[key];
    handleFieldChange('equipment', currentEquip);
  };

  const handleEquipmentWeightChange = (key, value) => {
    const currentEquip = { ...(formData.equipment || {}) };
    currentEquip[key] = Number(value) || 0;
    handleFieldChange('equipment', currentEquip);
  };

  const handleScheduleChange = (field, value) => {
    const updatedSchedule = {
      ...(formData.schedule || {}),
      [field]: value
    };
    handleFieldChange('schedule', updatedSchedule);
  };

  const handleToggleJointConcern = (concernId) => {
    const currentConcerns = Array.isArray(formData.jointConcerns) ? [...formData.jointConcerns] : [];
    const exists = currentConcerns.includes(concernId);
    const nextConcerns = exists 
      ? currentConcerns.filter(c => c !== concernId) 
      : [...currentConcerns, concernId];
    handleFieldChange('jointConcerns', nextConcerns);
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

  // Cálculo en vivo del % de grasa corporal por método de la Marina
  const navyFatPct = useMemo(() => {
    return calculateNavyBodyFat({
      gender: formData.gender || (selectedAthlete === 'paula' ? 'female' : 'male'),
      heightCm: formData.heightCm,
      waistCm: formData.waistCm,
      neckCm: formData.extendedMeasurements?.neckCm,
      hipsCm: formData.hipsCm
    });
  }, [formData.gender, formData.heightCm, formData.waistCm, formData.extendedMeasurements?.neckCm, formData.hipsCm, selectedAthlete]);

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
      fatPerKg: Number(formData.fatPerKg),
      equipment: formData.equipment || {},
      schedule: formData.schedule || {},
      jointConcerns: formData.jointConcerns || [],
      extendedMeasurements: formData.extendedMeasurements || {}
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

  const currentModeInfo = FITNESS_MODES[formData.activeMode] || FITNESS_MODES.visceral_fat_loss;
  const isRecommendedActive = formData.activeMode === recommendation.recommendedMode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gym-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gym-900 border border-gym-700 rounded-3xl w-full max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gym-800 flex items-center justify-between bg-gym-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                <span>Perfil Personalizado del Atleta</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Biometría 360°, inventario de equipamiento y horarios para que el Coach diseñe planes focalizados.
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
              <span>Configuración individual de <strong>{availableAthletes[selectedAthlete]?.name || 'Mi Perfil'}</strong></span>
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-gym-800 gap-2 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('biometrics')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'biometrics'
                  ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>1. Medidas & Biometría</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('equipment')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'equipment'
                  ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>2. Mi Equipamiento</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>3. Tiempos & Enfoque</span>
            </button>
          </div>

          {/* TAB 1: BIOMETRÍA & MEDIDAS CORPORALES */}
          {activeTab === 'biometrics' && (
            <div className="space-y-5 animate-fadeIn">
              {/* RECOMENDACIÓN INTELIGENTE */}
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
                    {navyFatPct && (
                      <span className="text-[11px] font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-500/30">
                        Grasa Navy: <strong>{navyFatPct}%</strong>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {recommendation.clinicalRationale}
                </p>

                {recommendation.isHypertrophyBlocked && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Aviso Clínico:</strong> El modo Aumento Muscular está bloqueado preventivamente por exceso de grasa visceral. Primero debes reducir la cintura a &lt; {recommendation.targetWaistGoalCm} cm.
                    </span>
                  </div>
                )}

                {/* Control Interactivo de Protección Digestiva */}
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
                              <strong>Techo estricto de grasa ({formData.maxFatsCap || (selectedAthlete === 'paula' ? 42 : 45)}g/día)</strong> para cuidar la vesícula biliar y prevenir reflujo o distensión.
                            </>
                          ) : (
                            <>
                              Límites liberados. Las grasas se calculan por ratio estándar del modo metabólico.
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
                      <span>Aplicar Modo ({recommendation.recommendedModeConfig?.shortName})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SELECTOR DE MODOS FISIOLÓGICOS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span>Modo Metabólico Activo</span>
                  </label>
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
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                            {isBlocked ? recommendation.hypertrophyBlockedReason : mode.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MEDIDAS Y ANTROPOMETRÍA 360° */}
              <div className="p-4 rounded-2xl bg-gym-950 border border-gym-800 space-y-3">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-pink-400" />
                  <span>Medidas Corporales & Antropometría Completa</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Edad (años)</label>
                    <input
                      type="number"
                      min="18"
                      max="90"
                      value={formData.age}
                      onChange={(e) => handleFieldChange('age', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      min="130"
                      max="220"
                      value={formData.heightCm}
                      onChange={(e) => handleFieldChange('heightCm', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Peso Activo (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="40"
                      max="180"
                      value={formData.currentWeightKg}
                      onChange={(e) => handleFieldChange('currentWeightKg', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-pink-400 mb-1">Cintura (cm) *Visceral</label>
                    <input
                      type="number"
                      step="0.5"
                      min="50"
                      max="160"
                      value={formData.waistCm || ''}
                      onChange={(e) => handleFieldChange('waistCm', e.target.value)}
                      className="w-full bg-gym-900 border border-pink-500/40 rounded-xl px-3 py-2 text-xs text-pink-300 font-mono font-bold focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Medidas Circunferenciales Extendidas */}
                <div className="pt-2 border-t border-gym-850 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Cuello (cm) *Navy</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 39"
                      value={formData.extendedMeasurements?.neckCm || ''}
                      onChange={(e) => handleExtendedMeasurementChange('neckCm', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Cadera (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 102"
                      value={formData.hipsCm || ''}
                      onChange={(e) => handleFieldChange('hipsCm', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Pecho (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 100"
                      value={formData.extendedMeasurements?.chestCm || ''}
                      onChange={(e) => handleExtendedMeasurementChange('chestCm', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Brazo (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ej: 34"
                      value={formData.extendedMeasurements?.armCm || ''}
                      onChange={(e) => handleExtendedMeasurementChange('armCm', e.target.value)}
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* DESGLOSE CLÍNICO: MASA MAGRA & METAS BIOQUÍMICAS */}
              {activePlan && (
                <div className="p-4 rounded-2xl bg-gym-900/90 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-gym-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Dna className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase text-white tracking-wider">
                        Composición Corporal & Metas Nutricionales de Precisión
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Proteína: {activePlan.proteinMultiplierLbm} g/kg LBM
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-gym-950/80 p-2.5 rounded-xl border border-gym-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Masa Magra (LBM)</span>
                      <span className="text-sm font-black text-white font-mono">{activePlan.leanMassKg} kg</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Tejido muscular activo</span>
                    </div>

                    <div className="bg-gym-950/80 p-2.5 rounded-xl border border-gym-800">
                      <span className="text-[10px] text-pink-400 uppercase block font-semibold">Masa Grasa</span>
                      <span className="text-sm font-black text-pink-300 font-mono">{activePlan.fatMassKg} kg</span>
                      <span className="text-[9px] text-pink-400/80 block mt-0.5">{activePlan.bodyFatPct}% Grasa</span>
                    </div>

                    <div className="bg-gym-950/80 p-2.5 rounded-xl border border-gym-800">
                      <span className="text-[10px] text-sky-400 uppercase block font-semibold">BMR Katch-McArdle</span>
                      <span className="text-sm font-black text-sky-300 font-mono">{activePlan.bmr} kcal</span>
                      <span className="text-[9px] text-sky-400/80 block mt-0.5">TDEE ~{activePlan.tdee} kcal</span>
                    </div>

                    <div className="bg-gym-950/80 p-2.5 rounded-xl border border-gym-800">
                      <span className="text-[10px] text-emerald-400 uppercase block font-semibold">Meta Calórica</span>
                      <span className="text-sm font-black text-emerald-300 font-mono">{activePlan.targetCals} kcal</span>
                      <span className="text-[9px] text-emerald-400/80 block mt-0.5">
                        {activePlan.deficitKcal > 0 ? `-${activePlan.deficitKcal} déficit` : 'Mantenimiento'}
                      </span>
                    </div>
                  </div>

                  {/* Macronutrientes Resultantes */}
                  <div className="p-2.5 bg-gym-950/90 rounded-xl border border-gym-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-emerald-300 font-bold">
                      🍗 Proteína: {activePlan.targetProtein}g ({activePlan.proteinMultiplierLbm} g/kg LBM)
                    </span>
                    <span className="text-amber-300 font-bold">
                      🥑 Grasas: {activePlan.targetFats}g {activePlan.digestiveProtection && '(🛡️ Techo)'}
                    </span>
                    <span className="text-sky-300 font-bold">
                      🍚 Carbos: {activePlan.targetCarbs}g
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MI EQUIPAMIENTO */}
          {activeTab === 'equipment' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-500/30">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
                  <Dumbbell className="w-4 h-4" />
                  <span>Inventario de Entrenamiento de {availableAthletes[selectedAthlete]?.name}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  El Coach adaptará los ejercicios únicamente al material que marques como disponible aquí.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EQUIPMENT_ITEMS.map((item) => {
                  const key = `has${item.id.charAt(0).toUpperCase() + item.id.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}`;
                  const isChecked = Boolean(formData.equipment?.[key]);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isChecked 
                          ? 'bg-gym-800/90 border-sky-500/60 shadow-md shadow-sky-500/5' 
                          : 'bg-gym-950/60 border-gym-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-2xl mt-0.5">{item.icon}</span>
                          <div>
                            <span className="text-xs font-black text-white block">{item.name}</span>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEquipmentToggle(item.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-sky-500 text-gym-950 font-black'
                              : 'bg-gym-900 border border-gym-700 text-transparent hover:border-slate-500'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>

                      {/* Parámetro de peso si está activo */}
                      {isChecked && item.hasWeightParam && (
                        <div className="mt-3 pt-2.5 border-t border-gym-750 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-300 font-medium">Peso Máximo Disponible:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={formData.equipment?.[`${item.id}MaxWeightKg`] || formData.equipment?.maxDumbbellWeightPerHandKg || (item.id === 'dumbbells' ? 20 : 16)}
                              onChange={(e) => {
                                const paramKey = item.id === 'dumbbells' ? 'maxDumbbellWeightPerHandKg' : `${item.id}MaxWeightKg`;
                                handleEquipmentWeightChange(paramKey, e.target.value);
                              }}
                              className="w-20 bg-slate-900 border-2 border-sky-500/50 focus:border-sky-400 rounded-xl px-2.5 py-1 text-center font-mono font-black text-sky-300 text-sm focus:outline-none shadow-inner"
                            />
                            <span className="text-xs text-slate-300 font-mono font-bold">{item.weightUnit || 'kg'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TIEMPOS, FRECUENCIA & ENFOQUE FOCALIZADO */}
          {activeTab === 'schedule' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Duración de Sesión */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Duración Disponible por Sesión</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DURATION_OPTIONS.map((dur) => {
                    const isSelected = (formData.schedule?.sessionDurationMinutes || 60) === dur.value;
                    return (
                      <button
                        key={dur.value}
                        type="button"
                        onClick={() => handleScheduleChange('sessionDurationMinutes', dur.value)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                            : 'bg-gym-950/60 border-gym-800 text-slate-400 hover:border-gym-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-sm text-white font-mono">{dur.value} min</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gym-900 border border-gym-700 text-slate-300">
                            {dur.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{dur.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frecuencia Semanal */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Días por Semana Disponibles</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WEEKLY_FREQUENCY_OPTIONS.map((freq) => {
                    const isSelected = (formData.schedule?.weeklyDaysTarget || 4) === freq.days;
                    return (
                      <button
                        key={freq.days}
                        type="button"
                        onClick={() => handleScheduleChange('weeklyDaysTarget', freq.days)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-gym-950 font-black shadow-md shadow-sky-500/20'
                            : 'bg-gym-950/60 border-gym-800 text-slate-300 hover:border-gym-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{freq.label}</span>
                        <span className="text-[9px] opacity-80 block truncate">{freq.splitSuggestion}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área de Enfoque Focalizado */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>Área Muscular Prioritaria / Enfoque</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FOCUS_AREAS.map((f) => {
                    const isSelected = (formData.schedule?.focusArea || 'balanced') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleScheduleChange('focusArea', f.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-pink-950/40 border-pink-500 text-white shadow-md shadow-pink-500/10 ring-1 ring-pink-500/50'
                            : 'bg-gym-950/60 border-gym-800 text-slate-400 hover:border-gym-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{f.icon}</span>
                          <span className="text-xs font-black text-white">{f.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cuidados Articulares y Lesiones */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-gym-950 border border-gym-800">
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Seguridad Biomecánica & Cuidados Articulares</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Selecciona si tienes zonas sensibles. El Coach filtrará ejercicios de riesgo (ej. cizalla lumbar o sobrecarga cervical):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {JOINT_CONCERNS.map((c) => {
                    const isChecked = Array.isArray(formData.jointConcerns) && formData.jointConcerns.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleJointConcern(c.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-start gap-2 ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                            : 'bg-gym-900/60 border-gym-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-sm shrink-0">{c.icon}</span>
                        <span className="text-[11px] leading-tight font-medium">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-gym-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gym-800 hover:bg-gym-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-gym-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Perfil & Equipamiento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
