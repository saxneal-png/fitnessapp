import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  db,
  isInitialized,
  saveWeightEntry, 
  deleteWeightEntry, 
  getLocalWeightEntries
} from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { getLocalDateString } from '../utils/dateUtils';
import { 
  Scale, 
  Ruler, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  Trash2, 
  Clock, 
  Activity, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Target, 
  Dna, 
  Zap, 
  Check,
  Dumbbell,
  ShieldCheck,
  Layers,
  Flame,
  Shield,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  FITNESS_MODES, 
  ACTIVITY_MULTIPLIERS,
  evaluateAthleteModeRecommendation, 
  saveAthleteMode, 
  getAthleteBiometrics,
  saveAthleteBiometrics,
  calculateAthleteNutrition,
  calculateNavyBodyFat,
  toggleAthleteDigestiveProtection
} from '../services/nutritionCalculator';
import { 
  EQUIPMENT_ITEMS, 
  DURATION_OPTIONS, 
  WEEKLY_FREQUENCY_OPTIONS, 
  FOCUS_AREAS, 
  JOINT_CONCERNS 
} from '../data/equipmentCatalog';
import { generateAICoachCustomWorkoutPlan } from '../services/geminiService';
import { getStoredCustomWorkoutPlan } from '../services/adaptiveWorkoutService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import confetti from 'canvas-confetti';

const FREQUENCIES = [
  { id: 'weekly_sun', label: 'Semanal (Domingos en ayunas)', intervalDays: 7, badge: 'Recomendado' },
  { id: 'weekly_sat', label: 'Semanal (Sábados en ayunas)', intervalDays: 7 },
  { id: 'biweekly', label: 'Quincenal (Cada 14 días)', intervalDays: 14 },
  { id: 'monthly', label: 'Mensual (Inicio de mes)', intervalDays: 30 }
];

