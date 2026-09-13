// Script de Automatización Serverless: Envío de Plan Semanal de Entrenamiento los Sábados
// Ejecutado automáticamente por GitHub Actions (.github/workflows/weekly-email.yml)

import admin from 'firebase-admin';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Environment & Secrets Check
const HOUSEHOLD_ID = process.env.HOUSEHOLD_ID || 'hogar-dionicio-paula';
const DIONICIO_EMAIL = process.env.DIONICIO_EMAIL;
const PAULA_EMAIL = process.env.PAULA_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

// Formateador de fecha con zona horaria chilena (manejo automático de horario de invierno/verano)
const CHILE_TZ = 'America/Santiago';
const formattedChileDate = new Intl.DateTimeFormat('es-CL', {
  timeZone: CHILE_TZ,
  dateStyle: 'full',
  timeStyle: 'short',
}).format(new Date());

console.log('🚀 Iniciando script de envío de plan semanal...');
console.log(`🏠 Hogar: ${HOUSEHOLD_ID}`);
console.log(`🇨🇱 Hora Local Santiago: ${formattedChileDate}`);

// 2. Initialize Firebase Admin SDK
let db = null;
if (FIREBASE_SERVICE_ACCOUNT) {
  try {
    let serviceAccountJson;
    try {
      serviceAccountJson = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    } catch {
      serviceAccountJson = JSON.parse(Buffer.from(FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
      });
    }
    db = admin.firestore();
    console.log('✅ Firebase Admin SDK conectado exitosamente.');
  } catch (err) {
    console.warn('⚠️ Error inicializando Firebase Admin SDK:', err.message);
  }
} else {
  console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT no proporcionado. Usando datos base de plantilla.');
}

// 3. Helper to Fetch Recent Logs
async function fetchUserRecentLogs(uid) {
  if (!db) return [];
  try {
    const snapshot = await db
      .collection('households')
      .doc(HOUSEHOLD_ID)
      .collection('members')
      .doc(uid)
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.warn(`Error al leer logs para ${uid}:`, err.message);
    return [];
  }
}

// 4. Exercise & Routine Definitions (Beginner Calibration - Semana 0)
const ROUTINE_DATA = {
  torso: [
    { name: 'Floor press con mancuernas', sets: '3 x 10-12', dionicioKg: 10, paulaKg: 4, rest: '60s' },
    { name: 'Remo unilateral con mancuerna', sets: '3 x 10 /brazo', dionicioKg: 8, paulaKg: 4, rest: '45s' },
    { name: 'Press militar de hombros', sets: '3 x 8-10', dionicioKg: 6, paulaKg: 3, rest: '60s' },
    { name: 'Curl bíceps / copa tríceps', sets: '2-3 x 10-12', dionicioKg: 6, paulaKg: 3, rest: '45s' },
  ],
  piernaCore: [
    { name: 'Goblet squat (Sentadilla con copa)', sets: '3 x 10-12', dionicioKg: 10, paulaKg: 6, rest: '60s' },
    { name: 'Peso muerto rumano con mancuernas', sets: '3 x 10', dionicioKg: 12, paulaKg: 6, rest: '60s' },
    { name: 'Puente de glúteos (Glute bridge)', sets: '3 x 12', dionicioKg: 8, paulaKg: 4, rest: '45s' },
    { name: 'Plancha abdominal isométrica', sets: '3 x 20-30 seg', dionicioKg: 'Corporal', paulaKg: 'Corporal', rest: '45s' },
  ],
  treadmillDionicio: [
    { range: 'Min 0-3 (3 min)', name: 'Adaptación', inc: '2', spd: '4.0 km/h' },
    { range: 'Min 3-20 (17 min)', name: 'Zona 2 Cardio', inc: '5-8', spd: '4.5-4.8 km/h' },
    { range: 'Min 20-25 (5 min)', name: 'Enfriamiento', inc: '2', spd: '3.8 km/h' },
  ],
  treadmillPaula: [
    { range: 'Min 0-3 (3 min)', name: 'Adaptación', inc: '2', spd: '3.6 km/h' },
    { range: 'Min 3-20 (17 min)', name: 'Zona 2 Cardio', inc: '4-6', spd: '4.0-4.3 km/h' },
    { range: 'Min 20-25 (5 min)', name: 'Enfriamiento', inc: '1', spd: '3.5 km/h' },
  ]
};

