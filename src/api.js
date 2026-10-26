export async function api(path, options = {}) {
  let response;
  try {
    const isFormData = options.body instanceof FormData;
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error(
      "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "No pudimos completar la operación.");
  return data;
}
