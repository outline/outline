// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import { useLocation } from "react-router-dom";
import CollectionsStore from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import Document from "models/Document";
import Fade from "components/Fade";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import ReferenceListItem from "./ReferenceListItem";
import useStores from "hooks/useStores";

type Props = {
  document: Document,
  documents: DocumentsStore,
  collections: CollectionsStore,
};

function References({ document }: Props) {
  const { collections, documents } = useStores();
  const location = useLocation();

  React.useEffect(() => {
    documents.fetchBacklinks(document.id);
  }, [documents, document.id]);

  const backlinks = documents.getBacklinedDocuments(document.id);
  const collection = collections.get(document.collectionId);
  const children = collection
    ? collection.getDocumentChildren(document.id)
    : [];

  const showBacklinks = !!backlinks.length;
  const showNestedDocuments = !!children.length;
  const isBacklinksTab = location.hash === "#backlinks" || !showNestedDocuments;

  return (
    (showBacklinks || showNestedDocuments) && (
      <Fade>
        <Tabs>
          {showNestedDocuments && (
            <Tab to="#children" isActive={() => !isBacklinksTab}>
              <Trans>Nested documents</Trans>
            </Tab>
          )}
          {showBacklinks && (
            <Tab to="#backlinks" isActive={() => isBacklinksTab}>
              <Trans>Referenced by</Trans>
            </Tab>
          )}
        </Tabs>
        {isBacklinksTab
          ? backlinks.map((backlinkedDocument) => (
              <ReferenceListItem
                anchor={document.urlId}
                key={backlinkedDocument.id}
                document={backlinkedDocument}
                showCollection={
                  backlinkedDocument.collectionId !== document.collectionId
                }
              />
            ))
          : children.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const document = documents.get(node.id);
              return (
                <ReferenceListItem
                  key={node.id}
                  document={document || node}
                  showCollection={false}
                />
              );
            })}
      </Fade>
    )
  );
}

export default observer(References);
