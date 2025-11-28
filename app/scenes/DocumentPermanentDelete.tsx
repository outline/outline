import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  documents: string[];
  onSubmit: () => void;
};

function DocumentPermanentDelete({ documents: documentIds, onSubmit }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const [fetchedDocuments, setFetchedDocuments] = React.useState<Document[]>(
    []
  );
  const [isLoading, setIsLoading] = React.useState(true);

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

  const handleSubmit = async () => {
    if (fetchedDocuments.length === 0) {
      toast.error(
        isPlural
          ? t("Couldn't delete the documents, try again?")
          : t("Couldn't delete the document, try again?")
      );
      return;
    }

    try {
      const deletePromises = fetchedDocuments.map((document) =>
        documents.delete(document, { permanent: true })
      );
      await Promise.all(deletePromises);

      toast.success(
        isPlural
          ? t("{{count}} documents permanently deleted", {
              count: fetchedDocuments.length,
            })
          : t("Document permanently deleted")
      );

      onSubmit();
      history.push("/trash");
    } catch {
      toast.error(
        isPlural
          ? t("Couldn't delete the documents, try again?")
          : t("Couldn't delete the document, try again?")
      );
    }
  };

  if (isLoading) {
    return (
      <Flex column>
        <Text type="secondary">
          {isPlural ? t("Loading documents...") : t("Loading document...")}
        </Text>
      </Flex>
    );
  }

  if (fetchedDocuments.length === 0) {
    return (
      <Flex column>
        <Text type="secondary">{t("Unable to load documents")}</Text>
      </Flex>
    );
  }

  return (
    <Flex column>
      <ConfirmationDialog
        submitText={t("I’m sure – Delete")}
        savingText={`${t("Deleting")}…`}
        onSubmit={handleSubmit}
        danger
      >
        {isPlural ? (
          <Trans
            defaults="Are you sure you want to permanently delete these <em>{{count}} documents</em>? This action is immediate and cannot be undone."
            values={{
              count: fetchedDocuments.length,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : (
          <Trans
            defaults="Are you sure you want to permanently delete the <em>{{ documentTitle }}</em> document? This action is immediate and cannot be undone."
            values={{
              documentTitle: fetchedDocuments[0].titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
      </ConfirmationDialog>
    </Flex>
  );
}

export default observer(DocumentPermanentDelete);
