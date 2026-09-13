// Catálogo de Ejercicios y Rutinas "Dúo en Casa" — Modo Principiantes & Semana 0

export const USERS = {
  dionicio: {
    uid: 'dionicio',
    name: 'Dionicio',
    email: import.meta.env.VITE_DIONICIO_EMAIL || 'dionicio@duoencasa.app',
    avatar: '👨‍💻',
    height: '180 cm',
    level: 'Principiante',
    phase: 'Semana 0 (Calibración & Adaptación)',
    targetRPE: '6 - 7 / 10',
    color: 'dionicio',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/30',
    accentColor: '#38bdf8',
    nutrition: 'Ayuno matutino + Almuerzo (13:00–14:00) + Cena fuerte post-entreno (20:00)',
    equipment: 'Mancuernas modulares hasta 40kg + Trotadora + Apple Watch S8',
  },
  paula: {
    uid: 'paula',
    name: 'Paula',
    email: import.meta.env.VITE_PAULA_EMAIL || 'paula@duoencasa.app',
    avatar: '👩‍💼',
    age: 41,
    height: '160 cm',
    level: 'Principiante',
    phase: 'Semana 0 (Calibración & Adaptación)',
    targetRPE: '5.5 - 6.5 / 10',
    color: 'paula',
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10 border-pink-500/30',
    accentColor: '#f472b6',
    nutrition: 'Desayuno liviano proteico + Almuerzo balanceado + Cena post-entreno (20:00)',
    equipment: 'Mancuernas modulares hasta 40kg + Trotadora + Apple Watch S8',
  }
};

