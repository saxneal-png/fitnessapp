import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, 
  Lock, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  UserPlus, 
  Sparkles, 
  AlertCircle, 
  Key, 
  Check, 
  User, 
  Target,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  HelpCircle
} from 'lucide-react';

const AVATARS = ['👨‍💻', '👩‍💼', '🏋️‍♂️', '🏃‍♀️', '🧘‍♂️', '🥑', '🔥', '⚡', '💪', '🎯'];

export function LoginScreen() {
  const { loginAthlete, registerAthlete, sendRecoveryOtp, verifyOtpAndResetPassword } = useAuth();
  
  // Modos de pantalla: 'login' | 'register' | 'recovery'
  const [viewMode, setViewMode] = useState('login');

  // Estado del Formulario de Inicio de Sesión
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Estado del Formulario de Alta de Cuenta
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAvatar, setRegAvatar] = useState('🏋️‍♂️');
  const [regGender, setRegGender] = useState('male');
  const [regAge, setRegAge] = useState(30);
  const [regHeightCm, setRegHeightCm] = useState(175);
  const [regWeightKg, setRegWeightKg] = useState(75);
  const [regWaistCm, setRegWaistCm] = useState(85);
  const [regActiveMode, setRegActiveMode] = useState('visceral_fat_loss');
  const [regApiKey, setRegApiKey] = useState('');

  // Estado de Recuperación con OTP
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtpSent, setRecoveryOtpSent] = useState(false);
  const [recoveryOtpCode, setRecoveryOtpCode] = useState('');
  const [generatedOtpDisplay, setGeneratedOtpDisplay] = useState(null);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryEmailTarget, setRecoveryEmailTarget] = useState('');

  // Mensajes de Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Limpiar mensajes al cambiar de modo
  const switchMode = (mode) => {
    setViewMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratedOtpDisplay(null);
  };

  // 1. Manejador de Inicio de Sesión
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!loginIdentifier.trim()) {
        throw new Error('Por favor ingresa tu usuario o correo electrónico.');
      }
      if (!loginPassword) {
        throw new Error('Por favor ingresa tu contraseña.');
      }

      await loginAthlete(loginIdentifier.trim(), loginPassword);
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejador de Alta de Cuenta
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await registerAthlete({
        name: regName.trim(),
        username: regUsername.trim() || regName.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        email: regEmail.trim(),
        password: regPassword,
        avatar: regAvatar,
        gender: regGender,
        age: Number(regAge),
        heightCm: Number(regHeightCm),
        weightKg: Number(regWeightKg),
        waistCm: Number(regWaistCm),
        activeMode: regActiveMode,
        geminiApiKey: regApiKey.trim()
      });
      setSuccessMsg('¡Cuenta dada de alta exitosamente! Iniciando tu sesión privada...');
    } catch (err) {
      console.error('Register error:', err);
      setErrorMsg(err.message || 'Error al registrar la nueva cuenta.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Manejador de Solicitud de OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryIdentifier.trim()) {
      setErrorMsg('Por favor ingresa tu usuario o correo para enviarte el código OTP.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendRecoveryOtp(recoveryIdentifier.trim());
      setRecoveryOtpSent(true);
      setRecoveryEmailTarget(res.email);
      setGeneratedOtpDisplay(res.code);
      setSuccessMsg(`Código OTP generado para ${res.email}. Ingresa los 6 dígitos a continuación.`);
    } catch (err) {
      console.error('OTP request error:', err);
      setErrorMsg(err.message || 'No se pudo generar el código OTP de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Manejador de Verificación de OTP y Restablecimiento
  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (recoveryOtpCode.trim().length !== 6) {
      setErrorMsg('El código OTP debe ser de 6 dígitos numéricos.');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setErrorMsg('Las nuevas contraseñas no coinciden.');
      return;
    }
    if (recoveryNewPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyOtpAndResetPassword(
        recoveryIdentifier.trim(),
        recoveryOtpCode.trim(),
        recoveryNewPassword
      );

      setSuccessMsg(res.message || '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.');
      setLoginIdentifier(recoveryIdentifier.trim());
      setLoginPassword('');
      setRecoveryOtpSent(false);
      setRecoveryOtpCode('');
      setGeneratedOtpDisplay(null);
      
      // Regresar a la vista de login tras 1.5 segundos
      setTimeout(() => {
        setViewMode('login');
      }, 1500);
    } catch (err) {
      console.error('OTP reset error:', err);
      setErrorMsg(err.message || 'Error al validar el código OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-lg w-full bg-gym-800/95 border border-gym-700/80 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6 animate-fadeIn">
        
        {/* Encabezado General */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-pink-500 p-0.5 mx-auto shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-gym-900 rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Fitness App & Coach
          </h1>
          <p className="text-xs text-slate-400">
            Plataforma individual y privada con IA personalizada
          </p>
        </div>

        {/* Notificaciones de Alerta / Error */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Notificaciones de Éxito */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 1: INICIAR SESIÓN (LIMPIO, SIN PREGUNTAS DE NOMBRES) */}
        {/* ======================================================== */}
        {viewMode === 'login' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center border-b border-gym-700 pb-3">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Ingreso a tu Cuenta</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ingresa con tu usuario o correo electrónico registrado
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Usuario o Correo */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>Usuario o Correo Electrónico</span>
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Ej: dionicio o tu@correo.com"
                  autoComplete="username"
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  required
                />
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Contraseña</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('recovery')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg bg-gradient-to-r from-sky-500 via-indigo-600 to-pink-600 hover:from-sky-400 hover:via-indigo-500 hover:to-pink-500 shadow-indigo-500/20 transition-all transform active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Iniciando sesión segura...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Separador y Enlace para Dar de Alta Cuenta */}
            <div className="pt-3 border-t border-gym-700/80 text-center space-y-2">
              <p className="text-xs text-slate-400">
                ¿No tienes una cuenta personal todavía?
              </p>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Dar de Alta Nueva Cuenta</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 2: ALTA DE CUENTAS (FORMULARIO COMPLETO) */}
        {/* ======================================================== */}
        {viewMode === 'register' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gym-700 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="p-1.5 rounded-lg bg-gym-900 text-slate-400 hover:text-white hover:bg-gym-700 transition-colors"
                  title="Volver"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Alta de Nueva Cuenta</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Crea tu cuenta privada e independiente
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Selector de Avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Elige tu Avatar</span>
                </label>
                <div className="flex flex-wrap gap-1.5 justify-center bg-gym-900/80 p-2 rounded-2xl border border-gym-700">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setRegAvatar(av)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                        regAvatar === av
                          ? 'bg-emerald-500 text-gym-900 scale-110 shadow-md shadow-emerald-500/30'
                          : 'bg-gym-800 text-slate-300 hover:bg-gym-700'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre y Usuario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    <span>Nombre Completo</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej: Carlos Méndez"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                    <span className="text-slate-400">@</span>
                    <span>Nombre de Usuario</span>
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="Ej: carlosm (para iniciar sesión)"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>Correo Electrónico (para OTP y recuperación)</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              {/* Contraseña y Confirmación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Contraseña</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirmar Contraseña</span>
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Género Fisiológico */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Género Fisiológico (para cálculos metabólicos)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegGender('male')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      regGender === 'male'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-gym-900 border-gym-700 text-slate-400'
                    }`}
                  >
                    Hombre
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegGender('female')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      regGender === 'female'
                        ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                        : 'bg-gym-900 border-gym-700 text-slate-400'
                    }`}
                  >
                    Mujer
                  </button>
                </div>
              </div>

              {/* Biometría Inicial */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gym-900/60 p-2.5 rounded-2xl border border-gym-700">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Edad</label>
                  <input
                    type="number"
                    value={regAge}
                    onChange={(e) => setRegAge(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    value={regHeightCm}
                    onChange={(e) => setRegHeightCm(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={regWeightKg}
                    onChange={(e) => setRegWeightKg(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={regWaistCm}
                    onChange={(e) => setRegWaistCm(e.target.value)}
                    className="w-full bg-gym-900 border border-gym-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                  />
                </div>
              </div>

              {/* Objetivo Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Objetivo Fisiológico</span>
                </label>
                <select
                  value={regActiveMode}
                  onChange={(e) => setRegActiveMode(e.target.value)}
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="visceral_fat_loss">🔥 Pérdida de Grasa Visceral & Abdominal</option>
                  <option value="body_recomposition">⚡ Recomposición Corporal (Grasa + Tono Muscular)</option>
                  <option value="hypertrophy_muscle_gain">💪 Aumento de Masa Muscular (Hipertrofia)</option>
                  <option value="metabolic_maintenance">🛡️ Mantenimiento & Descanso Metabólico</option>
                </select>
              </div>

              {/* Gemini API Key Privada */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <label className="block text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tu Google Gemini API Key Privada (Opcional)</span>
                </label>
                <input
                  type="password"
                  value={regApiKey}
                  onChange={(e) => setRegApiKey(e.target.value)}
                  placeholder="AIzaSy... (Opcional: puedes añadirla luego)"
                  className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400">
                  Tu clave es privada para tu propio Coach personal. Obtén una gratis en <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline font-bold">Google AI Studio</a>.
                </p>
              </div>

              {/* Botón de Enviar Alta */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-black text-sm text-gym-900 shadow-lg bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 hover:from-emerald-300 hover:to-sky-300 shadow-emerald-500/20 transition-all transform active:scale-98 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-gym-900" />
                    <span>Dando de alta usuario...</span>
                  </>
                ) : (
                  <>
                    <span>Completar Alta y Empezar</span>
                    <Check className="w-4 h-4 text-gym-900" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 3: RECUPERACIÓN DE CONTRASEÑA CON OTP POR CORREO */}
        {/* ======================================================== */}
        {viewMode === 'recovery' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gym-700 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="p-1.5 rounded-lg bg-gym-900 text-slate-400 hover:text-white hover:bg-gym-700 transition-colors"
                  title="Volver"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-pink-400" />
                    <span>Recuperación de Contraseña (OTP)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Código de seguridad temporal de 6 dígitos
                  </p>
                </div>
              </div>
            </div>

            {/* Banner de Simulación de Envío OTP en Pantalla */}
            {generatedOtpDisplay && (
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/40 text-sky-200 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-bold text-sky-400">
                  <Mail className="w-4 h-4" />
                  <span>Servicio de Correo Seguro: OTP Generado</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Enviado al correo asociado a tu cuenta. Válido por 10 minutos.
                </p>
                <div className="flex items-center justify-between bg-gym-900/90 p-2.5 rounded-xl border border-sky-500/30">
                  <span className="text-[11px] text-slate-400">Código de 6 dígitos:</span>
                  <span className="text-lg font-mono font-black text-white tracking-widest bg-sky-500/20 px-3 py-0.5 rounded-lg border border-sky-400/50">
                    {generatedOtpDisplay}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveryOtpCode(generatedOtpDisplay)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold"
                >
                  Autocompletar este código OTP
                </button>
              </div>
            )}

            {/* PASO 1: Ingresar Usuario/Correo para recibir OTP */}
            {!recoveryOtpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Usuario o Correo Electrónico Registrado</span>
                  </label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="Ej: dionicio o tu@correo.com"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Te enviaremos un código de seguridad OTP de 6 dígitos para validar tu identidad.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-sky-500/20 transition-all transform active:scale-98 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando código OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Código OTP a mi Correo</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* PASO 2: Ingresar Código OTP y Nueva Contraseña */
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Código OTP de 6 Dígitos</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={recoveryOtpCode}
                    onChange={(e) => setRecoveryOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full bg-gym-900 border border-gym-700 rounded-xl px-4 py-2.5 text-lg text-center font-mono font-black text-amber-300 tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Nuevas Contraseñas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-pink-400" />
                      <span>Nueva Contraseña</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRecoveryPassword ? 'text' : 'password'}
                        value={recoveryNewPassword}
                        onChange={(e) => setRecoveryNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full bg-gym-900 border border-gym-700 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        tabIndex={-1}
                      >
                        {showRecoveryPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Confirmar Clave</span>
                    </label>
                    <input
                      type={showRecoveryPassword ? 'text' : 'password'}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="Repite la clave"
                      className="w-full bg-gym-900 border border-gym-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryOtpSent(false);
                      setGeneratedOtpDisplay(null);
                    }}
                    className="py-3 px-3 rounded-xl border border-gym-700 bg-gym-900 text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Reenviar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validando OTP...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Restablecer Contraseña</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
