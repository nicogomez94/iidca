const localDebug = import.meta.env.VITE_DEBUG === "true";
export const testingMode =
  localDebug ||
  import.meta.env.VITE_TESTING_DEFAULT === "true" ||
  new URLSearchParams(window.location.search).get("testing") === "1";

const shared = {
  city: "Ciudad de Buenos Aires",
  neighborhood: "Palermo",
  sport: "Fútbol",
  sports: "Futsal, entrenamiento funcional",
  password: "PruebaSegura123",
};

const byRole = {
  ATHLETE: {
    name: "Alex Prueba",
    age: "25",
    searchGoal: "Encontrar club o gimnasio",
    level: "Principiante",
    frequency: "2–3 veces por semana",
    objective: "Socializar",
    availability: "Tarde",
    teamContact: "Sí",
  },
  CLUB: {
    name: "Club Deportivo de Prueba",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    levels: "Inicial, recreativo y competitivo",
    schedule: "Lunes a viernes de 17 a 21 h",
    facilities: "Cancha y salón de usos múltiples",
    ages: "Desde los 18 años",
  },
  PROFESSIONAL: {
    name: "Alex Entrenador de Prueba",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    profession: "Entrenador/a personal",
    license: "Prueba 12345",
    mode: "Presencial",
    specialty: "Entrenamiento funcional",
    education: "Formación deportiva de prueba",
    experience: "5",
  },
  FEDERATION: {
    name: "Federación Deportiva de Prueba",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    region: "Ciudad de Buenos Aires",
    founded: "2000",
    legalId: "CUIT de prueba",
    socialPractice: "Sí",
    beginners: "Sí",
  },
  SPONSOR: {
    name: "Marca Aliada de Prueba",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: "-34.5845",
    longitude: "-58.4205",
    sector: "Indumentaria deportiva",
    legalId: "CUIT de prueba",
    support: "Club deportivo",
    supportType: "Canje de productos o servicios",
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
    headline: "Propuesta deportiva de prueba",
    description: "Perfil ficticio para probar el registro y la revisión de IIDCA.",
  };
}

export function createLoginDefaults() {
  if (!testingMode) return {};
  return {
    email: window.sessionStorage.getItem("iidcaTestEmail") || "",
    password: shared.password,
  };
}
