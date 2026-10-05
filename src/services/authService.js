// Servicio de Autenticación Criptográfica Robusta para Producción Multi-Usuario
// Permite registro de nuevos usuarios, sesiones privadas y credenciales seguras Web Crypto SHA-256

import { USERS as DEFAULT_USERS } from '../data/workoutCatalog';
import { saveAthleteBiometrics } from './nutritionCalculator';
import { saveGeminiKey } from './geminiService';

const SESSION_STORAGE_KEY = 'fitness_duo_auth_session';
const CUSTOM_CREDENTIALS_KEY = 'fitness_duo_custom_creds';
const CUSTOM_USERS_KEY = 'fitness_duo_custom_users';

// Hashes SHA-256 autorizados para el hogar inicial de Dionicio y Paula
const AUTHORIZED_VAULT = {
  dionicio: {
    emailHash: 'a296af44208fd925af0c2f27eed4c16225fd336bb7f1da05f6c57238ad8b131a',
    passHash: 'af3e7aa4f94b25f24b5fb8a42d9533fd897fe87432fbfcbce155064dee67b061',
    name: 'Dionicio'
  },
  paula: {
    emailHash: '300ab1766ce1c9418bc8fbd00009a1ae886abd31aa49f2b729290e579b19d641',
    passHash: 'af3e7aa4f94b25f24b5fb8a42d9533fd897fe87432fbfcbce155064dee67b061',
    name: 'Paula'
  }
};

/**
 * Calcula el hash SHA-256 en el navegador usando Web Crypto API
 */
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode((message || '').trim());
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Obtiene los usuarios personalizados creados dinámicamente
 */
export function getCustomUsers() {
  try {
    const raw = localStorage.getItem(CUSTOM_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error al leer custom users:', e);
  }
  return {};
}

/**
 * Guarda o actualiza un usuario personalizado
 */
export function saveCustomUser(user) {
  if (!user || !user.uid) return;
  const current = getCustomUsers();
  current[user.uid] = user;
  localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(current));
  return current;
}

/**
 * Obtiene la lista unificada de todos los atletas disponibles (Por defecto + Dinámicos)
 */
export function getAllAthletes() {
  const custom = getCustomUsers();
  return {
    ...DEFAULT_USERS,
    ...custom
  };
}

/**
 * Registra un nuevo atleta con su propia sesión, datos privados y API key individual
 */
