import * as React from "react";
import { Editor } from "~/editor";

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

export default DocumentContext;