export const WORKOUT_DAYS = [
  {
    id: 'torso',
    name: 'Día Torso (Lunes y Jueves)',
    description: 'Empuje, tirón y brazos con mancuernas modulares. En Semana 0 nos enfocamos en trayectoria limpia sin fatiga excesiva.',
    days: ['Lunes', 'Jueves'],
    exercises: [
      {
        id: 'floor_press',
        name: 'Floor press con mancuernas',
        targetSets: '3',
        targetReps: '10 - 12',
        restSeconds: 60,
        equipment: 'Mancuernas + Mat de suelo',
        instructions: [
          'Acuéstate boca arriba en el suelo con rodillas flexionadas y pies firmes.',
          'Codos a 45 grados respecto al torso (no en cruz a 90° para cuidar los hombros).',
          'Empuja verticalmente con control y desciende en 2-3 segundos.',
          'Pausa suave cuando los tríceps toquen el suelo antes de volver a subir.'
        ],
        beginnerTips: 'Semana 0: Prioriza el control del descenso. El suelo evita sobrecargar la articulación del hombro.',
        defaultWeightDionicio: 10, // ~5 kg por mancuerna
        defaultWeightPaula: 4,    // ~2 kg por mancuerna
      },
      {
        id: 'remo_unilateral',
        name: 'Remo unilateral con mancuerna',
        targetSets: '3',
        targetReps: '10 por brazo',
        restSeconds: 45,
        equipment: 'Mancuerna individual + Apoyo seguro (silla/mueble)',
        instructions: [
          'Apoya una mano en un punto de apoyo firme e inclina el torso a 45° con espalda recta.',
          'Tira llevando el codo hacia la cadera/bolsillo, sin rotar el torso.',
          'Siente cómo trabaja la espalda media y dorsal sin jalar con el cuello.'
        ],
        beginnerTips: 'Imagina que tu mano es un gancho y la fuerza sale de llevar el codo hacia atrás.',
        defaultWeightDionicio: 8,  // Mancuerna 8 kg
        defaultWeightPaula: 4,    // Mancuerna 4 kg
      },
      {
        id: 'press_militar',
        name: 'Press militar de hombros',
        targetSets: '3',
        targetReps: '8 - 10',
        restSeconds: 60,
        equipment: 'Mancuernas ligeras',
        instructions: [
          'De pie o sentados erguidos con abdomen tenso y glúteos activos.',
          'Empuja las mancuernas hacia arriba sobre la cabeza sin arquear la zona lumbar.',
          'Baja lentamente hasta la altura de las orejas/clavícula.'
        ],
        beginnerTips: 'Si notas que arqueas la espalda baja, reduce 1-2 kg y realiza el ejercicio sentado.',
        defaultWeightDionicio: 6,  // ~3 kg por mancuerna
        defaultWeightPaula: 3,    // ~1.5 kg por mancuerna
      },
      {
        id: 'curl_triceps',
        name: 'Curl bíceps / Extensión tríceps copa',
        targetSets: '2 - 3',
        targetReps: '10 - 12',
        restSeconds: 45,
        equipment: 'Mancuernas',
        instructions: [
          'Bíceps: Mantén los codos pegados al cuerpo al flexionar los brazos.',
          'Tríceps: Con ambas manos sosteniendo una sola mancuerna tras la nuca, extiende hacia arriba.',
          'Control total en la bajada sin balancear la espalda.'
        ],
        beginnerTips: 'Cero balanceo corporal. El estímulo debe sentirse puramente en los brazos.',
        defaultWeightDionicio: 6,  // Mancuerna 6 kg
        defaultWeightPaula: 3,    // Mancuerna 3 kg
      }
    ]
  },
  {
    id: 'pierna_core',
    name: 'Día Pierna y Core (Martes y Viernes)',
    description: 'Sentadilla, bisagra de cadera y estabilidad central. En Semana 0 aprendemos a respirar y activar el core.',
    days: ['Martes', 'Viernes'],
    exercises: [
      {
        id: 'goblet_squat',
        name: 'Goblet squat (Sentadilla con copa)',
        targetSets: '3',
        targetReps: '10 - 12',
        restSeconds: 60,
        equipment: 'Mancuerna vertical o Peso Corporal',
        instructions: [
          'Sujeta la mancuerna pegada al pecho con ambas manos.',
          'Pies un poco más anchos que las caderas, puntas 20° hacia afuera.',
          'Desciende en 3 segundos abriendo las rodillas en la dirección de los pies.',
          'Empuja el suelo con toda la planta del pie para subir.'
        ],
        beginnerTips: 'Semana 0: Si te cuesta bajar profundo, haz las primeras series sin peso (peso corporal) hasta sentir comodidad.',
        defaultWeightDionicio: 10,
        defaultWeightPaula: 6,
      },
      {
        id: 'peso_muerto_rumano',
        name: 'Peso muerto rumano con mancuernas',
        targetSets: '3',
        targetReps: '10',
        restSeconds: 60,
        equipment: 'Dos mancuernas',
        instructions: [
          'De pie, rodillas con micro-flexión fija durante todo el movimiento.',
          'Empuja la cadera hacia atrás como tocando una pared invisible detrás.',
          'Baja las mancuernas rozando los muslos hasta justo debajo de la rodilla.',
          'Espalda 100% recta y mirada neutra.'
        ],
        beginnerTips: 'No es una sentadilla; es una bisagra de cadera. Debes sentir tensión agradable en la parte posterior de los muslos.',
        defaultWeightDionicio: 12, // ~6 kg por mancuerna
        defaultWeightPaula: 6,    // ~3 kg por mancuerna
      },
      {
        id: 'puente_gluteos',
        name: 'Puente de glúteos (Glute Bridge)',
        targetSets: '3',
        targetReps: '12',
        restSeconds: 45,
        equipment: 'Mat + Peso opcional',
        instructions: [
          'Boca arriba con rodillas flexionadas a 90° y pies planos.',
          'Eleva la cadera apretando los glúteos en el punto más alto durante 1 segundo.',
          'Baja suavemente sin descansar en el piso antes de la siguiente repetición.'
        ],
        beginnerTips: 'Empuja desde los talones y no sobreextiendas la espalda baja arriba.',
        defaultWeightDionicio: 8,
        defaultWeightPaula: 4,
      },
      {
        id: 'plancha_abdominal',
        name: 'Plancha abdominal isométrica',
        targetSets: '3',
        targetReps: '20 - 30 seg',
        restSeconds: 45,
        equipment: 'Mat de suelo',
        instructions: [
          'Apoya antebrazos con codos alineados bajo los hombros.',
          'Cuerpo en línea recta desde la nuca hasta los talones.',
          'Activa abdomen y glúteos fuertemente. Respira con calma.'
        ],
        beginnerTips: 'Semana 0: Si sientes tensión lumbar, apoya suavemente las rodillas manteniendo el abdomen contraído.',
        defaultWeightDionicio: 0,
        defaultWeightPaula: 0,
      }
    ]
  }
];

