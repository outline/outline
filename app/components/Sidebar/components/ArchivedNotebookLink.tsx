import { useState, useCallback } from "react";
import type Notebook from "~/models/Notebook";
import useStores from "~/hooks/useStores";
import NotebookLink from "./NotebookLink";
type Props = {
  /** The archived collection to render. */
  notebook: Notebook;
  /** Indentation depth of the row. */
  depth?: number;
};
export function ArchivedNotebookLink({ notebook, depth = 0 }: Props) {
  const { notes } = useStores();
  const [expanded, setExpanded] = useState(false);
  const handleDisclosureClick = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setExpanded((e) => !e);
  }, []);
  const handleClick = useCallback(() => {
    setExpanded(true);
  }, []);
  return (
    <NotebookLink
      depth={depth}
      notebook={notebook}
      expanded={expanded}
      activeNote={notes.active}
      onDisclosureClick={handleDisclosureClick}
      onClick={handleClick}
    />
  );
}
