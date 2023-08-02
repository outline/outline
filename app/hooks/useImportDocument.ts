import invariant from "invariant";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

let importingLock = false;

export default function useImportDocument(
  collectionId?: string | null,
  documentId?: string
): {
  handleFiles: (files: File[]) => Promise<void>;
  isImporting: boolean;
} {
  const { documents } = useStores();
  const { showToast } = useToasts();
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
          const doc = await documents.import(file, documentId, cId, {
            publish: true,
          });

          if (redirect) {
            history.push(doc.url);
          }
        }
      } catch (err) {
        showToast(`${t("Could not import file")}. ${err.message}`, {
          type: "error",
        });
      } finally {
        setImporting(false);
        importingLock = false;
      }
    },
    [t, documents, history, showToast, collectionId, documentId]
  );

  return {
    handleFiles,
    isImporting,
  };
}
