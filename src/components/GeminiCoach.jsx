import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS, WORKOUT_DAYS } from '../data/workoutCatalog';
import { 
  askCoachWithFullContext, 
  buildHouseholdContext, 
  getStoredGeminiKey, 
  saveGeminiKey,
  getStoredGeminiModel,
  saveGeminiModel,
  GEMINI_AVAILABLE_MODELS
} from '../services/geminiService';
import { 
  Sparkles, 
  Send, 
  Key, 
  Bot, 
  User, 
  RefreshCw, 
  Zap, 
  Flame, 
  Utensils, 
  Dumbbell, 
  ShieldCheck,
  Check,
  Activity,
  Layers,
  ShoppingBag,
  Scale
} from 'lucide-react';

export function GeminiCoach() {
  const { currentUser, householdId } = useAuth();
  const [apiKey, setApiKey] = useState(() => getStoredGeminiKey());
  const [selectedModel, setSelectedModel] = useState(() => getStoredGeminiModel());
  const [showKeyInput, setShowKeyInput] = useState(!getStoredGeminiKey());
  const [tempKey, setTempKey] = useState(apiKey);
  const [householdStats, setHouseholdStats] = useState(() => buildHouseholdContext(householdId));

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `¡Hola Dionicio y Paula! Soy su Coach Gemini personal para la rutina "Dúo en Casa" (19:00 a 20:00).
Estoy conectado en tiempo real con sus registros de sobrecarga, las series de mancuernas, la trotadora y los ingredientes de su despensa.

¿En qué puedo orientar su entrenamiento o nutrición hoy?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refresh household context stats periodically or on focus
  useEffect(() => {
    setHouseholdStats(buildHouseholdContext(householdId));
  }, [householdId, messages]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    setApiKey(tempKey.trim());
    saveGeminiKey(tempKey.trim());
    saveGeminiModel(selectedModel);
    setShowKeyInput(false);
  };

  const executeCoachPrompt = async (promptText) => {
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const userMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const responseText = await askCoachWithFullContext(promptText, currentUser, householdId, apiKey);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText }
      ]);
    } catch (err) {
      console.error('Error with Gemini Coach:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error al conectar con Gemini: ${err.message || 'Verifica tu API Key de Google AI Studio y vuelve a intentar.'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    const q = inputQuery;
    setInputQuery('');
    executeCoachPrompt(q);
  };

  const handlePresetPrompt = (type) => {
    const isDionicio = currentUser === 'dionicio';
    const athleteName = isDionicio ? 'Dionicio' : 'Paula';

    if (type === 'live_session_briefing') {
      executeCoachPrompt(`Actúa como nuestro coach en vivo. Genera el Briefing Estratégico para la sesión de hoy (19:00 a 20:00). Analiza nuestras últimas series registradas, recomienda qué pesos debemos calibrar hoy en las mancuernas y cómo debemos coordinar la rotación de 25 min.`);
    } else if (type === 'analyze_fatigue') {
      executeCoachPrompt(`Analiza mis últimos registros de series y RPE (${athleteName}). ¿Estoy en el rango óptimo de RPE 6-7 de la Semana 0 o he acumulado fatiga excesiva? Dame recomendaciones puntuales de descanso.`);
    } else if (type === 'sync_dinner') {
      executeCoachPrompt(`Considerando nuestro entrenamiento de hoy a las 19:00 y los ingredientes informados en nuestra despensa (${householdStats.pantryItems.join(', ')}), ¿cómo optimizamos la cena de las 20:00 (misma receta para ambos con porciones diferenciadas) para maximizar la síntesis proteica?`);
    } else if (type === 'joint_comfort') {
      executeCoachPrompt(`Si ${athleteName} siente ligera molestia o falta de movilidad en hombros o rodillas durante la rutina, ¿qué ajustes biomecánicos exactos o variantes en el suelo recomiendas para no suspender el entrenamiento?`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-black text-white">Centro de Inteligencia Gemini Coach</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Conectado en vivo con los registros de fuerza, trotadora y despensa del hogar compartido.
          </p>
        </div>

        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gym-800 hover:bg-gym-700 text-slate-300 border border-gym-700 rounded-xl text-xs font-semibold transition-all"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>{apiKey ? 'API Key Configurada' : 'Ingresar API Key'}</span>
        </button>
      </div>

      {/* 360° Live Household Context Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gym-800/90 border border-sky-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
            <Dumbbell className="w-4 h-4" />
            <span>Series del Hogar</span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {householdStats.totalLogsCount} <span className="text-xs font-normal text-slate-400">registros</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Sincronizados en Firestore</span>
        </div>

        <div className="bg-gym-800/90 border border-pink-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold">
            <Activity className="w-4 h-4" />
            <span>Atleta Activo</span>
          </div>
          <div className="text-xl font-black text-white">
            {USERS[currentUser]?.name}
          </div>
          <span className="text-[10px] text-pink-300 block">{USERS[currentUser]?.phase}</span>
        </div>

        <div className="bg-gym-800/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <ShoppingBag className="w-4 h-4" />
            <span>Despensa Activa</span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {householdStats.pantryItems.length} <span className="text-xs font-normal text-slate-400">ítems</span>
          </div>
          <span className="text-[10px] text-emerald-300 block">100% cocina compartida</span>
        </div>

        <div className="bg-gym-800/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
            <Utensils className="w-4 h-4" />
            <span>Menú Semanal</span>
          </div>
          <div className="text-xl font-black text-white">
            {householdStats.hasActiveMenu ? 'Activo' : 'Pendiente'}
          </div>
          <span className="text-[10px] text-slate-400 block">Cena fijada a las 20:00</span>
        </div>
      </div>

      {/* API Key Modal / Banner */}
      {showKeyInput && (
        <div className="bg-gym-800/95 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Google Gemini API Key (Privada en tu Navegador)</h4>
            </div>
            {apiKey && (
              <button onClick={() => setShowKeyInput(false)} className="text-slate-400 hover:text-white text-xs">
                Cerrar
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu clave se guarda únicamente en el <code className="text-amber-300">localStorage</code> de este dispositivo y nunca se comparte.
            Puedes obtenerla gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline">Google AI Studio</a>.
          </p>

          <form onSubmit={handleSaveKey} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-gym-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Modelo de IA Activo
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  saveGeminiModel(e.target.value);
                }}
                className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
              >
                {GEMINI_AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>
      )}

      {/* 1-Click Smart Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => handlePresetPrompt('live_session_briefing')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🎯 Briefing Pre-Entreno (19:00)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Analiza historial y define metas de peso y rotación para hoy.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('analyze_fatigue')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-sky-950/40 border border-sky-500/30 hover:border-sky-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
            <Dumbbell className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>📊 Analizar Fatiga & RPE</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Evalúa la sobrecarga real de las series de {USERS[currentUser]?.name}.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('sync_dinner')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Utensils className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🥗 Coordinar Cena (20:00)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sincroniza la cena compartida con el gasto calórico de la sesión.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('joint_comfort')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-pink-950/40 border border-pink-500/30 hover:border-pink-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🛡️ Ajustes Biomecánicos</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Variantes seguras para cuidar hombros, rodillas y zona lumbar.
          </p>
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 max-h-[500px] overflow-y-auto">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-sky-500 text-white'
                  : 'bg-gradient-to-br from-pink-500 to-indigo-600 text-white shadow-md'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-none'
                  : 'bg-gym-900/90 border border-gym-700 text-slate-200 rounded-tl-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-gym-900 border border-gym-700 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
              <span>El Coach Gemini está analizando los registros del hogar y preparando su respuesta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          placeholder="Escribe tu consulta al Coach Gemini con acceso a todos tus datos..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-gym-800 border border-gym-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 disabled:opacity-30 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/20 flex items-center gap-2 transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Preguntar</span>
        </button>
      </form>
    </div>
  );
}
