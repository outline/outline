// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";

type Props = {
  collection: Collection,
  onSubmit: () => void,
};

function CollectionExport({ collection, onSubmit }: Props) {
  const [isLoading, setIsLoading] = React.useState();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();

      setIsLoading(true);
      await collection.export();
      setIsLoading(false);
      onSubmit();
    },
    [collection, onSubmit]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Exporting the collection <em>{{collectionName}}</em> may take a
          few seconds. Your documents will be downloaded as a zip of folders
          with files in Markdown format."
            values={{ collectionName: collection.name }}
            components={{ em: <strong /> }}
          />
        </HelpText>
        <Button type="submit" disabled={isLoading} primary>
          {isLoading ? `${t("Exporting")}…` : t("Export Collection")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(CollectionExport);
