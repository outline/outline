import { observer } from "mobx-react";
import { EditIcon, LinkIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { sanitizeUrl } from "@shared/utils/urls";
import type Collection from "~/models/Collection";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import useBoolean from "~/hooks/useBoolean";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import { useLinkDialog } from "../hooks/useLinkDialog";
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
}

/**
 * A sidebar row for a link to an external location, which opens in a new tab.
 */
export const ExternalLink = observer(function ExternalLink({
  node,
  collection,
  parentId,
  depth,
}: Props) {
  const { t } = useTranslation();
  const linkDialog = useLinkDialog();
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const canCollection = usePolicy(collection);
  const canParent = usePolicy(parentId);
  const canEdit =
    !!collection &&
    (parentId ? canParent.createChildDocument : canCollection.createDocument);

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
    <SidebarLink
      href={sanitizeUrl(node.url)}
      external
      depth={depth}
      icon={depth === 0 ? <LinkIcon /> : undefined}
      label={node.title}
      contextAction={canEdit ? rootAction : undefined}
      menu={menu}
      $showActions={menuOpen}
    />
  );
});
