import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStoredFirebaseConfig, saveFirebaseConfig, initFirebase, clearProductionData } from '../firebase/config';
import { Database, Key, ShieldCheck, Check, AlertCircle, X, Home, ExternalLink } from 'lucide-react';

export function FirebaseConfigModal({ isOpen, onClose }) {
  const { householdId, changeHouseholdId, isFirebaseConnected } = useAuth();
  const [config, setConfig] = useState(() => getStoredFirebaseConfig());
  const [householdInput, setHouseholdInput] = useState(householdId);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    saveFirebaseConfig(config);
    changeHouseholdId(householdInput.trim() || 'hogar-dionicio-paula');
    initFirebase();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload(); // Reload to re-initialize firebase app instance cleanly
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gym-800 border border-gym-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Configuración de Firebase</h3>
              <p className="text-xs text-slate-400">Personaliza tus credenciales sin modificar el repositorio.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-gym-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isFirebaseConnected ? (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Firebase Firestore conectado y sincronizando en vivo.</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 text-sky-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Modo Local / Demo activo. Puedes pegar tus claves de Firebase Spark gratuitas a continuación para sincronización multi-dispositivo.
            </span>
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-500 text-gym-900 font-bold text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Configuración guardada exitosamente. Recargando app...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-sky-400" />
              <span>ID del Hogar (Household ID)</span>
            </label>
            <input
              type="text"
              value={householdInput}
              onChange={(e) => setHouseholdInput(e.target.value)}
              placeholder="hogar-dionicio-paula"
              className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">API Key</label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Project ID</label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="fitness-app-12345"
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Auth Domain</label>
              <input
                type="text"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                placeholder="project.firebaseapp.com"
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">App ID</label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="1:123456789:web:abcdef"
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                clearProductionData(householdId);
                alert('¡Datos locales limpiados con éxito! Todo está en cero para producción.');
                window.location.reload();
              }}
              className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
              title="Borra cualquier caché local de prueba para iniciar en cero limpio"
            >
              🗑️ Poner en Cero
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gym-700 hover:bg-gym-600 text-slate-300 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-sky-500/20 transition-all"
            >
              Guardar y Conectar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
