/**
 * Universal Input Sanitizer & PostgREST/SQL Filter Injection Defense
 * Neutralizes XSS, malicious HTML tags, control sequences, and PostgREST AST manipulation.
 */

/**
 * Strips HTML tags, script payloads, javascript: protocols, and event handlers.
 * Preserves normal Arabic, French, numbers, spaces, and standard punctuation.
 */
export function sanitizePlainText(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (!str) return '';

  return str
    // Strip HTML/XML tags
    .replace(/<\/?[^>]+(>|$)/gi, '')
    // Strip javascript: or vbscript: or data: URIs
    .replace(/(javascript|vbscript|data):/gi, '')
    // Strip dangerous event handler fragments (e.g. onerror=, onload=)
    .replace(/\b(on[a-z]+)\s*=/gi, '')
    // Strip null bytes and non-printable control characters (except newline \n and tab \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitizes input values for interpolation into PostgREST .or() or .filter() expressions.
 * Strips operators, commas, parentheses, colons, and semicolons that alter the PostgREST AST.
 */
export function sanitizePostgrestValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (!str) return '';

  // Strip characters that break PostgREST condition delimiters
  return str
    .replace(/[\(\),\\\/\.\:\;\*\?\!\<\>\=\~"\'\\$\{\}]/g, '')
    .trim();
}

/**
 * Sanitizes search terms for PostgREST .ilike queries.
 * Escapes wildcards (% and _) and strips PostgREST delimiters.
 */
export function sanitizeIlikePattern(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (!str) return '';

  // 1. Strip structural PostgREST control characters
  const clean = str.replace(/[\(\),\\\/\.\:\;\*\?\!\<\>\=\~"\'\\$\{\}]/g, '').trim();

  // 2. Escape SQL/PostgREST wildcards so user cannot inject arbitrary wildcard matches
  return clean.replace(/[%_]/g, '\\$&');
}

/**
 * Deep sanitization for nested JSON objects or arrays.
 * Traverses object trees and cleans string values.
 */
export function deepSanitizeObject<T = any>(data: T, allowedKeys?: string[]): T {
  if (data == null) return data;
  if (typeof data === 'string') {
    return sanitizePlainText(data) as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => deepSanitizeObject(item, allowedKeys)) as any;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      // If whitelist provided, reject keys not in whitelist
      if (allowedKeys && !allowedKeys.includes(key)) {
        continue;
      }
      cleanObj[key] = deepSanitizeObject(val);
    }
    return cleanObj as any;
  }
  return data;
}
