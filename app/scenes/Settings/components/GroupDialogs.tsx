import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Group from "~/models/Group";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";

type Props = {
  group: Group;
  onSubmit: () => void;
};

export function EditGroupDialog({ group, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = React.useState(group.name);
  const [isSaving, setIsSaving] = React.useState(false);
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await group.save({
          name,
        });
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [group, onSubmit, name]
  );

  const handleNameChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setName(ev.target.value);
    },
    []
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        <Trans>
          You can edit the name of this group at any time, however doing so too
          often might confuse your team mates.
        </Trans>
      </Text>
      <Flex>
        <Input
          type="text"
          label={t("Name")}
          onChange={handleNameChange}
          value={name}
          required
          autoFocus
          flex
        />
      </Flex>

      <Button type="submit" disabled={isSaving || !name}>
        {isSaving ? `${t("Saving")}…` : t("Save")}
      </Button>
    </form>
  );
}

export function DeleteGroupDialog({ group, onSubmit }: Props) {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    await group.delete();
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <Trans
        defaults="Are you sure about that? Deleting the <em>{{groupName}}</em> group will cause its members to lose access to collections and documents that it is associated with."
        values={{
          groupName: group.name,
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}
