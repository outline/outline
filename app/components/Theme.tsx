import { DirectionProvider } from "@radix-ui/react-direction";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "styled-components";
import GlobalStyles from "@shared/styles/globals";
import { TeamPreference, UserPreference } from "@shared/types";
import { isRTLLanguage } from "@shared/utils/rtl";
import useBuildTheme from "~/hooks/useBuildTheme";
import useStores from "~/hooks/useStores";

type Props = {
  children?: React.ReactNode;
};

const Theme: React.FC = ({ children }: Props) => {
  const { auth, ui } = useStores();
  const { i18n } = useTranslation();
  const theme = useBuildTheme(
    auth.team?.getPreference(TeamPreference.CustomTheme) ||
      auth.config?.customTheme ||
      undefined
  );
  const direction = isRTLLanguage(i18n.language) ? "rtl" : "ltr";

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { isDark: ui.resolvedTheme === "dark" },
      })
    );
  }, [ui.resolvedTheme]);

  return (
    <DirectionProvider dir={direction}>
      <ThemeProvider theme={theme}>
        <>
          <GlobalStyles
            useCursorPointer={
              // Default to showing the cursor pointer if no user is logged in (public share)
              auth.user?.getPreference(UserPreference.UseCursorPointer) ?? true
            }
          />
          {children}
        </>
      </ThemeProvider>
    </DirectionProvider>
  );
};

export default observer(Theme);
