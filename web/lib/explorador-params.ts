/** Parse repeated `line` / `fund` search params, keeping only allowed values. */
export function parseMultiParam(
  raw: string | string[] | undefined,
  allowed: Set<string>,
): string[] {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values.filter((v) => allowed.has(v));
}
