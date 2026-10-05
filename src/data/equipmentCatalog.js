/**
 * Catálogo de Equipamiento Deportivo, Opciones de Tiempo y Enfoques de Entrenamiento
 */

export const EQUIPMENT_ITEMS = [
  {
    id: 'dumbbells',
    name: 'Mancuernas Modulares / Ajustables',
    icon: '🏋️‍♂️',
    category: 'free_weights',
    description: 'Set de mancuernas ajustables o fijas con discos intercambiables.',
    defaultMaxWeightKg: 40,
    hasWeightParam: true,
    weightUnit: 'kg por mano'
  },
  {
    id: 'treadmill',
    name: 'Trotadora Eléctrica',
    icon: '🏃‍♂️',
    category: 'cardio',
    description: 'Cinta de correr o caminar con velocímetro e inclinación.',
    hasIncline: true
  },
  {
    id: 'pullup_bar',
    name: 'Barra de Dominadas',
    icon: '🧗‍♂️',
    category: 'calisthenics',
    description: 'Barra fija de pared o marco de puerta para tracciones verticales.'
  },
  {
    id: 'resistance_bands',
    name: 'Bandas Elásticas de Resistencia',
    icon: '🎗️',
    category: 'accessories',
    description: 'Tubos o bandas de látex de diversas tensiones para activación o sobrecarga.'
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell / Pesa Rusa',
    icon: '🔔',
    category: 'free_weights',
    description: 'Pesa rusa para balanceos, sentadillas copa y empujes balísticos.',
    hasWeightParam: true,
    weightUnit: 'kg'
  },
  {
    id: 'bench',
    name: 'Banco de Entrenamiento (Plano o Reclinable)',
    icon: '🛋️',
    category: 'support',
    description: 'Banco para presses, fondos, remos con apoyo y trabajo de brazos.'
  },
  {
    id: 'barbell',
    name: 'Barra Olímpica o Estándar',
    icon: '🏋️',
    category: 'free_weights',
    description: 'Barra larga con discos para sentadillas, peso muerto y empujes.',
    hasWeightParam: true,
    weightUnit: 'kg total'
  },
  {
    id: 'exercise_mat',
    name: 'Mat o Colchoneta de Suelo',
    icon: '🧘',
    category: 'support',
    description: 'Superficie acolchada para floor press, puente de glúteos y core.'
  },
  {
    id: 'stationary_bike',
    name: 'Bicicleta Estática / Rodillo',
    icon: '🚴',
    category: 'cardio',
    description: 'Cardio de bajo impacto articular para caderas y rodillas.'
  },
  {
    id: 'bodyweight_only',
    name: 'Peso Corporal / Calistenia Pura',
    icon: '🤸',
    category: 'calisthenics',
    description: 'Sin equipamiento externo: flexiones, sentadillas al aire, zancadas y planchas.'
  }
];

export const DURATION_OPTIONS = [
  { value: 25, label: '25 min (Express / HIIT)', badge: 'Ultra Rápido', description: 'Alta densidad: triseries o poco descanso' },
  { value: 35, label: '35 min (Compacto)', badge: 'Eficiente', description: 'Superseries con estímulo metabólico óptimo' },
  { value: 45, label: '45 min (Estándar Pro)', badge: 'Equilibrado', description: '3-4 ejercicios principales con descansos completos' },
  { value: 60, label: '60 min (Completo Dúo)', badge: 'Completo', description: 'Fuerza estructurada + bloque de cardio/inclinación' }
];

export const WEEKLY_FREQUENCY_OPTIONS = [
  { days: 2, label: '2 días por semana', splitSuggestion: 'Torso / Pierna o 2x Full Body' },
  { days: 3, label: '3 días por semana', splitSuggestion: 'Full Body A/B/C o Empuje / Tirón / Pierna' },
  { days: 4, label: '4 días por semana', splitSuggestion: 'Torso / Pierna x2 (Recomendado Dúo)' },
  { days: 5, label: '5 días por semana', splitSuggestion: 'Upper / Lower + Híbrido Metabólico' }
];

export const FOCUS_AREAS = [
  { id: 'balanced', label: 'Equilibrado / General', icon: '⚖️', desc: 'Desarrollo armónico de todo el cuerpo y salud postural.' },
  { id: 'torso_posture', label: 'Torso, Espalda & Postura', icon: '👔', desc: 'Énfasis en espalda alta, deltoides y pectoral (ideal para trabajo de oficina).' },
  { id: 'legs_glutes', label: 'Piernas, Glúteos & Cadena Posterior', icon: '🦵', desc: 'Foco en glúteos firmes, isquiotibiales y cuádriceps protectores de rodilla.' },
  { id: 'core_lumbar', label: 'Core Fuerte & Protección Lumbar', icon: '🛡️', desc: 'Anti-rotación, anti-extensión y salud de la columna vertebral.' },
  { id: 'fat_loss_metabolic', label: 'Aceleración Metabólica & Grasa Visceral', icon: '🔥', desc: 'Series de alta densidad y cardio progresivo en pendiente.' },
  { id: 'hypertrophy_arms', label: 'Brazos, Hombros & Firmeza', icon: '💪', desc: 'Volumen concentrado en bíceps, tríceps y deltoides.' }
];

export const JOINT_CONCERNS = [
  { id: 'shoulder_safe', label: 'Cuidado de Hombro (Evitar presses forzados tras nuca o codos a 90°)', icon: '🛡️' },
  { id: 'lower_back_safe', label: 'Cuidado Lumbar (Evitar hiperextensiones y flexiones vertebrales bajo carga)', icon: '🪵' },
  { id: 'knee_friendly', label: 'Amigable con Rodillas (Evitar impacto de salto y flexiones excesivas sin apoyo)', icon: '🦵' },
  { id: 'wrist_gentle', label: 'Comodidad de Muñecas (Agarre neutro con mancuernas en vez de barra fija)', icon: '🤲' },
  { id: 'cervical_protection', label: 'Protección Cervical (Cero tensión en cuello y trapecio superior)', icon: '💆' }
];
