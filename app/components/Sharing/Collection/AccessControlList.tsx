import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import { Avatar, GroupAvatar, AvatarSize } from "~/components/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import InputSelectPermission from "~/components/InputSelectPermission";
import Scrollable from "~/components/Scrollable";
import useMaxHeight from "~/hooks/useMaxHeight";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { EmptySelectValue, Permission } from "~/types";
import { ListItem } from "../components/ListItem";
import { Placeholder } from "../components/Placeholder";

type Props = {
  /** Collection to which team members are supposed to be invited */
  collection: Collection;
  /** Children to be rendered before the list of members */
  children?: React.ReactNode;
  /** List of users and groups that have been invited during the current editing session */
  invitedInSession: string[];
};

export const AccessControlList = observer(
  ({ collection, invitedInSession }: Props) => {
    const { memberships, groupMemberships } = useStores();
    const can = usePolicy(collection);
    const { t } = useTranslation();
    const theme = useTheme();
    const collectionId = collection.id;

    const { request: fetchMemberships, loading: membershipLoading } =
      useRequest(
        React.useCallback(
          () => memberships.fetchAll({ id: collectionId }),
          [memberships, collectionId]
        )
      );

    const { request: fetchGroupMemberships, loading: groupMembershipLoading } =
      useRequest(
        React.useCallback(
          () => groupMemberships.fetchAll({ collectionId }),
          [groupMemberships, collectionId]
        )
      );

    const groupMembershipsInCollection =
      groupMemberships.inCollection(collectionId);
    const membershipsInCollection = memberships.inCollection(collectionId);
    const hasMemberships =
      groupMembershipsInCollection.length > 0 ||
      membershipsInCollection.length > 0;
    const showLoading =
      !hasMemberships && (membershipLoading || groupMembershipLoading);

    React.useEffect(() => {
      void fetchMemberships();
      void fetchGroupMemberships();
    }, [fetchMemberships, fetchGroupMemberships]);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { maxHeight, calcMaxHeight } = useMaxHeight({
      elementRef: containerRef,
      maxViewportPercentage: 70,
    });

    React.useEffect(() => {
      calcMaxHeight();
    });

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
      <ScrollableContainer
        ref={containerRef}
        hiddenScrollbars
        style={{ maxHeight }}
      >
        {showLoading ? (
          <Placeholder count={2} />
        ) : (
          <>
            <ListItem
              image={
                <Squircle color={theme.accent} size={AvatarSize.Medium}>
                  <UserIcon color={theme.accentText} size={16} />
                </Squircle>
              }
              title={t("All members")}
              subtitle={t("Everyone in the workspace")}
              actions={
                <div style={{ marginRight: -8 }}>
                  <InputSelectPermission
                    style={{ margin: 0 }}
                    onChange={(
                      value: CollectionPermission | typeof EmptySelectValue
                    ) => {
                      void collection.save({
                        permission: value === EmptySelectValue ? null : value,
                      });
                    }}
                    disabled={!can.update}
                    value={collection?.permission}
                    labelHidden
                    nude
                  />
                </div>
              }
            />
            {groupMembershipsInCollection
              .filter((membership) => membership.group)
              .sort((a, b) =>
                (
                  (invitedInSession.includes(a.group.id) ? "_" : "") +
                  a.group.name
                ).localeCompare(b.group.name)
              )
              .map((membership) => (
                <ListItem
                  key={membership.id}
                  image={
                    <GroupAvatar
                      group={membership.group}
                      backgroundColor={theme.modalBackground}
                    />
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
                          permission:
                            | CollectionPermission
                            | typeof EmptySelectValue
                        ) => {
                          try {
                            if (permission === EmptySelectValue) {
                              await groupMemberships.delete({
                                collectionId: collection.id,
                                groupId: membership.groupId,
                              });
                            } else {
                              await groupMemberships.create({
                                collectionId: collection.id,
                                groupId: membership.groupId,
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
                        value={membership.permission}
                        labelHidden
                        nude
                      />
                    </div>
                  }
                />
              ))}
            {membershipsInCollection
              .filter((membership) => membership.user)
              .sort((a, b) =>
                (
                  (invitedInSession.includes(a.user.id) ? "_" : "") +
                  a.user.name
                ).localeCompare(b.user.name)
              )
              .map((membership) => (
                <ListItem
                  key={membership.id}
                  image={
                    <Avatar model={membership.user} size={AvatarSize.Medium} />
                  }
                  title={membership.user.name}
                  subtitle={membership.user.email}
                  actions={
                    <div style={{ marginRight: -8 }}>
                      <InputMemberPermissionSelect
                        style={{ margin: 0 }}
                        permissions={permissions}
                        onChange={async (
                          permission:
                            | CollectionPermission
                            | typeof EmptySelectValue
                        ) => {
                          try {
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
                          } catch (err) {
                            toast.error(err.message);
                            return false;
                          }
                          return true;
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
        )}
      </ScrollableContainer>
    );
  }
);

const ScrollableContainer = styled(Scrollable)`
  padding: 12px 24px;
  margin: -12px -24px;
`;
