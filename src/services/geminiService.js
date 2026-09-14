// Servicio Centralizado de Gemini Coach para la App Dúo en Casa
import { GoogleGenerativeAI } from '@google/generative-ai';
import { USERS, WORKOUT_DAYS, TREADMILL_PROTOCOLS } from '../data/workoutCatalog';
import { getLocalLogs, getLocalWeightEntries } from '../firebase/config';

export const GEMINI_STORAGE_KEY = 'fitness_gemini_api_key';

export function getStoredGeminiKey() {
  return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
}

export function saveGeminiKey(key) {
  localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
}

/**
 * Obtiene una instancia configurada de Gemini intentando con los modelos disponibles.
 */
async function callGemini(systemInstruction, userPrompt, apiKey) {
  const key = apiKey || getStoredGeminiKey();
  if (!key) throw new Error('API_KEY_MISSING');

  const genAI = new GoogleGenerativeAI(key);
  const modelCandidates = [
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-3.6-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-latest',
    'gemini-pro'
  ];
  let lastErr = null;

  for (const mName of modelCandidates) {
    try {
      const modelConfig = { model: mName };
      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }
      const model = genAI.getGenerativeModel(modelConfig);
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      lastErr = e;
      // Try fallback without systemInstruction if it was rejected by legacy models
      if (systemInstruction && (e.message?.includes('systemInstruction') || e.message?.includes('system_instruction'))) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const combinedPrompt = `${systemInstruction}\n\n---\n\n${userPrompt}`;
          const result = await model.generateContent(combinedPrompt);
          const text = result.response.text();
          if (text) return text;
        } catch (innerErr) {
          lastErr = innerErr;
        }
      }
      console.warn(`Gemini candidate model ${mName} notice:`, e.message);
    }
  }
  throw lastErr || new Error('No se pudo obtener respuesta de Gemini');
}

/**
 * Construye el contexto base del hogar para las consultas del coach
 */
export function buildHouseholdContext(householdId = 'hogar-dionicio-paula') {
  const logs = getLocalLogs(householdId);
  const weights = getLocalWeightEntries(householdId);
  
  let pantry = [];
  try {
    const rawPantry = localStorage.getItem('fitness_duo_pantry_items');
    if (rawPantry) pantry = JSON.parse(rawPantry);
  } catch (e) {}

  let activeMenu = null;
  try {
    const rawMenu = localStorage.getItem('fitness_duo_weekly_menu');
    if (rawMenu) activeMenu = JSON.parse(rawMenu);
  } catch (e) {}

  const dionicioLogs = logs.filter(l => l.userId === 'dionicio');
  const paulaLogs = logs.filter(l => l.userId === 'paula');

  return {
    athletes: USERS,
    totalLogsCount: logs.length,
    recentLogs: logs.slice(0, 10),
    dionicioRecent: dionicioLogs.slice(0, 5),
    paulaRecent: paulaLogs.slice(0, 5),
    bodyweights: weights.slice(0, 5),
    pantryItems: pantry,
    hasActiveMenu: !!activeMenu,
    menuSnippet: activeMenu ? activeMenu.content?.substring(0, 300) : 'Sin menú generado aún'
  };
}

/**
 * Genera una recomendación de carga previa antes de realizar un ejercicio
 */
export function getPreExerciseAdvice(userId, exerciseId, dayType = 'torso', logs = []) {
  const user = USERS[userId] || USERS.dionicio;
  const day = WORKOUT_DAYS.find(d => d.id === dayType) || WORKOUT_DAYS[0];
  const exercise = day.exercises.find(e => e.id === exerciseId);

  if (!exercise) return null;

  const userDefaultWeight = userId === 'dionicio' ? exercise.defaultWeightDionicio : exercise.defaultWeightPaula;
  
  // Buscar historial previo de este ejercicio para este usuario
  const prevLogs = logs.filter(l => l.userId === userId && l.type === 'strength' && l.exerciseId === exerciseId);
  
  if (prevLogs.length === 0) {
    return {
      suggestedWeightKg: userDefaultWeight,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetRPE: user.targetRPE,
      coachTip: `Semana 0 (Calibración): Inicia con ~${userDefaultWeight} kg. Enfócate en aprender la trayectoria limpia, descansando ${exercise.restSeconds}s entre series.`,
      isHistorical: false
    };
  }

  const lastLog = prevLogs[0];
  const lastMaxWeight = Math.max(...(lastLog.sets?.map(s => s.weightKg) || [userDefaultWeight]));
  const avgRpe = (lastLog.sets?.reduce((acc, s) => acc + (s.rpe || 8), 0) || 8) / (lastLog.sets?.length || 1);

  let suggested = lastMaxWeight;
  let tip = '';

  if (avgRpe < 7) {
    suggested = lastMaxWeight + (userId === 'dionicio' ? 2 : 1);
    tip = `En tu última sesión completaste las series con RPE suave (~${avgRpe.toFixed(1)}). Hoy puedes probar subir a ${suggested} kg con buena técnica.`;
  } else if (avgRpe >= 8.5) {
    suggested = lastMaxWeight;
    tip = `La última sesión tuvo RPE exigente (~${avgRpe.toFixed(1)}). Mantén ${suggested} kg y busca consolidar el control y la pausa isométrica.`;
  } else {
    suggested = lastMaxWeight;
    tip = `Carga calibrada correctamente en ${suggested} kg (RPE ${avgRpe.toFixed(1)}). Busca completar ${exercise.targetReps} reps con técnica impecable.`;
  }

  return {
    suggestedWeightKg: suggested,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetRPE: user.targetRPE,
    coachTip: tip,
    isHistorical: true,
    lastLogDate: lastLog.date
  };
}

