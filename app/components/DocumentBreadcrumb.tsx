import { observer } from "mobx-react";
import { ArchiveIcon, GoToIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import Breadcrumb from "~/components/Breadcrumb";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useCollectionMenuAction } from "~/hooks/useCollectionMenuAction";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { archivePath, trashPath } from "~/utils/routeHelpers";
import { createInternalLinkAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";

type Props = {
  children?: React.ReactNode;
  document: Document;
  onlyText?: boolean;
  reverse?: boolean;
  /**
   * Maximum number of items to show in the breadcrumb.
   * If value is less than or equals to 0, no items will be shown.
   * If value is undefined, all items will be shown.
   */
  maxDepth?: number;
};

function DocumentBreadcrumb(
  { document, children, onlyText, reverse = false, maxDepth }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const sidebarContext = useLocationSidebarContext();
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const can = usePolicy(collection);
  const depth = maxDepth === undefined ? undefined : Math.max(0, maxDepth);

  React.useEffect(() => {
    void document.loadRelations({ withoutPolicies: true });
  }, [document]);

  const path = document.pathTo.slice(0, -1);

  const actions = React.useMemo(() => {
    if (depth === 0) {
      return [];
    }

    const outputActions = [
      createInternalLinkAction({
        name: t("Trash"),
        section: ActiveDocumentSection,
        icon: <TrashIcon />,
        visible: document.isDeleted,
        to: trashPath(),
      }),
      createInternalLinkAction({
        name: t("Archive"),
        section: ActiveDocumentSection,
        icon: <ArchiveIcon />,
        visible: document.isArchived,
        to: archivePath(),
      }),
      createInternalLinkAction({
        name: collection ? (
          <CollectionName collection={collection} />
        ) : undefined,
        section: ActiveDocumentSection,
        icon: collection ? (
          <CollectionIcon collection={collection} expanded />
        ) : undefined,
        visible: !!(collection && can.readDocument),
        to: collection
          ? {
              pathname: collection.path,
              state: { sidebarContext },
            }
          : "",
      }),
      createInternalLinkAction({
        name: t("Deleted Collection"),
        section: ActiveDocumentSection,
        visible: document.isCollectionDeleted,
        to: "",
      }),
      ...path.map((node) => {
        const title = node.title || t("Untitled");
        return createInternalLinkAction({
          name: (
            <DocumentName
              documentId={node.id}
              collection={collection}
              icon={node.icon}
              color={node.color}
              title={title}
            />
          ),
          section: ActiveDocumentSection,
          to: {
            pathname: node.url,
            state: { sidebarContext },
          },
        });
      }),
    ];

    return reverse
      ? depth !== undefined
        ? outputActions.slice(-depth)
        : outputActions
      : depth !== undefined
        ? outputActions.slice(0, depth)
        : outputActions;
  }, [
    t,
    document,
    collection,
    can.readDocument,
    sidebarContext,
    path,
    reverse,
    depth,
  ]);

  if (!collections.isLoaded) {
    return null;
  }

  if (onlyText) {
    if (depth === 0) {
      return <></>;
    }

    const slicedPath = reverse
      ? path.slice(depth && -depth)
      : path.slice(0, depth);

    const showCollection =
      collection &&
      (!reverse || depth === undefined || slicedPath.length < depth);

    return (
      <>
        {showCollection && collection.name}
        {slicedPath.map((node: NavigationNode, index: number) => (
          <React.Fragment key={node.id}>
            {showCollection && <SmallSlash />}
            {node.title || t("Untitled")}
            {!showCollection && index !== slicedPath.length - 1 && (
              <SmallSlash />
            )}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (
    <Breadcrumb actions={actions} ref={ref} highlightFirstItem>
      {children}
    </Breadcrumb>
  );
}

/** Renders a collection name wrapped in a context menu. */
const CollectionName = observer(function CollectionName_({
  collection,
}: {
  collection: Collection;
}) {
  const { t } = useTranslation();
  const menuAction = useCollectionMenuAction({
    collectionId: collection.id,
  });

  return (
    <ActionContextProvider value={{ activeModels: [collection] }}>
      <ContextMenu action={menuAction} ariaLabel={t("Collection options")}>
        <span>{collection.name}</span>
      </ContextMenu>
    </ActionContextProvider>
  );
});

/** Renders a document name wrapped in a context menu. */
const DocumentName = observer(function DocumentName_({
  documentId,
  collection,
  icon,
  color,
  title,
}: {
  documentId: string;
  collection: Collection | undefined;
  icon: string | undefined;
  color: string | undefined;
  title: string;
}) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const doc = documents.get(documentId);
  const menuAction = useDocumentMenuAction({ documentId });

  const content = icon ? (
    <>
      <StyledIcon
        value={icon}
        color={color}
        initial={title.charAt(0).toUpperCase()}
      />{" "}
      {title}
    </>
  ) : (
    title
  );

  if (!doc) {
    return <>{content}</>;
  }

  return (
    <ActionContextProvider
      value={{
        activeModels: [doc, ...(collection ? [collection] : [])],
      }}
    >
      <ContextMenu action={menuAction} ariaLabel={t("Document options")}>
        <span>{content}</span>
      </ContextMenu>
    </ActionContextProvider>
  );
});

const StyledIcon = styled(Icon)`
  margin-right: 2px;
`;

const SmallSlash = styled(GoToIcon)`
  width: 12px;
  height: 12px;
  vertical-align: middle;
  flex-shrink: 0;

  fill: ${(props) => props.theme.textTertiary};
  opacity: 0.5;
`;

export default observer(React.forwardRef(DocumentBreadcrumb));
