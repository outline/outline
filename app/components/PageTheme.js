// @flow
import * as React from "react";
import { useTheme } from "styled-components";
import useStores from "hooks/useStores";

export default function PageTheme() {
  const { ui } = useStores();
  const theme = useTheme();

  React.useEffect(() => {
    // wider page background beyond the React root
    if (document.body) {
      document.body.style.background = theme.background;
    }

    // theme-color adjusts the title bar color for desktop PWA
    const themeElement = document.querySelector('meta[name="theme-color"]');
    if (themeElement) {
      themeElement.setAttribute("content", theme.background);
    }

    // status bar color for iOS PWA
    const statusElement = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (statusElement) {
      statusElement.setAttribute(
        "content",
        ui.resolvedTheme === "dark" ? "black-translucent" : "default"
      );
    }
  }, [theme, ui.resolvedTheme]);

  return null;
}