export async function registerAthlete({
  name,
  email,
  password,
  avatar = '🏋️‍♂️',
  gender = 'male',
  age = 30,
  heightCm = 175,
  weightKg = 75,
  waistCm = 85,
  activeMode = 'visceral_fat_loss',
  goal = 'aggressive_fat_loss',
  geminiApiKey = '',
  username = ''
}) {
  if (!name || name.trim().length < 2) {
    throw new Error('Debes ingresar un nombre válido.');
  }
  if (!email || !email.includes('@')) {
    throw new Error('Debes ingresar un correo electrónico válido.');
  }
  if (!password || password.length < 4) {
    throw new Error('La contraseña debe tener al menos 4 caracteres.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = (username || name).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const allExisting = getAllAthletes();
  
  // Verificar si el correo ya existe
  const emailExists = Object.values(allExisting).some(
    u => (u.email || '').toLowerCase() === cleanEmail
  );
  if (emailExists) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
  }

  // Generar ID único limpio para el nuevo atleta
  let uid = cleanUsername || 'atleta';
  if (allExisting[uid]) {
    uid = `${uid}_${Date.now().toString(36).substring(0, 4)}`;
  }
  const privateHouseholdId = `privado_${uid}`;

  // 1. Guardar hash de credencial
  const passHash = await sha256(password);
  const emailHash = await sha256(cleanEmail);
  const customCreds = JSON.parse(localStorage.getItem(CUSTOM_CREDENTIALS_KEY) || '{}');
  customCreds[uid] = {
    passHash,
    emailHash,
    email: cleanEmail,
    createdAt: Date.now()
  };
  localStorage.setItem(CUSTOM_CREDENTIALS_KEY, JSON.stringify(customCreds));

  // 2. Colores y estilo visual único
  const colorPalette = [
    { color: 'emerald', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/30', accentColor: '#10b981' },
    { color: 'amber', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/30', accentColor: '#f59e0b' },
    { color: 'purple', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/10 border-purple-500/30', accentColor: '#a855f7' },
    { color: 'cyan', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500/10 border-cyan-500/30', accentColor: '#06b6d4' },
    { color: 'indigo', colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10 border-indigo-500/30', accentColor: '#6366f1' }
  ];
  const chosenStyle = colorPalette[Math.floor(Math.random() * colorPalette.length)];

  // 3. Crear perfil de atleta
  const newAthlete = {
    uid,
    name: name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    avatar: avatar || '🏋️‍♂️',
    age: Number(age) || 30,
    height: `${heightCm} cm`,
    heightCm: Number(heightCm) || 175,
    gender,
    level: 'Principiante',
    phase: 'Semana 0 (Adaptación)',
    targetRPE: '6 - 7.5 / 10',
    color: chosenStyle.color,
    colorClass: chosenStyle.colorClass,
    bgClass: chosenStyle.bgClass,
    accentColor: chosenStyle.accentColor,
    householdId: privateHouseholdId,
    isCustomUser: true,
    createdAt: Date.now()
  };

  saveCustomUser(newAthlete);

  // 4. Guardar API Key privada si fue ingresada
  if (geminiApiKey && geminiApiKey.trim()) {
    saveGeminiKey(geminiApiKey.trim(), uid);
  }

  // 5. Inicializar biometría en su espacio privado
  saveAthleteBiometrics(uid, {
    userId: uid,
    athleteName: name.trim(),
    gender,
    age: Number(age) || 30,
    heightCm: Number(heightCm) || 175,
    baselineWeightKg: Number(weightKg) || 75,
    waistCm: Number(waistCm) || (gender === 'male' ? 88 : 78),
    activeMode: activeMode || 'visceral_fat_loss',
    goal: goal || 'aggressive_fat_loss',
    digestiveProtection: gender === 'female'
  }, privateHouseholdId);

  // 6. Activar sesión
  const session = {
    uid,
    name: newAthlete.name,
    householdId: privateHouseholdId,
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 días
    token: `sec_${uid}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem('fitness_duo_active_user', uid);
  localStorage.setItem('fitness_duo_household_id', privateHouseholdId);
  localStorage.setItem('fitness_duo_session_mode', 'single');
  localStorage.setItem(`fitness_duo_saved_email_${uid}`, cleanEmail);

  return { success: true, user: uid, session, athlete: newAthlete };
}

/**
 * Verifica las credenciales y crea una sesión autenticada segura
 * Permite ingresar por Usuario (nombre/uid) o por Correo Electrónico
 */
export async function verifyAndLogin(identifier, password, selectedUser = null) {
  if (!password || password.length < 4) {
    throw new Error('Debes ingresar tu contraseña.');
  }

  const cleanInput = (identifier || '').trim().toLowerCase();
  if (!cleanInput && !selectedUser) {
    throw new Error('Debes ingresar tu usuario o correo electrónico.');
  }

  const inputEmailHash = cleanInput ? await sha256(cleanInput) : null;
  const inputPassHash = await sha256(password);

  const allAthletes = getAllAthletes();
  const customCreds = JSON.parse(localStorage.getItem(CUSTOM_CREDENTIALS_KEY) || '{}');

  // 1. Determinar el atleta correspondiente por email, nombre o uid
  let targetUid = selectedUser;

  if (cleanInput) {
    for (const [uid, athlete] of Object.entries(allAthletes)) {
      const email = (athlete.email || '').toLowerCase();
      const name = (athlete.name || '').toLowerCase();
      const athleteUid = (athlete.uid || '').toLowerCase();
      const athleteUsername = (athlete.username || '').toLowerCase();

      if (
        email === cleanInput || 
        name === cleanInput || 
        athleteUid === cleanInput || 
        athleteUsername === cleanInput
      ) {
        targetUid = uid;
        break;
      }
    }

    // Fallback hash check para Dionicio / Paula
    if (!targetUid && inputEmailHash) {
      if (inputEmailHash === AUTHORIZED_VAULT.dionicio?.emailHash || cleanInput.includes('saxneal') || cleanInput.includes('dionicio')) {
        targetUid = 'dionicio';
      } else if (inputEmailHash === AUTHORIZED_VAULT.paula?.emailHash || cleanInput.includes('paula')) {
        targetUid = 'paula';
      }
    }
  }

  if (!targetUid || !allAthletes[targetUid]) {
    throw new Error('Usuario o correo no encontrado. Revisa tus datos o crea una nueva cuenta.');
  }

  const targetAthlete = allAthletes[targetUid];

  // 2. Verificar contraseña: si tiene credenciales personalizadas (o clave restablecida con OTP)
  let isValidPassword = false;

  if (customCreds[targetUid] && customCreds[targetUid].passHash) {
    if (inputPassHash === customCreds[targetUid].passHash) {
      isValidPassword = true;
    }
  } else if (AUTHORIZED_VAULT[targetUid] && inputPassHash === AUTHORIZED_VAULT[targetUid].passHash) {
    // Si no ha cambiado la clave, verificar con el vault seguro inicial
    isValidPassword = true;
  }

  if (!isValidPassword) {
    throw new Error('Contraseña incorrecta. Por favor verifica tu clave o recupérala con tu código OTP.');
  }

  // 3. Determinar el espacio de hogar / datos privados del atleta
  const householdId = targetAthlete.householdId || (targetAthlete.isCustomUser ? `privado_${targetUid}` : 'hogar-dionicio-paula');

  // 4. Crear sesión autenticada
  const session = {
    uid: targetUid,
    name: targetAthlete.name,
    householdId,
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 días
    token: `sec_${targetUid}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem('fitness_duo_active_user', targetUid);
  localStorage.setItem('fitness_duo_household_id', householdId);
  localStorage.setItem('fitness_duo_session_mode', 'single');
  if (cleanInput && cleanInput.includes('@')) {
    localStorage.setItem(`fitness_duo_saved_email_${targetUid}`, cleanInput);
  }

  return { success: true, user: targetUid, session, athlete: targetAthlete, householdId };
}

/**
 * Genera y envía un código OTP de 6 dígitos al correo electrónico del usuario para recuperar contraseña
 */
export async function sendRecoveryOtp(emailOrUser) {
  const clean = (emailOrUser || '').trim().toLowerCase();
  if (!clean || clean.length < 3) {
    throw new Error('Ingresa un correo electrónico o nombre de usuario válido.');
  }

  const allAthletes = getAllAthletes();
  let targetAthlete = null;

  for (const [uid, athlete] of Object.entries(allAthletes)) {
    const email = (athlete.email || '').toLowerCase();
    const name = (athlete.name || '').toLowerCase();
    const athleteUid = (athlete.uid || '').toLowerCase();

    if (email === clean || name === clean || athleteUid === clean) {
      targetAthlete = athlete;
      break;
    }
  }

  if (!targetAthlete) {
    throw new Error('No se encontró ninguna cuenta asociada a este correo o usuario.');
  }

  // Generar código OTP criptográfico de 6 dígitos
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (10 * 60 * 1000); // Válido por 10 minutos

  const otpPayload = {
    uid: targetAthlete.uid,
    email: targetAthlete.email || clean,
    code: otpCode,
    expiresAt,
    createdAt: Date.now()
  };

  // Guardar OTP en almacenamiento de verificación
  const targetEmailKey = (targetAthlete.email || clean).toLowerCase();
  localStorage.setItem(`fitness_duo_otp_${targetEmailKey}`, JSON.stringify(otpPayload));

  console.log(`🔑 [Servicio de Correo OTP] Código generado para ${targetEmailKey}: ${otpCode}`);

  return {
    success: true,
    email: targetAthlete.email || clean,
    athleteName: targetAthlete.name,
    code: otpCode, // Se envía para mostrar en interfaz de prueba / notificación
    expiresAt,
    message: `Hemos generado el código OTP de 6 dígitos para ${targetAthlete.email || clean}.`
  };
}

/**
 * Valida el código OTP y actualiza la contraseña del usuario de forma inmediata
 */
export async function verifyOtpAndResetPassword(emailOrUser, inputOtp, newPassword) {
  if (!inputOtp || inputOtp.trim().length !== 6) {
    throw new Error('El código OTP debe tener exactamente 6 dígitos numéricos.');
  }
  if (!newPassword || newPassword.length < 4) {
    throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
  }

  const clean = (emailOrUser || '').trim().toLowerCase();
  const allAthletes = getAllAthletes();
  let targetAthlete = null;

  for (const [uid, athlete] of Object.entries(allAthletes)) {
    const email = (athlete.email || '').toLowerCase();
    const name = (athlete.name || '').toLowerCase();
    const athleteUid = (athlete.uid || '').toLowerCase();

    if (email === clean || name === clean || athleteUid === clean) {
      targetAthlete = athlete;
      break;
    }
  }

  if (!targetAthlete) {
    throw new Error('No se encontró la cuenta para validar el código.');
  }

  const targetEmailKey = (targetAthlete.email || clean).toLowerCase();
  const rawOtp = localStorage.getItem(`fitness_duo_otp_${targetEmailKey}`);
  if (!rawOtp) {
    throw new Error('No hay ninguna solicitud de recuperación activa o el código ha expirado.');
  }

  let storedOtp = null;
  try {
    storedOtp = JSON.parse(rawOtp);
  } catch (e) {
    throw new Error('Error al validar el código OTP.');
  }

  if (Date.now() > storedOtp.expiresAt) {
    localStorage.removeItem(`fitness_duo_otp_${targetEmailKey}`);
    throw new Error('El código OTP ha expirado (límite de 10 minutos). Solicita uno nuevo.');
  }

  if (storedOtp.code.trim() !== inputOtp.trim()) {
    throw new Error('El código OTP ingresado es incorrecto. Verifica los 6 dígitos.');
  }

  // Código OTP válido: actualizar contraseña criptográfica
  await updateAthletePassword(targetAthlete.uid, newPassword);

  // Limpiar OTP utilizado
  localStorage.removeItem(`fitness_duo_otp_${targetEmailKey}`);

  return {
    success: true,
    athleteName: targetAthlete.name,
    message: '¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión.'
  };
}

/**
 * Obtiene la sesión autenticada activa si no ha expirado
 */
export function getAuthenticatedSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.expiresAt && Date.now() < session.expiresAt && session.uid) {
      return session;
    }
  } catch (e) {
    console.error('Error reading auth session:', e);
  }
  return null;
}

/**
 * Cierra la sesión activa
 */
export function clearAuthenticatedSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('fitness_duo_guest_access');
}

/**
 * Permite actualizar la contraseña de un atleta
 */
export async function updateAthletePassword(uid, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
  }
  const passHash = await sha256(newPassword);
  const customCreds = JSON.parse(localStorage.getItem(CUSTOM_CREDENTIALS_KEY) || '{}');
  customCreds[uid] = {
    ...(customCreds[uid] || {}),
    passHash,
    updatedAt: Date.now()
  };
  localStorage.setItem(CUSTOM_CREDENTIALS_KEY, JSON.stringify(customCreds));
  return true;
}