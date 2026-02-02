import { observer } from "mobx-react";
import { Toaster } from "sonner";
import styled, { useTheme } from "styled-components";
import useStores from "~/hooks/useStores";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();
  const toastTheme: "light" | "dark" =
    ui.resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ToasterWrapper>
      <Toaster
        theme={toastTheme}
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
    </ToasterWrapper>
  );
}

const ToasterWrapper = styled.div`
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
