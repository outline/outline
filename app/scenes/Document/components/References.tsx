import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import { useLocation } from "react-router-dom";
import Document from "~/models/Document";
import Fade from "~/components/Fade";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useStores from "~/hooks/useStores";
import ReferenceListItem from "./ReferenceListItem";

type Props = {
  document: Document;
};

function References({ document }: Props) {
  const { collections, documents } = useStores();
  const location = useLocation();

  React.useEffect(() => {
    documents.fetchBacklinks(document.id);
  }, [documents, document.id]);

  const backlinks = documents.getBacklinkedDocuments(document.id);
  const collection = collections.get(document.collectionId);
  const children = collection
    ? collection.getDocumentChildren(document.id)
    : [];
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const isBacklinksTab = location.hash === "#backlinks" || !showChildDocuments;

  return showBacklinks || showChildDocuments ? (
    <Fade>
      <Tabs>
        {showChildDocuments && (
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
  ) : null;
}

export default observer(References);
