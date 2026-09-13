# 🏋️ Dúo en Casa — Fitness & Overload Tracker (Dionicio & Paula)

Aplicación Web Progresiva (SPA) diseñada para guiar entrenamientos sincronizados en pareja en el horario estricto de **19:00 a 20:00**, con equipamiento compartido (set de mancuernas modulares de 40 kg y trotadora eléctrica de 15 niveles de inclinación), registro de sobrecarga progresiva, métricas de Apple Watch Series 8, Coach Gemini y automatización de correos los sábados con GitHub Actions.

Desplegado en GitHub Pages: **`https://saxneal-png.github.io/fitnessapp/`**

---

## 🌟 Características Principales

1. **⏱️ Temporizador de Sesión en Vivo (19:00 - 20:00):**
   - 5 Intervalos automáticos: Calentamiento (7 min), Bloque 1 Fuerza/Trotadora (25 min), Transición y ajuste de discos (3 min), Bloque 2 Trotadora/Fuerza (25 min) y Vuelta a la calma.
   - Síntesis de sonido Web Audio API (pitidos 3-2-1, chimes de inicio, zumbador de rotación y fanfarria final).
   - Modo Turbo 10x para simular rápidamente los bloques.
2. **📝 Registro de Sobrecarga Progresiva:**
   - Cargas de fuerza (kg, repeticiones, RPE 1-10) con cálculo automático de volumen acumulado.
   - Métricas de trotadora (inclinación 1-15, velocidad km/h, frecuencia cardíaca bpm y calorías activas del Apple Watch).
3. **📊 Dashboard Combinado del Hogar:**
   - Gráficos interactivos con Recharts que combinan las estadísticas de Dionicio y Paula lado a lado sin mezclar los registros individuales.
   - Tendencia de sobrecarga por ejercicio y evolución del peso corporal.
4. **🖨️ Pauta Imprimible A4 & Calendario:**
   - Vista de impresión en blanco y negro con checkboxes.
   - Descarga de archivo `.ics` y enlace directo para agendar en Google Calendar.
5. **🤖 Coach Gemini Interactivo:**
   - Consulta sobre ajustes de cargas semanales, variantes de ejercicios y menú post-entreno (20:00).
6. **📬 Automatización Serverless de Correos (Sábados 12:00 UTC):**
   - Script Node.js ejecutado vía GitHub Actions Cron (`0 12 * * 6`) con Firebase Admin SDK y Resend / Nodemailer.

---

## 🚀 Despliegue Rápido en Menos de 5 Minutos

### Paso 1: Configurar GitHub Pages en tu Repositorio
1. En tu repositorio `https://github.com/saxneal-png/fitnessapp`, ve a **Settings** > **Pages**.
2. En **Build and deployment** > **Source**, selecciona **GitHub Actions**.
3. Al hacer push a la rama `main`, el workflow `.github/workflows/deploy.yml` compilará y publicará la web automáticamente.

---