/**
 * Micro-feedback instantáneo después de guardar una serie en el Logger
 */
export async function getLiveSetFeedback({ userId, exerciseName, setNumber, weightKg, reps, rpe, notes }, apiKey) {
  const user = USERS[userId] || USERS.dionicio;

  // Si no hay API key o llamada rápida, generamos un feedback heurístico deportivo inmediato de alta calidad
  const key = apiKey || getStoredGeminiKey();
  if (!key) {
    if (rpe <= 6.5) {
      return `✅ Serie ${setNumber} (${weightKg}kg x ${reps} reps): Esfuerzo controlado (RPE ${rpe}). Para la próxima serie puedes mantener o subir +1 repetición sin perder técnica.`;
    } else if (rpe <= 8) {
      return `🔥 Serie ${setNumber} (${weightKg}kg x ${reps} reps): ¡Zona ideal de estímulo para ${user.name}! Descansa 45-60s e hidrátate antes de la siguiente serie.`;
    } else {
      return `⚠️ Serie ${setNumber} (${weightKg}kg x ${reps} reps): RPE ${rpe} (cerca del fallo). En Semana 0 mantén reserva; descansa 75s y considera no subir peso en la serie que sigue.`;
    }
  }

  try {
    const system = `Eres el Coach deportivo de IA de ${user.name} (principiante en casa, set mancuernas 40kg). Da un micro-feedback de exactamente 1 o 2 oraciones muy directas, motivadoras y técnicas tras la serie que acaba de registrar.`;
    const prompt = `Atleta: ${user.name}. Ejercicio: ${exerciseName}. Serie #${setNumber}: ${weightKg} kg x ${reps} reps con RPE ${rpe}/10. Notas: "${notes || 'Ninguna'}".`;
    return await callGemini(system, prompt, key);
  } catch (err) {
    if (rpe <= 7) {
      return `💪 Excelente serie ${setNumber} (${weightKg}kg x ${reps} reps). Mantén el control de la respiración para la siguiente serie.`;
    } else {
      return `🔥 Serie ${setNumber} completada con ${weightKg}kg. Buen estímulo, descansa bien antes de la siguiente.`;
    }
  }
}

/**
 * Guía contextual del Coach durante el temporizador en vivo (19:00 - 20:00)
 */
