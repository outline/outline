import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Group from "~/models/Group";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function GroupEdit({ group, onSubmit }: Props) {
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
      <Text type="secondary">
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

export default observer(GroupEdit);
