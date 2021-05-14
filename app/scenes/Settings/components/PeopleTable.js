// @flow
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTable, useSortBy, usePagination } from "react-table";
import styled from "styled-components";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Flex from "components/Flex";
import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import UserMenu from "menus/UserMenu";

type Props = {|
  data: User[],
  fetchData: ({
    offset: number,
    sort: number,
    direction: "ASC" | "DESC",
  }) => Promise<void>,
  offset: number,
  pageCount: number,
  canUpdate: boolean,
|};

function PeopleTable({
  data,
  fetchData,
  offset,
  pageCount: controlledPageCount,
  canUpdate,
}: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        Header: t("Name"),
        accessor: (item) => (
          <Flex align="center" gap={8}>
            <Avatar src={item.avatarUrl} size={32} /> {item.name}
          </Flex>
        ),
      },
      {
        id: "email",
        Header: t("Email"),
        accessor: "email",
      },
      {
        id: "lastActiveAt",
        Header: t("Last active"),
        accessor: (item) =>
          item.lastActiveAt && (
            <>
              {t("Active")} <Time dateTime={item.lastActiveAt} addSuffix />
            </>
          ),
      },
      {
        id: "isAdmin",
        Header: t("Role"),
        accessor: (item) => (
          <>
            {!item.lastActiveAt && <Badge>{t("Invited")}</Badge>}
            {item.isAdmin && <Badge primary>{t("Admin")}</Badge>}
            {item.isSuspended && <Badge>{t("Suspended")}</Badge>}
          </>
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

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { pageIndex, sortBy },
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      manualSortBy: true,
      autoResetPage: false,
      autoResetSortBy: false,
      pageCount: controlledPageCount,
    },
    useSortBy,
    usePagination
  );

  React.useEffect(() => {
    fetchData({
      offset: pageIndex,
      sort: sortBy.length ? sortBy[0].id : undefined,
      direction: sortBy.length && sortBy[0].desc ? "DESC" : "ASC",
    });
  }, [sortBy, fetchData, pageIndex]);

  return (
    <Table {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <Head {...column.getHeaderProps(column.getSortByToggleProps())}>
                <Flex align="center" gap={8}>
                  {column.render("Header")}
                  {column.isSorted &&
                    (column.isSortedDesc ? <CollapsedIcon /> : <AscIcon />)}
                </Flex>
              </Head>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row);
          return (
            <Row {...row.getRowProps()}>
              {row.cells.map((cell) => (
                <Cell {...cell.getCellProps()}>{cell.render("Cell")}</Cell>
              ))}
            </Row>
          );
        })}
      </tbody>
    </Table>
  );
}

const AscIcon = styled(CollapsedIcon)`
  transform: rotate(180deg);
`;

const Table = styled.table`
  border-collapse: collapse;
  margin-top: 16px;
  width: 100%;
`;

const Cell = styled.td`
  padding: 8px 0;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  font-size: 15px;

  &:first-child {
    font-weight: 500;
  }
`;

const Row = styled.tr`
  &:last-child {
    ${Cell} {
      border-bottom: 0;
    }
  }
`;

const Head = styled.th`
  text-align: left;
  position: sticky;
  top: 54px;
  padding: 6px 0;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  font-weight: 500;
  z-index: 1;
`;

export default PeopleTable;
