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
  onSubmit: () => void;
};

function BulkDeleteDialog({ documents, onSubmit }: Props) {
  const { t } = useTranslation();
  const { documents: documentsStore } = useStores();
  const [isDeleting, setDeleting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setDeleting(true);

      try {
        const results = await Promise.allSettled(
          documents.map((document) => document.delete())
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const errorCount = results.filter(
          (r) => r.status === "rejected"
        ).length;

        documentsStore.clearSelection();

        if (errorCount === 0) {
          toast.success(
            t("{{ count }} documents deleted", { count: successCount })
          );
        } else {
          toast.warning(
            t("{{ successCount }} deleted, {{ errorCount }} failed", {
              successCount,
              errorCount,
            })
          );
        }

        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setDeleting(false);
      }
    },
    [onSubmit, documents, documentsStore, t]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        <Trans
          count={documents.length}
          defaults="Are you sure you want to delete <em>{{ count }} documents</em>? This action will move them to the trash."
          values={{ count: documents.length }}
          components={{ em: <strong /> }}
        />
      </Text>

      <Flex justify="flex-end" gap={8}>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I'm sure – Delete")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(BulkDeleteDialog);
