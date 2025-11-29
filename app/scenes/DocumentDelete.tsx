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
  documents: string[]; // Array of document IDs
  onSubmit: () => void;
};

function DocumentDelete({ documents: documentIds, onSubmit }: Props) {
  const { t } = useTranslation();
  const { ui, documents, collections, userMemberships, groupMemberships } =
    useStores();
  const history = useHistory();
  const [isDeleting, setDeleting] = React.useState(false);
  const [isArchiving, setArchiving] = React.useState(false);
  const [fetchedDocuments, setFetchedDocuments] = React.useState<Document[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch all documents
  React.useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const fetchPromises = documentIds.map((id) => documents.fetch(id));
        const docs = await Promise.all(fetchPromises);
        setFetchedDocuments(docs.filter(Boolean) as Document[]);
      } catch {
        toast.error(t("Failed to load documents"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [documentIds, documents, t]);

  const isPlural = fetchedDocuments.length > 1;
  const canArchive = fetchedDocuments.every(
    (doc) => !doc.isDraft && !doc.isArchived && !doc.template
  );

  // Calculate total nested documents
  const totalNestedDocuments = React.useMemo(
    () =>
      fetchedDocuments.reduce((total, doc) => {
        const collection = doc.collectionId
          ? collections.get(doc.collectionId)
          : undefined;
        const nestedCount = collection
          ? collection.getChildrenForDocument(doc.id).length
          : 0;
        return total + nestedCount;
      }, 0),
    [fetchedDocuments, collections]
  );

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setDeleting(true);

      try {
        // Delete all documents
        const deletePromises = fetchedDocuments.map(async (document) => {
          await document.delete();

          userMemberships
            .getByDocumentId(document.id)
            ?.removeDocument(document.id);
          groupMemberships
            .getByDocumentId(document.id)
            ?.removeDocument(document.id);
        });

        await Promise.all(deletePromises);

        // Handle navigation if currently viewing one of the deleted documents
        const deletedIds = new Set(fetchedDocuments.map((doc) => doc.id));
        if (ui.activeDocumentId && deletedIds.has(ui.activeDocumentId)) {
          const activeDoc = fetchedDocuments.find(
            (doc) => doc.id === ui.activeDocumentId
          );

          if (activeDoc) {
            // Try to redirect to parent
            if (activeDoc.parentDocumentId) {
              const parent = documents.get(activeDoc.parentDocumentId);
              if (parent && !deletedIds.has(parent.id)) {
                history.push(documentPath(parent));
                onSubmit();
                return;
              }
            }

            // Redirect to template settings or collection
            const collection = activeDoc.collectionId
              ? collections.get(activeDoc.collectionId)
              : undefined;
            const path = activeDoc.template
              ? settingsPath("templates")
              : collectionPath(collection?.path || "/");
            history.push(path);
          }
        }

        toast.success(
          isPlural
            ? t("{{count}} documents deleted", {
                count: fetchedDocuments.length,
              })
            : t("Document deleted")
        );

        onSubmit();
      } catch {
        toast.error(
          isPlural
            ? t("Couldn't delete the documents, try again?")
            : t("Couldn't delete the document, try again?")
        );
      } finally {
        setDeleting(false);
      }
    },
    [
      onSubmit,
      ui,
      fetchedDocuments,
      documents,
      history,
      collections,
      userMemberships,
      groupMemberships,
      isPlural,
      t,
    ]
  );

  const handleArchive = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setArchiving(true);

      try {
        const archivePromises = fetchedDocuments.map((document) =>
          document.archive()
        );
        await Promise.all(archivePromises);

        toast.success(
          isPlural
            ? t("{{count}} documents archived", {
                count: fetchedDocuments.length,
              })
            : t("Document archived")
        );

        onSubmit();
      } catch {
        toast.error(
          isPlural
            ? t("Couldn't archive the documents, try again?")
            : t("Couldn't archive the document, try again?")
        );
      } finally {
        setArchiving(false);
      }
    },
    [onSubmit, fetchedDocuments, isPlural, t]
  );

  if (isLoading) {
    return (
      <Text type="secondary">
        {isPlural ? t("Loading documents...") : t("Loading document...")}
      </Text>
    );
  }

  if (fetchedDocuments.length === 0) {
    return <Text type="secondary">{t("Unable to load documents")}</Text>;
  }

  const hasTemplates = fetchedDocuments.some((doc) => doc.isTemplate);

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {isPlural ? (
          hasTemplates ? (
            <Trans
              defaults="Are you sure you want to delete these <em>{{count}} templates</em>?"
              values={{ count: fetchedDocuments.length }}
              components={{ em: <strong /> }}
            />
          ) : totalNestedDocuments > 0 ? (
            <Trans
              defaults="Are you sure about that? Deleting these <em>{{count}} documents</em>will delete all of their history and combined <em>{{nestedCount}} nested documents</em>."
              values={{
                count: fetchedDocuments.length,
                nestedCount: totalNestedDocuments,
              }}
              components={{ em: <strong /> }}
            />
          ) : (
            <Trans
              defaults="Are you sure about that? Deleting these <em>{{count}} documents</em> will delete all of their history."
              values={{ count: fetchedDocuments.length }}
              components={{ em: <strong /> }}
            />
          )
        ) : fetchedDocuments[0].isTemplate ? (
          <Trans
            defaults="Are you sure you want to delete the <em>{{ documentTitle }}</em> template?"
            values={{
              documentTitle: fetchedDocuments[0].titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : totalNestedDocuments > 0 ? (
          <Trans
            count={totalNestedDocuments}
            defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history and <em>{{ nestedCount }} nested document</em>."
            values={{
              documentTitle: fetchedDocuments[0].titleWithDefault,
              nestedCount: totalNestedDocuments,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : (
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history."
            values={{
              documentTitle: fetchedDocuments[0].titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
      </Text>
      {canArchive && (
        <Text as="p" type="secondary">
          {isPlural ? (
            <Trans>
              If you'd like the option of referencing or restoring these
              documents in the future, consider archiving them instead.
            </Trans>
          ) : (
            <Trans>
              If you'd like the option of referencing or restoring the{" "}
              {{
                noun: fetchedDocuments[0].noun,
              }}{" "}
              in the future, consider archiving it instead.
            </Trans>
          )}
        </Text>
      )}

      <Flex justify="flex-end" gap={8}>
        {canArchive && (
          <Button type="button" onClick={handleArchive} neutral>
            {isArchiving ? `${t("Archiving")}…` : t("Archive")}
          </Button>
        )}
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I'm sure – Delete")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(DocumentDelete);
