# Prompt para Antigravity — App de Fitness "Dúo en Casa"

Actúa como un Desarrollador Full-Stack Senior y Especialista en UI/UX. Diseña y construye, **en fases**, una aplicación web progresiva (SPA) lista para compilar y desplegar en GitHub Pages, con persistencia en Firebase Firestore (plan gratuito Spark), autenticación por usuario, y una **automatización semanal de correos** que requiere un componente serverless adicional (detallado en la sección 8).

---

## 1. OBJETIVO DEL PROYECTO

Crear una aplicación web para una pareja (Dionicio y Paula) que entrena simultáneamente en casa, todos los días de entrenamiento de **19:00 a 20:00** (ventana estricta de 60 minutos), con equipamiento compartido (un set de mancuernas modulares de 40 kg y una trotadora eléctrica con 15 niveles de inclinación). La app debe:

- Guiar la rutina minuto a minuto.
- Registrar cargas para sobrecarga progresiva.
- Dar a cada persona su **propio acceso** (login separado), pero permitir ver las **estadísticas combinadas** de ambos en un dashboard conjunto — sin mezclar los registros de entrenamiento de cada uno.
- Enviar automáticamente, **todos los sábados**, un correo a cada uno con su plan de entrenamiento de la semana (pesos, intensidades, repeticiones).
- Permitir imprimir la pauta semanal.
- Sugerir técnica y videos demostrativos para principiantes.

---

## 2. STACK TÉCNICO Y ARQUITECTURA DE DESPLIEGUE

**Frontend (cliente, estático):**
- React + Vite + Tailwind CSS + Lucide React (iconos).
- Desplegado en GitHub Pages (configurar `base` en `vite.config.js` + workflow `.github/workflows/deploy.yml`).

**Base de datos:**
- Firebase Firestore (Web SDK v10 modular), plan gratuito Spark.
- **Firebase Authentication** (email/password o link mágico) con exactamente 2 cuentas: Dionicio y Paula, agrupadas bajo un mismo `householdId`.

**⚠️ Importante — por qué GitHub Pages solo no alcanza:**
GitHub Pages solo sirve archivos estáticos; no puede ejecutar código en un horario (no hay "cron" del lado del servidor) ni guardar una API key de forma segura. Por eso el envío automático de correos de la sección 8 **no puede vivir dentro de la SPA** — necesita un proceso aparte. La solución más simple y gratuita es usar un **GitHub Actions workflow programado** (cron) en el mismo repositorio, que corre un script Node.js fuera del navegador del usuario.

**IA (uso interactivo, dentro de la app):**
- Integración con `@google/genai` o REST a Gemini API.
- La clave se pega una vez en la interfaz y se guarda en `localStorage` (nunca en el repo). Esto sirve solo para las consultas manuales al "Coach Gemini" mientras la persona usa la app.
- Para la automatización de correos (sección 8), se necesita una **segunda copia de la key** guardada como *GitHub Secret* — porque ese proceso corre sin navegador y no tiene acceso al `localStorage` de nadie.

---

## 3. MODELO MULTI-USUARIO ("MULTI-TENANT LIGERO")

No es multi-tenant real (son solo 2 usuarios fijos), pero sí necesita separación de datos con vista combinada:

- Estructura de Firestore sugerida:
  ```
  households/{householdId}/
    members/{uid}/               → perfil (nombre, altura, equipamiento)
    members/{uid}/logs/{logId}   → registros de entrenamiento individuales
    members/{uid}/bodyweight/{entryId}
  ```
- Cada usuario inicia sesión con su cuenta y solo puede **escribir** en su propia subcolección (`members/{su_uid}/...`).
- El dashboard de estadísticas hace una query a `members/*/logs` del mismo `householdId` y las combina en un solo gráfico (ej. progreso de peso corporal de ambos, volumen semanal comparado), pero siempre etiquetando de quién es cada serie.
- Reglas de Firestore (`firestore.rules`) — pedir explícitamente al agente que las genere:
  ```
  match /households/{householdId}/members/{uid}/{document=**} {
    allow read: if request.auth != null && existsInHousehold(householdId, request.auth.uid);
    allow write: if request.auth != null && request.auth.uid == uid;
  }
  ```

---

## 4. CONTEXTO DE LOS USUARIOS Y EQUIPO

- **Perfil 1 (Dionicio):**
  - Estatura: 180 cm.
  - Nutrición: ayuno matutino + almuerzo (13:00–14:00) + cena (20:00, justo después de entrenar).
