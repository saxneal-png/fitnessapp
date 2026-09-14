import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  db,
  isInitialized,
  saveWeightEntry, 
  deleteWeightEntry, 
  getLocalWeightEntries,
  saveLocalWeightEntries 
} from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Scale, 
  Ruler, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  PlusCircle, 
  Trash2, 
  Clock, 
  Activity, 
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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

const FREQUENCIES = [
  { id: 'weekly_sun', label: 'Semanal (Domingos en ayunas)', intervalDays: 7, badge: 'Recomendado' },
  { id: 'weekly_sat', label: 'Semanal (Sábados en ayunas)', intervalDays: 7 },
  { id: 'biweekly', label: 'Quincenal (Cada 14 días)', intervalDays: 14 },
  { id: 'monthly', label: 'Mensual (Inicio de mes)', intervalDays: 30 }
];

export function BodyMetrics() {
  const { currentUser, switchUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState(currentUser || 'dionicio');
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState(() => {
    return localStorage.getItem('fitness_duo_freq_' + (currentUser || 'dionicio')) || 'weekly_sun';
  });
  const [weightKg, setWeightKg] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [armCm, setArmCm] = useState('');
  const [thighCm, setThighCm] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentUser) {
      setSelectedUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fitness_duo_freq_' + selectedUser, frequency);
  }, [frequency, selectedUser]);

  // Sync / Listen to Firestore weights collection
  useEffect(() => {
    const allLocal = getLocalWeightEntries('hogar-dionicio-paula');
    const userLocal = allLocal.filter(w => w.userId === selectedUser);
    if (userLocal.length > 0) {
      setLogs(userLocal);
    }

    if (db && isInitialized) {
      try {
        const unsub = onSnapshot(
          collection(db, 'households', 'hogar-dionicio-paula', 'members', selectedUser, 'bodyweight'),
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
  }, [selectedUser]);

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

  const nextCheckInEstimate = useMemo(() => {
    if (!latestEntry || !latestEntry.date) return null;
    const lastDate = new Date(latestEntry.date);
    const freqConfig = FREQUENCIES.find(f => f.id === frequency) || FREQUENCIES[0];
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + freqConfig.intervalDays);
    return nextDate.toISOString().split('T')[0];
  }, [latestEntry, frequency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weightKg && !waistCm && !hipsCm && !chestCm && !armCm && !thighCm) {
      setFeedback({ type: 'error', message: 'Ingresa al menos el peso o una medida corporal.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const newEntry = {
      id: 'weight_' + Date.now(),
      userId: selectedUser,
      date,
      frequencySelected: frequency,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      waistCm: waistCm ? parseFloat(waistCm) : null,
      hipsCm: hipsCm ? parseFloat(hipsCm) : null,
      chestCm: chestCm ? parseFloat(chestCm) : null,
      armCm: armCm ? parseFloat(armCm) : null,
      thighCm: thighCm ? parseFloat(thighCm) : null,
      notes: notes.trim(),
      timestamp: Date.now()
    };

    try {
      await saveWeightEntry(newEntry, 'hogar-dionicio-paula');
      setLogs(prev => [newEntry, ...prev.filter(p => p.id !== newEntry.id)]);
      setFeedback({ type: 'success', message: '¡Registro guardado con éxito en la nube!' });
      setWeightKg('');
      setWaistCm('');
      setHipsCm('');
      setChestCm('');
      setArmCm('');
      setThighCm('');
      setNotes('');
    } catch (error) {
      console.error('Error saving weight entry:', error);
      setFeedback({ type: 'error', message: 'Error al guardar: ' + error.message });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('¿Seguro de que deseas eliminar este registro?')) return;
    try {
      await deleteWeightEntry(entryId, selectedUser, 'hogar-dionicio-paula');
      setLogs(prev => prev.filter(item => item.id !== entryId));
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Error al eliminar el registro.');
    }
  };

  const chartData = useMemo(() => {
    return sortedChronological.map(item => ({
      date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : ''),
      peso: item.weightKg ? Number(item.weightKg) : null,
      cintura: item.waistCm ? Number(item.waistCm) : null,
      cadera: item.hipsCm ? Number(item.hipsCm) : null,
      pecho: item.chestCm ? Number(item.chestCm) : null,
      brazo: item.armCm ? Number(item.armCm) : null,
      muslo: item.thighCm ? Number(item.thighCm) : null
    }));
  }, [sortedChronological]);

  return (
    <div className="space-y-6">
      {/* Header & Athlete switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gym-900 border border-gym-700/80 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className={'w-12 h-12 rounded-xl flex items-center justify-center ' + (selectedUser === 'dionicio' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30')}>
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Pesos & Medidas Corporales
            </h1>
            <p className="text-xs text-slate-400">
              Control de composición corporal, evolución y frecuencia de pesaje en ayunas
            </p>
          </div>
        </div>

        {/* User Switcher */}
        <div className="flex items-center bg-gym-800 p-1.5 rounded-xl border border-gym-700 self-start sm:self-auto">
          <button
            onClick={() => switchUser('dionicio')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (selectedUser === 'dionicio' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 'text-slate-400 hover:text-white')}
          >
            👨‍💻 Dionicio
          </button>
          <button
            onClick={() => switchUser('paula')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (selectedUser === 'paula' ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30' : 'text-slate-400 hover:text-white')}
          >
            👩‍💼 Paula
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gym-800/80 border border-gym-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Último Peso</span>
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {latestEntry && latestEntry.weightKg ? (latestEntry.weightKg + ' kg') : '--'}
          </div>
          {weightDelta !== null && (
            <div className={'flex items-center gap-1 text-xs font-bold mt-1.5 ' + (Number(weightDelta) < 0 ? 'text-emerald-400' : Number(weightDelta) > 0 ? 'text-amber-400' : 'text-slate-400')}>
              {Number(weightDelta) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : Number(weightDelta) > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              <span>{(Number(weightDelta) > 0 ? ('+' + weightDelta) : weightDelta) + ' kg vs anterior'}</span>
            </div>
          )}
        </div>

        <div className="bg-gym-800/80 border border-gym-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Cintura Actual</span>
            <Ruler className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {latestEntry && latestEntry.waistCm ? (latestEntry.waistCm + ' cm') : '--'}
          </div>
          {waistDelta !== null && (
            <div className={'flex items-center gap-1 text-xs font-bold mt-1.5 ' + (Number(waistDelta) < 0 ? 'text-emerald-400' : 'text-slate-400')}>
              {Number(waistDelta) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>{(Number(waistDelta) > 0 ? ('+' + waistDelta) : waistDelta) + ' cm'}</span>
            </div>
          )}
        </div>

        <div className="bg-gym-800/80 border border-gym-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Frecuencia</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-slate-200 line-clamp-1">
            {FREQUENCIES.find(f => f.id === frequency)?.label.split(' ')[0]}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {nextCheckInEstimate ? ('Próximo: ' + nextCheckInEstimate) : 'Configura tu frecuencia'}
          </p>
        </div>

        <div className="bg-gym-800/80 border border-gym-700 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Registros</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {logs.length}
          </div>
          <p className="text-[11px] text-emerald-400/90 mt-1 font-medium">
            Sincronizado con Firebase
          </p>
        </div>
      </div>

      {/* Main Grid: Form + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-5 bg-gym-900 border border-gym-700/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gym-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-sky-400" />
              Nuevo Registro
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedUser === 'dionicio' ? 'Perfil Dionicio' : 'Perfil Paula'}
            </span>
          </div>

          {feedback && (
            <div className={'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ' + (feedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400')}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Frequency Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Frecuencia de Registro Sugerida
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.label} {f.badge ? ('(' + f.badge + ')') : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Fecha de Medición
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Weight & Waist */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Peso (kg) <span className="text-sky-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="ej. 75.4"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 84.0"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Secondary measures: Hips, Chest */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cadera (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 98.5"
                  value={hipsCm}
                  onChange={(e) => setHipsCm(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pecho / Tórax (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 102.0"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Limbs: Arm, Thigh */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Brazo flexionado (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 34.5"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Muslo (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ej. 56.0"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full bg-gym-800 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notas / Contexto
              </label>
              <textarea
                rows={2}
                placeholder="ej. En ayunas, post descanso dominical..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gym-800 border border-gym-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={saving}
              className={'w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ' + (selectedUser === 'dionicio' ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/25' : 'bg-pink-500 hover:bg-pink-400 text-white shadow-pink-500/25') + (saving ? ' opacity-60 cursor-not-allowed' : '')}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando en Nube...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Guardar Medición de {selectedUser === 'dionicio' ? 'Dionicio' : 'Paula'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Tip */}
          <div className="bg-gym-800/40 border border-gym-700/50 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p>
              <strong>Recomendación:</strong> Medirse siempre a la misma hora, preferiblemente los domingos por la mañana en ayunas tras ir al baño, para evitar fluctuaciones por hidratación o comida.
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Weight Chart */}
          <div className="bg-gym-900 border border-gym-700/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Evolución de Peso (kg)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {sortedChronological.length} puntos
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="peso" 
                      stroke={selectedUser === 'dionicio' ? '#38bdf8' : '#f472b6'} 
                      strokeWidth={3}
                      dot={{ r: 4, fill: selectedUser === 'dionicio' ? '#38bdf8' : '#f472b6' }}
                      activeDot={{ r: 6 }}
                      name="Peso (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-gym-700 rounded-xl">
                <Scale className="w-8 h-8 text-slate-600 mb-2" />
                <p>Sin datos de peso registrados todavía.</p>
                <p className="text-[11px] text-slate-600">Completa el formulario de la izquierda para ver la gráfica.</p>
              </div>
            )}
          </div>

          {/* Circumferences Chart */}
          <div className="bg-gym-900 border border-gym-700/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pink-400" />
                Evolución de Medidas Corporales (cm)
              </h3>
            </div>

            {chartData.some(d => d.cintura || d.cadera || d.pecho || d.brazo || d.muslo) ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Line type="monotone" dataKey="cintura" stroke="#f43f5e" strokeWidth={2} name="Cintura" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="cadera" stroke="#a855f7" strokeWidth={2} name="Cadera" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="pecho" stroke="#3b82f6" strokeWidth={2} name="Pecho" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="brazo" stroke="#10b981" strokeWidth={2} name="Brazo" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="muslo" stroke="#f59e0b" strokeWidth={2} name="Muslo" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-gym-700 rounded-xl">
                <Ruler className="w-8 h-8 text-slate-600 mb-2" />
                <p>Sin medidas corporales registradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-gym-900 border border-gym-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Historial de Pesos y Medidas de {selectedUser === 'dionicio' ? 'Dionicio' : 'Paula'}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gym-800 text-slate-300 border border-gym-700">
            {logs.length} registros
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No hay registros guardados en el historial de {selectedUser === 'dionicio' ? 'Dionicio' : 'Paula'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-gym-800 text-slate-400 uppercase text-[10px] font-bold border-b border-gym-700">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Frecuencia</th>
                  <th className="py-2.5 px-3">Peso</th>
                  <th className="py-2.5 px-3">Cintura</th>
                  <th className="py-2.5 px-3">Cadera</th>
                  <th className="py-2.5 px-3">Pecho</th>
                  <th className="py-2.5 px-3">Brazo / Muslo</th>
                  <th className="py-2.5 px-3">Notas</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-800">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-gym-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      {item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : '')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {FREQUENCIES.find(f => f.id === item.frequencySelected)?.label.split(' ')[0] || 'Semanal'}
                    </td>
                    <td className="py-3 px-3 font-bold text-sky-400 whitespace-nowrap">
                      {item.weightKg ? (item.weightKg + ' kg') : '--'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-pink-400 whitespace-nowrap">
                      {item.waistCm ? (item.waistCm + ' cm') : '--'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {item.hipsCm ? (item.hipsCm + ' cm') : '--'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {item.chestCm ? (item.chestCm + ' cm') : '--'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {item.armCm ? ('B: ' + item.armCm + 'cm') : ''}{item.armCm && item.thighCm ? ' / ' : ''}{item.thighCm ? ('M: ' + item.thighCm + 'cm') : (!item.armCm ? '--' : '')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {item.notes || '--'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
        )}
      </div>
    </div>
  );
}