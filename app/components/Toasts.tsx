import { observer } from "mobx-react";
import * as React from "react";
import { Toaster } from "sonner";
import { useTheme } from "styled-components";
import useStores from "~/hooks/useStores";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();

  return (
    <Toaster
      theme={ui.resolvedTheme}
      toastOptions={{
        duration: 5000,
        style: {
          color: theme.toastText,
          background: theme.toastBackground,
          border: `1px solid ${theme.divider}`,
          fontFamily: theme.fontFamily,
          fontSize: "14px",
        },
      }}
    />
  );
}

export default observer(Toasts);
