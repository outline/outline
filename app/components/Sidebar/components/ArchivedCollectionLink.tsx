import { useState, useCallback } from "react";
import Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import CollectionLink from "./CollectionLink";
import CollectionLinkChildren from "./CollectionLinkChildren";
import Relative from "./Relative";

type Props = {
  collection: Collection;
  depth?: number;
};

export function ArchivedCollectionLink({ collection, depth }: Props) {
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
    <>
      <CollectionLink
        depth={depth ? depth : 0}
        collection={collection}
        expanded={expanded}
        activeDocument={documents.active}
        onDisclosureClick={handleDisclosureClick}
        onClick={handleClick}
      />
      <Relative>
        <CollectionLinkChildren
          collection={collection}
          expanded={expanded}
          prefetchDocument={documents.prefetchDocument}
        />
      </Relative>
    </>
  );
}
