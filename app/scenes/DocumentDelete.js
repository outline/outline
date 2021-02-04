// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import useStores from "hooks/useStores";
import { collectionUrl, documentUrl } from "utils/routeHelpers";

type Props = {
  document: Document,
  onSubmit: () => void,
};

function DocumentDelete({ document, onSubmit }: Props) {
  const { t } = useTranslation();
  const { ui, documents } = useStores();
  const history = useHistory();
  const [isDeleting, setDeleting] = React.useState(false);
  const [isArchiving, setArchiving] = React.useState(false);
  const { showToast } = ui;
  const canArchive = !document.isDraft && !document.isArchived;

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
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
              history.push(documentUrl(parent));
              return;
            }
          }

          // otherwise, redirect to the collection home
          history.push(collectionUrl(document.collectionId));
        }
        onSubmit();
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setDeleting(false);
      }
    },
    [showToast, onSubmit, ui, document, documents, history]
  );

  const handleArchive = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      setArchiving(true);

      try {
        await document.archive();
        onSubmit();
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setArchiving(false);
      }
    },
    [showToast, onSubmit, document]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          {document.isTemplate ? (
            <Trans
              defaults="Are you sure you want to delete the <em>{{ documentTitle }}</em> template?"
              values={{ documentTitle: document.titleWithDefault }}
              components={{ em: <strong /> }}
            />
          ) : (
            <Trans
              defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history and any nested documents."
              values={{ documentTitle: document.titleWithDefault }}
              components={{ em: <strong /> }}
            />
          )}
        </HelpText>
        {canArchive && (
          <HelpText>
            <Trans>
              If you’d like the option of referencing or restoring the{" "}
              {{ noun: document.noun }} in the future, consider archiving it
              instead.
            </Trans>
          </HelpText>
        )}
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
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
