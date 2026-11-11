import * as React from "react";
import { useTranslation } from "react-i18next";
import type { NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import useStores from "~/hooks/useStores";
import { openEditLinkDialog } from "../components/LinkDialog";

/**
 * Returns a function that opens the dialog to edit a sidebar link.
 *
 * @returns functions to open the edit dialog.
 */
export function useLinkDialog() {
  const stores = useStores();
  const { t } = useTranslation();

  return React.useMemo(
    () => ({
      openEdit: (collection: Collection, node: NavigationNode) =>
        openEditLinkDialog({ stores, t, collection, node }),
    }),
    [stores, t]
  );
}
