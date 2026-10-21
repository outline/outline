import { observer } from "mobx-react";
import { Toaster, type ToasterProps } from "sonner";
import styled, { useTheme } from "styled-components";
import useStores from "~/hooks/useStores";
import type { ResolvedTheme } from "~/stores/UiStore";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();

  return (
    <StyledToaster
      resolvedTheme={ui.resolvedTheme as ResolvedTheme}
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

// styled-components reserves the `theme` prop, so it is passed under another name.
function ThemedToaster({
  resolvedTheme,
  ...rest
}: Omit<ToasterProps, "theme"> & { resolvedTheme: ResolvedTheme }) {
  return <Toaster {...rest} theme={resolvedTheme} />;
}

const StyledToaster = styled(ThemedToaster)`
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
