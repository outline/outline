// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Document from "models/Document.js";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import useStores from "hooks/useStores";
import { collectionUrl } from "utils/routeHelpers";

type Props = {
  document: Document,
  onSubmit: () => void,
};

function DocumentPermanentDelete({ document, onSubmit }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { t } = useTranslation();
  const { ui, documents, collections } = useStores();
  const { showToast } = ui;
  const history = useHistory();
  const collection = collections.get(document.collectionId);

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      try {
        setIsDeleting(true);
        await documents.delete(document, { permanent: true });
        showToast(t("Document permanently deleted"), { type: "success" });
        onSubmit();

        if (documents.deleted.length) {
          history.push("/trash");
        } else {
          history.push(collectionUrl(collection?.url || "/"));
        }
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setIsDeleting(false);
      }
    },
    [document, onSubmit, showToast, t, history, documents, collection]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Are you sure about that? This irreverisble action will permanently delete the <em>{{ documentTitle }}</em> document."
            values={{ documentTitle: document.titleWithDefault }}
            components={{ em: <strong /> }}
          />
        </HelpText>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(DocumentPermanentDelete);
