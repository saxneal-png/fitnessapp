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
  LogOut,
  Scale
} from 'lucide-react';

export function Navbar({ currentTab, setCurrentTab, onOpenConfig, onLogout }) {
  const { currentUser, switchUser, sessionMode, changeSessionMode, allUsers, userProfile, isDuoHousehold, isFirebaseConnected, fbUser, logoutFirebase } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-gym-900/90 backdrop-blur-md border-b border-gym-700/60 no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => setCurrentTab('timer')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-pink-500 p-0.5 shadow-md shadow-sky-500/20">
              <div className="w-full h-full bg-gym-900 rounded-[9px] sm:rounded-[10px] flex items-center justify-center">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                  {isDuoHousehold ? 'Dúo ' : 'Fitness '}
                  <span className="hidden sm:inline">{isDuoHousehold ? 'en Casa' : 'App & Coach'}</span>
                </span>
                {isDuoHousehold && (
                  <span className="hidden md:inline-flex text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    19:00 - 20:00
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
                {isDuoHousehold ? 'Dionicio & Paula • Overload Tracker' : `${userProfile?.name || 'Mi Perfil'} • Sesión Privada`}
              </p>
            </div>
          </div>

          {/* User Switcher & Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Mode switch: Duo vs Single (Solo para hogar Dúo) */}
            {isDuoHousehold && (
              <div className="hidden lg:flex items-center bg-gym-800 rounded-lg p-0.5 border border-gym-700">
                <button
                  onClick={() => changeSessionMode('duo')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                    sessionMode === 'duo'
                      ? 'bg-gradient-to-r from-sky-500/20 to-pink-500/20 text-white border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Modo Dúo: Pantalla compartida"
                >
                  <Users className="w-3 h-3 text-sky-400" />
                  <span>Dúo</span>
                </button>
                <button
                  onClick={() => changeSessionMode('single')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                    sessionMode === 'single'
                      ? 'bg-gym-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Modo Individual: Vista móvil"
                >
                  <User className="w-3 h-3" />
                  <span>Single</span>
                </button>
              </div>
            )}

            {/* Selector de Atleta o Badge de Usuario Privado */}
            <div className="flex items-center">
              {isDuoHousehold ? (
                <>
                  {/* Mobile compact switcher button */}
                  <button
                    onClick={() => {
                      const uids = Object.keys(allUsers);
                      const currentIdx = uids.indexOf(currentUser);
                      const nextUid = uids[(currentIdx + 1) % uids.length];
                      switchUser(nextUid);
                    }}
                    className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border border-sky-400/50 bg-sky-500/20 text-sky-200 transition-all active:scale-95"
                    title="Toca para cambiar de atleta"
                  >
                    <span>{allUsers[currentUser]?.avatar || '🏋️‍♂️'} {allUsers[currentUser]?.name || 'Atleta'}</span>
                    <span className="text-[10px] text-slate-400 opacity-70">⇄</span>
                  </button>

                  {/* Desktop Dual Switcher */}
                  <div className="hidden sm:flex items-center bg-gym-800 rounded-xl p-1 border border-gym-700 max-w-[280px] overflow-x-auto scrollbar-none gap-1">
                    {Object.values(allUsers).map((athlete) => (
                      <button
                        key={athlete.uid}
                        onClick={() => switchUser(athlete.uid)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                          currentUser === athlete.uid
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{athlete.avatar || '🏋️‍♂️'}</span>
                        <span>{athlete.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* Cuenta privada individual: solo su perfil personal */
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gym-800 border border-gym-700 text-slate-200 text-xs font-bold shadow-sm">
                  <span className="text-sm">{userProfile?.avatar || '🏋️‍♂️'}</span>
                  <span className="max-w-[120px] truncate">{userProfile?.name || 'Mi Perfil'}</span>
                </div>
              )}
            </div>

            {/* Cloud Status Badge & Config */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isFirebaseConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Configuración de Firebase Nube"
            >
              <span className={`w-2 h-2 rounded-full ${isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <Settings className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {/* Logout Button */}
            <button
              onClick={async () => {
                await logoutFirebase();
                if (onLogout) onLogout();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on mobile) */}
        <nav className="hidden md:flex space-x-1 lg:space-x-2 overflow-x-auto py-2 border-t border-gym-800/80 scrollbar-none">
          <button
            onClick={() => setCurrentTab('timer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'logger'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Registrar Cargas</span>
          </button>

          <button
            onClick={() => setCurrentTab('metrics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'metrics'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Pesos & Medidas</span>
          </button>

          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'dashboard'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard Dúo</span>
          </button>

          <button
            onClick={() => setCurrentTab('pantry')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'pantry'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Nutrición & Despensa</span>
          </button>

          <button
            onClick={() => setCurrentTab('coach')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'coach'
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Coach Gemini</span>
          </button>

          <button
            onClick={() => setCurrentTab('planner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'planner'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-gym-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Plan Imprimible</span>
          </button>
        </nav>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (Thumb-friendly & always in reach) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-gym-700/80 px-1 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-6 gap-1 max-w-md mx-auto">
          <button
            onClick={() => setCurrentTab('timer')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'timer'
                ? 'text-sky-400 bg-sky-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Sesión</span>
          </button>

          <button
            onClick={() => setCurrentTab('logger')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'logger'
                ? 'text-amber-400 bg-amber-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Cargas</span>
          </button>

          <button
            onClick={() => setCurrentTab('metrics')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'metrics'
                ? 'text-indigo-400 bg-indigo-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Medidas</span>
          </button>

          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'dashboard'
                ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Stats</span>
          </button>

          <button
            onClick={() => setCurrentTab('pantry')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'pantry'
                ? 'text-teal-400 bg-teal-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Nutrición</span>
          </button>

          <button
            onClick={() => setCurrentTab('coach')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-95 ${
              currentTab === 'coach'
                ? 'text-pink-400 bg-pink-500/10 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight">Coach</span>
          </button>
        </div>
      </div>
    </header>
  );
}
