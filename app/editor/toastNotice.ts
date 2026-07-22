import { toast } from "sonner";
import type { EditorNotice } from "@shared/editor/types";

/**
 * The default editor notice handler, rendering a toast. This keeps knowledge of
 * the toast library at the application layer, out of shared editor code.
 *
 * @param message - the message to display.
 * @param type - the severity of the notice.
 */
export const toastNotice: EditorNotice = (message, type = "info") => {
  switch (type) {
    case "error":
      toast.error(message);
      return;
    case "success":
      toast.success(message);
      return;
    case "warning":
      toast.warning(message);
      return;
    default:
      toast.message(message);
  }
};
