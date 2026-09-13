import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, 
  Timer, 
  TrendingUp, 
  Calendar, 
  Bot, 
  Settings, 
  Users, 
  User, 
  Flame, 
  Sparkles,
  Printer,
  Utensils,
  LogOut
} from 'lucide-react';

export function Navbar({ currentTab, setCurrentTab, onOpenConfig, onLogout }) {
  const { currentUser, switchUser, sessionMode, changeSessionMode, allUsers, isFirebaseConnected, fbUser, logoutFirebase } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-gym-900/90 backdrop-blur-md border-b border-gym-700/60 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('timer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-gym-900 rounded-[10px] flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                  Dúo en Casa
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  19:00 - 20:00
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Dionicio & Paula • Overload Tracker</p>
            </div>
          </div>

          {/* User Switcher & Mode Selector */}
          <div className="flex items-center gap-2">
            {/* Mode switch: Duo vs Single */}
            <div className="hidden md:flex items-center bg-gym-800 rounded-lg p-1 border border-gym-700">
              <button
                onClick={() => changeSessionMode('duo')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  sessionMode === 'duo'
                    ? 'bg-gradient-to-r from-sky-500/20 to-pink-500/20 text-white border border-sky-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Modo Dúo: Pantalla compartida en TV/Tablet para ambos"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Modo Dúo</span>
              </button>
              <button
                onClick={() => changeSessionMode('single')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  sessionMode === 'single'
                    ? 'bg-gym-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Modo Individual: Vista optimizada para móvil"
              >
                <User className="w-3.5 h-3.5" />
                <span>Individual</span>
              </button>
            </div>

            {/* Active User Display / Switcher */}
            {sessionMode === 'duo' ? (
              <div className="flex items-center bg-gym-800 rounded-xl p-1 border border-gym-700">
                <button
                  onClick={() => switchUser('dionicio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentUser === 'dionicio'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  <span>👨‍💻 Dionicio</span>
                </button>
                <button
                  onClick={() => switchUser('paula')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentUser === 'paula'
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                      : 'text-slate-400 hover:text-pink-300'
                  }`}
                >
                  <span>👩‍💼 Paula</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-gym-800 rounded-xl p-1 border border-gym-700">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  currentUser === 'dionicio' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                }`}>
                  <span>{currentUser === 'dionicio' ? '👨‍💻 Dionicio' : '👩‍💼 Paula'}</span>
                </div>
                <button
                  onClick={async () => {
                    await logoutFirebase();
                    if (onLogout) onLogout();
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-gym-700 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cloud Status Badge & Config */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isCloudOnline || isFirebaseConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Estado de sincronización en la Nube con Firebase"
            >
              <span className={`w-2 h-2 rounded-full ${isCloudOnline || isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="hidden sm:inline font-mono text-[11px]">
                {isCloudOnline || isFirebaseConnected ? 'Nube Firebase' : 'Modo Local'}
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-gym-800/80 scrollbar-none">
          <button
            onClick={() => setCurrentTab('timer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'timer'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Sesión en Vivo (19:00)</span>
          </button>

          <button
            onClick={() => setCurrentTab('logger')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'logger'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Registrar Cargas</span>
          </button>

          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'dashboard'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard Dúo</span>
          </button>

          <button
            onClick={() => setCurrentTab('planner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'planner'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Plan & Impresión A4</span>
          </button>

          <button
            onClick={() => setCurrentTab('pantry')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'pantry'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Despensa & Menú</span>
          </button>

          <button
            onClick={() => setCurrentTab('coach')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              currentTab === 'coach'
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Coach Gemini</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
