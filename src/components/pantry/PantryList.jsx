import React from 'react';
import { Plus, Trash2, ShoppingBag } from 'lucide-react';

export function PantryList({
  pantryItems,
  onTogglePreset,
  onRemoveItem,
  onAddCustom,
  customInput,
  onCustomInputChange,
  presetIngredients = [],
  isDuoHousehold = false
}) {
  return (
    <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-gym-700 pb-3">
        <h3 className="font-extrabold text-base text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          <span>Ingredientes en Despensa ({pantryItems.length})</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {isDuoHousehold ? 'Compartido Dúo' : 'Despensa Personal'}
        </span>
      </div>

      {/* Preset quick buttons */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
          Ingredientes Frecuentes (Clic para agregar/quitar)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {presetIngredients.map((ing) => {
            const isSelected = pantryItems.includes(ing.name);
            return (
              <button
                key={ing.id}
                type="button"
                onClick={() => onTogglePreset(ing.name)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-gym-900 text-slate-400 border border-gym-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                <span>{ing.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom item input */}
      <form onSubmit={onAddCustom} className="flex gap-2 pt-2">
        <input
          type="text"
          placeholder="Añadir otro ingrediente disponible..."
          value={customInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          className="flex-1 bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-gym-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir</span>
        </button>
      </form>

      {/* Active Items List */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
          Actualmente en Tu Despensa
        </label>
        <div className="flex flex-wrap gap-2">
          {pantryItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gym-900 border border-gym-700 text-xs text-slate-200"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onRemoveItem(item)}
                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
