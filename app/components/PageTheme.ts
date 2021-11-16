import * as React from "react";
import { useTheme } from "styled-components";
import useStores from "hooks/useStores";

export default function PageTheme() {
  const { ui } = useStores();
  const theme = useTheme();
  React.useEffect(() => {
    // wider page background beyond the React root
    if (document.body) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'background' does not exist on type 'Defa... Remove this comment to see the full error message
      document.body.style.background = theme.background;
    }

    // theme-color adjusts the title bar color for desktop PWA
    const themeElement = document.querySelector('meta[name="theme-color"]');

    if (themeElement) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'background' does not exist on type 'Defa... Remove this comment to see the full error message
      themeElement.setAttribute("content", theme.background);
    }

    // user-agent controls and scrollbars
    const csElement = document.querySelector('meta[name="color-scheme"]');

    if (csElement) {
      csElement.setAttribute("content", ui.resolvedTheme);
    }
  }, [theme, ui.resolvedTheme]);
  return null;
}