### Paso 2: Crear Proyecto Gratuito en Firebase (Plan Spark)
1. Ingresa a [Firebase Console](https://console.firebase.google.com/) y crea un nuevo proyecto (ej. `fitness-duo-app`).
2. **Habilitar Authentication:**
   - Ve a **Build > Authentication** > **Get started**.
   - Habilita el método **Email/Password** y **Anonymous** (para acceso directo en el celular).
   - Puedes inicializar los usuarios con UIDs exactos (`dionicio` y `paula`) ejecutando:
     ```bash
     cd automation
     npm install
     DIONICIO_EMAIL="tu-email@..." PAULA_EMAIL="email-paula@..." FIREBASE_SERVICE_ACCOUNT="./serviceAccountKey.json" npm run init-users
     ```
3. **Habilitar Firestore Database:**
   - Ve a **Build > Firestore Database** > **Create database**.
   - Elige una ubicación cercana (ej. `southamerica-east1` o `us-east1`).
   - Pega las reglas del archivo `firestore.rules`:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         function isAuth() { return request.auth != null; }
         function isHouseholdMember(householdId) {
           return isAuth() && (
             request.auth.uid == 'dionicio' ||
             request.auth.uid == 'paula' ||
             request.auth.token.firebase.sign_in_provider == 'anonymous' ||
             exists(/databases/$(database)/documents/households/$(householdId)/members/$(request.auth.uid))
           );
         }
         match /households/{householdId} {
           allow read, write: if isHouseholdMember(householdId);
           match /{allSubcollections=**} {
             allow read, write: if isHouseholdMember(householdId);
           }
         }
       }
     }
     ```
4. **Obtener Credenciales Web:**
   - En **Project Settings** (icono de engranaje) > **General**, crea una **Web App (`</>`)**.
   - Copia las claves (`apiKey`, `authDomain`, `projectId`, `appId`).
   - Se configuran en `.env` o en el botón ⚙️ **Base de Datos en la Nube** de la app web.

---

### Paso 3: Configurar GitHub Secrets para los Correos Automáticos
Para que el workflow `.github/workflows/weekly-email.yml` envíe los correos cada sábado:

1. **Generar Service Account de Firebase:**
   - En Firebase Console > **Project Settings** > **Service accounts**.
   - Haz clic en **Generate new private key**. Descargarás un archivo JSON.
2. **Opciones de Envío de Correo:**
   - **Opción A (Recomendada para cuentas personales como Yahoo/Gmail sin dominio propio):** Usa Gmail con una Contraseña de Aplicación (`SMTP_USER` y `SMTP_PASS`).
   - **Opción B:** Usa [Resend.com](https://resend.com) configurando `RESEND_API_KEY` y `EMAIL_FROM` (si tienes dominio propio verificado).
3. **Cargar Secrets en GitHub:**
   - Ve a `https://github.com/saxneal-png/fitnessapp/settings/secrets/actions` y define estos Secrets:

| Secret Name | Valor requerido |
| :--- | :--- |
| `FIREBASE_SERVICE_ACCOUNT` | Contenido completo del JSON de la Service Account de Firebase. |
| `DIONICIO_EMAIL` | Correo electrónico de Dionicio donde llegará su plan. |
| `PAULA_EMAIL` | Correo electrónico de Paula donde llegará su plan. |
| `SMTP_USER` | Tu cuenta de correo remitente (ej. `tu-correo@gmail.com`). |
| `SMTP_PASS` | Contraseña de aplicación de 16 caracteres de Google (generada en https://myaccount.google.com/apppasswords). |
| `GEMINI_API_KEY` | *(Opcional)* Clave de [Google AI Studio](https://aistudio.google.com/) para análisis IA semanal. |
| `HOUSEHOLD_ID` | `hogar-dionicio-paula` |

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en http://localhost:5173/fitnessapp/
npm run dev

# Compilar para producción
npm run build
```

---

## 🛠️ Estructura del Código

```
fitnessapp/
├── .agents/skills/fitness-duo-app/SKILL.md  # Skill de Antigravity para consistencia
├── .github/workflows/
│   ├── deploy.yml                          # Despliegue automático a GitHub Pages
│   └── weekly-email.yml                    # Cron job semanal de correos los sábados
├── automation/
│   ├── package.json
│   └── send-weekly-plan.mjs                # Script Node.js con Firebase Admin & Resend
├── src/
│   ├── components/
│   │   ├── Navbar.jsx                      # Navegación y selector de Dionicio/Paula
│   │   ├── Timer.jsx                       # Temporizador interactivo 19:00-20:00
│   │   ├── ExerciseCard.jsx                # Tarjetas con tutoriales y link a YouTube
│   │   ├── WorkoutLogger.jsx               # Registro de fuerza y trotadora
│   │   ├── Dashboard.jsx                   # Gráficos combinados Recharts
│   │   ├── PrintablePlan.jsx               # Vista de impresión A4 & .ICS
│   │   ├── GeminiCoach.jsx                 # Asistente IA interactivo
│   │   └── FirebaseConfigModal.jsx         # Modal de credenciales
│   ├── context/
│   │   └── AuthContext.jsx                 # Manejo multi-usuario
│   ├── data/
│   │   └── workoutCatalog.js               # Rutinas de Torso, Pierna/Core y Trotadora
│   ├── firebase/
│   │   └── config.js                       # Conector Firestore con fallback local
│   ├── services/
│   │   └── soundEffects.js                 # Sintetizador Web Audio API
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── firestore.rules                         # Reglas de seguridad de Firestore
├── package.json
├── tailwind.config.js
└── vite.config.js
```

Desarrollado con ❤️ para **Dionicio y Paula** — ¡A darlo todo en la ventana de 19:00 a 20:00!
