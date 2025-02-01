import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import Group from "~/models/Group";
import User from "~/models/User";
import Invite from "~/scenes/Invite";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import ButtonLink from "~/components/ButtonLink";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DelayedMount from "~/components/DelayedMount";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import PlaceholderList from "~/components/List/Placeholder";
import PaginatedList from "~/components/PaginatedList";
import { ListItem } from "~/components/Sharing/components/ListItem";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import GroupMemberMenu from "~/menus/GroupMemberMenu";

type Props = {
  group: Group;
  onSubmit: () => void;
};

export function CreateGroupDialog() {
  const { dialogs, groups } = useStores();
  const { t } = useTranslation();
  const [name, setName] = React.useState<string | undefined>();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      const group = new Group(
        {
          name,
        },
        groups
      );

      try {
        await group.save();
        dialogs.openModal({
          title: t("Group members"),
          content: <ViewGroupMembersDialog group={group} />,
          fullscreen: true,
        });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [t, dialogs, groups, name]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        <Trans>
          Groups are for organizing your team. They work best when centered
          around a function or a responsibility — Support or Engineering for
          example.
        </Trans>
      </Text>
      <Flex>
        <Input
          type="text"
          label="Name"
          onChange={(e) => setName(e.target.value)}
          value={name}
          required
          autoFocus
          flex
        />
      </Flex>
      <Text as="p" type="secondary">
        <Trans>You’ll be able to add people to the group next.</Trans>
      </Text>

      <Button type="submit" disabled={isSaving || !name}>
        {isSaving ? `${t("Creating")}…` : t("Continue")}
      </Button>
    </form>
  );
}

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

export const ViewGroupMembersDialog = observer(function ({
  group,
}: Pick<Props, "group">) {
  const { dialogs, users, groupUsers } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(group);

  const handleAddPeople = React.useCallback(() => {
    dialogs.openModal({
      title: t(`Add people to {{groupName}}`, {
        groupName: group.name,
      }),
      content: <AddPeopleToGroupDialog group={group} />,
      fullscreen: true,
    });
  }, [t, group, dialogs]);

  const handleRemoveUser = React.useCallback(
    async (user: User) => {
      try {
        await groupUsers.delete({
          groupId: group.id,
          userId: user.id,
        });
        toast.success(
          t(`{{userName}} was removed from the group`, {
            userName: user.name,
          }),
          {
            icon: <Avatar model={user} size={AvatarSize.Toast} />,
          }
        );
      } catch (err) {
        toast.error(t("Could not remove user"));
      }
    },
    [t, groupUsers, group.id]
  );

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
          {can.update && (
            <span>
              <Button
                type="button"
                onClick={handleAddPeople}
                icon={<PlusIcon />}
                neutral
              >
                {t("Add people")}…
              </Button>
            </span>
          )}
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
        renderItem={(user: User) => (
          <GroupMemberListItem
            key={user.id}
            user={user}
            onRemove={can.update ? () => handleRemoveUser(user) : undefined}
          />
        )}
      />
    </Flex>
  );
});

const AddPeopleToGroupDialog = observer(function ({
  group,
}: Pick<Props, "group">) {
  const { dialogs, users, groupUsers } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const [query, setQuery] = React.useState("");

  const debouncedFetch = React.useMemo(
    () => debounce((q) => users.fetchPage({ query: q }), 250),
    [users]
  );

  const handleFilter = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      const updatedQuery = ev.target.value;
      setQuery(updatedQuery);
      void debouncedFetch(updatedQuery);
    },
    [debouncedFetch]
  );

  const handleAddUser = React.useCallback(
    async (user: User) => {
      try {
        await groupUsers.create({
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
    },
    [t, groupUsers, group.id]
  );

  const handleInvitePeople = React.useCallback(() => {
    const id = uuidv4();
    dialogs.openModal({
      id,
      title: t("Invite people"),
      content: <Invite onSubmit={() => dialogs.closeModal(id)} />,
    });
  }, [t, dialogs]);

  const { loading } = useRequest(
    React.useCallback(
      () => groupUsers.fetchAll({ id: group.id }),
      [groupUsers, group]
    ),
    true
  );

  return (
    <Flex column>
      <Text as="p" type="secondary">
        {t(
          "Add members below to give them access to the group. Need to add someone who’s not yet a member?"
        )}{" "}
        {can.inviteUser ? (
          <ButtonLink onClick={handleInvitePeople}>
            {t("Invite them to {{teamName}}", {
              teamName: team.name,
            })}
          </ButtonLink>
        ) : (
          t("Ask an admin to invite them first")
        )}
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
      {loading ? (
        <DelayedMount>
          <PlaceholderList count={5} />
        </DelayedMount>
      ) : (
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
      )}
    </Flex>
  );
});

type GroupMemberListItemProps = {
  user: User;
  onAdd?: () => Promise<void>;
  onRemove?: () => Promise<void>;
};

const GroupMemberListItem = observer(function ({
  user,
  onRemove,
  onAdd,
}: GroupMemberListItemProps) {
  const { t } = useTranslation();

  return (
    <ListItem
      title={user.name}
      subtitle={
        <>
          {user.lastActiveAt ? (
            <Trans>
              Active <Time dateTime={user.lastActiveAt} /> ago
            </Trans>
          ) : (
            t("Never signed in")
          )}
          {user.isInvited && <Badge>{t("Invited")}</Badge>}
          {user.isAdmin && <Badge primary={user.isAdmin}>{t("Admin")}</Badge>}
        </>
      }
      image={<Avatar model={user} size={AvatarSize.Large} />}
      actions={
        <Flex align="center">
          {onRemove && <GroupMemberMenu onRemove={onRemove} />}
          {onAdd && (
            <Button onClick={onAdd} neutral>
              {t("Add")}
            </Button>
          )}
        </Flex>
      }
    />
  );
});
