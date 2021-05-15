// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Flex from "components/Flex";
import Table from "components/Table";
import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import UserMenu from "menus/UserMenu";

type Props = {|
  data: User[],
  fetchData: ({
    offset: number,
    limit: number,
    sort: number,
    direction: "ASC" | "DESC",
  }) => Promise<void>,
  offset: number,
  pageCount: number,
  canUpdate: boolean,
|};

function PeopleTable({ canUpdate, ...rest }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        Header: t("Name"),
        Cell: (d) => <ObserverCell {...d} />,
        accessor: (item) => (
          <Flex align="center" gap={8}>
            <Avatar src={item.avatarUrl} size={32} /> {item.name}
          </Flex>
        ),
      },
      {
        id: "email",
        Header: t("Email"),
        Cell: (d) => <ObserverCell {...d} />,
        accessor: "email",
      },
      {
        id: "lastActiveAt",
        Header: t("Last active"),
        Cell: (d) => <ObserverCell {...d} />,
        accessor: (item) =>
          item.lastActiveAt && <Time dateTime={item.lastActiveAt} addSuffix />,
      },
      {
        id: "isAdmin",
        Header: t("Role"),
        Cell: (d) => <ObserverCell {...d} />,
        accessor: (item) => (
          <Badges>
            {!item.lastActiveAt && <Badge>{t("Invited")}</Badge>}
            {item.isAdmin && <Badge primary>{t("Admin")}</Badge>}
            {item.isViewer && <Badge>{t("Viewer")}</Badge>}
            {item.isSuspended && <Badge>{t("Suspended")}</Badge>}
          </Badges>
        ),
      },
      {
        Header: " ",
        accessor: (item) =>
          canUpdate && currentUser.id !== item.id && <UserMenu user={item} />,
      },
    ],
    [t, canUpdate, currentUser]
  );

  return <Table columns={columns} {...rest} />;
}

const Badges = styled.div`
  margin-left: -10px;
`;

const Cell = ({ value }) => {
  return value;
};

const ObserverCell = observer(Cell);

export default PeopleTable;
