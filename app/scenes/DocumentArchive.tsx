import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  documents: Document[];
  onSubmit?: () => void;
};

function DocumentArchive({ documents, onSubmit }: Props) {
  const { t } = useTranslation();
  const { documents: documentsStore, dialogs } = useStores();
  const [isArchiving, setArchiving] = React.useState(false);
  const isBulkAction = documents.length > 1;

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setArchiving(true);

      try {
        const results = await Promise.allSettled(
          documents.map((document) => document.archive())
        );

        if (isBulkAction) {
          const successCount = results.filter(
            (r) => r.status === "fulfilled"
          ).length;
          const errorCount = results.filter(
            (r) => r.status === "rejected"
          ).length;

          if (errorCount === 0) {
            toast.success(
              t("{{ count }} documents archived", { count: successCount })
            );
          } else {
            toast.warning(
              t("{{ successCount }} archived, {{ errorCount }} failed", {
                successCount,
                errorCount,
              })
            );
          }
        } else {
          toast.success(t("Document archived"));
        }

        onSubmit?.();
        dialogs.closeAllModals();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setArchiving(false);
      }
    },
    [onSubmit, documents, documentsStore, t, isBulkAction, dialogs]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {isBulkAction ? (
          <Trans
            count={documents.length}
            defaults="Are you sure you want to archive <em>{{ count }} documents</em>? They will be removed from collections and search results."
            values={{ count: documents.length }}
            components={{ em: <strong /> }}
          />
        ) : (
          <Trans defaults="Archiving this document will remove it from the collection and search results." />
        )}
      </Text>

      <Flex justify="flex-end" gap={8}>
        <Button type="submit">
          {isArchiving ? `${t("Archiving")}…` : t("Archive")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(DocumentArchive);
