import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocalLogs } from '../firebase/config';
import { USERS, WORKOUT_DAYS } from '../data/workoutCatalog';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  Check
} from 'lucide-react';

const GEMINI_STORAGE_KEY = 'fitness_gemini_api_key';

export function GeminiCoach() {
  const { currentUser, householdId } = useAuth();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(GEMINI_STORAGE_KEY) || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem(GEMINI_STORAGE_KEY));
  const [tempKey, setTempKey] = useState(apiKey);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `¡Hola Dionicio y Paula! Soy su Coach Gemini personal para la rutina "Dúo en Casa" (19:00 a 20:00). Puedo analizar sus registros de sobrecarga, recomendar ajustes en el set de mancuernas de 40 kg o sugerir adaptaciones nutricionales post-entreno. ¿En qué les ayudo hoy?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    setApiKey(tempKey.trim());
    localStorage.setItem(GEMINI_STORAGE_KEY, tempKey.trim());
    setShowKeyInput(false);
  };

  const executeGeminiPrompt = async (promptText) => {
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const userMessage = { role: 'user', content: promptText };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const logs = getLocalLogs(householdId);
      const userContext = USERS[currentUser];
      
      const systemInstruction = `Eres un Coach de Fuerza y Acondicionamiento Físico experto para Dionicio y Paula.
CONTEXTO CRÍTICO DE LOS ATLETAS:
- Nivel: PRINCIPIANTES ABSOLUTOS en entrenamiento de fuerza en casa.
- Fase actual: SEMANA 0 (Fase de Calibración, Aprendizaje Motor y Adaptación Tendinosa).
- Atleta actual: ${userContext.name} (${userContext.level}, ${userContext.height}, RPE Objetivo Semana 0: ${userContext.targetRPE}, Nutrición: ${userContext.nutrition}).
- Equipamiento: Set de mancuernas modulares ajustable hasta 40 kg totales, y trotadora eléctrica de 15 niveles de inclinación.
- Reloj: Apple Watch Series 8 para monitoreo de FC y calorías activas.
- Registros actuales en el hogar: ${JSON.stringify(logs.slice(0, 10))}.

REGLAS DE ORO PARA PRINCIPIANTES (SEMANA 0):
1. Dionicio y Paula tienen programas 100% INDIVIDUALES y diferentes: los pesos e intensidades nunca deben ser iguales.
2. En Semana 0, la meta NO es cansarse al máximo ni llegar al fallo, sino calibrar qué peso permite hacer 10-12 repeticiones limpias con RPE 6-7 (quedando 3-4 repeticiones en reserva).
3. Para la trotadora en Semana 0: Caminata en pendiente controlada (Zona 2 cardio, donde puedan hablar sin ahogarse).
4. Respuestas claras, concisas, estructuradas en viñetas y motivadoras.`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: systemInstruction 
      });

      const result = await model.generateContent(promptText);
      const responseText = result.response.text();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText }
      ]);
    } catch (err) {
      console.error('Error with Gemini API:', err);
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
    executeGeminiPrompt(q);
  };

  const handlePresetPrompt = (type) => {
    if (type === 'week0_calibration') {
      executeGeminiPrompt(`Actúa como mi coach. Soy principiante (${currentUser === 'dionicio' ? 'Dionicio' : 'Paula'}) y estoy en mi 'Semana 0'. Analiza cómo debo encarar las series de calibración de hoy, qué pesos iniciales me recomiendas para no lesionarme y cómo debo sentir el esfuerzo (RPE 6-7).`);
    } else if (type === 'overload') {
      executeGeminiPrompt(`A partir de mis registros de esta Semana 0, ¿qué pesos exactos me recomiendas fijar para la Semana 1 en cada ejercicio para iniciar la sobrecarga progresiva sin dolor articular?`);
    } else if (type === 'replace') {
      executeGeminiPrompt(`Siendo principiante, si siento molestia o falta de flexibilidad en algún ejercicio con mancuernas, ¿qué variante más amigable me recomiendas para el bloque de 25 minutos?`);
    } else if (type === 'nutrition') {
      executeGeminiPrompt(`Recomienda una cena post-entreno (20:00) para ${currentUser === 'dionicio' ? 'Dionicio (180cm, ayuno intermitente)' : 'Paula (41 años, 160cm)'} enfocada en recuperación muscular de principiante sin digestión pesada.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-black text-white">Coach Gemini Interactivo</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Inteligencia artificial especializada en sobrecarga progresiva y planificación dual en casa.
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
            Tu clave se guarda únicamente en el <code className="text-amber-300">localStorage</code> de este dispositivo y nunca se sube a GitHub.
            Puedes obtener tu clave gratuita en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline">Google AI Studio</a>.
          </p>

          <form onSubmit={handleSaveKey} className="flex gap-2">
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
          </form>
        </div>
      )}

      {/* Predefined Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => handlePresetPrompt('week0_calibration')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>🎯 Calibrar Semana 0</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Guía de pesos y RPE 6-7 para principiantes sin riesgo de lesión.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('overload')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-sky-950/40 border border-sky-500/30 hover:border-sky-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-1">
            <Dumbbell className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Proyectar Semana 1</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Analiza RPE de la Semana 0 y propone aumentos para la Semana 1.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('replace')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-pink-950/40 border border-pink-500/30 hover:border-pink-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Sugerir Reemplazo</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Variantes de ejercicios con mancuernas si hay molestias articulares.
          </p>
        </button>

        <button
          onClick={() => handlePresetPrompt('nutrition')}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-gym-800 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Utensils className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Cena Post-Entreno (20:00)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ideas de comidas de rápida asimilación para cerrar la ventana del día.
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
              <span>El Coach Gemini está analizando las series y preparando su respuesta...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          placeholder="Escribe tu consulta al Coach Gemini..."
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
