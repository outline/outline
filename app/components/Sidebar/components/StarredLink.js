// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import useStores from "../../../hooks/useStores";
import Disclosure from "./Disclosure";
import SidebarLink from "./SidebarLink";

type Props = {|
  depth: number,
  title: string,
  to: string,
  documentId: string,
  collectionId: string,
|};

function StarredLink({ depth, title, to, documentId, collectionId }: Props) {
  const { collections } = useStores();
  const [collection, setCollection] = useState(() =>
    collections.get(collectionId)
  );
  const [expanded, setExpanded] = useState(false);

  const childDocuments = collection
    ? collection.getDocumentChildren(documentId)
    : [];

  const hasChildDocuments = childDocuments.length > 0;

  useEffect(() => {
    async function load() {
      if (!collection) {
        const fetchedCollection = await collections.fetch(collectionId);
        setCollection(fetchedCollection);
      }
    }
    load();
  }, [collection, collectionId, collections]);

  const handleDisclosureClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

  const showChildDocuments = childDocuments.map((childDocument) => (
    <ObserveredStarredLink
      key={childDocument.id}
      depth={depth + 1}
      title={childDocument.title}
      to={childDocument.url}
      documentId={childDocument.id}
      collectionId={collectionId}
    />
  ));

  return (
    <>
      <SidebarLink
        depth={hasChildDocuments ? depth : depth - 1}
        to={to}
        label={
          <>
            {hasChildDocuments && (
              <Disclosure expanded={expanded} onClick={handleDisclosureClick} />
            )}
            {title}
          </>
        }
        exact={false}
      />
      {hasChildDocuments && expanded && showChildDocuments}
    </>
  );
}

const ObserveredStarredLink = observer(StarredLink);

export default ObserveredStarredLink;
