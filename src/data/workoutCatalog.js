// Catálogo de Ejercicios y Rutinas "Dúo en Casa"

export const USERS = {
  dionicio: {
    uid: 'dionicio',
    name: 'Dionicio',
    avatar: '👨‍💻',
    height: '180 cm',
    color: 'dionicio',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/30',
    accentColor: '#38bdf8',
    nutrition: 'Ayuno matutino + Almuerzo (13:00–14:00) + Cena (20:00, post-entreno inmediato)',
    equipment: 'Mancuernas modulares hasta 40kg + Trotadora + Apple Watch S8',
  },
  paula: {
    uid: 'paula',
    name: 'Paula',
    avatar: '👩‍💼',
    age: 41,
    height: '160 cm',
    color: 'paula',
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10 border-pink-500/30',
    accentColor: '#f472b6',
    nutrition: 'Desayuno liviano proteico + Almuerzo + Cena',
    equipment: 'Mancuernas modulares hasta 40kg + Trotadora + Apple Watch S8',
  }
};

export const WORKOUT_DAYS = [
  {
    id: 'torso',
    name: 'Día Torso (Lunes y Jueves)',
    description: 'Empuje, tirón horizontal y vertical, y brazos con mancuernas modulares.',
    days: ['Lunes', 'Jueves'],
    exercises: [
      {
        id: 'floor_press',
        name: 'Floor press con mancuernas',
        targetSets: '3 - 4',
        targetReps: '8 - 12',
        restSeconds: 60,
        equipment: 'Mancuernas + Mat de suelo',
        instructions: [
          'Acuéstate boca arriba en el suelo con las rodillas flexionadas y los pies firmes.',
          'Sujeta las mancuernas al pecho con los codos a unos 45-60 grados respecto al torso.',
          'Empuja hacia arriba extendiendo los brazos sin chocar las mancuernas.',
          'Baja lentamente hasta que tus tríceps toquen suavemente el suelo (sin rebotar), pausa 1 segundo y repite.'
        ],
        beginnerTips: 'El suelo protege los hombros de una sobre-extensión. Mantén la espalda baja pegada al piso.',
        defaultWeightDionicio: 18,
        defaultWeightPaula: 8,
      },
      {
        id: 'remo_unilateral',
        name: 'Remo unilateral con mancuerna',
        targetSets: '3',
        targetReps: '10 - 12 por brazo',
        restSeconds: 45,
        equipment: 'Mancuerna individual + Apoyo seguro',
        instructions: [
          'Inclina el torso a 45 grados apoyando una mano en una silla o superficie firme.',
          'Espalda completamente recta y abdomen tenso.',
          'Lleva la mancuerna hacia la cadera/bolsillo, sintiendo la contracción del dorsal.',
          'Evita rotar el torso; mantén los hombros alineados al suelo.'
        ],
        beginnerTips: 'Imagina que tiras llevando el codo hacia el techo en vez de jalar con la mano.',
        defaultWeightDionicio: 16,
        defaultWeightPaula: 7,
      },
      {
        id: 'press_militar',
        name: 'Press militar de hombros',
        targetSets: '3',
        targetReps: '8 - 10',
        restSeconds: 60,
        equipment: 'Mancuernas',
        instructions: [
          'De pie con pies al ancho de caderas o sentado erguido.',
          'Coloca las mancuernas a la altura de las clavículas con palmas mirando al frente o en semi-neutro.',
          'Empuja verticalmente hasta extender brazos sobre la cabeza sin arquear la espalda baja.',
          'Desciende en 2-3 segundos de forma controlada.'
        ],
        beginnerTips: 'Aprieta glúteos y abdomen durante todo el movimiento para proteger la zona lumbar.',
        defaultWeightDionicio: 12,
        defaultWeightPaula: 5,
      },
      {
        id: 'curl_triceps',
        name: 'Curl bíceps / Extensión tríceps copa',
        targetSets: '3',
        targetReps: '10 - 12',
        restSeconds: 45,
        equipment: 'Mancuernas',
        instructions: [
          'Bíceps: Curl simultáneo o alterno manteniendo los codos fijos a los costados.',
          'Tríceps copa: Sujeta una mancuerna con ambas manos tras la nuca y extiende los codos hacia arriba.',
          'Movimiento fluido sin balancear la espalda.'
        ],
        beginnerTips: 'No uses impulso de cadera. Si balanceas el cuerpo, baja 1-2 kg para mantener técnica limpia.',
        defaultWeightDionicio: 10,
        defaultWeightPaula: 4,
      }
    ]
  },
  {
    id: 'pierna_core',
    name: 'Día Pierna y Core (Martes y Viernes)',
    description: 'Cuádriceps, cadena posterior, glúteos y estabilidad lumbo-abdominal.',
    days: ['Martes', 'Viernes'],
    exercises: [
      {
        id: 'goblet_squat',
        name: 'Goblet squat (Sentadilla con copa)',
        targetSets: '3 - 4',
        targetReps: '10 - 12',
        restSeconds: 60,
        equipment: 'Mancuerna vertical o Kettlebell',
        instructions: [
          'Sujeta una mancuerna pegada al pecho con ambas manos por la cabeza del disco.',
          'Pies ligeramente más anchos que las caderas, puntas hacia afuera 15-30°.',
          'Baja en 3 segundos empujando las rodillas hacia afuera y manteniendo el pecho erguido.',
          'Desciende hasta que los muslos queden paralelos al suelo y sube con fuerza desde los talones.'
        ],
        beginnerTips: 'Mantén la mirada al frente y no despegues los talones del piso.',
        defaultWeightDionicio: 20,
        defaultWeightPaula: 10,
      },
      {
        id: 'peso_muerto_rumano',
        name: 'Peso muerto rumano con mancuernas',
        targetSets: '3 - 4',
        targetReps: '10 - 12',
        restSeconds: 60,
        equipment: 'Dos mancuernas',
        instructions: [
          'De pie sosteniendo las mancuernas frente a los muslos.',
          'Flexiona ligeramente las rodillas (posición bloqueada, no sentadilla).',
          'Empuja las caderas hacia atrás como si quisieras tocar una pared detrás de ti.',
          'Desciende las mancuernas pegadas a las espinillas hasta media pierna sintiendo tensión en los isquiosurales.',
          'Regresa empujando las caderas al frente y contrayendo glúteos arriba.'
        ],
        beginnerTips: 'La espalda debe permanecer 100% recta. El movimiento nace en la bisagra de cadera.',
        defaultWeightDionicio: 22,
        defaultWeightPaula: 12,
      },
      {
        id: 'puente_gluteos',
        name: 'Puente de glúteos (Glute Bridge)',
        targetSets: '3',
        targetReps: '12 - 15',
        restSeconds: 45,
        equipment: 'Mat + Mancuerna opcional sobre pelvis',
        instructions: [
          'Boca arriba con rodillas dobladas a 90° y plantas de los pies firmes.',
          'Opcional: coloca una mancuerna sobre la cadera sosteniéndola con las manos.',
          'Eleva la pelvis contrayendo fuertemente los glúteos arriba durante 1 segundo.',
          'Baja lentamente sin apoyar del todo antes de la siguiente repetición.'
        ],
        beginnerTips: 'Empuja a través de los talones y no arquees excesivamente la espalda baja arriba.',
        defaultWeightDionicio: 16,
        defaultWeightPaula: 8,
      },
      {
        id: 'plancha_abdominal',
        name: 'Plancha abdominal isométrica',
        targetSets: '3',
        targetReps: '30 - 45 seg',
        restSeconds: 45,
        equipment: 'Mat de suelo',
        instructions: [
          'Apoya los antebrazos en el suelo con los codos bajo los hombros.',
          'Extiende las piernas apoyando las puntas de los pies.',
          'Forma una línea recta desde la cabeza hasta los talones.',
          'Activa cuádriceps, abdomen y glúteos. Respira de forma controlada.'
        ],
        beginnerTips: 'No permitas que la cadera caiga ni se eleve en forma de pirámide.',
        defaultWeightDionicio: 0,
        defaultWeightPaula: 0,
      }
    ]
  }
];

export const TREADMILL_PROTOCOL = {
  name: 'Protocolo Trotadora Eléctrica (25 Minutos)',
  phases: [
    {
      range: 'Min 0 - 3 (3 min)',
      title: 'Adaptación y Calentamiento',
      incline: 2,
      speedKmH: 4.2,
      description: 'Paso continuo para elevar temperatura corporal y preparar articulaciones.',
      targetHR: '100 - 115 bpm'
    },
    {
      range: 'Min 3 - 20 (17 min)',
      title: 'Bloque de Inclinación Progresiva',
      incline: '8 - 11',
      speedKmH: '4.8 - 5.3',
      description: 'Caminata rápida en pendiente alta para máximo gasto calórico sin impacto articular.',
      targetHR: '130 - 155 bpm (Zona 2/3)'
    },
    {
      range: 'Min 20 - 25 (5 min)',
      title: 'Enfriamiento y Vuelta a la Calma',
      incline: 2,
      speedKmH: 3.8,
      description: 'Descenso paulatino de frecuencia cardíaca e hidratación.',
      targetHR: '< 110 bpm'
    }
  ]
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
