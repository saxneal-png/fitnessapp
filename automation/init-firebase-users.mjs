// Script para Inicializar / Garantizar Usuarios de Firebase Auth con UIDs Exactos ('dionicio' y 'paula')
// Uso:
//   node automation/init-firebase-users.mjs
// Requiere variable de entorno FIREBASE_SERVICE_ACCOUNT (JSON string o path a serviceAccountKey.json)

import admin from 'firebase-admin';
import fs from 'fs';

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const DIONICIO_EMAIL = process.env.DIONICIO_EMAIL;
const DIONICIO_PASSWORD = process.env.DIONICIO_PASSWORD || 'Cambiar123!';
const PAULA_EMAIL = process.env.PAULA_EMAIL;
const PAULA_PASSWORD = process.env.PAULA_PASSWORD || 'Cambiar123!';

if (!FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT no está definida en las variables de entorno.');
  console.error('Proporciona el JSON de la cuenta de servicio de Firebase para ejecutar este script.');
  process.exit(1);
}

let serviceAccountJson;
try {
  if (fs.existsSync(FIREBASE_SERVICE_ACCOUNT)) {
    serviceAccountJson = JSON.parse(fs.readFileSync(FIREBASE_SERVICE_ACCOUNT, 'utf8'));
  } else {
    try {
      serviceAccountJson = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    } catch {
      serviceAccountJson = JSON.parse(Buffer.from(FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
    }
  }
} catch (e) {
  console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function ensureUser(uid, email, password, displayName) {
  if (!email) {
    console.warn(\⚠️ Saltando usuario \: Correo no especificado.\);
    return;
  }
  try {
    const existingUser = await auth.getUser(uid);
    console.log(\✅ Usuario ya existe con UID exacto '\': \\);
    await auth.updateUser(uid, { email, displayName });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(\👤 Creando usuario con UID exacto '\' y correo \...\);
      await auth.createUser({
        uid,
        email,
        password,
        displayName,
      });
      console.log(\✨ Usuario '\' creado exitosamente.\);
    } else {
      throw err;
    }
  }

  // Inicializar documento en Firestore para el miembro
  const memberRef = db.collection('households').doc('hogar-dionicio-paula').collection('members').doc(uid);
  await memberRef.set({
    uid,
    name: displayName,
    email,
    updatedAt: Date.now()
  }, { merge: true });
  console.log(\📁 Documento de miembro 'households/hogar-dionicio-paula/members/\' asegurado en Firestore.\);
}

async function main() {
  console.log('🚀 Inicializando usuarios con UIDs exactos en Firebase Auth...');
  if (DIONICIO_EMAIL) {
    await ensureUser('dionicio', DIONICIO_EMAIL, DIONICIO_PASSWORD, 'Dionicio');
  } else {
    console.log('ℹ️ DIONICIO_EMAIL no configurado. Para crearlo, define DIONICIO_EMAIL en las variables de entorno.');
  }

  if (PAULA_EMAIL) {
    await ensureUser('paula', PAULA_EMAIL, PAULA_PASSWORD, 'Paula');
  } else {
    console.log('ℹ️ PAULA_EMAIL no configurado. Para crearlo, define PAULA_EMAIL en las variables de entorno.');
  }

  console.log('🎉 Inicialización de usuarios completada con éxito.');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});

