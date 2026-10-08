import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { CollectionValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";

type Props = {
  collection: Collection;
  onSubmit: () => void;
};

function CollectionDuplicateDialog({ collection, onSubmit }: Props) {
  const history = useHistory();
  const { t } = useTranslation();
  const [name, setName] = React.useState(collection.name);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      const toastId = toast.loading(`${t("Duplicating collection")}…`);
      try {
        const duplicated = await collection.duplicate({ name });

        setTimeout(() => {
          history.push(duplicated.path);
          toast.dismiss(toastId);
          onSubmit();
          setIsSaving(false);
        }, 2000);
      } catch (err) {
        toast.error(errToString(err));
        toast.dismiss(toastId);
        setIsSaving(false);
      }
    },
    [collection, onSubmit, name, t, history]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        <Trans>
          A copy of the collection and the documents within it will be created.
        </Trans>
      </Text>
      <Flex column>
        <Input
          type="text"
          label={t("Name")}
          onChange={(ev) => setName(ev.target.value)}
          value={name}
          maxLength={CollectionValidation.maxNameLength}
          required
          autoSelect
          flex
        />
      </Flex>
      <Flex justify="flex-end">
        <Button type="submit" disabled={isSaving || !name}>
          {isSaving ? `${t("Duplicating")}…` : t("Duplicate")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(CollectionDuplicateDialog);
