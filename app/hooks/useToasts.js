// @flow
import { useCallback } from "react";
import useStores from "./useStores";

export default function useToasts() {
  const { toasts } = useStores();

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
      if (toasts) {
        toasts.showToast(message, options);
      }
    },
    [toasts]
  );

  const hideToast = useCallback(
    (toastId: string) => {
      toasts.removeToast(toastId);
    },
    [toasts]
  );

  return { showToast, hideToast };
}