// 5. Generate AI Coach Note with Gemini (if API Key provided)
async function getGeminiWeeklySummary(userName, userLogs) {
  if (!GEMINI_API_KEY) {
    return `¡Excelente semana de constancia, ${userName}! Mantén la disciplina en la ventana de 19:00 a 20:00 y enfócate en subir 1-2 kg en los ejercicios principales si tu RPE fue inferior a 8.5.`;
  }
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelCandidates = ['gemini-flash-latest', 'gemini-1.5-flash-latest', 'gemini-2.0-flash'];
    let text = null;

    const prompt = `Genera un mensaje breve (2 párrafos, motivador y técnico) para el correo de pauta semanal de ${userName} (Nivel Principiante, Fase Semana 0).
    Rutina: 19:00 a 20:00, mancuernas modulares 40kg y trotadora con inclinación.
    Últimos registros: ${JSON.stringify(userLogs)}.
    Enfócate en la calibración de Semana 0, mantener RPE 6-7 sin dolor y la consistencia en pareja.`;

    for (const mName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const res = await model.generateContent(prompt);
        text = res.response.text();
        if (text) break;
      } catch (e) {
        console.warn(`Intento con ${mName} en automatización falló:`, e.message);
      }
    }

    return text || `¡Gran trabajo, ${userName}! Vamos por otra semana de progresión constante y coordinación en la estación dual.`;
  } catch (err) {
    console.warn('Error llamando a Gemini:', err.message);
    return `¡Gran trabajo, ${userName}! Vamos por otra semana de progresión constante y coordinación en la estación dual.`;
  }
}

