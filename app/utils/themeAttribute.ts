/**
 * Records the theme in use on the root element.
 *
 * Outline's theme lives in JavaScript, handed to styled-components. Anything
 * styled in plain CSS – the Tailwind utility classes the pet store pages are
 * built from – has no way to see it, so it stays on its light-mode palette and
 * turns unreadable. This puts the choice somewhere CSS can match on.
 *
 * @param theme the resolved theme, either "dark" or "light".
 */
export function applyThemeAttribute(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
}
