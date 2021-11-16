import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Group from "models/Group";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import useToasts from "hooks/useToasts";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function GroupEdit({ group, onSubmit }: Props) {
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const [name, setName] = React.useState(group.name);
  const [isSaving, setIsSaving] = React.useState();
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'true' is not assignable to param... Remove this comment to see the full error message
      setIsSaving(true);

      try {
        await group.save({
          name: name,
        });
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'false' is not assignable to para... Remove this comment to see the full error message
        setIsSaving(false);
      }
    },
    [group, onSubmit, showToast, name]
  );
  const handleNameChange = React.useCallback(
    (ev: React.SyntheticEvent<any>) => {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'EventTarg... Remove this comment to see the full error message
      setName(ev.target.value);
    },
    []
  );
  return (
    <form onSubmit={handleSubmit}>
      <HelpText>
        <Trans>
          You can edit the name of this group at any time, however doing so too
          often might confuse your team mates.
        </Trans>
      </HelpText>
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
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string |
        HTMLCollection' is not assignable t... Remove this comment to see the
        full error message
        {isSaving ? `${t("Saving")}…` : t("Save")}
      </Button>
    </form>
  );
}

export default observer(GroupEdit);
