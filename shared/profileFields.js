export const YES_NO_OPTIONS = ["Sí", "No"];

const conditional = (name, value = "Sí") => ({ name, value });

export const roleFields = {
  ATHLETE: [
    { name: "age", label: "Edad", type: "number", min: 18, required: false, private: true },
    { name: "country", label: "País", required: true },
    {
      name: "searchGoals",
      label: "¿Qué estás buscando?",
      type: "checkboxes",
      required: true,
      options: [
        "Entrenar con un profesional",
        "Completar o formar un equipo",
        "Encontrar un club o gimnasio",
        "Contactar una federación",
        "Mejorar mi rendimiento",
        "Hacer deporte por diversión",
        "Profesionalizarme",
      ],
    },
    { name: "favoriteSports", label: "Deportes que practicás", type: "tags", required: true, placeholder: "Fútbol, natación, running" },
    { name: "sportsToTry", label: "Deportes que querés probar", type: "tags", placeholder: "Tenis, pádel, escalada" },
    { name: "hobbies", label: "Otros hobbies e intereses", type: "tags", placeholder: "Fotografía, música, viajes" },
    {
      name: "level", label: "Nivel actual", type: "select", required: true,
      options: ["Quiero empezar desde cero", "Principiante", "Intermedio", "Avanzado", "Competitivo"],
    },
    {
      name: "frequency", label: "Frecuencia actual", type: "select", required: true,
      options: ["Estoy retomando", "1 vez por semana", "2–3 veces por semana", "4+ veces por semana"],
    },
    { name: "teamContact", label: "¿Te pueden contactar para completar equipos?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "availability", label: "Disponibilidad", type: "checkboxes", required: true, options: ["Mañana", "Tarde", "Noche", "Fines de semana"] },
    { name: "tournamentInterest", label: "¿Te interesa participar en torneos?", type: "select", required: true, options: YES_NO_OPTIONS },
    {
      name: "objective", label: "Objetivo principal", type: "select", required: true,
      options: ["Mejorar mi salud", "Socializar", "Competir", "Profesionalizarme", "Recreación"],
    },
    { name: "receiveOffers", label: "¿Autorizás recibir propuestas deportivas y oportunidades?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "whatsapp", label: "WhatsApp", type: "tel", private: true, placeholder: "+54 9 11 1234 5678" },
    { name: "instagram", label: "Instagram", private: true, placeholder: "@usuario" },
  ],
  PROFESSIONAL: [
    {
      name: "profession", label: "Profesión principal", type: "select", required: true,
      options: ["Entrenador/a personal", "Profesor/a de Educación Física", "Kinesiólogo/a", "Nutricionista", "Preparador/a físico/a", "Coach deportivo", "Psicólogo/a deportivo/a", "Médico/a deportólogo/a", "Otro"],
    },
    { name: "license", label: "Número de matrícula, si aplica" },
    { name: "country", label: "País", required: true },
    { name: "mode", label: "Modalidad de atención", type: "checkboxes", required: true, options: ["Presencial", "Online"] },
    { name: "valueProposition", label: "Propuesta de valor", type: "textarea", required: true, maxLength: 500, placeholder: "Contá brevemente cómo ayudás a deportistas y organizaciones." },
    { name: "specialties", label: "Especialidades", type: "tags", required: true, placeholder: "Rendimiento, rehabilitación, nutrición" },
    { name: "audiences", label: "Público al que atendés", type: "checkboxes", required: true, options: ["Infancias", "Adolescentes", "Adultos", "Personas mayores", "Deportistas amateurs", "Deportistas de alto rendimiento", "Clubes y equipos", "Personas con discapacidad"] },
    { name: "education", label: "Formación principal", type: "textarea", required: true },
    { name: "additionalCertifications", label: "Certificaciones adicionales", type: "textarea" },
    { name: "experience", label: "Años de experiencia", type: "number", min: 0, required: true },
    { name: "hasTestimonials", label: "¿Contás con testimonios o casos?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "testimonials", label: "Testimonios o enlace a casos", type: "textarea", when: conditional("hasTestimonials"), placeholder: "Podés describirlos o agregar un enlace público." },
    { name: "jobInterest", label: "¿Te interesan oportunidades laborales?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "iidcaCertification", label: "¿Querés postularte a una certificación IIDCA?", type: "select", required: true, options: YES_NO_OPTIONS },
  ],
  CLUB: [
    { name: "country", label: "País", required: true },
    { name: "founded", label: "Año de fundación", type: "number", min: 1800 },
    { name: "legalId", label: "CUIT o identificación legal" },
    { name: "history", label: "Historia institucional", type: "textarea", required: true, maxLength: 1200 },
    { name: "memberCount", label: "Cantidad aproximada de socios", type: "number", min: 0 },
    { name: "infrastructure", label: "Infraestructura general", type: "textarea", required: true, placeholder: "Sedes, canchas, gimnasio, vestuarios y accesibilidad." },
    { name: "levels", label: "Niveles ofrecidos", type: "checkboxes", required: true, options: ["Inicial", "Recreativo", "Intermedio", "Competitivo", "Alto rendimiento"] },
    { name: "schedule", label: "Días y horarios", type: "textarea", required: true, placeholder: "Lunes a viernes, 17 a 21 h" },
    { name: "ages", label: "Edades admitidas", type: "textarea", required: true, placeholder: "Desde 6 años, sin límite de edad" },
    { name: "contactPerson", label: "Persona de contacto", required: true },
    { name: "contactRole", label: "Cargo de la persona de contacto" },
  ],
  FEDERATION: [
    { name: "country", label: "País", required: true },
    { name: "region", label: "Provincia o región", required: true },
    { name: "founded", label: "Año de fundación", type: "number", min: 1800 },
    { name: "hasLegalStatus", label: "¿Cuenta con personería jurídica?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "legalId", label: "CUIT o identificación legal", required: true },
    { name: "legalResolution", label: "Número de resolución o personería", required: true, when: conditional("hasLegalStatus") },
    { name: "affiliatedClubs", label: "Clubes afiliados", type: "club-list", required: true },
    { name: "publishTournaments", label: "¿Desea informar torneos?", type: "select", required: true, options: YES_NO_OPTIONS },
    {
      name: "tournament", label: "Información del próximo torneo", type: "group", when: conditional("publishTournaments"),
      fields: [
        { name: "name", label: "Nombre", required: true }, { name: "type", label: "Tipo", required: true }, { name: "date", label: "Fecha", type: "date", required: true },
        { name: "city", label: "Ciudad", required: true }, { name: "level", label: "Nivel", required: true },
        { name: "openRegistration", label: "¿Inscripción abierta?", type: "select", required: true, options: YES_NO_OPTIONS },
        { name: "cost", label: "Costo" }, { name: "link", label: "Enlace de información", type: "url" },
      ],
    },
    { name: "needsSportsSpaces", label: "¿Busca espacios deportivos?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "requiredSpaces", label: "Tipo de espacios requeridos", type: "tags", required: true, when: conditional("needsSportsSpaces"), placeholder: "Canchas, natatorio, gimnasio" },
    { name: "captureMessage", label: "Mensaje para captar clubes y deportistas", type: "textarea", required: true, maxLength: 500 },
    { name: "socialPractice", label: "¿Permiten práctica social no federada?", type: "select", required: true, options: YES_NO_OPTIONS },
    { name: "beginners", label: "¿Ofrecen formación para principiantes?", type: "select", required: true, options: YES_NO_OPTIONS },
  ],
  SPONSOR: [
    { name: "legalId", label: "CUIT o identificación fiscal", required: true },
    { name: "sector", label: "Rubro de actividad", required: true },
    { name: "country", label: "País", required: true },
    { name: "socialNetworks", label: "Redes sociales", type: "textarea", placeholder: "Instagram, LinkedIn u otras" },
    { name: "support", label: "¿Qué te interesa acompañar?", type: "checkboxes", required: true, options: ["Club deportivo", "Deportista social", "Causa IIDCA", "Evento deportivo", "Federación", "Infraestructura deportiva"] },
    { name: "supportType", label: "Tipo de aporte", type: "checkboxes", required: true, options: ["Donación económica", "Sponsoreo publicitario", "Canje de productos o servicios", "Becas", "Equipamiento"] },
    { name: "contributionAmount", label: "Monto estimado del aporte", type: "number", min: 0, required: true },
    { name: "contributionCurrency", label: "Moneda", type: "select", required: true, options: ["ARS", "USD", "EUR", "UYU", "BRL", "Otra"] },
    { name: "contributionMode", label: "Modalidad o frecuencia del aporte", type: "select", required: true, options: ["Único", "Mensual", "Trimestral", "Anual", "A definir"] },
    { name: "visibilityGoals", label: "Objetivos de visibilidad", type: "checkboxes", required: true, options: ["Presencia de marca", "Impacto social", "Alcance local", "Alcance nacional", "Contenido en redes", "Activaciones y eventos", "Beneficios para empleados"] },
    { name: "contactName", label: "Nombre de la persona de contacto", required: true },
    { name: "contactRole", label: "Cargo", required: true },
    { name: "corporateEmail", label: "Email corporativo", type: "email", required: true },
    { name: "contactPhone", label: "Teléfono de contacto", type: "tel", required: true },
    { name: "sponsorTermsAccepted", label: "Acepto las condiciones de vinculación y la cláusula de aporte del 15 % a la Fundación IIDCA", type: "consent", required: true, private: true },
  ],
};

export const roleDocuments = {
  PROFESSIONAL: [{ key: "testimonials", label: "Archivo de testimonios o casos", when: conditional("hasTestimonials") }],
  FEDERATION: [{ key: "legalStatus", label: "Estatuto o resolución de personería jurídica", when: conditional("hasLegalStatus") }],
};

export function fieldIsVisible(field, details = {}) {
  return !field.when || details?.[field.when.name] === field.when.value;
}

export function hasValue(value) {
  if (Array.isArray(value)) return value.some((item) => hasValue(item));
  if (value && typeof value === "object") return Object.values(value).some((item) => hasValue(item));
  if (typeof value === "number") return Number.isFinite(value);
  return value === true || (typeof value === "string" && value.trim().length > 0);
}

export function requiredMissing(role, details = {}) {
  return (roleFields[role] || []).filter((field) => field.required && fieldIsVisible(field, details) && !hasValue(details[field.name]));
}

export function publicRoleFields(role) {
  return (roleFields[role] || []).filter((field) => !field.private && field.type !== "consent");
}
