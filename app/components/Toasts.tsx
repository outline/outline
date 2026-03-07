import { observer } from "mobx-react";
import * as React from "react";
import { Toaster, useSonner } from "sonner";
import styled, { useTheme } from "styled-components";
import { useWebHaptics } from "web-haptics/react";
import useStores from "~/hooks/useStores";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();
  const { toasts } = useSonner();
  const { trigger } = useWebHaptics();
  const prevCountRef = React.useRef(toasts.length);

  React.useEffect(() => {
    if (toasts.length > prevCountRef.current) {
      const latest = toasts[toasts.length - 1];
      if (latest.type === "error") {
        void trigger("error");
      } else if (latest.type === "success") {
        void trigger("success");
      }
    }
    prevCountRef.current = toasts.length;
  }, [toasts, trigger]);

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
