import type { Location } from "history";
import { parsePath } from "history";
import { observer } from "mobx-react";
import { EditIcon, LinkIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type { match } from "react-router";
import styled from "styled-components";
import { toast } from "sonner";
import useShare from "@shared/hooks/useShare";
import type { NavigationNode } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type { FlattenedTreeNode } from "@shared/utils/tree";
import { isInternalUrl, sanitizeUrl } from "@shared/utils/urls";
import type Collection from "~/models/Collection";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import useBoolean from "~/hooks/useBoolean";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import { toRelative } from "~/utils/urls";
import { useDragLink } from "../hooks/useDragAndDrop";
import { useLinkDialog } from "../hooks/useLinkDialog";
import Relative from "./Relative";
import { useReorderDropCursors } from "./ReorderDropCursors";
import type { SidebarContextType } from "./SidebarContext";
import { useSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";

interface Props {
  /** The link node to render. */
  node: NavigationNode;
  /** The collection that contains the link, required to edit it. */
  collection?: Collection;
  /** Id of the document that contains the link, if any. */
  parentId?: string;
  /** Indentation depth of the row. */
  depth: number;
  /** Position of the row among its siblings, required to reorder. */
  index?: number;
  /** Ancestors whose subtree ends with this row, nearest first. */
  trailingAncestors?: FlattenedTreeNode[];
}

const noAncestors: FlattenedTreeNode[] = [];

/**
 * A sidebar row for a link. A link to a page in this app opens through the
 * router, any other link opens in a new tab.
 */
export const ExternalLink = observer(function ExternalLink({
  node,
  collection,
  parentId,
  depth,
  index,
  trailingAncestors = noAncestors,
}: Props) {
  const { t } = useTranslation();
  const { shareId } = useShare();
  const sidebarContext = useSidebarContext();
  const linkDialog = useLinkDialog();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const canCollection = usePolicy(collection);
  const canParent = usePolicy(parentId);
  const canEdit =
    !!collection &&
    (parentId ? canParent.createChildDocument : canCollection.createDocument);

  const [{ isDragging }, dragRef] = useDragLink(
    node,
    depth,
    collection,
    parentId,
    canEdit
  );

  const { cursorBefore, cursorAfter } = useReorderDropCursors({
    node,
    collection: index === undefined ? undefined : collection,
    depth,
    index: index ?? 0,
    parentId,
    expanded: false,
    hasChildren: false,
    isDragging,
    trailingAncestors,
  });

  // In a public share, app pages other than the share are not available.
  const to = React.useMemo(() => {
    const path = shareId ? undefined : toInternalPath(node.url);
    return path
      ? { ...parsePath(path), state: { title: node.title, sidebarContext } }
      : undefined;
  }, [shareId, node.url, node.title, sidebarContext]);

  const isActive = React.useCallback(
    (
      routeMatch: match | null,
      location: Location<{ sidebarContext?: SidebarContextType }>
    ) => !!routeMatch && location.state?.sidebarContext === sidebarContext,
    [sidebarContext]
  );

  const handleEdit = React.useCallback(() => {
    if (collection) {
      linkDialog.openEdit(collection, node);
    }
  }, [linkDialog, collection, node]);

  const handleDelete = React.useCallback(async () => {
    try {
      await collection?.removeLink(node.id);
    } catch (err) {
      toast.error(errToString(err));
    }
  }, [collection, node.id]);

  const actions = React.useMemo(
    () => [
      createAction({
        name: `${t("Edit")}…`,
        section: DocumentSection,
        icon: <EditIcon />,
        visible: canEdit,
        perform: handleEdit,
      }),
      createAction({
        name: t("Delete"),
        section: DocumentSection,
        icon: <TrashIcon />,
        dangerous: true,
        visible: canEdit,
        perform: handleDelete,
      }),
    ],
    [t, canEdit, handleEdit, handleDelete]
  );
  const rootAction = useMenuAction(actions);

  const menu = canEdit ? (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Link options")}
      onOpen={handleMenuOpen}
      onClose={handleMenuClose}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  ) : undefined;

  return (
    <Relative>
      {cursorBefore}
      <Draggable ref={dragRef} $isDragging={isDragging}>
        <SidebarLink
          to={to}
          href={to ? undefined : sanitizeUrl(node.url)}
          external={!to}
          isActive={to ? isActive : undefined}
          depth={depth}
          icon={depth === 0 ? <LinkIcon /> : undefined}
          label={node.title}
          contextAction={canEdit ? rootAction : undefined}
          menu={isDragging ? undefined : menu}
          $showActions={menuOpen}
        />
      </Draggable>
      {cursorAfter}
    </Relative>
  );
});

/**
 * Returns the router path for a url that points to a page in this app.
 *
 * @param url The url of the link.
 * @returns the path, or undefined if the url must open as a normal link.
 */
function toInternalPath(url: string): string | undefined {
  if (!isInternalUrl(url)) {
    return undefined;
  }

  try {
    const path = toRelative(url);

    // The API is not part of the app, and the router cannot decode a
    // malformed percent-encoding. The result is used so that the minifier
    // keeps the call.
    const decoded = decodeURI(path);
    return decoded && !path.startsWith("/api/") ? path : undefined;
  } catch (_err) {
    return undefined;
  }
}

const Draggable = styled.div<{ $isDragging: boolean }>`
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
`;
