import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { ensureAnonymousAuth } from '../firebase/config';
import { Dumbbell, Lock, Mail, ArrowRight, ShieldCheck, Users, Sparkles, AlertCircle, Key, Check } from 'lucide-react';

export function LoginScreen({ onGuestDuoAccess }) {
  const { loginAthlete, switchUser, changeSessionMode } = useAuth();
  
  const getSavedEmail = (uid) => {
    try {
      return localStorage.getItem(`fitness_duo_saved_email_${uid}`) || '';
    } catch (e) {
      return '';
    }
  };

  const [isRegister, setIsRegister] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('dionicio'); // 'dionicio' or 'paula'
  const [email, setEmail] = useState(() => getSavedEmail('dionicio'));
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      await loginAthlete(cleanEmail, password, selectedUserType);
      // Successful login automatically sets session and updates state
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Error al verificar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAccess = async (uid) => {
    switchUser(uid);
    changeSessionMode('single');
    localStorage.setItem('fitness_duo_guest_access', 'true');
    await ensureAnonymousAuth();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-gym-800/90 border border-gym-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-pink-500 p-0.5 mx-auto shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-gym-900 rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Dúo en Casa
          </h1>
          <p className="text-xs text-slate-400">
            Entrenamiento sincronizado y sobrecarga progresiva (19:00 - 20:00).
          </p>
        </div>

        {/* User Identity Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            ¿Quién eres?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedUserType('dionicio');
                setEmail(getSavedEmail('dionicio'));
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                selectedUserType === 'dionicio'
                  ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/20'
                  : 'bg-gym-900/60 border-gym-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl">👨‍💻</span>
              <span className="font-bold text-xs">Dionicio</span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                {getSavedEmail('dionicio') || 'Atleta 1 (Torso)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedUserType('paula');
                setEmail(getSavedEmail('paula'));
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                selectedUserType === 'paula'
                  ? 'bg-pink-500/20 border-pink-400 text-white shadow-md shadow-pink-500/20'
                  : 'bg-gym-900/60 border-gym-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl">👩‍💼</span>
              <span className="font-bold text-xs">Paula</span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                {getSavedEmail('paula') || 'Atleta 2 (Trotadora)'}
              </span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@ejemplo.com"
              className="w-full bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-pink-400" />
              <span>Contraseña</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-black text-sm text-white shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2 ${
              selectedUserType === 'dionicio'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/20'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 shadow-pink-500/20'
            }`}
          >
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <span>Entrar como {selectedUserType === 'dionicio' ? 'Dionicio' : 'Paula'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
