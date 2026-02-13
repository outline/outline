import includes from "lodash/includes";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";
import { sharedModelPath } from "~/utils/routeHelpers";
import { descendants } from "@shared/utils/tree";
import SidebarDisclosureContext, {
  useSidebarDisclosure,
  useSidebarDisclosureState,
} from "./SidebarDisclosureContext";
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

  const isActiveDocument = activeDocumentId === node.id;

  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const showChildren = React.useMemo(
    () =>
      !!(
        hasChildDocuments &&
        ((activeDocumentId &&
          includes(
            descendants(node).map((n) => n.id),
            activeDocumentId
          )) ||
          isActiveDocument ||
          depth <= 1)
      ),
    [hasChildDocuments, activeDocumentId, isActiveDocument, depth, node]
  );

  const [expanded, setExpanded] = React.useState(showChildren);

  const { event: disclosureEvent, onDisclosureClick } =
    useSidebarDisclosureState();

  const handleExpand = React.useCallback(() => setExpanded(true), []);
  const handleCollapse = React.useCallback(() => setExpanded(false), []);

  useSidebarDisclosure(handleExpand, handleCollapse);

  React.useEffect(() => {
    if (showChildren) {
      setExpanded(showChildren);
    }
  }, [showChildren]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const willExpand = !expanded;
      setExpanded(willExpand);
      const altKey = "altKey" in ev && (ev as React.MouseEvent).altKey;
      onDisclosureClick(willExpand, !!altKey);
    },
    [expanded, onDisclosureClick]
  );

  // since we don't have access to the collection sort here, we just put any
  // drafts at the front of the list. this is slightly inconsistent with the
  // logged-in behavior, but it's probably better to emphasize the draft state
  // of the document in a shared context
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
      <SidebarDisclosureContext.Provider value={disclosureEvent}>
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
      </SidebarDisclosureContext.Provider>
    </>
  );
}

export const SharedDocumentLink = observer(React.forwardRef(DocumentLink));
