import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Database from "~/models/Database";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { InputSelect } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  /** The database to move. */
  database: Database;
  /** Callback once the database has been moved. */
  onSubmit: () => void;
};

/**
 * Moves a database to another collection. Only collections the user may add
 * documents to are offered, because the rows move along with the database and
 * have to stay readable by whoever can read their new collection.
 */
function DatabaseMove({ database, onSubmit }: Props) {
  const { t } = useTranslation();
  const { collections, policies } = useStores();
  const [collectionId, setCollectionId] = React.useState(database.collectionId);
  const [isSaving, setIsSaving] = React.useState(false);

  const options = collections.allActive
    .filter((collection) => !!policies.abilities(collection.id).updateDocument)
    .map((collection) => ({
      type: "item" as const,
      label: collection.name,
      value: collection.id,
    }));

  const handleSubmit = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await database.save({ collectionId });
      onSubmit();
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      setIsSaving(false);
    }
  }, [database, collectionId, onSubmit]);

  return (
    <Flex column gap={12}>
      <Text as="p" type="secondary">
        {t("The rows of the database move with it.")}
      </Text>
      <InputSelect
        options={options}
        value={collectionId}
        onChange={setCollectionId}
        label={t("Collection")}
      />
      <div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || collectionId === database.collectionId}
        >
          {isSaving ? `${t("Moving")}…` : t("Move")}
        </Button>
      </div>
    </Flex>
  );
}

export default observer(DatabaseMove);
