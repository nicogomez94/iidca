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

export { roleFields } from "../shared/profileFields.js";
