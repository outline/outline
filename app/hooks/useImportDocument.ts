import invariant from "invariant";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { documentPath } from "~/utils/routeHelpers";

let importingLock = false;

export default function useImportDocument(
  collectionId?: string | null,
  documentId?: string
): {
  handleFiles: (files: File[]) => Promise<void>;
  isImporting: boolean;
} {
  const { documents } = useStores();
  const [isImporting, setImporting] = React.useState(false);
  const { t } = useTranslation();
  const history = useHistory();
  const handleFiles = React.useCallback(
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
        let cId = collectionId;
        const redirect = files.length === 1;

        if (documentId && !collectionId) {
          const document = await documents.fetch(documentId);
          invariant(document, "Document not available");
          cId = document.collectionId;
        }

        for (const file of files) {
          try {
            const doc = await documents.import(file, documentId, cId, {
              publish: true,
            });

            if (redirect) {
              history.push(documentPath(doc));
            }
          } catch (err) {
            toast.error(err.message);
          }
        }
      } catch (err) {
        toast.error(`${t("Could not import file")}. ${err.message}`);
      } finally {
        setImporting(false);
        importingLock = false;
      }
    },
    [t, documents, history, collectionId, documentId]
  );

  return {
    handleFiles,
    isImporting,
  };
}