- **Perfil 2 (Paula):**
  - Edad: 41 años | Estatura: 160 cm.
  - Nutrición: desayuno liviano proteico + almuerzo + cena.
- **Equipamiento disponible:**
  - Set 3 en 1 de mancuernas/barra/kettlebell ajustable hasta 40 kg totales.
  - Trotadora eléctrica con 15 niveles de inclinación y control de velocidad en km/h.
  - Apple Watch Series 8 en ambos (frecuencia cardíaca y calorías activas).

> Nota para el agente: no asumas condiciones físicas o lesiones que el usuario no haya escrito explícitamente en este prompt; si faltan datos de un ejercicio, pide que se completen en vez de inventarlos.

---

## 5. ARQUITECTURA DE LA RUTINA Y CRONÓMETRO (19:00–20:00)

Temporizador de Sesión en Vivo con alertas sonoras/visuales:

1. **19:00–19:07:** Calentamiento y movilidad conjunta.
2. **19:07–19:32 (Bloque 1, 25 min):** Usuario A en Fuerza / Usuario B en Trotadora.
3. **19:32–19:35 (Transición, 3 min):** Alarma de rotación, ajuste de discos e hidratación.
4. **19:35–20:00 (Bloque 2, 25 min):** Usuario A en Trotadora / Usuario B en Fuerza.
5. **Vuelta a la calma / estiramientos** (puede extenderse unos minutos fuera de la ventana estricta).

---

## 6. EJERCICIOS Y VALORES POR DEFECTO

Cada ejercicio debe mostrar instrucciones para principiantes y un botón que abra la búsqueda en YouTube (`https://www.youtube.com/results?search_query=tecnica+correcta+[nombre_ejercicio]`).

**Día Torso (Lunes y Jueves):**
1. Floor press con mancuernas — 3-4 x 8-12.
2. Remo unilateral con mancuerna — 3 x 10-12 por brazo.
3. Press militar de hombros — 3 x 8-10.
4. Curl bíceps / extensión tríceps copa — 3 x 10-12.

**Día Pierna y Core (Martes y Viernes):**
1. Goblet squat — 3-4 x 10-12 (bajada controlada).
2. Peso muerto rumano con mancuernas — 3-4 x 10-12.
3. Puente de glúteos — 3 x 12-15.
4. Plancha abdominal — 3 x 30-45 seg.

**Estación Trotadora:**
- Min 0-3: Inclinación 2 | 4.2 km/h (adaptación).
- Min 3-20: Inclinación 8-11 | 4.8-5.3 km/h.
- Min 20-25: Inclinación 2 | 3.8 km/h (enfriamiento).

---

## 7. FUNCIONALIDADES ESPECÍFICAS

1. **Login por usuario** (Firebase Auth) + selector "Modo Dúo en Vivo" para la pantalla compartida durante el entrenamiento.
2. **Dashboard combinado**: gráficos (Recharts/Chart.js) que muestran el progreso de ambos lado a lado, siempre diferenciando la serie de cada persona.
3. **Módulo de sobrecarga progresiva**: formulario de fecha, ejercicio, peso (kg), repeticiones, RPE (1-10); para trotadora: inclinación, velocidad promedio, FC media y calorías (Apple Watch).
4. **Calendario**: botón "Descargar .ics" + enlace directo a Google Calendar para agendar la semana.
5. **Vista de impresión** (Print CSS): plan semanal A4 en blanco y negro con casillas de verificación.
6. **Coach Gemini (interactivo)**: modal para ingresar la API key una vez, con prompts predefinidos ("Ajustar pesos según esta semana", "Sugerir reemplazo de ejercicio", "Revisar menú según despensa").
7. **Configuración Firebase**: pantalla para pegar credenciales propias, de modo que el repo sea reusable sin tocar código fuente.

---

## 8. AUTOMATIZACIÓN: CORREO SEMANAL LOS SÁBADOS

Esto corre **fuera del navegador**, como un job programado:

- Crear un script en `/automation/send-weekly-plan.mjs` (Node.js) que:
  1. Se conecta a Firestore usando el **Firebase Admin SDK** (con una service account, no la key pública del cliente).
  2. Lee el plan de la próxima semana + últimos registros de cada usuario (para ajustar pesos si corresponde, opcionalmente llamando a Gemini con la key server-side).
  3. Envía un correo individual a Dionicio y otro a Paula (usando un proveedor con tier gratuito, ej. **Resend** o **Nodemailer + contraseña de aplicación de Gmail**).
