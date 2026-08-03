import { useState, useCallback } from "react";
import type Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import CollectionLink from "./CollectionLink";

type Props = {
  /** The archived collection to render. */
  collection: Collection;
  /** Indentation depth of the row. */
  depth?: number;
};

export function ArchivedCollectionLink({ collection, depth = 0 }: Props) {
  const { documents } = useStores();
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
    <CollectionLink
      depth={depth}
      collection={collection}
      expanded={expanded}
      activeDocument={documents.active}
      onDisclosureClick={handleDisclosureClick}
      onClick={handleClick}
    />
  );
}
