import React from 'react';
import { Calendar } from 'lucide-react';
import { formatShortDate } from '../../utils/dateUtils';

export function NutritionHistoryPills({
  availableDates = [],
  selectedDate,
  onSelectDate,
  todayStr
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
      <div className="flex items-center gap-1 text-slate-400 text-xs font-bold shrink-0 mr-1">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Historial:</span>
      </div>
      {availableDates.map((dateStr) => {
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelectDate(dateStr)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-emerald-500 text-gym-950 shadow-md shadow-emerald-500/20'
                : 'bg-gym-800 text-slate-400 border border-gym-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {isToday ? `Hoy (${formatShortDate(dateStr)})` : formatShortDate(dateStr)}
          </button>
        );
      })}
    </div>
  );
}