export function BodyMetrics({ onNavigateTab }) {
  const { currentUser, switchUser, householdId, isDuoHousehold, userProfile, allUsers } = useAuth();
  const currentHousehold = householdId || 'hogar-dionicio-paula';
  const [selectedUser, setSelectedUser] = useState(currentUser || 'dionicio');
  
  // Pestaña activa del Centro Unificado
  const [activeTab, setActiveTab] = useState('measurements'); // 'measurements' | 'equipment' | 'schedule' | 'history'

  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  // Perfil biométrico completo sincronizado
  const [bioProfile, setBioProfile] = useState(() => getAthleteBiometrics(selectedUser, currentHousehold));
  const [activePlan, setActivePlan] = useState(() => calculateAthleteNutrition(selectedUser, currentHousehold));

  // Form State para Ingesta Unificada
  const [date, setDate] = useState(() => getLocalDateString());
  const [frequency, setFrequency] = useState(() => {
    return localStorage.getItem('fitness_duo_freq_' + (currentUser || 'dionicio')) || 'weekly_sun';
  });
  
  // Medidas del formulario
  const [weightKg, setWeightKg] = useState(() => bioProfile.currentWeightKg || '');
  const [waistCm, setWaistCm] = useState(() => bioProfile.waistCm || '');
  const [neckCm, setNeckCm] = useState(() => bioProfile.extendedMeasurements?.neckCm || '');
  const [hipsCm, setHipsCm] = useState(() => bioProfile.hipsCm || '');
  const [chestCm, setChestCm] = useState(() => bioProfile.extendedMeasurements?.chestCm || '');
  const [armCm, setArmCm] = useState(() => bioProfile.extendedMeasurements?.armCm || '');
  const [thighCm, setThighCm] = useState(() => bioProfile.extendedMeasurements?.thighCm || '');
  const [notes, setNotes] = useState('');

  // Parámetros base
  const [age, setAge] = useState(() => bioProfile.age || 40);
  const [heightCm, setHeightCm] = useState(() => bioProfile.heightCm || 175);
  const [activityLevel, setActivityLevel] = useState(() => bioProfile.activityLevel || 'desk_job_with_training');

  // Sincronizar al cambiar de usuario
  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const bio = getAthleteBiometrics(selectedUser, currentHousehold);
    setBioProfile(bio);
    setActivePlan(calculateAthleteNutrition(selectedUser, currentHousehold));
    setWeightKg(bio.currentWeightKg || '');
    setWaistCm(bio.waistCm || '');
    setNeckCm(bio.extendedMeasurements?.neckCm || '');
    setHipsCm(bio.hipsCm || '');
    setChestCm(bio.extendedMeasurements?.chestCm || '');
    setArmCm(bio.extendedMeasurements?.armCm || '');
    setThighCm(bio.extendedMeasurements?.thighCm || '');
    setAge(bio.age || 40);
    setHeightCm(bio.heightCm || 175);
    setActivityLevel(bio.activityLevel || 'desk_job_with_training');
  }, [selectedUser, currentHousehold]);

  useEffect(() => {
    localStorage.setItem('fitness_duo_freq_' + selectedUser, frequency);
  }, [frequency, selectedUser]);

  // Sync / Listen to Firestore weights collection
  useEffect(() => {
    const allLocal = getLocalWeightEntries(currentHousehold);
    const userLocal = allLocal.filter(w => w.userId === selectedUser);
    if (userLocal.length > 0) {
      setLogs(userLocal);
    }

    if (db && isInitialized) {
      try {
        const unsub = onSnapshot(
          collection(db, 'households', currentHousehold, 'members', selectedUser, 'bodyweight'),
          (snap) => {
            const remoteDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sorted = remoteDocs.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
            setLogs(sorted);
          },
          (err) => {
            console.warn('Firestore weights sync notice:', err);
          }
        );
        return () => unsub();
      } catch (err) {
        console.warn('BodyMetrics listener error:', err);
      }
    }
  }, [selectedUser, currentHousehold]);

  const modeRecommendation = useMemo(() => {
    return evaluateAthleteModeRecommendation(selectedUser, currentHousehold);
  }, [selectedUser, currentHousehold, logs, waistCm]);

  const sortedChronological = useMemo(() => {
    return [...logs].sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
  }, [logs]);

  const latestEntry = logs[0] || null;
  const previousEntry = logs[1] || null;

  // KPIs
  const weightDelta = useMemo(() => {
    if (!latestEntry || !previousEntry || !latestEntry.weightKg || !previousEntry.weightKg) return null;
    return (Number(latestEntry.weightKg) - Number(previousEntry.weightKg)).toFixed(2);
  }, [latestEntry, previousEntry]);

  const waistDelta = useMemo(() => {
    if (!latestEntry || !previousEntry || !latestEntry.waistCm || !previousEntry.waistCm) return null;
    return (Number(latestEntry.waistCm) - Number(previousEntry.waistCm)).toFixed(1);
  }, [latestEntry, previousEntry]);

  // Cálculo en tiempo real de % Grasa Navy
  const liveNavyFat = useMemo(() => {
    return calculateNavyBodyFat({
      gender: bioProfile.gender || (selectedUser === 'paula' ? 'female' : 'male'),
      heightCm: Number(heightCm) || 175,
      waistCm: Number(waistCm),
      neckCm: Number(neckCm),
      hipsCm: Number(hipsCm)
    });
  }, [bioProfile.gender, selectedUser, heightCm, waistCm, neckCm, hipsCm]);

  // Ratio Cintura / Altura en vivo
  const liveWHtR = useMemo(() => {
    if (!waistCm || !heightCm) return null;
    return Number((Number(waistCm) / Number(heightCm)).toFixed(2));
  }, [waistCm, heightCm]);

  // Plan personalizado guardado
  const currentCustomPlan = useMemo(() => {
    return getStoredCustomWorkoutPlan(selectedUser, currentHousehold);
  }, [selectedUser, currentHousehold, isGeneratingPlan]);

  // ==========================================
  // UNIFIED HANDLERS: GUARDA EN AMBOS LUGARES
  // ==========================================

  const handleSaveCheckInAndProfile = async (e) => {
    e.preventDefault();
    if (!weightKg && !waistCm && !neckCm && !hipsCm && !chestCm && !armCm && !thighCm) {
      setFeedback({ type: 'error', message: 'Ingresa al menos el peso o una medida corporal.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const parsedWeight = weightKg ? parseFloat(weightKg) : bioProfile.currentWeightKg;
    const parsedWaist = waistCm ? parseFloat(waistCm) : bioProfile.waistCm;
    const parsedNeck = neckCm ? parseFloat(neckCm) : null;
    const parsedHips = hipsCm ? parseFloat(hipsCm) : null;
    const parsedChest = chestCm ? parseFloat(chestCm) : null;
    const parsedArm = armCm ? parseFloat(armCm) : null;
    const parsedThigh = thighCm ? parseFloat(thighCm) : null;

    // 1. Guardar entrada histórica en Firestore y LocalStorage
    const newEntry = {
      id: 'weight_' + Date.now(),
      userId: selectedUser,
      date,
      frequencySelected: frequency,
      weightKg: parsedWeight,
      waistCm: parsedWaist,
      neckCm: parsedNeck,
      hipsCm: parsedHips,
      chestCm: parsedChest,
      armCm: parsedArm,
      thighCm: parsedThigh,
      notes: notes.trim(),
      timestamp: Date.now()
    };

    // 2. Sincronizar simultáneamente en el perfil biométrico activo
    const updatedProfile = saveAthleteBiometrics(selectedUser, {
      age: Number(age),
      heightCm: Number(heightCm),
      baselineWeightKg: parsedWeight,
      currentWeightKg: parsedWeight,
      waistCm: parsedWaist,
      hipsCm: parsedHips,
      activityLevel,
      extendedMeasurements: {
        neckCm: parsedNeck,
        chestCm: parsedChest,
        armCm: parsedArm,
        thighCm: parsedThigh
      }
    }, currentHousehold);

    try {
      await saveWeightEntry(newEntry, currentHousehold);
      setLogs(prev => [newEntry, ...prev.filter(p => p.id !== newEntry.id)]);
      setBioProfile(updatedProfile);
      setActivePlan(calculateAthleteNutrition(selectedUser, currentHousehold, parsedWeight));
      
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (err) {}

      setFeedback({ 
        type: 'success', 
        message: '¡Punto de ingesta sincronizado! Se guardó tu check-in histórico y se actualizó tu perfil biométrico 360°.' 
      });
      setNotes('');
    } catch (error) {
      console.error('Error saving unified check-in:', error);
      setFeedback({ type: 'error', message: 'Error al sincronizar: ' + error.message });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleEquipmentToggle = (equipmentId) => {
    const currentEquip = { ...(bioProfile.equipment || {}) };
    const key = `has${equipmentId.charAt(0).toUpperCase() + equipmentId.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}`;
    currentEquip[key] = !currentEquip[key];
    
    const updated = saveAthleteBiometrics(selectedUser, { equipment: currentEquip }, currentHousehold);
    setBioProfile(updated);
  };

  const handleEquipmentWeightChange = (key, value) => {
    const currentEquip = { ...(bioProfile.equipment || {}) };
    currentEquip[key] = Number(value) || 0;
    const updated = saveAthleteBiometrics(selectedUser, { equipment: currentEquip }, currentHousehold);
    setBioProfile(updated);
  };

  const handleScheduleChange = (field, value) => {
    const updatedSchedule = {
      ...(bioProfile.schedule || {}),
      [field]: value
    };
    const updated = saveAthleteBiometrics(selectedUser, { schedule: updatedSchedule }, currentHousehold);
    setBioProfile(updated);
  };

  const handleToggleJointConcern = (concernId) => {
    const currentConcerns = Array.isArray(bioProfile.jointConcerns) ? [...bioProfile.jointConcerns] : [];
    const exists = currentConcerns.includes(concernId);
    const nextConcerns = exists ? currentConcerns.filter(c => c !== concernId) : [...currentConcerns, concernId];
    const updated = saveAthleteBiometrics(selectedUser, { jointConcerns: nextConcerns }, currentHousehold);
    setBioProfile(updated);
  };

  const handleSelectMode = (modeId) => {
    saveAthleteMode(selectedUser, modeId, currentHousehold);
    const updated = getAthleteBiometrics(selectedUser, currentHousehold);
    setBioProfile(updated);
    setActivePlan(calculateAthleteNutrition(selectedUser, currentHousehold, updated.currentWeightKg));
  };

  const handleToggleDigestive = (enabled) => {
    toggleAthleteDigestiveProtection(selectedUser, enabled, currentHousehold);
    const updated = getAthleteBiometrics(selectedUser, currentHousehold);
    setBioProfile(updated);
    setActivePlan(calculateAthleteNutrition(selectedUser, currentHousehold, updated.currentWeightKg));
  };

  const handleGeneratePlanDirectly = async () => {
    setIsGeneratingPlan(true);
    try {
      await generateAICoachCustomWorkoutPlan({
        userId: selectedUser,
        householdId: currentHousehold
      });
      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.7 }
        });
      } catch (e) {}
      alert('¡Plan Focalizado generado exitosamente con IA! Ya está activo en tu Planificador.');
    } catch (err) {
      console.error('Error generando plan:', err);
      alert('Error al generar el plan: ' + err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('¿Seguro de que deseas eliminar este registro histórico?')) return;
    try {
      await deleteWeightEntry(entryId, selectedUser, currentHousehold);
      setLogs(prev => prev.filter(item => item.id !== entryId));
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Error al eliminar el registro.');
    }
  };

  const chartData = useMemo(() => {
    return sortedChronological.map(item => ({
      date: item.date || (item.timestamp ? getLocalDateString(item.timestamp) : ''),
      peso: item.weightKg ? Number(item.weightKg) : null,
      cintura: item.waistCm ? Number(item.waistCm) : null,
      cadera: item.hipsCm ? Number(item.hipsCm) : null,
      pecho: item.chestCm ? Number(item.chestCm) : null,
      brazo: item.armCm ? Number(item.armCm) : null,
      muslo: item.thighCm ? Number(item.thighCm) : null
    }));
  }, [sortedChronological]);

  const currentModeInfo = FITNESS_MODES[bioProfile.activeMode] || FITNESS_MODES.visceral_fat_loss;

  return (
    <div className="space-y-6">
      {/* Header Unificado & Selector de Atleta */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gym-900 border border-gym-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Dna className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Centro Unificado: Biometría & Equipamiento</span>
            </h1>
            <p className="text-xs text-slate-400">
              Punto único de ingesta de medidas, inventario de implementos y tiempos para el Coach IA.
            </p>
          </div>
        </div>

        {/* User Switcher (Duo) o Badge Individual */}
        {isDuoHousehold ? (
          <div className="flex items-center bg-gym-800 p-1.5 rounded-xl border border-gym-700 self-start sm:self-auto gap-1">
            <button
              onClick={() => switchUser('dionicio')}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + (selectedUser === 'dionicio' ? 'bg-sky-500 text-gym-950 font-black shadow-md shadow-sky-500/30' : 'text-slate-400 hover:text-white')}
            >
              <span>👨‍💻 Dionicio</span>
            </button>
            <button
              onClick={() => switchUser('paula')}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ' + (selectedUser === 'paula' ? 'bg-pink-500 text-gym-950 font-black shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white')}
            >
              <span>👩‍💼 Paula</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gym-800 border border-gym-700 rounded-xl text-xs font-bold text-slate-300">
            <span>{userProfile?.avatar || '🏋️‍♂️'}</span>
            <span>{userProfile?.name || 'Mi Perfil'}</span>
          </div>
        )}
      </div>

      {/* Tabs Principales de Ingesta Unificada */}
      <div className="flex bg-gym-900/90 border border-gym-750 p-1.5 rounded-2xl gap-1 overflow-x-auto scrollbar-none shadow-lg">
        <button
          onClick={() => setActiveTab('measurements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === 'measurements'
              ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
          }`}
        >
          <Dna className="w-4 h-4" />
          <span>1. Ingesta de Medidas & Biometría</span>
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === 'equipment'
              ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>2. Mi Equipamiento Propio</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === 'schedule'
              ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. Tiempos & Diseñar Plan IA</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-gym-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-gym-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>4. Historial & Evolución ({logs.length})</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gym-800/90 border border-gym-700/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Peso Corporal Activo</span>
          <div className="text-xl font-black text-white font-mono flex items-baseline gap-1">
            <span>{bioProfile.currentWeightKg || '--'}</span>
            <span className="text-xs font-normal text-slate-400">kg</span>
            {weightDelta && (
              <span className={`text-[11px] font-bold ml-1 ${Number(weightDelta) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Number(weightDelta) > 0 ? `+${weightDelta}` : weightDelta} kg
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {bioProfile.isWeightFromLog ? `Último pesaje: ${bioProfile.lastWeightDate}` : 'Línea base calibrada'}
          </span>
        </div>

        <div className="bg-gym-800/90 border border-gym-700/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] text-pink-400 uppercase font-bold block">Cintura & Ratio Visceral</span>
          <div className="text-xl font-black text-white font-mono flex items-baseline gap-1">
            <span>{bioProfile.waistCm || '--'}</span>
            <span className="text-xs font-normal text-slate-400">cm</span>
            {liveWHtR && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 ${liveWHtR >= 0.50 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                WHtR: {liveWHtR}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {liveWHtR >= 0.50 ? 'Grasa visceral activa' : 'Rango saludable'}
          </span>
        </div>

        <div className="bg-gym-800/90 border border-gym-700/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] text-sky-400 uppercase font-bold block">% Grasa (Método Navy)</span>
          <div className="text-xl font-black text-sky-300 font-mono">
            {liveNavyFat ? `${liveNavyFat}%` : `${bioProfile.bodyFatPct || 23}%`}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {liveNavyFat ? 'Calculado con cuello y cintura' : 'Estimación inicial'}
          </span>
        </div>

        <div className="bg-gym-800/90 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Gasto & Meta Calórica</span>
          <div className="text-xl font-black text-emerald-300 font-mono">
            {activePlan.targetCals} <span className="text-xs text-slate-400 font-normal">kcal</span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            TDEE ~{activePlan.tdee} • {activePlan.targetProtein}g prot
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fadeIn ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 1: INGESTA UNIFICADA DE MEDIDAS & BIOMETRÍA          */}
      {/* ============================================================ */}
      {activeTab === 'measurements' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Tarjeta de Recomendación Clínica del Asesor */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gym-950 to-gym-900 border border-amber-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Diagnóstico Clínico del Asesor Deportivo
                </span>
              </div>
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-gym-800 text-amber-300 border border-amber-500/40">
                {modeRecommendation.riskLevel}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {modeRecommendation.clinicalRationale}
            </p>

            {/* Aviso de Bloqueo si WHtR >= 0.50 */}
            {modeRecommendation.isHypertrophyBlocked && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Aviso Clínico:</strong> El modo Aumento Muscular está bloqueado preventivamente por grasa visceral. Meta prioritaria: cintura &lt; {modeRecommendation.targetWaistGoalCm} cm.
                </span>
              </div>
            )}

            {/* Selector Rápido de Modos */}
            <div className="pt-2 border-t border-gym-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(FITNESS_MODES).map(([mKey, mode]) => {
                const isSelected = bioProfile.activeMode === mKey;
                const isBlocked = mKey === 'hypertrophy_muscle_gain' && modeRecommendation.isHypertrophyBlocked;

                return (
                  <button
                    key={mKey}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => handleSelectMode(mKey)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      isBlocked
                        ? 'opacity-50 cursor-not-allowed bg-gym-950 border-gym-800'
                        : isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/40'
                          : 'bg-gym-900 border-gym-800 text-slate-400 hover:border-gym-700'
                    }`}
                  >
                    <span>{mode.icon} {mode.shortName}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario Unificado de Ingesta */}
          <form onSubmit={handleSaveCheckInAndProfile} className="bg-gym-900/90 border border-gym-700/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-gym-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-emerald-400" />
                  <span>Formulario de Ingesta & Check-in Completo</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Al guardar, se sincroniza tanto el pesaje en el historial como el perfil activo del atleta.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-400 hidden sm:inline">Fecha:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gym-950 border border-gym-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Medidas Clave: Peso, Cintura, Cuello, Cadera */}
            <div>
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-2">
                Medidas Corporales & Antropometría
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Peso (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="40"
                    max="180"
                    placeholder="ej. 85.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-pink-400 mb-1 flex items-center gap-1">
                    <span>Cintura (cm) *Visceral</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="160"
                    placeholder="ej. 88.0"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="w-full bg-gym-950 border border-pink-500/40 rounded-xl px-3 py-2 text-xs text-pink-300 font-mono font-bold focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-sky-400 mb-1">
                    Cuello (cm) *Navy
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ej. 40.0"
                    value={neckCm}
                    onChange={(e) => setNeckCm(e.target.value)}
                    className="w-full bg-gym-950 border border-sky-500/40 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Cadera (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ej. 102.0"
                    value={hipsCm}
                    onChange={(e) => setHipsCm(e.target.value)}
                    className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Medidas Segmentarias: Pecho, Brazo, Muslo */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pecho / Tórax (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 104.0"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Brazo flexionado (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 35.0"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Muslo (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 58.0"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Parámetros Base del Perfil: Edad, Altura, Nivel de Actividad */}
            <div className="pt-3 border-t border-gym-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Edad del Atleta (años)
                </label>
                <input
                  type="number"
                  min="18"
                  max="90"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Estatura (cm)
                </label>
                <input
                  type="number"
                  min="130"
                  max="220"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nivel de Actividad Física (PAL)
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500"
                >
                  {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, opt]) => (
                    <option key={key} value={key}>
                      {opt.label.split('(')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas opcionales del pesaje */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Notas del día (sensaciones, retención, ayuno)
              </label>
              <input
                type="text"
                placeholder="ej. Pesaje en ayunas tras cena liviana, buena energía"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-gym-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{saving ? 'Sincronizando...' : 'Guardar Check-in & Actualizar Perfil Biométrico'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* PESTAÑA 2: MI EQUIPAMIENTO PROPIO                           */}
      {/* ============================================================ */}
      {activeTab === 'equipment' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-gym-900 border border-sky-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Dumbbell className="w-4 h-4" />
                <span>Inventario de Implementos de {bioProfile.athleteName}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Marca los implementos que tienes en casa o gimnasio. El Coach IA diseñará tu plan usándolos exclusivamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EQUIPMENT_ITEMS.map((item) => {
              const key = `has${item.id.charAt(0).toUpperCase() + item.id.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}`;
              const isChecked = Boolean(bioProfile.equipment?.[key]);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isChecked 
                      ? 'bg-gym-800/90 border-sky-500/60 shadow-md shadow-sky-500/5' 
                      : 'bg-gym-950/60 border-gym-800 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{item.icon}</span>
                      <div>
                        <span className="text-xs font-black text-white block">{item.name}</span>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{item.description}</p>
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

                  {isChecked && item.hasWeightParam && (
                    <div className="mt-3 pt-2.5 border-t border-gym-750 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-300 font-medium">Peso Máximo Disponible:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={bioProfile.equipment?.[`${item.id}MaxWeightKg`] || bioProfile.equipment?.maxDumbbellWeightPerHandKg || (item.id === 'dumbbells' ? 20 : 16)}
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

      {/* ============================================================ */}
      {/* PESTAÑA 3: TIEMPOS, ENFOQUE & DISEÑAR PLAN IA                */}
      {/* ============================================================ */}
      {activeTab === 'schedule' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Banner de Acción Rápida con IA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-gym-900 to-emerald-950/60 border border-emerald-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">Diseñador Autónomo de Planes Focalizados</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                El Coach IA tomará tus minutos seleccionados ({bioProfile.schedule?.sessionDurationMinutes || 45} min), tu inventario de equipamiento y tu edad para estructurar tu rutina semanal.
              </p>
            </div>

            <button
              onClick={handleGeneratePlanDirectly}
              disabled={isGeneratingPlan}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-gym-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Zap className={`w-4 h-4 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
              <span>{isGeneratingPlan ? 'Diseñando Plan...' : '⚡ Diseñar mi Plan con Coach IA'}</span>
            </button>
          </div>

          {/* Si ya hay un plan generado, mostrar tarjeta resumen */}
          {currentCustomPlan && (
            <div className="p-4 rounded-2xl bg-gym-900 border border-sky-500/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-sky-400">Plan Focalizado Activo</span>
                <h4 className="font-extrabold text-white text-sm">{currentCustomPlan.planTitle}</h4>
                <p className="text-xs text-slate-400">
                  {currentCustomPlan.durationMinutes} min por sesión • {currentCustomPlan.weeklyDaysTarget} días por semana
                </p>
              </div>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('planner')}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-gym-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <span>Ver en Planificador</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Duración de Sesión */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Duración Disponible por Sesión</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DURATION_OPTIONS.map((dur) => {
                const isSelected = (bioProfile.schedule?.sessionDurationMinutes || 45) === dur.value;
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

          {/* Días por Semana */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Días por Semana Disponibles</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WEEKLY_FREQUENCY_OPTIONS.map((freq) => {
                const isSelected = (bioProfile.schedule?.weeklyDaysTarget || 4) === freq.days;
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

          {/* Enfoque Focalizado */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>Área de Enfoque Muscular Prioritaria</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FOCUS_AREAS.map((f) => {
                const isSelected = (bioProfile.schedule?.focusArea || 'balanced') === f.id;
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

          {/* Cuidados Articulares */}
          <div className="p-3.5 rounded-2xl bg-gym-950 border border-gym-800 space-y-2">
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Cuidados Articulares & Prevención de Lesiones</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JOINT_CONCERNS.map((c) => {
                const isChecked = Array.isArray(bioProfile.jointConcerns) && bioProfile.jointConcerns.includes(c.id);
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

      {/* ============================================================ */}
      {/* PESTAÑA 4: HISTORIAL & EVOLUCIÓN CRONOLÓGICA                */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Chart View */}
          <div className="bg-gym-900/90 border border-gym-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-white text-sm sm:text-base">
                  Evolución Temporal de Peso & Cintura
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {logs.length} pesajes en Firestore
              </span>
            </div>

            {chartData.length > 1 ? (
              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#38bdf8" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f472b6" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="cintura" name="Cintura (cm)" stroke="#f472b6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 border border-dashed border-gym-750 rounded-xl flex items-center justify-center text-xs text-slate-500">
                Registra al menos 2 check-ins para ver la gráfica de progreso temporal.
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-gym-900/90 border border-gym-700/80 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-black text-white text-sm">Registros Históricos Individuales</h3>
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gym-800 text-slate-400">
                      <th className="py-2 px-3 font-bold">Fecha</th>
                      <th className="py-2 px-3 font-bold">Peso</th>
                      <th className="py-2 px-3 font-bold text-pink-400">Cintura</th>
                      <th className="py-2 px-3 font-bold text-sky-400">Cuello</th>
                      <th className="py-2 px-3 font-bold">Cadera</th>
                      <th className="py-2 px-3 font-bold">Notas</th>
                      <th className="py-2 px-3 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gym-800/60 font-mono">
                    {logs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gym-800/40">
                        <td className="py-2.5 px-3 text-slate-300 font-sans">{entry.date || getLocalDateString(entry.timestamp)}</td>
                        <td className="py-2.5 px-3 font-black text-white">{entry.weightKg ? `${entry.weightKg} kg` : '--'}</td>
                        <td className="py-2.5 px-3 text-pink-300 font-bold">{entry.waistCm ? `${entry.waistCm} cm` : '--'}</td>
                        <td className="py-2.5 px-3 text-sky-300">{entry.neckCm ? `${entry.neckCm} cm` : '--'}</td>
                        <td className="py-2.5 px-3 text-slate-300">{entry.hipsCm ? `${entry.hipsCm} cm` : '--'}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px] truncate max-w-[150px]">{entry.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Sin registros previos aún.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}