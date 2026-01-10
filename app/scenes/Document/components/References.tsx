import { observer } from "mobx-react";
import { useEffect, useRef, Fragment, useMemo } from "react";
import { Trans } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import type Document from "~/models/Document";
import Fade from "~/components/Fade";
import { determineSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import ReferenceListItem from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";
import type { NavigationNode } from "@shared/types";

type Props = {
  document: Document;
};

function References({ document }: Props) {
  const { documents } = useStores();
  const user = useCurrentUser();
  const location = useLocation();
  const locationSidebarContext = useLocationSidebarContext();
  const { sharedTree } = useShare();

  useEffect(() => {
    void documents.fetchBacklinks(document.id);
  }, [documents, document.id]);

  // The sharedTree is the entire document tree starting at the shared document
  // we must filter down the tree to only the part with the document we're
  // currently viewing
  const children = useMemo(() => {
    let result: NavigationNode[];

    function findChildren(node?: NavigationNode) {
      if (!node) {
        return;
      }

      if (node.id === document.id) {
        result = node.children;
      } else {
        node.children.forEach((node) => {
          if (result) {
            return;
          }

          findChildren(node);
        });
      }

      return result;
    }

    return sharedTree ? findChildren(sharedTree) || [] : document.children;
  }, [document.id, sharedTree]);

  const backlinks = document.backlinks;
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const shouldFade = useRef(!showBacklinks && !showChildDocuments);
  const isBacklinksTab = location.hash === "#backlinks" || !showChildDocuments;
  const height = Math.max(backlinks.length, children.length) * 40;
  const Component = shouldFade.current ? Fade : Fragment;

  return showBacklinks || showChildDocuments ? (
    <Component>
      <Tabs>
        {showChildDocuments && (
          <Tab
            to={{
              hash: "#children",
              state: { sidebarContext: locationSidebarContext },
            }}
            isActive={() => !isBacklinksTab}
          >
            <Trans>Documents</Trans>
          </Tab>
        )}
        {showBacklinks && (
          <Tab
            to={{
              hash: "#backlinks",
              state: { sidebarContext: locationSidebarContext },
            }}
            isActive={() => isBacklinksTab}
          >
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
                sidebarContext={determineSidebarContext({
                  document: backlinkedDocument,
                  user,
                  currentContext: locationSidebarContext,
                })}
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
                  sidebarContext={locationSidebarContext}
                />
              );
            })}
          </List>
        )}
      </Content>
    </Component>
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
