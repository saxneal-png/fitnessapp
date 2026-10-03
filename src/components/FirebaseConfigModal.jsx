import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  initFirebase, 
  clearProductionData,
  syncLocalDataToFirestore,
  ensureAnonymousAuth,
  testFirestorePermissions
} from '../firebase/config';
import { 
  Database, 
  Key, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  X, 
  Home, 
  Cloud, 
  CloudUpload, 
  RefreshCw,
  ExternalLink,
  Copy,
  Terminal
} from 'lucide-react';

const RECOMMENDED_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId}/{document=**} {
      allow read, write: if householdId == 'hogar-dionicio-paula' || request.auth != null;
    }
  }
}`;

export function FirebaseConfigModal({ isOpen, onClose }) {
  const { householdId, changeHouseholdId, isFirebaseConnected, isCloudOnline } = useAuth();
  const [config, setConfig] = useState(() => getStoredFirebaseConfig());
  const [householdInput, setHouseholdInput] = useState(householdId);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingPerms, setIsTestingPerms] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [permTestMsg, setPermTestMsg] = useState(null);
  const [copiedRules, setCopiedRules] = useState(false);

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

  const handleTestPermissions = async () => {
    setIsTestingPerms(true);
    setPermTestMsg(null);
    try {
      const res = await testFirestorePermissions(householdId);
      setPermTestMsg(res);
    } catch (e) {
      setPermTestMsg({ ok: false, error: e.message });
    } finally {
      setIsTestingPerms(false);
    }
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_FIRESTORE_RULES);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const result = await syncLocalDataToFirestore(householdId);
      const parts = [];
      if (result.uploadedLogs) parts.push(`${result.uploadedLogs} entrenamientos`);
      if (result.uploadedWeights) parts.push(`${result.uploadedWeights} pesos`);
      if (result.uploadedNutrition) parts.push(`${result.uploadedNutrition} comidas`);
      setSyncStatusMsg(`✅ ¡Sincronización completada! (${parts.join(', ') || 'Todo al día'} subidos a Firestore)`);
    } catch (err) {
      setSyncStatusMsg(`⚠️ Error de permisos al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gym-800 border border-gym-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Base de Datos en la Nube (Firebase)</h3>
              <p className="text-xs text-slate-400">Sincronización multi-dispositivo y persistencia en Google Cloud.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-gym-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCloudOnline || isFirebaseConnected ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block">Conectado a Firebase Cloud Firestore</span>
                <span className="text-[11px] text-emerald-200/80 font-mono">Proyecto: {config.projectId || 'fitness-app-e7a59'}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-gym-900 font-black text-[10px] uppercase">
              Online
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">Conectando a Firebase Cloud...</span>
              <span className="text-[11px] text-slate-300">Verifica tu conexión a internet o tus credenciales abajo.</span>
            </div>
          </div>
        )}

        {/* Cloud Migration / Sync Button */}
        <div className="p-3.5 rounded-2xl bg-gym-900/90 border border-gym-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-sky-400" />
              <span>Sincronizador a la Nube</span>
            </span>
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-gym-900 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Subir todo a Firebase</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Sube todos los entrenamientos, pesos, comidas y despensa almacenados a Firestore Cloud para sincronizarlos con ambos celulares.
          </p>
          {syncStatusMsg && (
            <p className={`text-xs font-semibold pt-1 ${syncStatusMsg.includes('⚠️') ? 'text-amber-400' : 'text-emerald-400'}`}>
              {syncStatusMsg}
            </p>
          )}

          {/* Botón de Test de Permisos Firestore */}
          <div className="pt-2 border-t border-gym-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTestPermissions}
              disabled={isTestingPerms}
              className="px-2.5 py-1 rounded-lg bg-gym-800 hover:bg-gym-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all border border-gym-700"
            >
              {isTestingPerms ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  <span>Verificando permisos...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3 h-3 text-sky-400" />
                  <span>Probar Permisos de Nube</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyRules}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[11px] font-bold flex items-center gap-1.5 transition-all border border-sky-500/30"
              title="Copiar reglas de seguridad oficiales para pegar en Firebase Console"
            >
              {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRules ? '¡Reglas Copiadas!' : 'Copiar Reglas Firestore'}</span>
            </button>
          </div>

          {/* Feedback del Test de Permisos */}
          {permTestMsg && (
            <div className={`p-2.5 rounded-xl text-xs mt-2 ${permTestMsg.ok ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>
              <div className="font-bold flex items-center gap-1.5">
                {permTestMsg.ok ? <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span>{permTestMsg.ok ? 'Permisos correctos' : 'Problema de Permisos Detectado'}</span>
              </div>
              <p className="text-[11px] mt-1 leading-relaxed">
                {permTestMsg.ok ? permTestMsg.message : permTestMsg.error}
              </p>
              {!permTestMsg.ok && (
                <div className="mt-2 pt-2 border-t border-red-500/30 text-[10px] text-slate-300 space-y-1">
                  <p><strong>Solución rápida en Firebase Console:</strong></p>
                  <p>1. Ve a <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5 inline" /></a> &gt; Firestore Database &gt; pestaña <strong>Reglas (Rules)</strong>.</p>
                  <p>2. Haz clic en <strong>"Copiar Reglas Firestore"</strong> arriba, pégalas en la consola y presiona <strong>Publicar (Publish)</strong>.</p>
                </div>
              )}
            </div>
          )}
        </div>


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

