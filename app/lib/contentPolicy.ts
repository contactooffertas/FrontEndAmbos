// app/lib/contentPolicy.ts
// Filtro de texto público del cliente. El backend aplica la misma regla,
// por lo que esta validación mejora la UX pero no es la única defensa.

const FORBIDDEN_PATTERNS = [
  /\bviolacion(?:es)?\b/,
  /\basesinato(?:s)?\b/,
  /\basesin[oa]s?\b/,
  /\bput[oa]s?\b/,
  /\bhijo\s+de\s+mil\s+puta\b/,
  /\bcojer\b/,
  /\bcoger\b/,
  /\bcojiendo\b/,
  /\bcogiendo\b/,
  /\banal\b/,
  /\bcagar\b/,
  /\bdroga(?:s)?\b/,
  /\bporro(?:s)?\b/,
  /\bfaso(?:s)?\b/,
  /\bcocaina\b/,
  /\bprostitucion\b/,
  /\bprostitut[oa]s?\b/,
  /\bborracho(?:s)?\b/,
];

export function normalizePublicText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsForbiddenContent(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => {
    const normalized = normalizePublicText(value || "").replace(/\bpalo\s+borracho\b/g, " ");
    return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(normalized));
  });
}
