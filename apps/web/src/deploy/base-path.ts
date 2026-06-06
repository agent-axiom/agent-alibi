export function normalizeBasePath(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, "");
  return withoutEdges ? `/${withoutEdges}/` : "/";
}

export function buildPublicAssetPath(basePath: string, assetPath: string): string {
  const base = normalizeBasePath(basePath);
  const cleanAssetPath = assetPath.replace(/^\/+/, "");
  return `${base}${cleanAssetPath}`;
}
