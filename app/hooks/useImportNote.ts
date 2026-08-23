import invariant from "invariant";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { useSidebarContext } from "~/components/Sidebar/components/SidebarContext";
import useStores from "~/hooks/useStores";
import { notePath } from "~/utils/routeHelpers";
let importingLock = false;
export default function useImportNote(
  notebookId?: string | null,
  noteId?: string
): {
  handleFiles: (files: File[]) => Promise<void>;
  isImporting: boolean;
} {
  const { notes } = useStores();
  const sidebarContext = useSidebarContext();
  const [isImporting, setImporting] = useState(false);
  const { t } = useTranslation();
  const history = useHistory();
  const handleFiles = useCallback(
    async (files = []) => {
      if (importingLock) {
        return;
      }
      // Because this is the onChange handler it's possible for the change to be
      // from previously selecting a file to not selecting a file – aka empty
      if (!files.length) {
        return;
      }
      setImporting(true);
      importingLock = true;
      try {
        let cId = notebookId;
        const redirect = files.length === 1;
        if (noteId && !notebookId) {
          const note = await notes.fetch(noteId);
          invariant(note, "Document not available");
          cId = note.notebookId;
        }
        for (const file of files) {
          const toastId = toast.loading(`${t("Uploading")}…`);
          try {
            const doc = await notes.import(file, noteId, cId, {
              publish: true,
            });
            if (redirect) {
              history.push({
                pathname: notePath(doc),
                state: { sidebarContext },
              });
            }
          } catch (err) {
            toast.error(errToString(err));
          } finally {
            toast.dismiss(toastId);
          }
        }
      } catch (err) {
        toast.error(`${t("Could not import file")}. ${errToString(err)}`);
      } finally {
        setImporting(false);
        importingLock = false;
      }
    },
    [t, notes, history, notebookId, sidebarContext, noteId]
  );
  return {
    handleFiles,
    isImporting,
  };
}
