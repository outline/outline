import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { EmptySelectValue, Permission } from "~/types";
import { ListItem } from "../components/ListItem";

type Props = {
  /** Collection to which team members are supposed to be invited */
  collection: Collection;
  /** Children to be rendered before the list of members */
  children?: React.ReactNode;
  /** List of users and groups that have been invited during the current editing session */
  invitedInSession: string[];
};

function CollectionMemberList({ collection, invitedInSession }: Props) {
  const { memberships, collectionGroupMemberships } = useStores();
  const can = usePolicy(collection);
  const { t } = useTranslation();
  const theme = useTheme();
  const collectionId = collection.id;

  const { request: fetchMemberships } = useRequest(
    React.useCallback(
      () => memberships.fetchAll({ id: collectionId }),
      [memberships, collectionId]
    )
  );

  const { request: fetchGroupMemberships } = useRequest(
    React.useCallback(
      () => collectionGroupMemberships.fetchAll({ id: collectionId }),
      [collectionGroupMemberships, collectionId]
    )
  );

  React.useEffect(() => {
    void fetchMemberships();
    void fetchGroupMemberships();
  }, [fetchMemberships, fetchGroupMemberships]);

  const permissions = React.useMemo(
    () =>
      [
        {
          label: t("View only"),
          value: CollectionPermission.Read,
        },
        {
          label: t("Can edit"),
          value: CollectionPermission.ReadWrite,
        },
        {
          label: t("Manage"),
          value: CollectionPermission.Admin,
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
    <>
      {collectionGroupMemberships
        .inCollection(collection.id)
        .sort((a, b) =>
          (
            (invitedInSession.includes(a.group.id) ? "_" : "") + a.group.name
          ).localeCompare(b.group.name)
        )
        .map((membership) => (
          <ListItem
            key={membership.id}
            image={
              <Squircle color={theme.text} size={AvatarSize.Medium}>
                <GroupIcon color={theme.background} size={16} />
              </Squircle>
            }
            title={membership.group.name}
            subtitle={t("{{ count }} member", {
              count: membership.group.memberCount,
            })}
            actions={
              <div style={{ marginRight: -8 }}>
                <InputMemberPermissionSelect
                  style={{ margin: 0 }}
                  permissions={permissions}
                  onChange={async (
                    permission: CollectionPermission | typeof EmptySelectValue
                  ) => {
                    if (permission === EmptySelectValue) {
                      await collectionGroupMemberships.delete({
                        collectionId: collection.id,
                        groupId: membership.groupId,
                      });
                    } else {
                      await collectionGroupMemberships.create({
                        collectionId: collection.id,
                        groupId: membership.groupId,
                        permission,
                      });
                    }
                  }}
                  disabled={!can.update}
                  value={membership.permission}
                  labelHidden
                  nude
                />
              </div>
            }
          />
        ))}
      {memberships
        .inCollection(collection.id)
        .sort((a, b) =>
          (
            (invitedInSession.includes(a.user.id) ? "_" : "") + a.user.name
          ).localeCompare(b.user.name)
        )
        .map((membership) => (
          <ListItem
            key={membership.id}
            image={
              <Avatar
                model={membership.user}
                size={AvatarSize.Medium}
                showBorder={false}
              />
            }
            title={membership.user.name}
            subtitle={membership.user.email}
            actions={
              <div style={{ marginRight: -8 }}>
                <InputMemberPermissionSelect
                  style={{ margin: 0 }}
                  permissions={permissions}
                  onChange={async (
                    permission: CollectionPermission | typeof EmptySelectValue
                  ) => {
                    if (permission === EmptySelectValue) {
                      await memberships.delete({
                        collectionId: collection.id,
                        userId: membership.userId,
                      });
                    } else {
                      await memberships.create({
                        collectionId: collection.id,
                        userId: membership.userId,
                        permission,
                      });
                    }
                  }}
                  disabled={!can.update}
                  value={membership.permission}
                  labelHidden
                  nude
                />
              </div>
            }
          />
        ))}
    </>
  );
}

export default observer(CollectionMemberList);
