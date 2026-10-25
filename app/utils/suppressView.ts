import history from "~/utils/history";

/** The query parameter that prevents a document view from being recorded. */
const param = "suppressView";

/**
 * Returns a path to a document that will not record a view when opened, so
 * that reviewing activity does not change it.
 *
 * @param path the frontend path to the document.
 * @returns the path with the parameter appended.
 */
export function suppressView(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${param}=true`;
}

/**
 * Whether the current location asks for a document view not to be recorded.
 *
 * @returns true if the parameter is present.
 */
export function shouldSuppressView(): boolean {
  return new URLSearchParams(history.location.search).has(param);
}

/**
 * Removes the parameter from the current location, so that copying the URL
 * does not prevent views from being recorded for others.
 */
export function clearSuppressView() {
  const params = new URLSearchParams(history.location.search);
  if (!params.has(param)) {
    return;
  }

  params.delete(param);
  history.replace({
    ...history.location,
    search: params.toString(),
  });
}
