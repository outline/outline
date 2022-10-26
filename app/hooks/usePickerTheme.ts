import useStores from "~/hooks/useStores";

/**
 * React hook to derive picker's theme from UI theme
 *
 * @returns {string} Theme to use for picker
 */
export default function usePickerTheme(): string {
  const { ui } = useStores();
  const { theme } = ui;

  if (theme === "system") {
    return "auto";
  }

  return theme;
}
