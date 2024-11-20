import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import User from "~/models/User";
import { Avatar } from "~/components/Avatar";
import Badge from "~/components/Badge";
import Flex from "~/components/Flex";
import TableFromParams from "~/components/TableFromParams";
import Time from "~/components/Time";
import useCurrentUser from "~/hooks/useCurrentUser";
import UserMenu from "~/menus/UserMenu";

type Props = Omit<React.ComponentProps<typeof TableFromParams>, "columns"> & {
  data: User[];
  canManage: boolean;
};

function PeopleTable({ canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const columns = React.useMemo(
    () =>
      [
        {
          id: "name",
          Header: t("Name"),
          accessor: "name",
          Cell: observer(
            ({ value, row }: { value: string; row: { original: User } }) => (
              <Flex align="center" gap={8}>
                <Avatar model={row.original} size={32} /> {value}{" "}
                {currentUser.id === row.original.id && `(${t("You")})`}
              </Flex>
            )
          ),
        },
        canManage
          ? {
              id: "email",
              Header: t("Email"),
              accessor: "email",
              Cell: observer(({ value }: { value: string }) => <>{value}</>),
            }
          : undefined,
        {
          id: "lastActiveAt",
          Header: t("Last active"),
          accessor: "lastActiveAt",
          Cell: observer(({ value }: { value: string }) =>
            value ? <Time dateTime={value} addSuffix /> : null
          ),
        },
        {
          id: "role",
          Header: t("Role"),
          accessor: "rank",
          Cell: observer(({ row }: { row: { original: User } }) => (
            <Badges>
              {!row.original.lastActiveAt && <Badge>{t("Invited")}</Badge>}
              {row.original.isAdmin ? (
                <Badge primary>{t("Admin")}</Badge>
              ) : row.original.isViewer ? (
                <Badge>{t("Viewer")}</Badge>
              ) : row.original.isGuest ? (
                <Badge yellow>{t("Guest")}</Badge>
              ) : (
                <Badge>{t("Editor")}</Badge>
              )}
              {row.original.isSuspended && <Badge>{t("Suspended")}</Badge>}
            </Badges>
          )),
        },
        canManage
          ? {
              Header: " ",
              accessor: "id",
              className: "actions",
              disableSortBy: true,
              Cell: observer(
                ({ row, value }: { value: string; row: { original: User } }) =>
                  currentUser.id !== value ? (
                    <UserMenu user={row.original} />
                  ) : null
              ),
            }
          : undefined,
      ].filter((i) => i),
    [t, canManage, currentUser]
  );

  return <TableFromParams columns={columns} {...rest} />;
}

const Badges = styled.div`
  margin-left: -10px;
`;

export default observer(PeopleTable);
