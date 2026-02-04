import { useEffect } from "react";
import { useDocumentContext } from "~/components/DocumentContext";
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
  const { editor } = useDocumentContext();
  const isIdle = useIdle(3000, activityEvents);
  const isEditingFocus = isIdle && !!editor?.view.hasFocus();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : "64px"
    );
  }, [isEditingFocus]);

  return isEditingFocus;
}
