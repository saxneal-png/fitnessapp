import React from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';

export function PantryNLPInput({
  value,
  onChange,
  onSubmit,
  isAnalyzing,
  selectedAthlete,
  errorMessage,
  lastResult
}) {
  const isDionicio = selectedAthlete === 'dionicio';

  return (
    <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
              <span>Registro Rápido con Coach IA (Lenguaje Natural)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Escribe lo que comiste o tu once (ej: <em>"Paula comió 1 marraqueta con 80g quesillo y té"</em>)
            </p>
          </div>
        </div>

        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isDionicio ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'}`}>
          {isDionicio ? '👨‍💻 Dionicio' : '👩‍💼 Paula'}
        </span>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Describe la comida para ${isDionicio ? 'Dionicio' : 'Paula'}...`}
          disabled={isAnalyzing}
          className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isAnalyzing || !value.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-gym-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-md"
        >
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Analizar</span>
        </button>
      </form>

      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {lastResult && (
        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white block">Resumen del Coach IA:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">{lastResult.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
