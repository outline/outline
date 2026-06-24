import * as React from "react";
import { DocumentSelection } from "~/components/DocumentSelection";
import DocumentSelectionToolbar from "~/components/DocumentSelectionToolbar";

const DocumentSelectionContext = React.createContext<DocumentSelection | null>(
  null
);

/**
 * Retrieve the document selection for the nearest enclosing list, or null if
 * the list does not support multi-selection.
 *
 * @returns the document selection, or null.
 */
export function useDocumentSelection(): DocumentSelection | null {
  return React.useContext(DocumentSelectionContext);
}

type Props = {
  children: React.ReactNode;
};

/**
 * Provides multi-selection state to a list of documents and renders the
 * floating toolbar of bulk actions while a selection is active.
 *
 * @param props The component props.
 * @returns the provider element.
 */
export function DocumentSelectionProvider({ children }: Props) {
  const [selection] = React.useState(() => new DocumentSelection());

  return (
    <DocumentSelectionContext.Provider value={selection}>
      {children}
      <DocumentSelectionToolbar selection={selection} />
    </DocumentSelectionContext.Provider>
  );
}
