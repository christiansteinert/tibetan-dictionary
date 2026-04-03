/**
 * Global type definitions used throughout the application.
 */

/** Supported languages in the dictionary */
export type Language = 'tib' | 'en' | 'skt';

/**
 * Map a frontend Language code to the backend 'lang' query-parameter value.
 * Frontend: 'tib' | 'en' | 'skt'
 * Backend:  'bo'  | 'en' | 'sa'
 */
export function langToBackend(lang: Language): string {
  if (lang === 'en') return 'en';
  if (lang === 'skt') return 'sa';
  return 'bo';
}
