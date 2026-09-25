export async function readJsonResponse<T>(
  response: Response,
  fallbackMessage = "El servidor devolvió una respuesta inesperada.",
): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const statusSuffix = response.status ? ` (HTTP ${response.status})` : "";
    throw new Error(`${fallbackMessage}${statusSuffix}`);
  }
}
