import includes from "lodash/includes";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationNode } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Icon from "~/components/Icon";
import useStores from "~/hooks/useStores";
import { sharedDocumentPath } from "~/utils/routeHelpers";
import { descendants } from "~/utils/tree";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  collection?: Collection;
  activeDocumentId?: string;
  activeDocument?: Document;
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

  React.useEffect(() => {
    if (showChildren) {
      setExpanded(showChildren);
    }
  }, [showChildren]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
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

  const title =
    (activeDocument?.id === node.id ? activeDocument.title : node.title) ||
    t("Untitled");

  return (
    <>
      <SidebarLink
        to={{
          pathname: sharedDocumentPath(shareId, node.url),
          state: {
            title: node.title,
          },
        }}
        expanded={hasChildDocuments && depth !== 0 ? expanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        icon={node.icon && <Icon value={node.icon} color={node.color} />}
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
          <ObservedDocumentLink
            shareId={shareId}
            key={childNode.id}
            collection={collection}
            node={childNode}
            activeDocumentId={activeDocumentId}
            activeDocument={activeDocument}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            index={index}
            parentId={node.id}
          />
        ))}
    </>
  );
}

const ObservedDocumentLink = observer(React.forwardRef(DocumentLink));

export default ObservedDocumentLink;