export function getLiveTimerAdvice(interval, userAIsDionicio, selectedDayRoutine) {
  const userA = userAIsDionicio ? USERS.dionicio : USERS.paula;
  const userB = userAIsDionicio ? USERS.paula : USERS.dionicio;
  const routine = WORKOUT_DAYS.find(d => d.id === selectedDayRoutine) || WORKOUT_DAYS[0];

  switch (interval.id) {
    case 'warmup':
      return {
        badge: 'Movilidad Conjunta (19:00 - 19:07)',
        headline: '7 minutos de preparación articular en pareja',
        userATip: `${userA.name}: Círculos de brazos, rotación torácica y sentadillas suaves sin peso.`,
        userBTip: `${userB.name}: Movilidad de tobillos, apertura de caderas y elevaciones de talones.`,
        generalTip: 'No usar peso aún. El objetivo es elevar la temperatura corporal y lubricar articulaciones.'
      };

    case 'block1':
      return {
        badge: `Bloque 1 (19:07 - 19:32) • ${routine.name.split('(')[0]}`,
        headline: `${userA.name} en Mancuernas / ${userB.name} en Trotadora`,
        userATip: `${userA.name} (Fuerza): Inicia con ${routine.exercises[0].name}. Descansos de ${routine.exercises[0].restSeconds}s. RPE ${userA.targetRPE}.`,
        userBTip: `${userB.name} (Cardio): Sube a inclinación 4-6% (min 3-20). Mantén FC en Zona 2 sin apoyarte en los pasamanos.`,
        generalTip: 'Ambos entrenan al mismo tiempo. Mantengan botellas de agua a mano.'
      };

    case 'transition':
      return {
        badge: 'Rotación & Ajuste de Discos (19:32 - 19:35)',
        headline: '3 minutos de cambio de estación e hidratación',
        userATip: `${userA.name}: Pasa a la trotadora. Inicia a velocidad suave (3.8 - 4.0 km/h) para normalizar el pulso.`,
        userBTip: `${userB.name}: Pasa a las mancuernas. Ajusta el peso de los discos a tu carga (${routine.exercises[0].defaultWeightPaula}kg aprox).`,
        generalTip: 'Aprovechen de beber 200ml de agua y registrar las series del Bloque 1.'
      };

    case 'block2':
      return {
        badge: `Bloque 2 (19:35 - 20:00) • ${routine.name.split('(')[0]}`,
        headline: `${userB.name} en Mancuernas / ${userA.name} en Trotadora`,
        userATip: `${userA.name} (Cardio): Mantén ritmo constante en pendiente (Zona 2 aeróbica).`,
        userBTip: `${userB.name} (Fuerza): Ejecuta ${routine.exercises[0].name} y ${routine.exercises[1]?.name || 'ejercicios del día'} cuidando la postura lumbar.`,
        generalTip: '¡Último esfuerzo de la sesión! Mantengan la técnica estricta.'
      };

    case 'cooldown':
    default:
      return {
        badge: 'Vuelta a la Calma & Cena (20:00+)',
        headline: '¡Entrenamiento cumplido! Hora de la cena compartida',
        userATip: `${userA.name}: Estiramiento de pectorales/dorsales. ¡A comer tu porción a las 20:00!`,
        userBTip: `${userB.name}: Estiramiento de cuádriceps y glúteos. Hidrátate con agua fría.`,
        generalTip: 'Diríjanse a la cocina para su cena basada en la despensa del hogar.'
      };
  }
}

/**
 * Generador Estricto de Menú Semanal con Recetas Idénticas y Porciones Diferenciadas
 */
export async function generateStrictPantryMenu(pantryItems, apiKey) {
  const key = apiKey || getStoredGeminiKey();
  
  if (pantryItems.length === 0) {
    throw new Error('Debes seleccionar o ingresar al menos 2 o 3 ingredientes disponibles en tu despensa.');
  }

  const systemInstruction = `Eres un Nutricionista Deportivo de precisión para Dionicio y Paula.
REGLAS OBLIGATORIAS Y ESTRICTAS:
1. RECETAS 100% IDÉNTICAS PARA AMBOS: Dionicio y Paula comen EXACTAMENTE EL MISMO PLATO/RECETA en cada Almuerzo (13:30) y en cada Cena Post-Entreno (20:00). Se cocina 1 sola preparación compartida por comida para simplificar la vida del hogar.
2. PORCIONES Y GRAMAJES DIFERENCIADOS POR ATLETA: En cada comida, especifica con total claridad el gramaje exacto de la porción para Dionicio y para Paula según sus perfiles:
   - Dionicio (180 cm, ayuno intermitente en la mañana): Porciones mayores de proteína y carbohidratos (ej: 200-220g proteína, 150-200g carbohidratos cocidos, vegetales abundantes, 1 cda aceite).
   - Paula (41 años, 160 cm): Porciones ajustadas a su gasto calórico (ej: 120-140g proteína, 70-100g carbohidratos cocidos, vegetales abundantes, 1 cdta aceite). Desayuno proteico liviano solo para ella (Dionicio no desayuna por ayuno).
3. EXCLUSIVIDAD TOTAL DE DESPENSA: Usa ÚNICA Y EXCLUSIVAMENTE los ingredientes que están en la lista proporcionada. NO inventes ingredientes no listados (solo se asume agua, sal y pimienta de cocina básica). Si falta un grupo de alimentos, adáptalo con lo que haya.
4. ESTRUCTURA DE LUNES A VIERNES: Desglosa día por día (Lunes a Viernes) con Almuerzo (13:30) y Cena Post-Entreno (20:00), más el desayuno de Paula.
5. Formato Markdown limpio, claro y fácil de leer con emojis y viñetas.`;

  const userPrompt = `Diseña el Plan Nutricional Semanal (Lunes a Viernes) cumpliendo estrictamente que la receta sea la misma para ambos y solo varíen las porciones.

LISTA ESTRICTA DE INGREDIENTES DISPONIBLES EN NUESTRA DESPENSA:
${pantryItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Genera el menú completo ahora.`;

  if (key) {
    return await callGemini(systemInstruction, userPrompt, key);
  }

  // Fallback Inteligente Estricto si no hay API Key
  return generateDeterministicStrictMenu(pantryItems);
}

