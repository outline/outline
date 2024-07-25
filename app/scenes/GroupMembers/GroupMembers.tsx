import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Group from "~/models/Group";
import User from "~/models/User";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import AddPeopleToGroup from "./AddPeopleToGroup";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = {
  group: Group;
};

function GroupMembers({ group }: Props) {
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const { users, groupUsers } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(group);

  const handleAddModal = (state: boolean) => {
    setAddModalOpen(state);
  };

  const handleRemoveUser = async (user: User) => {
    try {
      await groupUsers.delete({
        groupId: group.id,
        userId: user.id,
      });
      toast.success(
        t(`{{userName}} was removed from the group`, {
          userName: user.name,
        })
      );
    } catch (err) {
      toast.error(t("Could not remove user"));
    }
  };

  return (
    <Flex column>
      {can.update ? (
        <>
          <Text as="p" type="secondary">
            <Trans
              defaults="Add and remove members to the <em>{{groupName}}</em> group. Members of the group will have access to any collections this group has been added to."
              values={{
                groupName: group.name,
              }}
              components={{
                em: <strong />,
              }}
            />
          </Text>
          <span>
            <Button
              type="button"
              onClick={() => handleAddModal(true)}
              icon={<PlusIcon />}
              neutral
            >
              {t("Add people")}…
            </Button>
          </span>
        </>
      ) : (
        <Text as="p" type="secondary">
          <Trans
            defaults="Listing members of the <em>{{groupName}}</em> group."
            values={{
              groupName: group.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
      )}

      <Subheading>
        <Trans>Members</Trans>
      </Subheading>
      <PaginatedList
        items={users.inGroup(group.id)}
        fetch={groupUsers.fetchPage}
        options={{
          id: group.id,
        }}
        empty={<Empty>{t("This group has no members.")}</Empty>}
        renderItem={(item: User) => (
          <GroupMemberListItem
            key={item.id}
            user={item}
            onRemove={can.update ? () => handleRemoveUser(item) : undefined}
          />
        )}
      />
      {can.update && (
        <Modal
          title={t(`Add people to {{groupName}}`, {
            groupName: group.name,
          })}
          onRequestClose={() => handleAddModal(false)}
          isOpen={addModalOpen}
        >
          <AddPeopleToGroup
            group={group}
            onSubmit={() => handleAddModal(false)}
          />
        </Modal>
      )}
    </Flex>
  );
}

export default observer(GroupMembers);
