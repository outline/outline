import { useNoteContext } from "~/components/NoteContext";
import useIdle from "./useIdle";
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
export default function useEditingFocus() {
  const { editor } = useNoteContext();
  const isIdle = useIdle(3000, activityEvents);
  return isIdle && !!editor?.view.hasFocus();
}
