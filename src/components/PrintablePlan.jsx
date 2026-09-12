import React from 'react';
import { useAuth } from '../context/AuthContext';
import { WORKOUT_DAYS, TREADMILL_PROTOCOL, USERS } from '../data/workoutCatalog';
import { Printer, Calendar, Download, ExternalLink, CheckSquare, Clock, Dumbbell, Footprints } from 'lucide-react';

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
X-WR-CALNAME:Rutina Dúo en Casa (19:00 - 20:00)
X-WR-TIMEZONE:America/Santiago
BEGIN:VEVENT
SUMMARY:🏋️ Dúo en Casa: Torso & Trotadora
DESCRIPTION:Sesión 19:00-20:00 con mancuernas 40kg y trotadora inclinación 15.\\nBloque 1 (25m) + Transición (3m) + Bloque 2 (25m).
DTSTART;TZID=America/Santiago:20260914T190000
DTEND;TZID=America/Santiago:20260914T200000
RRULE:FREQ=WEEKLY;BYDAY=MO,TH
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
SUMMARY:🦵 Dúo en Casa: Pierna & Core + Trotadora
DESCRIPTION:Sesión 19:00-20:00 con sentadilla goblet, peso muerto rumano y trotadora.\\nBloque 1 (25m) + Transición (3m) + Bloque 2 (25m).
DTSTART;TZID=America/Santiago:20260915T190000
DTEND;TZID=America/Santiago:20260915T200000
RRULE:FREQ=WEEKLY;BYDAY=TU,FR
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Rutina_Duo_En_Casa_${currentUser}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Calendar Quick Add URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Entrenamiento+D%C3%BAo+en+Casa+(19:00-20:00)&details=Rutina+sincronizada+de+Fuerza+y+Trotadora+Dionicio+y+Paula.&dates=20260914T220000Z/20260914T230000Z&recur=RRULE:FREQ%3DWEEKLY;BYDAY%3DMO,TU,TH,FR`;

  return (
    <div className="space-y-6">
      {/* Action Header - Hidden on Print */}
      <div className="bg-gym-800/90 border border-gym-700 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Printer className="w-6 h-6 text-indigo-400" />
            <span>Pauta Semanal Imprimible & Calendario</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Formato A4 en blanco y negro con casillas de verificación para colgar en el área de entrenamiento.
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
      <div className="printable-page bg-white text-black p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-4xl mx-auto space-y-6">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight uppercase text-black">
              📋 Pauta de Entrenamiento Semanal — Dúo en Casa
            </h1>
            <p className="text-xs text-gray-700 font-semibold mt-1">
              Horario: <strong>19:00 a 20:00</strong> | Equipamiento: Set Mancuernas 40kg + Trotadora Eléctrica (15 inc)
            </p>
          </div>
          <div className="text-right text-xs font-mono text-gray-600 border border-black px-3 py-1.5 rounded">
            <div>Atletas: Dionicio & Paula</div>
            <div>Semana: ____ / ____ / 2026</div>
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
        <div className="space-y-6">
          {WORKOUT_DAYS.map((workout) => (
            <div key={workout.id} className="border border-black rounded-xl p-4 space-y-3 print-card">
              <div className="flex items-center justify-between border-b border-gray-300 pb-2">
                <h3 className="font-extrabold text-base uppercase text-black flex items-center gap-2">
                  <span>🏋️ {workout.name}</span>
                </h3>
                <span className="text-xs font-semibold bg-gray-200 text-black px-2 py-0.5 rounded print-badge">
                  Días: {workout.days.join(' y ')}
                </span>
              </div>

              {/* Table of Exercises */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-gray-700">
                    <th className="py-1.5 font-bold">Ejercicio</th>
                    <th className="py-1.5 font-bold">Series x Reps</th>
                    <th className="py-1.5 font-bold">Dionicio (~kg)</th>
                    <th className="py-1.5 font-bold">Paula (~kg)</th>
                    <th className="py-1.5 font-bold text-center">Registro de Series</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workout.exercises.map((ex) => (
                    <tr key={ex.id} className="py-2">
                      <td className="py-2 font-bold text-black">{ex.name}</td>
                      <td className="py-2 font-mono text-gray-800">{ex.targetSets} x {ex.targetReps}</td>
                      <td className="py-2 font-mono font-bold text-black">{ex.defaultWeightDionicio} kg</td>
                      <td className="py-2 font-mono font-bold text-black">{ex.defaultWeightPaula} kg</td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                          <span className="border border-black px-1.5 py-0.5 rounded inline-block min-w-[28px] text-gray-400">[ &nbsp; ]</span>
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

          {/* Treadmill Protocol */}
          <div className="border border-black rounded-xl p-4 space-y-2 print-card">
            <h3 className="font-extrabold text-base uppercase text-black flex items-center gap-2 border-b border-gray-300 pb-2">
              <span>🏃 {TREADMILL_PROTOCOL.name}</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {TREADMILL_PROTOCOL.phases.map((phase, idx) => (
                <div key={idx} className="border border-gray-300 p-2 rounded bg-gray-50 print-card">
                  <div className="font-bold text-black">{phase.range}</div>
                  <div className="text-[11px] font-mono text-gray-800">
                    Inc: <strong>{phase.incline}</strong> | Vel: <strong>{phase.speedKmH} km/h</strong>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">{phase.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Notes for Print */}
        <div className="border-t border-gray-300 pt-3 text-[10px] text-gray-600 flex items-center justify-between">
          <span>Cronograma estricto 19:00 - 20:00 • Rotación a las 19:32 (3 min)</span>
          <span>Sincronizado con Firebase Firestore • Generado por Dúo en Casa</span>
        </div>
      </div>
    </div>
  );
}
