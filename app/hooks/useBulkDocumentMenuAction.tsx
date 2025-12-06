import { useMemo } from "react";
import {
  bulkArchiveDocuments,
  bulkDeleteDocuments,
  bulkMoveDocuments,
} from "~/actions/definitions/bulkDocuments";
import Document from "~/models/Document";
import { useMenuAction } from "./useMenuAction";

type Props = {
  /** Documents that are selected */
  documents: Document[];
};

/**
 * Hook that creates bulk document menu actions.
 *
 * @param props - documents and callbacks.
 * @returns root menu action with children for bulk operations.
 */
export function useBulkDocumentMenuAction({ documents }: Props) {
  const actions = useMemo(() => {
    if (!documents.length) {
      return [];
    }

    return [
      bulkArchiveDocuments({ documents }),
      bulkMoveDocuments({ documents }),
      bulkDeleteDocuments({ documents }),
    ];
  }, [documents]);

  return useMenuAction(actions);
}
