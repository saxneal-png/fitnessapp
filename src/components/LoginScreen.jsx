import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { Dumbbell, Lock, Mail, ArrowRight, ShieldCheck, Users, Sparkles, AlertCircle } from 'lucide-react';

export function LoginScreen({ onGuestDuoAccess }) {
  const { loginWithFirebase, registerWithFirebase, switchUser, changeSessionMode, isFirebaseConnected } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('dionicio'); // 'dionicio' or 'paula'
  const [email, setEmail] = useState('saxneal@gmail.com');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerWithFirebase(email, password);
      } else {
        await loginWithFirebase(email, password);
      }
      
      // Map user identity based on email or selection
      const emailLower = email.toLowerCase();
      if (emailLower.includes('paula') || emailLower.includes('sandoval') || selectedUserType === 'paula') {
        switchUser('paula');
      } else {
        switchUser('dionicio');
      }
      changeSessionMode('single');
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Correo o contraseña incorrectos. Verifica tus datos de Firebase.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo ya está registrado. Selecciona "Iniciar Sesión".';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLocalLogin = (uid) => {
    switchUser(uid);
    changeSessionMode('single');
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
                setEmail('saxneal@gmail.com');
              }}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                selectedUserType === 'dionicio'
                  ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/20'
                  : 'bg-gym-900/60 border-gym-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl">👨‍💻</span>
              <span className="font-bold text-xs">Dionicio</span>
              <span className="text-[10px] text-slate-500">saxneal@gmail.com</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedUserType('paula');
                setEmail('paula_sandoval@yahoo.es');
              }}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                selectedUserType === 'paula'
                  ? 'bg-pink-500/20 border-pink-400 text-white shadow-md shadow-pink-500/20'
                  : 'bg-gym-900/60 border-gym-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-2xl">👩‍💼</span>
              <span className="font-bold text-xs">Paula</span>
              <span className="text-[10px] text-slate-500">paula_sandoval@yahoo.es</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
              <span>Conectando...</span>
            ) : (
              <>
                <span>{isRegister ? 'Crear Cuenta y Entrar' : `Entrar como ${selectedUserType === 'dionicio' ? 'Dionicio' : 'Paula'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-slate-400 hover:text-white underline transition-colors"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿Primera vez en este dispositivo? Regístrate aquí'}
          </button>
        </div>

        {/* Alternative: Shared Duo Mode on Tablet/TV */}
        <div className="pt-4 border-t border-gym-700 text-center space-y-2">
          <button
            type="button"
            onClick={onGuestDuoAccess}
            className="w-full py-2.5 bg-gym-900/80 hover:bg-gym-900 border border-gym-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Acceder en Modo Dúo (Pantalla Compartida TV / Tablet)</span>
          </button>
          <p className="text-[10px] text-slate-500">
            Recomendado si ambos están frente a la misma pantalla durante el entrenamiento de las 19:00.
          </p>
        </div>
      </div>
    </div>
  );
}
