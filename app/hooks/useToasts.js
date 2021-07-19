// @flow
import { useCallback } from "react";
import useStores from "./useStores";
import type { ToastOptions } from "types";

export default function useToasts() {
  const { toasts } = useStores();

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      if (toasts) {
        return toasts.showToast(message, options);
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
