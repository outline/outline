import * as React from "react";
import { Editor } from "~/editor";
import useIdle from "~/hooks/useIdle";

export type DocumentContextValue = {
  /** The current editor instance for this document. */
  editor: Editor | null;
  /** Set the current editor instance for this document. */
  setEditor: (editor: Editor) => void;
};

const DocumentContext = React.createContext<DocumentContextValue>({
  editor: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setEditor() {},
});

export const useDocumentContext = () => React.useContext(DocumentContext);

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

export const useEditingFocus = () => {
  const { editor } = useDocumentContext();
  const isIdle = useIdle(3000, activityEvents);
  return isIdle && !!editor?.view.hasFocus();
};

export default DocumentContext;