- Crear `.github/workflows/weekly-email.yml` con:
  ```yaml
  on:
    schedule:
      - cron: '0 12 * * 6'   # sábados 12:00 UTC — ajustar a tu huso horario
  ```
- Todas las credenciales (service account de Firebase, API key de Gemini, credenciales del proveedor de correo) van como **GitHub Secrets**, nunca en el código.
- Pedir al agente que documente en el README cómo generar y cargar cada secret paso a paso.

---

## 9. ENTREGABLES — DESARROLLO EN 3 FASES

**No pidas todo en un solo turno al agente.** Entrégale este documento completo como contexto, pero pídele que trabaje fase por fase:

- **Fase 1 — Base:** estructura del proyecto, `package.json`, `vite.config.js`, `tailwind.config.js`, Firebase Auth con las 2 cuentas, `Timer.jsx`, `ExerciseCard.jsx`, navegación básica.
- **Fase 2 — Datos:** `WorkoutLogger.jsx`, reglas de Firestore, dashboard combinado con gráficos, `PrintablePlan.jsx`.
- **Fase 3 — Automatización e IA:** `GeminiCoach.jsx`, `FirebaseConfig.jsx`, script de automatización + workflow de GitHub Actions para el correo de los sábados, README de despliegue completo (menos de 5 minutos).

Al final de la Fase 3, pide un README con: cómo desplegar en GitHub Pages, cómo crear el proyecto Firebase y sus reglas, cómo generar la service account, y cómo cargar los 3-4 secrets necesarios en GitHub.

---

## 10. RECOMENDACIÓN: USAR SKILLS Y MCP DE ANTIGRAVITY PARA CONSTRUIR ESTO

Antigravity soporta dos mecanismos de extensión que conviene aprovechar para que las 3 fases queden consistentes entre sí y para no tener que copiar/pegar configuración manualmente:

**a) Crea una Skill de proyecto** (`.antigravity/skills/fitness-app-pareja/SKILL.md` o carpeta equivalente según tu instalación). Una Skill es una definición de metodología ligera, basada en archivos, que el agente carga automáticamente cuando detecta la tarea relevante — piénsala como "el cerebro" que le dice al agente *cómo* hacer algo de forma repetible. Pídele a Antigravity, al inicio del proyecto, que genere una Skill que documente:
   - El modelo de datos de Firestore (`households/{householdId}/members/{uid}/...`) y las reglas de seguridad de la sección 3, para que el agente las reutilice igual en Fase 1, 2 y 3 sin reinventarlas.
   - La convención de nombres de ejercicios y estructura de `logs` (fecha, peso, reps, RPE), para que el `WorkoutLogger.jsx` y el script de correos semanales usen exactamente el mismo esquema.
   - El formato esperado del correo semanal (secciones: plan de la semana, ajuste sugerido según overload progresivo, recordatorio de horario 19:00–20:00).

**b) Conecta MCP servers para que el agente tenga "manos" reales sobre tu infraestructura**, en vez de que tú pegues configuración a mano:
   - **GitHub MCP** (disponible en el MCP Store de Antigravity): para que el agente cree directamente el workflow `.github/workflows/weekly-email.yml` y te guíe para cargar los Secrets, en lugar de solo dejarte el YAML para copiar.
   - **Firebase/GCP MCP** (si está disponible en tu MCP Store): para que el agente pueda provisionar/verificar las colecciones de Firestore y validar las reglas de seguridad directamente contra tu proyecto, reduciendo el riesgo de que la app y las reglas queden desincronizadas.
   - Si no encuentras un MCP de Firebase específico, no es bloqueante: la Skill del punto (a) sigue garantizando consistencia aunque la configuración de Firebase se haga manualmente vía consola.

**Diferencia clave a tener en mente:** la Skill define la metodología (el "qué y cómo"); el MCP ejecuta acciones reales contra un sistema externo (el "hacerlo"). Pide explícitamente en el prompt que el agente use la Skill para mantener consistencia entre fases, y los MCP conectados para ejecutar cambios reales en GitHub/Firebase en vez de solo generarte texto para copiar y pegar.

> Nota: estas dos capacidades son específicas del propio Antigravity (agente de desarrollo) — no forman parte del código final de la app en sí, sino de cómo le pides al agente que trabaje mientras la construye.
