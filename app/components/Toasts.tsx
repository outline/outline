import { observer } from "mobx-react";
import * as React from "react";
import { Toaster } from "sonner";
import styled, { useTheme } from "styled-components";
import useStores from "~/hooks/useStores";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();

  return (
    <StyledToaster
      theme={ui.resolvedTheme as any}
      closeButton
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

const StyledToaster = styled(Toaster)`
  [data-close-button] {
    cursor: var(--pointer);
    opacity: 0;
  }

  [data-sonner-toast][data-expanded="true"] {
    [data-close-button] {
      opacity: 1;
    }
  }
`;

export default observer(Toasts);
