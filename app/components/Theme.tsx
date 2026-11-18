import { DirectionProvider } from "@radix-ui/react-direction";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "styled-components";
import { StyleSheetProvider } from "@shared/components/StyleSheetProvider";
import GlobalStyles from "@shared/styles/globals";
import { TeamPreference, UserPreference } from "@shared/types";
import { isRTLLanguage } from "@shared/utils/rtl";
import useBuildTheme from "~/hooks/useBuildTheme";
import useStores from "~/hooks/useStores";

type Props = {
  children?: React.ReactNode;
};

const Theme: React.FC<Props> = ({ children }: Props) => {
  const { auth } = useStores();
  const { i18n } = useTranslation();
  const theme = useBuildTheme(
    auth.team?.getPreference(TeamPreference.CustomTheme) ||
      auth.config?.customTheme ||
      undefined
  );
  const direction = isRTLLanguage(i18n.language) ? "rtl" : "ltr";

  return (
    <DirectionProvider dir={direction}>
      <StyleSheetProvider>
        <ThemeProvider theme={theme}>
          <>
            <GlobalStyles
              useCursorPointer={
                // Default to showing the cursor pointer if no user is logged in (public share)
                auth.user?.getPreference(UserPreference.UseCursorPointer) ??
                true
              }
            />
            {children}
          </>
        </ThemeProvider>
      </StyleSheetProvider>
    </DirectionProvider>
  );
};

export default observer(Theme);