export const TREADMILL_PROTOCOLS = {
  dionicio: {
    name: 'Protocolo Trotadora Dionicio (Semana 0 - Adaptación)',
    phases: [
      {
        range: 'Min 0 - 3 (3 min)',
        title: 'Calentamiento & Entrada en Calor',
        incline: 2,
        speedKmH: 4.0,
        description: 'Caminata suave para acondicionar tobillos y frecuencia cardíaca.',
        targetHR: '100 - 110 bpm'
      },
      {
        range: 'Min 3 - 20 (17 min)',
        title: 'Bloque de Inclinación Progresiva',
        incline: '5 - 8',
        speedKmH: '4.5 - 4.8',
        description: 'Pendiente moderada para estimular cardio y quema calórica sin impacto articular.',
        targetHR: '120 - 140 bpm (Zona 2)'
      },
      {
        range: 'Min 20 - 25 (5 min)',
        title: 'Vuelta a la Calma',
        incline: 2,
        speedKmH: 3.8,
        description: 'Descenso gradual de pulsaciones.',
        targetHR: '< 110 bpm'
      }
    ]
  },
  paula: {
    name: 'Protocolo Trotadora Paula (Semana 0 - Adaptación)',
    phases: [
      {
        range: 'Min 0 - 3 (3 min)',
        title: 'Calentamiento & Entrada en Calor',
        incline: 2,
        speedKmH: 3.6,
        description: 'Paso cómodo para preparar rodillas y caderas.',
        targetHR: '95 - 110 bpm'
      },
      {
        range: 'Min 3 - 20 (17 min)',
        title: 'Bloque de Inclinación Segura',
        incline: '4 - 6',
        speedKmH: '4.0 - 4.3',
        description: 'Caminata en pendiente suave sin apoyar las manos en los pasamanos.',
        targetHR: '115 - 135 bpm (Zona 2)'
      },
      {
        range: 'Min 20 - 25 (5 min)',
        title: 'Vuelta a la Calma',
        incline: 1,
        speedKmH: 3.5,
        description: 'Paso suave para normalizar la respiración.',
        targetHR: '< 105 bpm'
      }
    ]
  }
};

export const SESSION_SCHEDULE = {
  totalDurationMinutes: 60,
  startTime: '19:00',
  endTime: '20:00',
  intervals: [
    {
      id: 'warmup',
      name: 'Calentamiento & Movilidad Conjunta',
      durationSeconds: 7 * 60, // 7 min (19:00 - 19:07)
      timeDisplay: '19:00 - 19:07',
      roleA: 'Movilidad articular & activación',
      roleB: 'Movilidad articular & activación',
      isTransition: false,
      color: 'emerald'
    },
    {
      id: 'block1',
      name: 'Bloque 1 de Entrenamiento',
      durationSeconds: 25 * 60, // 25 min (19:07 - 19:32)
      timeDisplay: '19:07 - 19:32',
      roleA: 'Fuerza (Mancuernas / Mat)',
      roleB: 'Cardio (Trotadora Pendiente)',
      isTransition: false,
      color: 'sky'
    },
    {
      id: 'transition',
      name: 'Transición & Ajuste de Discos',
      durationSeconds: 3 * 60, // 3 min (19:32 - 19:35)
      timeDisplay: '19:32 - 19:35',
      roleA: 'Rotación a Trotadora + Hidratación',
      roleB: 'Rotación a Fuerza + Ajuste Pesas',
      isTransition: true,
      color: 'amber'
    },
    {
      id: 'block2',
      name: 'Bloque 2 de Entrenamiento',
      durationSeconds: 25 * 60, // 25 min (19:35 - 20:00)
      timeDisplay: '19:35 - 20:00',
      roleA: 'Cardio (Trotadora Pendiente)',
      roleB: 'Fuerza (Mancuernas / Mat)',
      isTransition: false,
      color: 'pink'
    },
    {
      id: 'cooldown',
      name: 'Vuelta a la Calma & Estiramientos',
      durationSeconds: 5 * 60, // 5 min extra
      timeDisplay: '20:00+',
      roleA: 'Estiramientos & cena post-entreno',
      roleB: 'Estiramientos & cena post-entreno',
      isTransition: false,
      color: 'indigo'
    }
  ]
};