// 6. Build HTML Email Template
function buildEmailHtml(userName, isDionicio, coachNote) {
  const accentColor = isDionicio ? '#0284c7' : '#db2777';
  const headerBg = isDionicio ? 'linear-gradient(135deg, #0f172a, #0369a1)' : 'linear-gradient(135deg, #0f172a, #be185d)';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
      .header { background: ${headerBg}; color: #ffffff; padding: 32px 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
      .badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 12px; }
      .content { padding: 24px; }
      .coach-box { background: #f1f5f9; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
      .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
      .card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase; }
      td { padding: 10px 4px; border-bottom: 1px solid #f1f5f9; color: #334155; }
      .weight-tag { background: #f8fafc; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 6px; font-weight: 700; font-family: monospace; }
      .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏋️ Tu Plan Semanal — Dúo en Casa</h1>
        <p>Atleta: <strong>${userName}</strong> • Ventana Sagrada: <strong>19:00 a 20:00</strong></p>
        <span class="badge">Sincronización de Cargas & Sobrecarga Progresiva</span>
      </div>

      <div class="content">
        <div class="coach-box">
          <strong style="color: ${accentColor};">💡 Mensaje de tu Coach:</strong>
          <p style="margin: 6px 0 0;">${coachNote}</p>
        </div>

        <!-- Torso Card -->
        <div class="card">
          <h2 class="card-title">
            <span>Día Torso (Lunes y Jueves)</span>
            <span style="font-size: 11px; color: #64748b; font-weight: normal;">Mancuernas 40kg</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Series x Reps</th>
                <th>Carga Sugerida</th>
              </tr>
            </thead>
            <tbody>
              ${ROUTINE_DATA.torso.map(ex => `
                <tr>
                  <td><strong>${ex.name}</strong></td>
                  <td>${ex.sets}</td>
                  <td><span class="weight-tag">${isDionicio ? ex.dionicioKg : ex.paulaKg} kg</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pierna & Core Card -->
        <div class="card">
          <h2 class="card-title">
            <span>Día Pierna & Core (Martes y Viernes)</span>
            <span style="font-size: 11px; color: #64748b; font-weight: normal;">Mancuernas + Mat</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Series x Reps</th>
                <th>Carga Sugerida</th>
              </tr>
            </thead>
            <tbody>
              ${ROUTINE_DATA.piernaCore.map(ex => `
                <tr>
                  <td><strong>${ex.name}</strong></td>
                  <td>${ex.sets}</td>
                  <td><span class="weight-tag">${isDionicio ? (typeof ex.dionicioKg === 'number' ? ex.dionicioKg + ' kg' : ex.dionicioKg) : (typeof ex.paulaKg === 'number' ? ex.paulaKg + ' kg' : ex.paulaKg)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Treadmill Card -->
        <div class="card">
          <h2 class="card-title">
            <span>Estación Trotadora (25 Minutos — Semana 0)</span>
            <span style="font-size: 11px; color: #64748b; font-weight: normal;">Zona 2 Cardio</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Fase</th>
                <th>Inclinación</th>
                <th>Velocidad</th>
              </tr>
            </thead>
            <tbody>
              ${(isDionicio ? ROUTINE_DATA.treadmillDionicio : ROUTINE_DATA.treadmillPaula).map(ph => `
                <tr>
                  <td><strong>${ph.range}</strong> (${ph.name})</td>
                  <td>Inc <strong>${ph.inc}</strong></td>
                  <td>${ph.spd}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">
        <p><strong>Dúo en Casa</strong> • Dionicio & Paula</p>
        <p>Cronograma: 19:00 Calentamiento | 19:07 Bloque 1 | 19:32 Transición | 19:35 Bloque 2 | 20:00 Cena</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// 7. Send Email Helper (Nodemailer / SMTP prioritario para evitar restricciones de dominio no verificado)
async function sendEmail({ to, subject, html }) {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`📨 Enviando via Nodemailer (SMTP: ${process.env.SMTP_HOST || 'smtp.gmail.com'}) a: ${to}...`);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: (process.env.SMTP_SECURE !== 'false'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter.sendMail({
      from: `"Dúo en Casa Coach" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } else if (RESEND_API_KEY) {
    const resend = new Resend(RESEND_API_KEY);
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    console.log(`📨 Enviando via Resend (${fromEmail}) a: ${to}...`);
    try {
      return await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      });
    } catch (err) {
      if (err.message && err.message.includes('validation_error')) {
        console.warn(`⚠️ Aviso Resend: Si el dominio no está verificado en Resend, solo puedes enviar a tu propio correo de registro. Se recomienda usar SMTP (Gmail App Password) con SMTP_USER y SMTP_PASS.`);
      }
      throw err;
    }
  } else {
    console.log(`[SIMULACIÓN] No se encontró SMTP_USER ni RESEND_API_KEY. Correo simulado para: ${to}`);
    return { id: 'simulated-ok' };
  }
}

// 8. Main Execution
async function main() {
  const dionicioLogs = await fetchUserRecentLogs('dionicio');
  const paulaLogs = await fetchUserRecentLogs('paula');

  const dionicioNote = await getGeminiWeeklySummary('Dionicio', dionicioLogs);
  const paulaNote = await getGeminiWeeklySummary('Paula', paulaLogs);

  const dionicioHtml = buildEmailHtml('Dionicio', true, dionicioNote);
  const paulaHtml = buildEmailHtml('Paula', false, paulaNote);

  const subject = `📋 Tu Plan de Entrenamiento Semanal — Dúo en Casa (19:00 a 20:00)`;

  if (DIONICIO_EMAIL) {
    try {
      await sendEmail({ to: DIONICIO_EMAIL, subject, html: dionicioHtml });
      console.log('✅ Correo semanal enviado a Dionicio.');
    } catch (e) {
      console.error('❌ Error enviando a Dionicio:', e.message);
    }
  } else {
    console.log('ℹ️ DIONICIO_EMAIL no configurado en GitHub Secrets.');
  }

  if (PAULA_EMAIL) {
    try {
      await sendEmail({ to: PAULA_EMAIL, subject, html: paulaHtml });
      console.log('✅ Correo semanal enviado a Paula.');
    } catch (e) {
      console.error('❌ Error enviando a Paula:', e.message);
    }
  } else {
    console.log('ℹ️ PAULA_EMAIL no configurado en GitHub Secrets.');
  }

  console.log('🎉 Proceso de automatización finalizado con éxito.');
}

main().catch(err => {
  console.error('Error fatal en ejecución:', err);
  process.exit(1);
});
