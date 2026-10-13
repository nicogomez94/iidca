export const categories = [
  { value: "", label: "Todas las categorías" },
  { value: "CLUB", label: "Clubes y espacios" },
  { value: "PROFESSIONAL", label: "Profesionales" },
  { value: "FEDERATION", label: "Federaciones" },
  { value: "SPONSOR", label: "Marcas aliadas" },
];

export const roleLabels = {
  ATHLETE: "Deportista social",
  PROFESSIONAL: "Profesional",
  CLUB: "Club o espacio",
  FEDERATION: "Federación",
  SPONSOR: "Marca aliada",
  ADMIN: "Administración",
};

export const roleDescriptions = {
  ATHLETE: "Descubrí actividades y espacios cerca tuyo.",
  CLUB: "Hacé visible tu club y acercá nuevas personas.",
  PROFESSIONAL: "Presentá tu trabajo a la comunidad deportiva.",
  FEDERATION: "Conectá tu disciplina con nuevos practicantes.",
  SPONSOR: "Acercá tu marca a proyectos con impacto social.",
};

export const roleFields = {
  ATHLETE: [
    { name: "age", label: "Edad", type: "number", min: 18, required: true },
    {
      name: "searchGoal",
      label: "¿Qué estás buscando?",
      type: "select",
      options: [
        "Encontrar club o gimnasio",
        "Entrenar con un profesional",
        "Hacer deporte por diversión",
        "Federarme en un deporte",
        "Mejorar mi rendimiento",
        "Jugar con otros",
      ],
    },
    {
      name: "level",
      label: "Nivel actual",
      type: "select",
      options: [
        "Quiero empezar desde cero",
        "Principiante",
        "Intermedio",
        "Avanzado",
        "Competitivo",
      ],
    },
    {
      name: "frequency",
      label: "Frecuencia",
      type: "select",
      options: [
        "Estoy retomando",
        "1 vez por semana",
        "2–3 veces por semana",
        "4+ veces por semana",
      ],
    },
    {
      name: "objective",
      label: "Objetivo principal",
      type: "select",
      options: [
        "Mejorar mi salud",
        "Socializar",
        "Competir",
        "Profesionalizarme",
        "Recreación",
      ],
    },
    {
      name: "availability",
      label: "Disponibilidad",
      type: "select",
      options: ["Mañana", "Tarde", "Noche", "Fines de semana"],
    },
    {
      name: "teamContact",
      label: "¿Te pueden contactar para completar equipos?",
      type: "select",
      options: ["Sí", "No"],
    },
  ],
  PROFESSIONAL: [
    {
      name: "profession",
      label: "Profesión principal",
      type: "select",
      options: [
        "Entrenador/a personal",
        "Profesor/a de Educación Física",
        "Kinesiólogo/a",
        "Nutricionista",
        "Preparador/a físico/a",
        "Coach deportivo",
        "Otro",
      ],
    },
    { name: "license", label: "Número de matrícula, si aplica" },
    {
      name: "mode",
      label: "Modalidad",
      type: "select",
      options: ["Presencial", "Online", "Ambos"],
    },
    { name: "specialty", label: "Especialidad" },
    { name: "education", label: "Formación principal" },
    {
      name: "experience",
      label: "Años de experiencia",
      type: "number",
      min: 0,
    },
  ],
  CLUB: [
    {
      name: "levels",
      label: "Niveles ofrecidos",
      placeholder: "Inicial, recreativo, competitivo",
    },
    {
      name: "schedule",
      label: "Días y horarios",
      placeholder: "Lunes a viernes, 17 a 21 h",
    },
    {
      name: "facilities",
      label: "Infraestructura",
      placeholder: "Canchas, salón, gimnasio",
    },
    { name: "ages", label: "Edades admitidas" },
  ],
  FEDERATION: [
    { name: "region", label: "Provincia o región" },
    { name: "founded", label: "Año de fundación", type: "number", min: 1800 },
    { name: "legalId", label: "CUIT o registro legal" },
    {
      name: "socialPractice",
      label: "¿Permiten práctica social no federada?",
      type: "select",
      options: ["Sí", "No"],
    },
    {
      name: "beginners",
      label: "¿Ofrecen formación para principiantes?",
      type: "select",
      options: ["Sí", "No"],
    },
  ],
  SPONSOR: [
    { name: "sector", label: "Rubro de actividad" },
    { name: "legalId", label: "CUIT o identificación fiscal" },
    {
      name: "support",
      label: "¿Qué te interesa acompañar?",
      type: "select",
      options: [
        "Club deportivo",
        "Deportista social",
        "Causa IIDCA",
        "Evento deportivo",
      ],
    },
    {
      name: "supportType",
      label: "Tipo de aporte",
      type: "select",
      options: [
        "Donación económica",
        "Sponsoreo publicitario",
        "Canje de productos o servicios",
      ],
    },
  ],
};
