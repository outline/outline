import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import { useSidebarExpansion } from "./SidebarExpansionContext";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  collection?: Collection;
  activeDocumentId?: string;
  activeDocument?: Document;
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  shareId: string;
  parentId?: string;
};

function DocumentLink(
  {
    node,
    collection,
    activeDocument,
    activeDocumentId,
    prefetchDocument,
    isDraft,
    depth,
    shareId,
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const expansion = useSidebarExpansion();

  const isActiveDocument = activeDocumentId === node.id;

  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);

  // Auto-expand top-level nodes (depth <= 1) on initial render
  React.useEffect(() => {
    if (hasChildDocuments && depth <= 1 && !expansion.isExpanded(node.id)) {
      expansion.expand(node.id);
    }
  }, [expansion, node.id, hasChildDocuments, depth]);

  const expanded = expansion.isExpanded(node.id);

  const handleDisclosureClick = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (expanded) {
        const altKey = "altKey" in ev && (ev as React.MouseEvent).altKey;
        if (altKey) {
          expansion.collapseDescendants(node);
        } else {
          expansion.collapse(node.id);
        }
      } else {
        const altKey = "altKey" in ev && (ev as React.MouseEvent).altKey;
        if (altKey) {
          expansion.expandDescendants(node);
        } else {
          expansion.expand(node.id);
        }
      }
    },
    [expanded, expansion, node]
  );

  const nodeChildren = React.useMemo(() => {
    if (
      activeDocument?.isDraft &&
      activeDocument?.isActive &&
      activeDocument?.parentDocumentId === node.id
    ) {
      return [activeDocument?.asNavigationNode, ...node.children];
    }

    return node.children;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    node,
  ]);

  const handlePrefetch = React.useCallback(() => {
    void prefetchDocument?.(node.id);
  }, [prefetchDocument, node]);

  const title =
    (activeDocument?.id === node.id ? activeDocument.title : node.title) ||
    t("Untitled");

  const icon = node.icon ?? node.emoji;
  const initial = title ? title.charAt(0).toUpperCase() : "?";

  return (
    <>
      <SidebarLink
        to={{
          pathname: sharedModelPath(shareId, node.url),
          state: {
            title: node.title,
          },
        }}
        expanded={hasChildDocuments && depth !== 0 ? expanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        onClickIntent={handlePrefetch}
        icon={
          icon && <Icon value={icon} color={node.color} initial={initial} />
        }
        label={title}
        depth={depth}
        exact={false}
        scrollIntoViewIfNeeded={!document?.isStarred}
        isDraft={isDraft}
        ref={ref}
        isActive={() => !!isActiveDocument}
      />
      {expanded &&
        nodeChildren.map((childNode, index) => (
          <SharedDocumentLink
            shareId={shareId}
            key={childNode.id}
            collection={collection}
            node={childNode}
            activeDocumentId={activeDocumentId}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            index={index}
            parentId={node.id}
          />
        ))}
    </>
  );
}

export const SharedDocumentLink = observer(React.forwardRef(DocumentLink));
