// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Group from "models/Group";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Switch from "components/Switch";
import useToasts from "hooks/useToasts";

type Props = {
  group: Group,
  onSubmit: () => void,
};

function GroupEdit({ group, onSubmit }: Props) {
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const [name, setName] = React.useState(group.name);
  const [isPrivate, setIsPrivate] = React.useState(group.isPrivate);
  const [isSaving, setIsSaving] = React.useState();

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await group.save({ name, isPrivate });
        onSubmit();
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [group, isPrivate, name, onSubmit, showToast]
  );

  const handleNameChange = React.useCallback((ev: SyntheticInputEvent<*>) => {
    setName(ev.target.value);
  }, []);

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
      <SwitchWrapper>
        <Switch
          id="isPrivate"
          label={t("Access to group")}
          onChange={() => setIsPrivate((prev) => !prev)}
          checked={!isPrivate}
        />
        <SwitchLabel>
          <SwitchText>
            {isPrivate
              ? t(
                  "Only Admins and members present in the group know about the group"
                )
              : t("Everyone in the team can view the group")}
          </SwitchText>
        </SwitchLabel>
      </SwitchWrapper>

      <Button type="submit" disabled={isSaving || !name}>
        {isSaving ? `${t("Saving")}…` : t("Save")}
      </Button>
    </form>
  );
}

const SwitchWrapper = styled.div`
  margin: 20px 0;
`;

const SwitchLabel = styled(Flex)`
  flex-align: center;

  svg {
    flex-shrink: 0;
  }
`;

const SwitchText = styled(HelpText)`
  margin: 0;
  font-size: 15px;
`;

export default observer(GroupEdit);
