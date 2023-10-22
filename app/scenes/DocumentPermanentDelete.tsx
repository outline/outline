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

type Props = {
  document: Document;
  onSubmit: () => void;
};

function DocumentPermanentDelete({ document, onSubmit }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        setIsDeleting(true);
        await documents.delete(document, {
          permanent: true,
        });
        toast.success(t("Document permanently deleted"));
        onSubmit();
        history.push("/trash");
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsDeleting(false);
      }
    },
    [document, onSubmit, t, history, documents]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          <Trans
            defaults="Are you sure you want to permanently delete the <em>{{ documentTitle }}</em> document? This action is immediate and cannot be undone."
            values={{
              documentTitle: document.titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(DocumentPermanentDelete);
