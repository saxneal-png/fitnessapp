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
    match /{document=**} {
      allow read, write: if true;
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gym-800 border border-gym-700 rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl animate-fadeIn max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 border-b border-gym-700/80 flex items-center justify-between shrink-0 bg-gym-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Nube Firebase (Google Cloud)</h3>
              <p className="text-[11px] text-slate-400">Sincronización multi-dispositivo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-gym-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 text-slate-200">
          {isCloudOnline || isFirebaseConnected ? (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block">Conectado a Firestore Cloud</span>
                  <span className="text-[10px] text-emerald-200/80 font-mono">Proyecto: {config.projectId || 'fitness-app-e7a59'}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-gym-900 font-black text-[10px] uppercase">
                Online
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block">Conectando a Firebase Cloud...</span>
                <span className="text-[10px] text-slate-300">Verifica tu conexión a internet o tus credenciales abajo.</span>
              </div>
            </div>
          )}

          {/* Cloud Migration / Sync Button */}
          <div className="p-3 rounded-2xl bg-gym-900/90 border border-gym-700 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-sky-400" />
                <span>Sincronizador a la Nube</span>
              </span>
              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isSyncing}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-gym-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-md active:scale-95"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Subiendo datos...</span>
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
              Sube entrenamientos, pesos, comidas y despensa para verlos en ambos celulares.
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
                className="px-2.5 py-1.5 rounded-lg bg-gym-800 hover:bg-gym-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all border border-gym-700 active:scale-95"
              >
                {isTestingPerms ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Verificando...</span>
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
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[11px] font-bold flex items-center gap-1.5 transition-all border border-sky-500/30 active:scale-95"
                title="Copiar reglas de seguridad oficiales para pegar en Firebase Console"
              >
                {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? '¡Copiado!' : 'Copiar Reglas'}</span>
              </button>
            </div>

            {/* Feedback del Test de Permisos */}
            {permTestMsg && (
              <div className={`p-2.5 rounded-xl text-xs mt-2 ${permTestMsg.ok ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>
                <div className="font-bold flex items-center gap-1.5">
                  {permTestMsg.ok ? <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span>{permTestMsg.ok ? 'Permisos correctos' : 'Problema de Permisos'}</span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed">
                  {permTestMsg.ok ? permTestMsg.message : permTestMsg.error}
                </p>
                {!permTestMsg.ok && (
                  <div className="mt-2 pt-2 border-t border-red-500/30 text-[10px] text-slate-300 space-y-1">
                    <p><strong>Solución en Firebase Console:</strong></p>
                    <p>1. Abre <a href="https://console.firebase.google.com/project/fitness-app-e7a59/firestore/rules" target="_blank" rel="noreferrer" className="text-sky-400 font-bold underline inline-flex items-center gap-0.5">Reglas de tu Proyecto <ExternalLink className="w-2.5 h-2.5 inline" /></a>.</p>
                    <p>2. Toca <strong>"Copiar Reglas"</strong> arriba, pégalas y presiona <strong>Publicar</strong>.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {saved && (
            <div className="p-2.5 rounded-xl bg-emerald-500 text-gym-900 font-bold text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Configuración guardada exitosamente. Recargando...</span>
            </div>
          )}

          <form id="firebase-config-form" onSubmit={handleSubmit} className="space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                  placeholder="fitness-app-e7a59"
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
          </form>
        </div>

        {/* Fixed Footer with Reachable Action Buttons */}
        <div className="p-3 sm:p-4 border-t border-gym-700/80 bg-gym-900/95 shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Deseas reiniciar los datos locales de prueba a cero?')) {
                clearProductionData(householdId);
                window.location.reload();
              }
            }}
            className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all shrink-0"
            title="Poner en Cero"
          >
            🗑️ <span className="hidden sm:inline">Poner Cero</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 sm:py-2.5 rounded-xl bg-gym-700 hover:bg-gym-600 text-slate-300 text-xs font-bold transition-all"
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="firebase-config-form"
            className="flex-1 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-sky-500/20 transition-all active:scale-95"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

