import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import {
  collectionPath,
  documentPath,
  settingsPath,
} from "~/utils/routeHelpers";

type Props = {
  documents: Document[];
  onSubmit?: () => void;
};

function DocumentDelete({ documents, onSubmit }: Props) {
  const { t } = useTranslation();
  const {
    ui,
    dialogs,
    documents: documentsStore,
    collections: collectionsStore,
    userMemberships,
    groupMemberships,
  } = useStores();
  const history = useHistory();
  const [isDeleting, setDeleting] = React.useState(false);
  const [isArchiving, setArchiving] = React.useState(false);
  const isBulkAction = documents.length > 1;
  const canArchiveAll = documents.every(
    (doc) => !doc.isDraft && !doc.isArchived && !doc.template
  );

  const nestedDocumentsCount = React.useMemo(
    () =>
      documents.reduce((total, doc) => {
        const collection = collectionsStore.get(doc.collectionId || "");
        const childrenCount = collection?.getChildrenForDocument(doc.id).length;
        return total + (childrenCount ?? 0);
      }, 0),
    [documents, collectionsStore]
  );

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setDeleting(true);

      try {
        const failedIds: string[] = [];
        let successCount = 0;

        // Delete documents
        for (const document of documents) {
          try {
            await document.delete();
            userMemberships
              .getByDocumentId(document.id)
              ?.removeDocument(document.id);
            groupMemberships
              .getByDocumentId(document.id)
              ?.removeDocument(document.id);
            successCount++;
          } catch {
            failedIds.push(document.id);
          }
        }

        if (failedIds.length === documents.length) {
          throw new Error(
            t("Couldn’t delete the {{noun}}, try again?", {
              noun: isBulkAction ? "documents" : "document",
            })
          );
        }

        onSubmit?.();
        dialogs.closeAllModals();

        // Show toast messages
        if (isBulkAction) {
          const message = failedIds.length
            ? t("{{ errorCount }} documents failed to delete, try again?", {
                errorCount: failedIds.length,
              })
            : t("{{ count }} documents deleted", { count: successCount });
          failedIds.length ? toast.warning(message) : toast.success(message);
        } else {
          toast.success(t("Document deleted"));
        }

        // only redirect if we're currently viewing one of the documents that have been deleted
        const activeDocument = documents.find(
          (doc) => ui.activeDocumentId === doc.id
        );
        if (activeDocument && !failedIds.includes(activeDocument.id)) {
          const parent = activeDocument.parentDocumentId
            ? documentsStore.get(activeDocument.parentDocumentId)
            : null;

          const path = parent
            ? documentPath(parent)
            : activeDocument.template
              ? settingsPath("templates")
              : collectionPath(
                  collectionsStore.get(activeDocument.collectionId || "")
                    ?.path || "/"
                );

          history.push(path);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setDeleting(false);
      }
    },
    [
      documents,
      userMemberships,
      groupMemberships,
      ui,
      documentsStore,
      collectionsStore,
      history,
      dialogs,
      onSubmit,
      isBulkAction,
      t,
    ]
  );

  const handleArchive = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setArchiving(true);

      try {
        const results = await Promise.allSettled(
          documents.map((doc) => doc.archive())
        );

        const errorCount = results.filter(
          (r) => r.status === "rejected"
        ).length;

        if (errorCount === documents.length) {
          throw new Error(
            t("Couldn’t archive the {{noun}}, try again?", {
              noun: isBulkAction ? "documents" : "document",
            })
          );
        }

        onSubmit?.();
        dialogs.closeAllModals();

        // Show toast messages
        if (isBulkAction) {
          const successCount = results.filter(
            (r) => r.status === "fulfilled"
          ).length;

          const message = errorCount
            ? t("{{ successCount }} archived, {{ errorCount }} failed", {
                successCount,
                errorCount,
              })
            : t("{{ count }} documents archived", { count: successCount });
          errorCount ? toast.warning(message) : toast.success(message);
        } else {
          toast.success(t("Document archived"));
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setArchiving(false);
      }
    },
    [documents, dialogs, isBulkAction, t, onSubmit]
  );

  const NoChildBody = () =>
    isBulkAction ? (
      <Trans
        count={documents.length}
        defaults="Are you sure you want to delete these <em>{{ count }} documents</em>? This action will delete all their history."
        values={{ count: documents.length }}
        components={{ em: <strong /> }}
      />
    ) : (
      <Trans
        defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history</em>."
        values={{
          documentTitle: documents[0].titleWithDefault,
        }}
        components={{
          em: <strong />,
        }}
      />
    );

  const HasChildBody = () =>
    isBulkAction ? (
      <Trans
        count={documents.length}
        defaults="Are you sure about that? Deleting these <em>{{ count }} documents</em> will delete all their history and their combined <em>{{ any }} nested documents.</em>."
        values={{ count: documents.length, any: nestedDocumentsCount }}
        components={{
          em: <strong />,
        }}
      />
    ) : (
      <Trans
        count={nestedDocumentsCount}
        defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history and <em>{{ any }} nested document</em>."
        values={{
          documentTitle: documents[0].titleWithDefault,
          any: nestedDocumentsCount,
        }}
        components={{
          em: <strong />,
        }}
      />
    );

  const ArchiveInsteadBody = () =>
    isBulkAction ? (
      <Trans>
        If you’d like the option of referencing or restoring these documents in
        the future, consider archiving them instead.
      </Trans>
    ) : (
      <Trans>
        If you’d like the option of referencing or restoring the document in the
        future, consider archiving it instead.
      </Trans>
    );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {!isBulkAction && documents[0].isTemplate ? (
          <Trans
            defaults="Are you sure you want to delete the <em>{{ documentTitle }}</em> template?"
            values={{
              documentTitle: documents[0].titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : nestedDocumentsCount < 1 ? (
          <NoChildBody />
        ) : (
          <HasChildBody />
        )}
      </Text>
      {canArchiveAll && (
        <Text as="p" type="secondary">
          <ArchiveInsteadBody />
        </Text>
      )}

      <Flex justify="flex-end" gap={8}>
        {canArchiveAll && (
          <Button type="button" onClick={handleArchive} neutral>
            {isArchiving ? `${t("Archiving")}…` : t("Archive")}
          </Button>
        )}
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(DocumentDelete);
