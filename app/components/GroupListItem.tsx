import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import { s } from "@shared/styles";
import CollectionGroupMembership from "~/models/CollectionGroupMembership";
import Group from "~/models/Group";
import GroupMembers from "~/scenes/GroupMembers";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Modal from "~/components/Modal";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import { hover } from "~/styles";
import NudeButton from "./NudeButton";

type Props = {
  group: Group;
  membership?: CollectionGroupMembership;
  showFacepile?: boolean;
  showAvatar?: boolean;
  renderActions: (params: { openMembersModal: () => void }) => React.ReactNode;
};

function GroupListItem({ group, showFacepile, renderActions }: Props) {
  const { groupMemberships } = useStores();
  const { t } = useTranslation();
  const [membersModalOpen, setMembersModalOpen, setMembersModalClosed] =
    useBoolean();
  const memberCount = group.memberCount;
  const membershipsInGroup = groupMemberships.inGroup(group.id);
  const users = membershipsInGroup
    .slice(0, MAX_AVATAR_DISPLAY)
    .map((gm) => gm.user);
  const overflow = memberCount - users.length;

  return (
    <>
      <ListItem
        image={
          <Image>
            <GroupIcon size={24} />
          </Image>
        }
        title={<Title onClick={setMembersModalOpen}>{group.name}</Title>}
        subtitle={t("{{ count }} member", { count: memberCount })}
        actions={
          <Flex align="center" gap={8}>
            {showFacepile && (
              <NudeButton
                width="auto"
                height="auto"
                onClick={setMembersModalOpen}
              >
                <Facepile users={users} overflow={overflow} />
              </NudeButton>
            )}
            {renderActions({
              openMembersModal: setMembersModalOpen,
            })}
          </Flex>
        }
      />
      <Modal
        title={t("Group members")}
        onRequestClose={setMembersModalClosed}
        isOpen={membersModalOpen}
      >
        <GroupMembers group={group} />
      </Modal>
    </>
  );
}

const Image = styled(Flex)`
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${s("secondaryBackground")};
  border-radius: 32px;
`;

const Title = styled.span`
  &: ${hover} {
    text-decoration: underline;
    cursor: var(--pointer);
  }
`;

export default observer(GroupListItem);