/**
 * Fallback determinístico con la misma receta y porciones diferenciadas basadas en la despensa
 */
export function generateDeterministicStrictMenu(pantryItems) {
  const hasChicken = pantryItems.some(i => i.toLowerCase().includes('pollo'));
  const hasEggs = pantryItems.some(i => i.toLowerCase().includes('huevo'));
  const hasTuna = pantryItems.some(i => i.toLowerCase().includes('atún') || i.toLowerCase().includes('atun'));
  const hasMeat = pantryItems.some(i => i.toLowerCase().includes('carne'));
  const hasRice = pantryItems.some(i => i.toLowerCase().includes('arroz'));
  const hasOats = pantryItems.some(i => i.toLowerCase().includes('avena'));
  const hasPotatoes = pantryItems.some(i => i.toLowerCase().includes('papa') || i.toLowerCase().includes('camote'));
  const hasSpinach = pantryItems.some(i => i.toLowerCase().includes('espinaca') || i.toLowerCase().includes('hojas'));
  const hasAvocado = pantryItems.some(i => i.toLowerCase().includes('palta') || i.toLowerCase().includes('aguacate'));
  const hasTomato = pantryItems.some(i => i.toLowerCase().includes('tomate'));

  const protein1 = hasChicken ? 'Pechuga de pollo a la plancha' : (hasTuna ? 'Atún al natural' : (hasEggs ? 'Huevos revueltos/cocidos' : 'Proteína disponible'));
  const protein2 = hasMeat ? 'Carne magra salteada' : (hasEggs ? 'Omelette proteico' : protein1);
  const carb1 = hasRice ? 'Arroz cocido' : (hasPotatoes ? 'Papas al horno/cocidas' : (hasOats ? 'Avena cocida' : 'Carbohidrato disponible'));
  const veg1 = hasSpinach ? 'Ensalada de espinacas y hojas verdes' : (hasTomato ? 'Ensalada de tomates frescos' : 'Vegetales frescos');
  const fat1 = hasAvocado ? 'Palta/Aguacate' : 'Aceite de oliva (toque)';

  return `### 🥗 Plan Nutricional Semanal Dúo (Misma Receta • Porciones Diferenciadas)
*Basado estrictamente en los ingredientes activos de su despensa (${pantryItems.length} ingredientes informados).*

---

#### 📅 LUNES
- **🥣 Desayuno (Solo Paula - Dionicio en Ayuno):**
  - **Paula:** ${hasEggs ? '2 huevos revueltos con espinacas' : 'Porción ligera de avena con agua/té'} + infusión sin azúcar.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein1} con ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio (180 cm):** 220g de ${protein1} + 1.5 tazas de ${carb1} + ${veg1} abundante + ${fat1}.
  - **👩‍💼 Paula (160 cm):** 130g de ${protein1} + 0.5 taza de ${carb1} + ${veg1} abundante + 1/4 ${fat1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *${hasEggs ? 'Revuelto de huevos con vegetales y palta' : `${protein1} con ensalada tibia`}*
  - **👨‍💻 Dionicio:** 4 huevos enteros + 2 tostadas integrales + 1/2 palta.
  - **👩‍💼 Paula:** 2 huevos enteros + 1 clara + ensalada de espinaca + 1/4 palta.

---

#### 📅 MARTES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** ${hasOats ? 'Bowl de avena cocida (30g) con canela' : '1 huevo duro con té verde'}.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein2} acompañado de ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio:** 220g de ${protein2} + 1.5 tazas de ${carb1} + ${veg1}.
  - **👩‍💼 Paula:** 130g de ${protein2} + 0.5 taza de ${carb1} + ${veg1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Bowl proteico de ${hasTuna ? 'Atún en lata' : protein1} con ${veg1}*
  - **👨‍💻 Dionicio:** 2 latas de atún (o 200g) + 1 taza de arroz/papas + hojas verdes.
  - **👩‍💼 Paula:** 1 lata de atún (120g) + ensalada verde abundante con tomate y limón.

---

#### 📅 MIÉRCOLES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** Omelette de 2 huevos con hojas verdes.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *Wok o salteado de ${protein1} con ${carb1} y verduras*
  - **👨‍💻 Dionicio:** 230g de ${protein1} salteado + 1.5 tazas de ${carb1}.
  - **👩‍💼 Paula:** 130g de ${protein1} salteado + 0.5 taza de ${carb1}.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *${hasEggs ? 'Tortilla de huevos y espinacas al sartén' : `${protein2} con ensalada fresca`}*
  - **👨‍💻 Dionicio:** 4 huevos en tortilla + 1 papa mediana cocida + palta.
  - **👩‍💼 Paula:** 2 huevos en tortilla + ensalada de tomate con limón.

---

#### 📅 JUEVES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** ${hasOats ? 'Avena cocida liviana con café' : '2 claras y 1 huevo revuelto'}.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *${protein2} con ${carb1} y ${veg1}*
  - **👨‍💻 Dionicio:** 220g de ${protein2} + 1.5 tazas de ${carb1} + aceite de oliva.
  - **👩‍💼 Paula:** 120g de ${protein2} + 0.5 taza de ${carb1} + ensalada fresca.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Ensalada tibia de ${protein1} con palta y huevo duro*
  - **👨‍💻 Dionicio:** 200g de ${protein1} + 2 huevos duros + 1/2 palta + pan integral.
  - **👩‍💼 Paula:** 120g de ${protein1} + 1 huevo duro + 1/4 palta + hojas verdes.

---

#### 📅 VIERNES
- **🥣 Desayuno (Solo Paula):**
  - **Paula:** 2 huevos pochados o pasados por agua con té.
- **🍽️ Almuerzo (13:30) — Receta Compartida:** *Arroz o papas salteadas con ${protein1} y verduras*
  - **👨‍💻 Dionicio:** 220g de ${protein1} + 1.5 tazas de arroz + ensalada.
  - **👩‍💼 Paula:** 130g de ${protein1} + 0.5 taza de arroz + ensalada abundante.
- **🌙 Cena Post-Entreno (20:00) — Receta Compartida:** *Revuelto proteico de cierre de semana*
  - **👨‍💻 Dionicio:** 4 huevos revueltos con ${hasTuna ? 'atún' : 'pollo'} + 1 rebanada de pan/papa.
  - **👩‍💼 Paula:** 2 huevos revueltos con ${hasTuna ? 'atún' : 'pollo'} + ensalada de hojas verdes.

---

💡 **Regla de Cocina en Pareja:** Se prepara una sola tanda de cocción (ej. todo el pollo y arroz a la vez) y al momento de servir en los platos se aplican los gramajes individuales indicados arriba.`;
}

