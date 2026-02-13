import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Group from "~/models/Group";
import type User from "~/models/User";
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
import type { Item } from "~/components/InputSelect";
import { InputSelect } from "~/components/InputSelect";
import PlaceholderList from "~/components/List/Placeholder";
import PaginatedList from "~/components/PaginatedList";
import { ListItem } from "~/components/Sharing/components/ListItem";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import { GroupPermission } from "@shared/types";
import { GroupValidation } from "@shared/validations";
import type { Permission } from "~/types";
import { EmptySelectValue } from "~/types";
import type GroupUser from "~/models/GroupUser";
import Switch from "~/components/Switch";

type Props = {
  group: Group;
  onSubmit: () => void;
};

export function CreateGroupDialog() {
  const { dialogs, groups } = useStores();
  const { t } = useTranslation();
  const [name, setName] = React.useState<string | undefined>();
  const [description, setDescription] = React.useState<string | undefined>();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      const group = new Group(
        {
          name,
          description,
        },
        groups
      );

      try {
        await group.save();
        dialogs.closeAllModals();
        dialogs.openModal({
          title: t("Group members"),
          content: <ViewGroupMembersDialog group={group} />,
        });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [t, dialogs, groups, name, description]
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
      <Flex column>
        <Input
          type="text"
          label="Name"
          onChange={(e) => setName(e.target.value)}
          value={name}
          required
          autoFocus
          flex
        />
        <Input
          type="textarea"
          label="Description"
          placeholder={t("Optional")}
          onChange={(e) => setDescription(e.target.value)}
          value={description || ""}
          maxLength={GroupValidation.maxDescriptionLength}
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
  const [description, setDescription] = React.useState(group.description || "");
  const [disableMentions, setDisableMentions] = React.useState(
    group.disableMentions || false
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await group.save({
          name,
          description,
          disableMentions,
        });
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [group, onSubmit, name, description, disableMentions]
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
      <Flex column>
        <Input
          type="text"
          label={t("Name")}
          onChange={handleNameChange}
          value={name}
          required
          autoFocus
          flex
        />
        <Input
          type="textarea"
          label={t("Description")}
          placeholder={t("Optional")}
          onChange={(e) => setDescription(e.target.value)}
          value={description}
          maxLength={GroupValidation.maxDescriptionLength}
          flex
        />
        <Switch
          id="mentions"
          label={t("Disable mentions")}
          note={t(
            "Prevent this group from being mentionable in documents or comments"
          )}
          checked={disableMentions}
          onChange={setDisableMentions}
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
  const [query, setQuery] = React.useState("");
  const [permissionFilter, setPermissionFilter] = React.useState<
    GroupPermission | "all"
  >("all");

  const handleAddPeople = React.useCallback(() => {
    dialogs.openModal({
      title: t(`Add people to {{groupName}}`, {
        groupName: group.name,
      }),
      content: <AddPeopleToGroupDialog group={group} />,
      replace: true,
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
      } catch (_err) {
        toast.error(t("Could not remove user"));
      }
    },
    [t, groupUsers, group.id]
  );

  const handleFilter = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(ev.target.value);
    },
    []
  );

  const handlePermissionFilterChange = React.useCallback((value: string) => {
    setPermissionFilter(value as GroupPermission | "all");
  }, []);

  const permissionOptions: Item[] = React.useMemo(
    () => [
      {
        type: "item",
        label: t("All permissions"),
        value: "all",
      },
      {
        type: "item",
        label: t("Group admin"),
        value: GroupPermission.Admin,
      },
      {
        type: "item",
        label: t("Member"),
        value: GroupPermission.Member,
      },
    ],
    [t]
  );

  const filteredUsers = React.useMemo(() => {
    let result = users.inGroup(group.id, query);

    if (permissionFilter !== "all") {
      const groupUserMap = new Map(
        groupUsers.orderedData
          .filter((gu) => gu.groupId === group.id)
          .map((gu) => [gu.userId, gu])
      );

      result = result.filter((user) => {
        const groupUser = groupUserMap.get(user.id);
        return groupUser?.permission === permissionFilter;
      });
    }

    return result;
  }, [users, group.id, query, permissionFilter, groupUsers.orderedData]);

  const hasActiveFilters = query || permissionFilter !== "all";

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
          <br />
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
      {(filteredUsers.length || hasActiveFilters) && (
        <Flex gap={8}>
          <Input
            type="search"
            placeholder={`${t("Search by name")}…`}
            value={query}
            onChange={handleFilter}
            label={t("Search members")}
            labelHidden
            flex
          />
          <InputSelect
            options={permissionOptions}
            value={permissionFilter}
            onChange={handlePermissionFilterChange}
            label={t("Filter by permissions")}
            hideLabel
            short
          />
        </Flex>
      )}
      <PaginatedList<User>
        items={filteredUsers}
        fetch={groupUsers.fetchPage}
        options={{
          id: group.id,
        }}
        empty={
          hasActiveFilters ? (
            <Empty>{t("No members matching your filters")}</Empty>
          ) : (
            <Empty>{t("This group has no members.")}</Empty>
          )
        }
        renderItem={(user) => (
          <GroupMemberListItem
            key={user.id}
            user={user}
            group={group}
            groupUser={groupUsers.orderedData.find(
              (gu) => gu.userId === user.id && gu.groupId === group.id
            )}
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
      } catch (_err) {
        toast.error(t("Could not add user"));
      }
    },
    [t, groupUsers, group.id]
  );

  const handleInvitePeople = React.useCallback(() => {
    dialogs.openModal({
      title: t("Invite people"),
      content: <Invite onSubmit={dialogs.closeAllModals} />,
      replace: true,
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
        <PaginatedList<User>
          empty={
            query ? (
              <Empty>{t("No people matching your search")}</Empty>
            ) : (
              <Empty>{t("No people left to add")}</Empty>
            )
          }
          items={users.notInGroup(group.id, query)}
          fetch={query ? undefined : users.fetchPage}
          renderItem={(item) => (
            <GroupMemberListItem
              key={item.id}
              user={item}
              group={group}
              groupUser={undefined}
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
  group: Group;
  groupUser: GroupUser | undefined;
  onAdd?: () => Promise<void>;
  onRemove?: () => Promise<void>;
};

const GroupMemberListItem = observer(function ({
  user,
  group,
  groupUser,
  onAdd,
}: GroupMemberListItemProps) {
  const { t } = useTranslation();
  const { groupUsers } = useStores();
  const can = usePolicy(group);

  const permissions = React.useMemo(
    () =>
      [
        {
          label: t("Group admin"),
          value: GroupPermission.Admin,
        },
        {
          label: t("Member"),
          value: GroupPermission.Member,
        },
        {
          divider: true,
          label: t("Remove"),
          value: EmptySelectValue,
        },
      ] as Permission[],
    [t]
  );

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
          {onAdd ? (
            <Button onClick={onAdd} neutral>
              {t("Add")}
            </Button>
          ) : (
            <div style={{ marginRight: -8 }}>
              <InputMemberPermissionSelect
                permissions={permissions}
                onChange={async (
                  permission: GroupPermission | typeof EmptySelectValue
                ) => {
                  try {
                    if (permission === EmptySelectValue) {
                      await groupUsers.delete({
                        userId: user.id,
                        groupId: group.id,
                      });
                    } else {
                      await groupUsers.update({
                        userId: user.id,
                        groupId: group.id,
                        permission,
                      });
                    }
                  } catch (err) {
                    toast.error(err.message);
                    return false;
                  }
                  return true;
                }}
                disabled={!can.update}
                value={groupUser?.permission}
              />
            </div>
          )}
        </Flex>
      }
    />
  );
});
