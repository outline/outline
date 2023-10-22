import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Group from "~/models/Group";
import User from "~/models/User";
import Invite from "~/scenes/Invite";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import ButtonLink from "~/components/ButtonLink";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Modal from "~/components/Modal";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import GroupMemberListItem from "./components/GroupMemberListItem";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function AddPeopleToGroup(props: Props) {
  const { group } = props;

  const { users, auth, groupMemberships } = useStores();
  const { t } = useTranslation();

  const [query, setQuery] = React.useState("");
  const [inviteModalOpen, handleInviteModalOpen, handleInviteModalClose] =
    useBoolean(false);

  const { fetchPage: fetchUsers } = users;
  const debouncedFetch = React.useMemo(
    () => debounce((query) => fetchUsers({ query }), 250),
    [fetchUsers]
  );

  const handleFilter = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const updatedQuery = ev.target.value;
      setQuery(updatedQuery);
      void debouncedFetch(updatedQuery);
    },
    [debouncedFetch]
  );

  const handleAddUser = async (user: User) => {
    try {
      await groupMemberships.create({
        groupId: group.id,
        userId: user.id,
      });

      toast.success(
        t(`{{userName}} was added to the group`, {
          userName: user.name,
        }),
        {
          icon: <Avatar model={user} size={AvatarSize.Toast} />,
        }
      );
    } catch (err) {
      toast.error(t("Could not add user"));
    }
  };

  const { user, team } = auth;
  if (!user || !team) {
    return null;
  }

  return (
    <Flex column>
      <Text type="secondary">
        {t(
          "Add members below to give them access to the group. Need to add someone who’s not yet a member?"
        )}{" "}
        <ButtonLink onClick={handleInviteModalOpen}>
          {t("Invite them to {{teamName}}", {
            teamName: team.name,
          })}
        </ButtonLink>
        .
      </Text>
      <Input
        type="search"
        placeholder={`${t("Search by name")}…`}
        value={query}
        onChange={handleFilter}
        label={t("Search people")}
        labelHidden
        autoFocus
        flex
      />
      <PaginatedList
        empty={
          query ? (
            <Empty>{t("No people matching your search")}</Empty>
          ) : (
            <Empty>{t("No people left to add")}</Empty>
          )
        }
        items={users.notInGroup(group.id, query)}
        fetch={query ? undefined : users.fetchPage}
        renderItem={(item: User) => (
          <GroupMemberListItem
            key={item.id}
            user={item}
            onAdd={() => handleAddUser(item)}
          />
        )}
      />
      <Modal
        title={t("Invite people")}
        onRequestClose={handleInviteModalClose}
        isOpen={inviteModalOpen}
      >
        <Invite onSubmit={handleInviteModalClose} />
      </Modal>
    </Flex>
  );
}

export default observer(AddPeopleToGroup);
