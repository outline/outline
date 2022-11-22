import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useToasts from "~/hooks/useToasts";

type Props = {
  collection: Collection;
  onSubmit: () => void;
};

function CollectionExport({ collection, onSubmit }: Props) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();
  const { showToast } = useToasts();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsLoading(true);
      await collection.export();

      setIsLoading(false);
      showToast(
        t(
          "Export started. If you have notifications enabled, you will receive an email when it's complete."
        )
      );
      onSubmit();
    },
    [collection, onSubmit, showToast, t]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          <Trans
            defaults="Exporting the collection <em>{{collectionName}}</em> may take some time."
            values={{
              collectionName: collection.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
        <Text type="secondary">
          <Trans>
            Your documents will be a zip of folders with files in Markdown
            format. Please visit the Export section in Settings to get the zip.
          </Trans>
        </Text>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? `${t("Exporting")}…` : t("Export collection")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(CollectionExport);
