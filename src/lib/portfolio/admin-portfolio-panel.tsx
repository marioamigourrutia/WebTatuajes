"use client";

export function AdminPortfolioPanel({
  enabled,
  fileUploadsEnabled,
}: {
  enabled: boolean;
  fileUploadsEnabled: boolean;
}) {
  // Se conserva la API/colección histórica para no perder datos ni romper enlaces antiguos,
  // pero la interfaz duplicada se retira: Instagram / Imágenes editoriales es ahora la fuente visual.
  void enabled;
  void fileUploadsEnabled;
  return null;
}
