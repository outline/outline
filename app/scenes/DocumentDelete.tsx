import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { collectionPath, documentPath } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  onSubmit: () => void;
};

function DocumentDelete({ document, onSubmit }: Props) {
  const { t } = useTranslation();
  const { ui, documents, collections } = useStores();
  const history = useHistory();
  const [isDeleting, setDeleting] = React.useState(false);
  const [isArchiving, setArchiving] = React.useState(false);
  const { showToast } = useToasts();
  const canArchive = !document.isDraft && !document.isArchived;
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const nestedDocumentsCount = collection
    ? collection.getDocumentChildren(document.id).length
    : 0;
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setDeleting(true);

      try {
        await document.delete();

        // only redirect if we're currently viewing the document that's deleted
        if (ui.activeDocumentId === document.id) {
          // If the document has a parent and it's available in the store then
          // redirect to it
          if (document.parentDocumentId) {
            const parent = documents.get(document.parentDocumentId);

            if (parent) {
              history.push(documentPath(parent));
              onSubmit();
              return;
            }
          }

          // otherwise, redirect to the collection home
          history.push(collectionPath(collection?.url || "/"));
        }

        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setDeleting(false);
      }
    },
    [showToast, onSubmit, ui, document, documents, history, collection]
  );

  const handleArchive = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setArchiving(true);

      try {
        await document.archive();
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setArchiving(false);
      }
    },
    [showToast, onSubmit, document]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          {document.isTemplate ? (
            <Trans
              defaults="Are you sure you want to delete the <em>{{ documentTitle }}</em> template?"
              values={{
                documentTitle: document.titleWithDefault,
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : nestedDocumentsCount < 1 ? (
            <Trans
              defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history</em>."
              values={{
                documentTitle: document.titleWithDefault,
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            <Trans
              count={nestedDocumentsCount}
              defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history and <em>{{ any }} nested document</em>."
              values={{
                documentTitle: document.titleWithDefault,
                any: nestedDocumentsCount,
              }}
              components={{
                em: <strong />,
              }}
            />
          )}
        </Text>
        {canArchive && (
          <Text type="secondary">
            <Trans>
              If you’d like the option of referencing or restoring the{" "}
              {{
                noun: document.noun,
              }}{" "}
              in the future, consider archiving it instead.
            </Trans>
          </Text>
        )}
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
        &nbsp;&nbsp;
        {canArchive && (
          <Button type="button" onClick={handleArchive} neutral>
            {isArchiving ? `${t("Archiving")}…` : t("Archive")}
          </Button>
        )}
      </form>
    </Flex>
  );
}

export default observer(DocumentDelete);
