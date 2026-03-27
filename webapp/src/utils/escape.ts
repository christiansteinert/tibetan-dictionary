/**
 * Encode a query-parameter value using `%20` for spaces instead of `+`.
 *
 * @param value - The raw string to encode (e.g. a search query)
 * @returns The percent-encoded string with spaces as `%20`
 */
export function encodeQueryParam(value: string): string {
  var result = encodeURIComponent(value);
  result = result .replace(/\+/g, '%20');
  return result;
}
