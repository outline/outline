import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { NavigationNode } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import useStores from "~/hooks/useStores";
import { sharedDocumentPath } from "~/utils/routeHelpers";
import Disclosure from "./Disclosure";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  collection?: Collection;
  activeDocumentId: string | undefined;
  activeDocument: Document | undefined;
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
    () => !!hasChildDocuments,
    [hasChildDocuments]
  );

  const [expanded, setExpanded] = React.useState(showChildren);

  React.useEffect(() => {
    if (showChildren) {
      setExpanded(showChildren);
    }
  }, [showChildren]);

  React.useEffect(() => {
    if (isActiveDocument) {
      setExpanded(true);
    }
  }, [isActiveDocument]);

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
        label={
          <>
            {hasChildDocuments && depth !== 0 && (
              <Disclosure expanded={expanded} onClick={handleDisclosureClick} />
            )}
            {title}
          </>
        }
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
