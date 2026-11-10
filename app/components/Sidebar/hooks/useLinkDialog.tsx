import * as React from "react";
import { useTranslation } from "react-i18next";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import { LinkDialog, type LinkDialogValues } from "../components/LinkDialog";

/**
 * Returns functions that open the dialog to add or edit a sidebar link.
 *
 * @returns functions to open the create and edit dialogs.
 */
export function useLinkDialog() {
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const openCreate = React.useCallback(
    (
      collection: Collection,
      parentDocumentId?: string,
      onCreated?: () => void
    ) => {
      const handleSubmit = async (values: LinkDialogValues) => {
        await collection.addLink(values, parentDocumentId);
        onCreated?.();
        dialogs.closeAllModals();
      };

      dialogs.openModal({
        title: t("Add link"),
        content: <LinkDialog onSubmit={handleSubmit} />,
      });
    },
    [dialogs, t]
  );

  const openEdit = React.useCallback(
    (collection: Collection, node: NavigationNode) => {
      const handleSubmit = async (values: LinkDialogValues) => {
        await collection.updateLink(node.id, values);
        dialogs.closeAllModals();
      };

      dialogs.openModal({
        title: t("Edit link"),
        content: (
          <LinkDialog
            defaultValues={{ title: node.title, url: node.url }}
            onSubmit={handleSubmit}
          />
        ),
      });
    },
    [dialogs, t]
  );

  return { openCreate, openEdit };
}
