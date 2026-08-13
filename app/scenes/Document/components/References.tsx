import { observer } from "mobx-react";
import { useEffect, useRef, Fragment, useMemo, useState } from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import type Document from "~/models/Document";
import Fade from "~/components/Fade";
import { determineSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import usePolicy from "~/hooks/usePolicy";
import ReferenceListItem, {
  NewChildReferenceListItem,
} from "./ReferenceListItem";
import useShare from "@shared/hooks/useShare";
import type { NavigationNode } from "@shared/types";
import { flattenTree } from "@shared/utils/tree";

type Props = {
  document: Document;
};

type TabType = "children" | "backlinks";

function References({ document }: Props) {
  const { documents } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const locationSidebarContext = useLocationSidebarContext();
  const { sharedTree, isShare } = useShare();
  const [activeTab, setActiveTab] = useState<TabType>("children");
  const isJustCreated = useMemo(
    () => document.isJustCreated,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [document.id]
  );

  useEffect(() => {
    if (!isShare && !isJustCreated) {
      void documents.fetchRelationships(document.id);
    }
  }, [isShare, documents, document.id, isJustCreated]);

  const children = useChildren(document, sharedTree);
  const backlinks = useBacklinks(document, sharedTree);
  const can = usePolicy(document);
  const showBacklinks = !!backlinks.length;
  const showChildDocuments = !!children.length;
  const showNewChildDocument =
    showChildDocuments && !isShare && !!can.createChildDocument;
  const shouldFade = useRef(!showBacklinks && !showChildDocuments);
  const isBacklinksTab = activeTab === "backlinks" || !showChildDocuments;
  const height =
    Math.max(
      backlinks.length,
      children.length + (showNewChildDocument ? 1 : 0)
    ) * 40;
  const Component = shouldFade.current ? Fade : Fragment;

  return showBacklinks || showChildDocuments ? (
    <Component>
      <Tabs>
        {showChildDocuments && (
          <Tab
            active={!isBacklinksTab}
            onClick={() => setActiveTab("children")}
          >
            <Trans>Documents</Trans>
          </Tab>
        )}
        {showBacklinks && (
          <Tab
            active={isBacklinksTab}
            onClick={() => setActiveTab("backlinks")}
          >
            <Trans>Backlinks</Trans>
          </Tab>
        )}
      </Tabs>
      <Content style={{ height }}>
        {showBacklinks && (
          <List $active={isBacklinksTab}>
            {backlinks.map((node) => {
              // If we have the document in the store already then use it to get the extra
              // contextual info, otherwise the collection node will do (only has title and id)
              const backlinkedDocument = documents.get(node.id);
              return (
                <ReferenceListItem
                  anchor={backlinkedDocument?.urlId}
                  key={node.id}
                  document={backlinkedDocument || node}
                  showCollection={
                    backlinkedDocument?.collectionId !== document.collectionId
                  }
                  sidebarContext={
                    user && backlinkedDocument
                      ? determineSidebarContext({
                          document: backlinkedDocument,
                          user,
                          currentContext: locationSidebarContext,
                        })
                      : undefined
                  }
                />
              );
            })}
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
            {showNewChildDocument && (
              <NewChildReferenceListItem
                parentDocumentId={document.id}
                sidebarContext={locationSidebarContext}
              />
            )}
          </List>
        )}
      </Content>
    </Component>
  ) : null;
}

/**
 * Hook to get the children of a document, filtering from the shared tree if available.
 *
 * @param document - the document to get children for.
 * @param sharedTree - the shared tree to filter from, if available.
 * @returns the children of the document.
 */
function useChildren(
  document: Document,
  sharedTree: NavigationNode | undefined
): NavigationNode[] {
  return useMemo(() => {
    if (!sharedTree) {
      return document.children;
    }

    function findChildren(node: NavigationNode): NavigationNode[] | undefined {
      if (node.id === document.id) {
        return node.children;
      }

      for (const child of node.children) {
        const result = findChildren(child);
        if (result) {
          return result;
        }
      }

      return undefined;
    }

    return findChildren(sharedTree) || [];
  }, [document.id, document.children, sharedTree]);
}

/**
 * Hook to get backlinks for a document, filtering from the shared tree if available.
 *
 * @param document - the document to get backlinks for.
 * @returns documents that link to this document.
 */
function useBacklinks(
  document: Document,
  sharedTree: NavigationNode | undefined
): Document[] {
  if (sharedTree) {
    return flattenTree(sharedTree).filter((node) =>
      document.backlinkIds?.includes(node.id)
    ) as Document[];
  }
  return document.backlinks;
}

const Content = styled.div`
  position: relative;
`;

const List = styled.ul<{ $active: boolean }>`
  visibility: ${({ $active }) => ($active ? "visible" : "hidden")};
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0;
`;

export default observer(References);
