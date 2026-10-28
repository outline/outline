/** The query parameter that prevents a document view from being recorded. */
export const SuppressViewParam = "suppressView";

/**
 * Returns a path to a document that will not record a view when opened, so
 * that reviewing activity does not change it.
 *
 * @param path the frontend path to the document.
 * @returns the path with the parameter appended.
 */
export function suppressView(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${SuppressViewParam}=true`;
}
