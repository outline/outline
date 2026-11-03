import { useDocumentContext } from "~/components/DocumentContext";
import useIdle from "./useIdle";
import useMobile from "./useMobile";

const activityEvents = [
  "click",
  "mousemove",
  "DOMMouseScroll",
  "mousewheel",
  "mousedown",
  "touchstart",
  "touchmove",
  "focus",
];

/**
 * Hook to detect when the user is focused on editing, so that surrounding UI
 * can be hidden. Always false on mobile, where the header stays visible.
 *
 * @returns true if the editor has focus and the user is otherwise idle.
 */
export default function useEditingFocus() {
  const { editor } = useDocumentContext();
  const isMobile = useMobile();
  const isIdle = useIdle(3000, activityEvents);
  return !isMobile && isIdle && !!editor?.view.hasFocus();
}
