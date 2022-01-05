import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import Disclosure from "./Disclosure";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";

type Props = {
  node: NavigationNode;
  canUpdate: boolean;
  collection?: Collection;
  activeDocument: Document | null | undefined;
  isDraft?: boolean;
  depth: number;
  index: number;
  shareId: string;
  parentId?: string;
};

function DocumentLink(
  {
    node,
    canUpdate,
    collection,
    activeDocument,
    isDraft,
    depth,
    shareId,
    index,
    parentId,
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { documents, policies } = useStores();
  const { t } = useTranslation();

  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isActiveDocument && hasChildDocuments) {
      fetchChildDocuments(node.id);
    }
  }, [fetchChildDocuments, node, hasChildDocuments, isActiveDocument]);

  const pathToNode = React.useMemo(
    () =>
      collection && collection.pathToDocument(node.id).map((entry) => entry.id),
    [collection, node]
  );

  const showChildren = React.useMemo(() => {
    return !!hasChildDocuments;
  }, [hasChildDocuments]);

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

  const handleTitleChange = React.useCallback(
    async (title: string) => {
      if (!document) return;
      await documents.update(
        {
          id: document.id,
          text: document.text,
          title,
        },
        {
          lastRevision: document.revision,
        }
      );
    },
    [documents, document]
  );

  const nodeChildren = React.useMemo(() => {
    if (
      collection &&
      activeDocument?.isDraft &&
      activeDocument?.isActive &&
      activeDocument?.parentDocumentId === node.id
    ) {
      return sortNavigationNodes(
        [activeDocument?.asNavigationNode, ...node.children],
        collection.sort
      );
    }

    return node.children;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection,
    node,
  ]);

  const handleTitleEditing = React.useCallback((isEditing: boolean) => {
    setIsEditing(isEditing);
  }, []);

  const title =
    (activeDocument?.id === node.id ? activeDocument.title : node.title) ||
    t("Untitled");

  return (
    <>
      <SidebarLink
        to={{
          pathname: `/share/${shareId}${node.url}`,
          state: {
            title: node.title,
          },
        }}
        label={
          <>
            {hasChildDocuments && (
              <Disclosure expanded={expanded} onClick={handleDisclosureClick} />
            )}
            <EditableTitle
              title={title}
              onSubmit={handleTitleChange}
              onEditing={handleTitleEditing}
              canUpdate={canUpdate}
              maxLength={MAX_TITLE_LENGTH}
            />
          </>
        }
        depth={depth}
        exact={false}
        scrollIntoViewIfNeeded={!document?.isStarred}
        isDraft={isDraft}
        ref={ref}
      />
      {expanded &&
        nodeChildren.map((childNode, index) => (
          <ObservedDocumentLink
            shareId={shareId}
            key={childNode.id}
            collection={collection}
            node={childNode}
            activeDocument={activeDocument}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            canUpdate={canUpdate}
            index={index}
            parentId={node.id}
          />
        ))}
    </>
  );
}

const ObservedDocumentLink = observer(React.forwardRef(DocumentLink));

export default ObservedDocumentLink;
