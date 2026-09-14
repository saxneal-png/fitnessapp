import React from 'react';
import { useAuth } from '../context/AuthContext';
import { WORKOUT_DAYS, TREADMILL_PROTOCOLS, USERS } from '../data/workoutCatalog';
import { Printer, Calendar, Download, ExternalLink, CheckSquare, Clock, Dumbbell, Footprints, Sparkles } from 'lucide-react';

export function PrintablePlan() {
  const { currentUser } = useAuth();
  const user = USERS[currentUser] || USERS.dionicio;

  const handlePrint = () => {
    window.print();
  };

  // Generate .ICS file for weekly workouts (19:00 to 20:00)
  const handleDownloadICS = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DuoEnCasa//Fitness App//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Rutina Dúo en Casa - Semana 0 (19:00 - 20:00)
X-WR-TIMEZONE:America/Santiago
BEGIN:VEVENT
SUMMARY:🏋️ Dúo en Casa: Torso & Trotadora (Semana 0)
DESCRIPTION:Sesión 19:00-20:00 con mancuernas modulares y trotadora.\\nSemana 0 de calibración principiante.\\nBloque 1 (25m) + Transición (3m) + Bloque 2 (25m).
DTSTART;TZID=America/Santiago:20260914T190000
DTEND;TZID=America/Santiago:20260914T200000
RRULE:FREQ=WEEKLY;BYDAY=MO,TH
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
SUMMARY:🦵 Dúo en Casa: Pierna & Core + Trotadora (Semana 0)
DESCRIPTION:Sesión 19:00-20:00 de sentadilla goblet, peso muerto rumano y trotadora.\\nSemana 0 de calibración principiante.\\nBloque 1 (25m) + Transición (3m) + Bloque 2 (25m).
DTSTART;TZID=America/Santiago:20260915T190000
DTEND;TZID=America/Santiago:20260915T200000
RRULE:FREQ=WEEKLY;BYDAY=TU,FR
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Rutina_Duo_En_Casa_Semana0.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Calendar Quick Add URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Entrenamiento+D%C3%BAo+en+Casa+(Semana+0)&details=Rutina+sincronizada+de+Fuerza+y+Trotadora+Dionicio+y+Paula+(19:00-20:00).&dates=20260914T220000Z/20260914T230000Z&recur=RRULE:FREQ%3DWEEKLY;BYDAY%3DMO,TU,TH,FR`;

  return (
    <div className="space-y-6">
      {/* Action Header - Hidden on Print */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-black text-white">Pauta Imprimible A4 & Calendario</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
              Semana 0 (Calibración)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Pauta semanal adaptada a nivel principiante con casillas para anotar las cargas reales de esta semana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Hoja A4</span>
          </button>

          <button
            onClick={handleDownloadICS}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gym-700 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs sm:text-sm font-bold transition-all"
            title="Descargar archivo .ics para Apple Calendar o Outlook"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Descargar .ics</span>
          </button>

          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gym-700 hover:bg-gym-600 text-slate-200 border border-gym-600 rounded-xl text-xs sm:text-sm font-bold transition-all"
            title="Agendar en Google Calendar"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Google Calendar</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* Printable Sheet Area (Styled for both Screen and High Quality Print) */}
      <div className="printable-page bg-white text-black p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto space-y-5">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
                📋 Pauta Semanal — Dúo en Casa
              </h1>
              <span className="border border-black px-2 py-0.5 text-xs font-bold uppercase rounded">
                Semana 0 (Calibración Principiante)
              </span>
            </div>
            <p className="text-xs text-gray-700 font-semibold mt-1">
              Horario: <strong>19:00 a 20:00</strong> • RPE Objetivo: <strong>6 - 7 / 10</strong> (Dejar 3-4 reps en reserva para aprender la técnica).
            </p>
          </div>
          <div className="text-right text-xs font-mono text-gray-800 border border-black px-3 py-1.5 rounded">
            <div><strong>Dionicio:</strong> Atleta 1 (180 cm)</div>
            <div><strong>Paula:</strong> Atleta 2 (160 cm)</div>
          </div>
        </div>

        {/* Schedule Grid Overview */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border border-black rounded-lg p-2 bg-gray-50 print-card">
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Lunes</span>
            <span>Torso + Trotadora</span>
          </div>
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Martes</span>
            <span>Pierna/Core + Trotadora</span>
          </div>
          <div className="border-r border-gray-300">
            <span className="text-gray-500 uppercase text-[10px] block">Jueves</span>
            <span>Torso + Trotadora</span>
          </div>
          <div>
            <span className="text-gray-500 uppercase text-[10px] block">Viernes</span>
            <span>Pierna/Core + Trotadora</span>
          </div>
        </div>

        {/* Workouts Breakdown */}
        <div className="space-y-4">
          {WORKOUT_DAYS.map((workout) => (
            <div key={workout.id} className="border border-black rounded-xl p-3.5 space-y-2 print-card">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1.5">
                <h3 className="font-extrabold text-sm uppercase text-black flex items-center gap-2">
                  <span>🏋️ {workout.name}</span>
                </h3>
                <span className="text-[11px] font-semibold bg-gray-200 text-black px-2 py-0.5 rounded print-badge">
                  Días: {workout.days.join(' y ')}
                </span>
              </div>

              {/* Table of Exercises */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-gray-700">
                    <th className="py-1 font-bold">Ejercicio</th>
                    <th className="py-1 font-bold">Series x Reps</th>
                    <th className="py-1 font-bold">Dionicio (Base)</th>
                    <th className="py-1 font-bold">Paula (Base)</th>
                    <th className="py-1 font-bold text-center">Registro Real (Semana 0)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workout.exercises.map((ex) => (
                    <tr key={ex.id} className="py-1.5">
                      <td className="py-1.5 font-bold text-black">{ex.name}</td>
                      <td className="py-1.5 font-mono text-gray-800">{ex.targetSets} x {ex.targetReps}</td>
                      <td className="py-1.5 font-mono font-bold text-black">~{ex.defaultWeightDionicio} kg</td>
                      <td className="py-1.5 font-mono font-bold text-black">~{ex.defaultWeightPaula} kg</td>
                      <td className="py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Differentiated Treadmill Protocols */}
          <div className="border border-black rounded-xl p-3.5 space-y-2 print-card">
            <h3 className="font-extrabold text-sm uppercase text-black border-b border-gray-300 pb-1.5">
              🏃 Trotadora Eléctrica (25 min) — Protocolos Diferenciados para Principiantes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Dionicio Protocol */}
              <div className="border border-gray-300 p-2.5 rounded bg-gray-50 print-card space-y-1">
                <strong className="text-black block text-xs border-b border-gray-200 pb-0.5">
                  👨‍💻 Dionicio (180 cm):
                </strong>
                <div className="space-y-1 font-mono text-[11px] text-gray-800">
                  <div>• Min 0-3: Inc 2 | 4.0 km/h (Adaptación)</div>
                  <div>• Min 3-20: Inc 5 - 8 | 4.5 - 4.8 km/h (Zona 2)</div>
                  <div>• Min 20-25: Inc 2 | 3.8 km/h (Enfriamiento)</div>
                </div>
              </div>

              {/* Paula Protocol */}
              <div className="border border-gray-300 p-2.5 rounded bg-gray-50 print-card space-y-1">
                <strong className="text-black block text-xs border-b border-gray-200 pb-0.5">
                  👩‍💼 Paula (41 años, 160 cm):
                </strong>
                <div className="space-y-1 font-mono text-[11px] text-gray-800">
                  <div>• Min 0-3: Inc 2 | 3.6 km/h (Adaptación)</div>
                  <div>• Min 3-20: Inc 4 - 6 | 4.0 - 4.3 km/h (Zona 2)</div>
                  <div>• Min 20-25: Inc 1 | 3.5 km/h (Enfriamiento)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notes for Print */}
        <div className="border-t border-gray-300 pt-2.5 text-[10px] text-gray-600 flex items-center justify-between">
          <span>Ventana Sagrada 19:00 - 20:00 • Rotación a las 19:32 (3 min)</span>
          <span>Sincronizado con Firebase Firestore • Generado por Dúo en Casa</span>
        </div>
      </div>
    </div>
  );
}
