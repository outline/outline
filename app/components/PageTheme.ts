import { useEffect } from "react";
import { useTheme } from "styled-components";
import { light } from "@shared/styles/theme";

/**
 * Synchronizes browser page colors with the active application theme.
 *
 * @returns null.
 */
export default function PageTheme() {
  const theme = useTheme();
  const { background, isDark } = theme;

  useEffect(() => {
    // theme-color adjusts the browser chrome for installed PWAs
    const themeElements = document.querySelectorAll('meta[name="theme-color"]');

    // color-scheme controls user-agent controls, scrollbars and the page canvas
    const colorSchemeElement = document.querySelector(
      'meta[name="color-scheme"]'
    );

    const applyTheme = (background: string, isDark: boolean) => {
      // wider page background beyond the React root
      if (document.body) {
        document.body.style.background = background;
      }
      themeElements.forEach((element) => {
        element.setAttribute("content", background);
      });
      colorSchemeElement?.setAttribute("content", isDark ? "dark" : "light");
    };

    applyTheme(background, isDark);

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        applyTheme(light.background, false);
      } else {
        applyTheme(background, isDark);
      }
    };

    // Printing always uses the light theme. window.print blocks the main thread
    // so React cannot re-render in time to update the background – handle the
    // print media query synchronously and apply the light theme imperatively.
    const mediaQuery = window.matchMedia("print");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [background, isDark]);

  return null;
}
