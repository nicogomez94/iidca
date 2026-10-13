export const DEBUG = import.meta.env.VITE_DEBUG === "true";

export const registrationDefaults = DEBUG
  ? {
      name: "Club Ejemplo",
      city: "Ciudad de Buenos Aires",
      neighborhood: "Palermo",
      sport: "Fútbol",
      email: "club-prueba@example.test",
      password: "PruebaSegura123",
      headline: "Deporte para todas las personas",
      description: "Un espacio deportivo abierto a la comunidad.",
    }
  : {};
