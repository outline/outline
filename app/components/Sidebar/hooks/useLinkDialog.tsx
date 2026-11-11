import * as React from "react";
import { useTranslation } from "react-i18next";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import {
  openAddLinkDialog,
  openEditLinkDialog,
} from "../components/LinkDialog";

/**
 * Returns functions that open the dialog to add or edit a sidebar link.
 *
 * @returns functions to open the create and edit dialogs.
 */
export function useLinkDialog() {
  const stores = useStores();
  const { t } = useTranslation();

  return React.useMemo(
    () => ({
      openCreate: (
        collection: Collection,
        parentDocumentId?: string,
        onCreated?: () => void
      ) =>
        openAddLinkDialog({
          stores,
          t,
          collection,
          parentDocumentId,
          onCreated,
        }),
      openEdit: (collection: Collection, node: NavigationNode) =>
        openEditLinkDialog({ stores, t, collection, node }),
    }),
    [stores, t]
  );
}
