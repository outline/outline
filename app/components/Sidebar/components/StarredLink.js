// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import Fade from "components/Fade";
import useStores from "../../../hooks/useStores";
import Disclosure from "./Disclosure";
import SidebarLink from "./SidebarLink";
import useBoolean from "hooks/useBoolean";
import DocumentMenu from "menus/DocumentMenu";

const style = { position: "relative" };

type Props = {|
  depth: number,
  title: string,
  to: string,
  documentId: string,
  collectionId: string,
|};

function StarredLink({ depth, title, to, documentId, collectionId }: Props) {
  const { collections, documents } = useStores();
  const [collection, setCollection] = useState(() =>
    collections.get(collectionId)
  );
  const [document, setDocument] = useState(() => documents.get(documentId));
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();

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
      if (!document) {
        const fetchDocument = await documents.fetch(documentId);
        setDocument(fetchDocument);
      }
    }
    load();
  }, [collection, collectionId, collections, document, documentId, documents]);

  const handleDisclosureClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

  return (
    <>
      <div style={style}>
        <SidebarLink
          depth={depth}
          to={to}
          label={
            <>
              {hasChildDocuments && (
                <Disclosure
                  expanded={expanded}
                  onClick={handleDisclosureClick}
                />
              )}
              {title}
            </>
          }
          exact={false}
          showAction={menuOpen}
          menu={
            document ? (
              <Fade>
                <DocumentMenu
                  document={document}
                  onOpen={handleMenuOpen}
                  onClose={handleMenuClose}
                />
              </Fade>
            ) : undefined
          }
        />
      </div>
      {expanded &&
        childDocuments.map((childDocument) => (
          <ObserveredStarredLink
            key={childDocument.id}
            depth={depth + 1}
            title={childDocument.title}
            to={childDocument.url}
            documentId={childDocument.id}
            collectionId={collectionId}
          />
        ))}
    </>
  );
}

const ObserveredStarredLink = observer(StarredLink);

export default ObserveredStarredLink;
