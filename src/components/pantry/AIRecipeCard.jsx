import React from 'react';
import { ChefHat, Sparkles, RefreshCw, Copy, Printer, Check } from 'lucide-react';

export function AIRecipeCard({
  generatedMenu,
  isLoading,
  onGenerate,
  onCopy,
  onPrint,
  copied,
  pantryItemsCount
}) {
  return (
    <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gym-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Menú Semanal Personalizado con IA</h3>
            <p className="text-xs text-slate-400">Genera almuerzos y cenas adaptados a las calorías de Dionicio y Paula.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || pantryItemsCount === 0}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gym-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{generatedMenu ? 'Regenerar Menú' : 'Crear Menú con Despensa'}</span>
        </button>
      </div>

      {generatedMenu ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Generado: {generatedMenu.generatedAt}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="px-2.5 py-1 bg-gym-900 border border-gym-700 rounded-lg text-slate-300 hover:text-white flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="px-2.5 py-1 bg-gym-900 border border-gym-700 rounded-lg text-slate-300 hover:text-white flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          <div className="bg-gym-900/90 border border-gym-700/80 rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line font-mono max-h-[500px] overflow-y-auto">
            {generatedMenu.content}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-gym-700 rounded-xl text-xs text-slate-500 space-y-2">
          <ChefHat className="w-8 h-8 text-slate-600 mx-auto" />
          <p>Presiona el botón para diseñar un menú de lunes a viernes basado estrictamente en lo que tienes en despensa.</p>
        </div>
      )}
    </div>
  );
}
