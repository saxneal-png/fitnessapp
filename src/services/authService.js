// Servicio de Autenticación Criptográfica Robusta para Producción
// Protege el acceso contra personas no autorizadas sin depender de restricciones de Google Cloud

const SESSION_STORAGE_KEY = 'fitness_duo_auth_session';
const CUSTOM_CREDENTIALS_KEY = 'fitness_duo_custom_creds';

// Hashes SHA-256 autorizados para el hogar de Dionicio y Paula
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
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica las credenciales y crea una sesión autenticada segura
 */
export async function verifyAndLogin(email, password, selectedUser = 'dionicio') {
  if (!password || password.length < 4) {
    throw new Error('Debes ingresar tu contraseña.');
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const inputEmailHash = cleanEmail ? await sha256(cleanEmail) : null;
  const inputPassHash = await sha256(password);

  // 1. Determinar el atleta correspondiente
  let targetUid = selectedUser;
  if (inputEmailHash) {
    if (inputEmailHash === AUTHORIZED_VAULT.dionicio.emailHash || cleanEmail.includes('saxneal') || cleanEmail.includes('dionicio')) {
      targetUid = 'dionicio';
    } else if (inputEmailHash === AUTHORIZED_VAULT.paula.emailHash || cleanEmail.includes('paula')) {
      targetUid = 'paula';
    }
  }

  const targetConfig = AUTHORIZED_VAULT[targetUid];
  if (!targetConfig) {
    throw new Error('Usuario no reconocido. Selecciona Dionicio o Paula.');
  }

  // 2. Verificar contraseña contra el vault criptográfico
  let isValidPassword = (inputPassHash === targetConfig.passHash);

  // Verificar si el usuario cambió su contraseña personalizada localmente
  try {
    const customCreds = JSON.parse(localStorage.getItem(CUSTOM_CREDENTIALS_KEY) || '{}');
    if (customCreds[targetUid] && customCreds[targetUid].passHash) {
      if (inputPassHash === customCreds[targetUid].passHash) {
        isValidPassword = true;
      }
    }
  } catch (e) {}

  if (!isValidPassword) {
    throw new Error('Contraseña incorrecta. Por favor verifica tu clave de acceso.');
  }

  // 3. Crear sesión autenticada
  const session = {
    uid: targetUid,
    name: targetConfig.name,
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 días
    token: `sec_${targetUid}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem('fitness_duo_active_user', targetUid);
  localStorage.setItem('fitness_duo_session_mode', 'single');
  if (cleanEmail) {
    localStorage.setItem(`fitness_duo_saved_email_${targetUid}`, cleanEmail);
  }

  return { success: true, user: targetUid, session };
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
  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }
  const passHash = await sha256(newPassword);
  const customCreds = JSON.parse(localStorage.getItem(CUSTOM_CREDENTIALS_KEY) || '{}');
  customCreds[uid] = {
    passHash,
    updatedAt: Date.now()
  };
  localStorage.setItem(CUSTOM_CREDENTIALS_KEY, JSON.stringify(customCreds));
  return true;
}