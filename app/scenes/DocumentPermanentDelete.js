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
import useToasts from "hooks/useToasts";

type Props = {|
  document: Document,
  onSubmit: () => void,
|};

function DocumentPermanentDelete({ document, onSubmit }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { t } = useTranslation();
  const { documents } = useStores();
  const { showToast } = useToasts();
  const history = useHistory();

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      try {
        setIsDeleting(true);
        await documents.delete(document, { permanent: true });
        showToast(t("Document permanently deleted"), { type: "success" });
        onSubmit();
        history.push("/trash");
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setIsDeleting(false);
      }
    },
    [document, onSubmit, showToast, t, history, documents]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Are you sure you want to permanently delete the <em>{{ documentTitle }}</em> document? This action is immediate and cannot be undone."
            values={{ documentTitle: document.titleWithDefault }}
            components={{ em: <strong /> }}
          />
        </HelpText>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(DocumentPermanentDelete);
