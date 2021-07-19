// @flow
import { useCallback } from "react";
import useStores from "./useStores";

export default function useToasts() {
  const { ui } = useStores();

  const showToast = useCallback(
    (
      message: string,
      options?: {
        type: "warning" | "error" | "info" | "success",
        timeout?: number,
        action?: {
          text: string,
          onClick: () => void,
        },
      }
    ) => {
      if (ui) {
        ui.showToast(message, options);
      }
    },
    [ui]
  );

  const hideToast = useCallback(
    (toastId: string) => {
      ui.removeToast(toastId);
    },
    [ui]
  );

  return { showToast, hideToast };
}
