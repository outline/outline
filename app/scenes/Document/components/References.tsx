import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
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
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const children = collection
    ? collection.getDocumentChildren(document.id)
    : [];
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const isBacklinksTab = location.hash === "#backlinks" || !showChildDocuments;
  const height = Math.max(backlinks.length, children.length) * 40;

  return showBacklinks || showChildDocuments ? (
    <Fade>
      <Tabs>
        {showChildDocuments && (
          <Tab to="#children" isActive={() => !isBacklinksTab}>
            <Trans>Documents</Trans>
          </Tab>
        )}
        {showBacklinks && (
          <Tab to="#backlinks" isActive={() => isBacklinksTab}>
            <Trans>Backlinks</Trans>
          </Tab>
        )}
      </Tabs>
      <Content style={{ height }}>
        {showBacklinks && (
          <List $active={isBacklinksTab}>
            {backlinks.map((backlinkedDocument) => (
              <ReferenceListItem
                anchor={document.urlId}
                key={backlinkedDocument.id}
                document={backlinkedDocument}
                showCollection={
                  backlinkedDocument.collectionId !== document.collectionId
                }
              />
            ))}
          </List>
        )}
        {showChildDocuments && (
          <List $active={!isBacklinksTab}>
            {children.map((node) => {
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
          </List>
        )}
      </Content>
    </Fade>
  ) : null;
}

const Content = styled.div`
  position: relative;
`;

const List = styled.div<{ $active: boolean }>`
  visibility: ${({ $active }) => ($active ? "visible" : "hidden")};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
`;

export default observer(References);
