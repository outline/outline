// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Group from "models/Group";
import GroupMembers from "scenes/GroupMembers";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import Switch from "components/Switch";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

type Props = {
  onSubmit: () => void,
};

function GroupNew({ onSubmit }: Props) {
  const { groups } = useStores();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [name, setName] = React.useState();
  const [isSaving, setIsSaving] = React.useState();
  const [isPrivate, setIsPrivate] = React.useState(true);
  const [group, setGroup] = React.useState();

  const handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    setIsSaving(true);
    const group = new Group(
      {
        name,
        isPrivate,
      },
      groups
    );

    try {
      setGroup(await group.save());
    } catch (err) {
      showToast(err.message, { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (ev: SyntheticInputEvent<*>) => {
    setName(ev.target.value);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans>
            Groups are for organizing your team. They work best when centered
            around a function or a responsibility — Support or Engineering for
            example.
          </Trans>
        </HelpText>
        <Flex>
          <Input
            type="text"
            label="Name"
            onChange={handleNameChange}
            value={name}
            required
            autoFocus
            flex
          />
        </Flex>
        <HelpText>
          <Trans>You’ll be able to add people to the group next.</Trans>
        </HelpText>

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
          {isSaving ? `${t("Creating")}…` : t("Continue")}
        </Button>
      </form>
      <Modal
        title={t("Group members")}
        onRequestClose={onSubmit}
        isOpen={!!group}
      >
        <GroupMembers group={group} />
      </Modal>
    </>
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

export default observer(GroupNew);
