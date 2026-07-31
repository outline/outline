import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import useStores from "~/hooks/useStores";

/**
 * Returns a callback that deletes a database row after confirming.
 *
 * A row is an ordinary document, so it moves to the trash rather than being
 * destroyed — the confirmation says so, since that is the reassurance a user
 * deleting from inside a table needs.
 *
 * @param onDeleted Called once the row is deleted, for callers holding rows in
 *   local state that the store cannot update for them.
 * @returns a callback taking the row to delete.
 */
export default function useDeleteRow(onDeleted?: (row: Document) => void) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  return useCallback(
    (row: Document) => {
      dialogs.openModal({
        title: t("Delete row"),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              try {
                await row.delete();
                onDeleted?.(row);
              } catch (error) {
                toast.error(errToString(error));
              }
            }}
            savingText={`${t("Deleting")}…`}
            danger
          >
            {t(
              "Are you sure you want to delete {{ rowName }}? A row is a document, so it moves to the trash and can be restored from there.",
              { rowName: row.titleWithDefault }
            )}
          </ConfirmationDialog>
        ),
      });
    },
    [t, dialogs, onDeleted]
  );
}