/**
 * Consulta general al Coach con contexto 360° de la aplicación
 */
export async function askCoachWithFullContext(queryText, currentUser, householdId, apiKey) {
  const context = buildHouseholdContext(householdId);
  const user = USERS[currentUser] || USERS.dionicio;

  const systemInstruction = `Eres el Coach Integral de Fuerza y Nutrición de Dionicio y Paula para su programa "Dúo en Casa" (19:00 a 20:00).
ESTÁS PROFUNDAMENTE INTEGRADO CON LA APP. Tienes acceso en tiempo real a los siguientes datos:
- Atleta consultante: ${user.name} (${user.level}, ${user.height}, Fase: ${user.phase}, Nutrición: ${user.nutrition}).
- Total de registros de series en el hogar: ${context.totalLogsCount}.
- Últimas series de Dionicio: ${JSON.stringify(context.dionicioRecent)}.
- Últimas series de Paula: ${JSON.stringify(context.paulaRecent)}.
- Despensa actual del hogar: ${context.pantryItems.join(', ') || 'Sin ingredientes informados'}.
- Menú activo: ${context.hasActiveMenu ? 'Existe menú generado' : 'Aún no han generado el menú semanal'}.
- Pesos corporales: ${JSON.stringify(context.bodyweights)}.

REGLAS DE RESPUESTA:
1. Responde de forma muy concisa, estructurada, empática y práctica.
2. Basa tus recomendaciones en sus datos reales (pesos usados, RPE y despensa).
3. Recuerda que entrenan juntos a las 19:00 rotando mancuernas (40kg modulares) y trotadora, y cenan juntos a las 20:00 la MISMA receta variando solo las porciones.`;

  return await callGemini(systemInstruction, queryText, apiKey);
}
