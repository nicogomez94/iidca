export const testingMode = import.meta.env.VITE_DEMO_MODE === "true";

const shared = {
  city: "Ciudad de Buenos Aires",
  neighborhood: "Palermo",
  sport: "Fútbol",
  sports: "Futsal, entrenamiento funcional",
  password: "",
};

const byRole = {
  ATHLETE: {
    name: "Alex Prueba",
    age: "25",
    country: "Argentina",
    searchGoals: ["Encontrar un club o gimnasio"],
    favoriteSports: ["Fútbol"],
    sportsToTry: ["Pádel"],
    hobbies: ["Música"],
    level: "Principiante",
    frequency: "2–3 veces por semana",
    objective: "Socializar",
    availability: ["Tarde"],
    teamContact: "Sí",
    tournamentInterest: "Sí",
    receiveOffers: "Sí",
    whatsapp: "+5491100000000",
    instagram: "@iidca_prueba",
  },
  CLUB: {
    name: "Club Deportivo de Prueba",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    country: "Argentina",
    history: "Club barrial creado para acompañar a su comunidad mediante el deporte.",
    infrastructure: "Cancha, salón de usos múltiples y vestuarios.",
    levels: ["Inicial", "Recreativo", "Competitivo"],
    schedule: "Lunes a viernes de 17 a 21 h",
    facilities: "Cancha y salón de usos múltiples",
    ages: "Desde los 18 años",
    contactPerson: "Responsable de prueba",
  },
  PROFESSIONAL: {
    name: "Alex Entrenador de Prueba",
    country: "Argentina",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    profession: "Entrenador/a personal",
    license: "Prueba 12345",
    mode: ["Presencial"],
    valueProposition: "Acompañamiento deportivo personalizado y accesible.",
    specialties: ["Entrenamiento funcional"],
    audiences: ["Adultos", "Deportistas amateurs"],
    education: "Formación deportiva de prueba",
    experience: "5",
    hasTestimonials: "No",
    jobInterest: "Sí",
    iidcaCertification: "Sí",
  },
  FEDERATION: {
    name: "Federación Deportiva de Prueba",
    country: "Argentina",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    region: "Ciudad de Buenos Aires",
    founded: "2000",
    legalId: "CUIT de prueba",
    hasLegalStatus: "Sí",
    legalResolution: "Resolución de prueba 123",
    affiliatedClubs: [{ name: "Club afiliado de prueba", city: "Buenos Aires", address: "Calle 123", contact: "contacto@example.test", acceptsSocial: "Sí" }],
    publishTournaments: "No",
    needsSportsSpaces: "No",
    captureMessage: "Sumate a una comunidad que acerca esta disciplina a más personas.",
    socialPractice: "Sí",
    beginners: "Sí",
  },
  SPONSOR: {
    name: "Marca Aliada de Prueba",
    country: "Argentina",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    sector: "Indumentaria deportiva",
    legalId: "CUIT de prueba",
    support: ["Club deportivo"],
    supportType: ["Canje de productos o servicios"],
    contributionAmount: "100000",
    contributionCurrency: "ARS",
    contributionMode: "Único",
    visibilityGoals: ["Impacto social"],
    contactName: "Contacto de prueba",
    contactRole: "Responsable de alianzas",
    corporateEmail: "alianzas@example.test",
    contactPhone: "+5491100000000",
    sponsorTermsAccepted: true,
  },
};

export function createRegistrationDefaults(role = "ATHLETE") {
  if (!testingMode) return {};
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...shared,
    ...byRole[role],
    email: `iidca-prueba-${unique}@example.test`,
    contactEmail: "contacto-prueba@example.test",
    phone: "+5491100000000",
    instagram: "@iidca_prueba",
    website: "https://example.test",
    imageUrl: "/images/sports/football.jpg",
    headline: "Propuesta deportiva de prueba",
    description: "Perfil ficticio para probar el registro y la revisión de IIDCA.",
  };
}

export function createLoginDefaults(adminPortal = false) {
  if (!testingMode) return {};
  return {
    email: adminPortal ? "admin@iidca.com.ar" : window.sessionStorage.getItem("iidcaTestEmail") || "test@iidca.test",
    password: "",
  };
}
