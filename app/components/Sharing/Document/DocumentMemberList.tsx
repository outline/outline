import orderBy from "lodash/orderBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { DocumentPermission } from "@shared/types";
import Document from "~/models/Document";
import UserMembership from "~/models/UserMembership";
import { GroupAvatar } from "~/components/Avatar";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { EmptySelectValue, Permission } from "~/types";
import { homePath } from "~/utils/routeHelpers";
import { ListItem } from "../components/ListItem";
import DocumentMemberListItem from "./DocumentMemberListItem";

type Props = {
  /** Document to which team members are supposed to be invited */
  document: Document;
  /** Children to be rendered before the list of members */
  children?: React.ReactNode;
  /** List of users that have been invited during the current editing session */
  invitedInSession: string[];
};

function DocumentMembersList({ document, invitedInSession }: Props) {
  const { userMemberships, groupMemberships } = useStores();

  const user = useCurrentUser();
  const history = useHistory();
  const can = usePolicy(document);
  const { t } = useTranslation();
  const theme = useTheme();

  const handleRemoveUser = React.useCallback(
    async (item) => {
      try {
        await userMemberships.delete({
          documentId: document.id,
          userId: item.id,
        } as UserMembership);

        if (item.id === user.id) {
          history.push(homePath());
        } else {
          toast.success(
            t(`{{ userName }} was removed from the document`, {
              userName: item.name,
            })
          );
        }
      } catch (err) {
        toast.error(t("Could not remove user"));
      }
    },
    [t, history, userMemberships, user, document]
  );

  const handleUpdateUser = React.useCallback(
    async (user, permission) => {
      try {
        await userMemberships.create({
          documentId: document.id,
          userId: user.id,
          permission,
        });
        toast.success(
          t(`Permissions for {{ userName }} updated`, {
            userName: user.name,
          })
        );
      } catch (err) {
        toast.error(t("Could not update user"));
      }
    },
    [t, userMemberships, document]
  );

  // Order newly added users first during the current editing session, on reload members are
  // ordered by name
  const members = React.useMemo(
    () =>
      orderBy(
        document.members,
        (user) =>
          (invitedInSession.includes(user.id) ? "_" : "") +
          user.name.toLocaleLowerCase(),
        "asc"
      ),
    [document.members, invitedInSession]
  );

  const permissions = React.useMemo(
    () =>
      [
        {
          label: t("View only"),
          value: DocumentPermission.Read,
        },
        {
          label: t("Can edit"),
          value: DocumentPermission.ReadWrite,
        },
        {
          label: t("Manage"),
          value: DocumentPermission.Admin,
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
      {groupMemberships
        .inDocument(document.id)
        .sort((a, b) =>
          (
            (invitedInSession.includes(a.group.id) ? "_" : "") + a.group.name
          ).localeCompare(b.group.name)
        )
        .map((membership) => {
          const MaybeLink = membership?.source ? StyledLink : React.Fragment;
          return (
            <ListItem
              key={membership.id}
              image={
                <GroupAvatar
                  group={membership.group}
                  backgroundColor={theme.modalBackground}
                />
              }
              title={membership.group.name}
              subtitle={
                membership.sourceId ? (
                  <Trans>
                    Has access through{" "}
                    <MaybeLink
                      // @ts-expect-error to prop does not exist on React.Fragment
                      to={membership.source?.document?.path ?? ""}
                    >
                      parent
                    </MaybeLink>
                  </Trans>
                ) : (
                  t("{{ count }} member", {
                    count: membership.group.memberCount,
                  })
                )
              }
              actions={
                <div style={{ marginRight: -8 }}>
                  <InputMemberPermissionSelect
                    style={{ margin: 0 }}
                    permissions={permissions}
                    onChange={async (
                      permission: DocumentPermission | typeof EmptySelectValue
                    ) => {
                      if (permission === EmptySelectValue) {
                        await groupMemberships.delete({
                          documentId: document.id,
                          groupId: membership.groupId,
                        });
                      } else {
                        await groupMemberships.create({
                          documentId: document.id,
                          groupId: membership.groupId,
                          permission,
                        });
                      }
                    }}
                    disabled={!can.manageUsers}
                    value={membership.permission}
                    labelHidden
                    nude
                  />
                </div>
              }
            />
          );
        })}
      {members.map((item) => (
        <DocumentMemberListItem
          key={item.id}
          user={item}
          membership={item.getMembership(document)}
          onRemove={() => handleRemoveUser(item)}
          onUpdate={
            can.manageUsers
              ? (permission) => handleUpdateUser(item, permission)
              : undefined
          }
          onLeave={
            item.id === user.id ? () => handleRemoveUser(item) : undefined
          }
        />
      ))}
    </>
  );
}

const StyledLink = styled(Link)`
  color: ${s("textTertiary")};
  text-decoration: underline;
`;

export default observer(DocumentMembersList);
