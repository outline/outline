// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTable, useSortBy, usePagination } from "react-table";
import styled from "styled-components";
import User from "models/User";
import Flex from "components/Flex";

type Props = {|
  data: User[],
  fetchData: ({
    offset: number,
    limit: number,
    sort: ?number,
    direction: "ASC" | "DESC",
  }) => Promise<void>,
  offset: number,
  totalPages: number,
  canUpdate: boolean,
  columns: any,
|};

function Table({
  data,
  fetchData,
  offset,
  totalPages,
  canUpdate,
  columns,
}: Props) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { pageIndex, pageSize, sortBy },
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      manualSortBy: true,
      autoResetPage: false,
      autoResetSortBy: false,
      pageCount: totalPages,
      initialState: {
        sortBy: [{ id: "name", desc: false }],
        pageSize: 50,
      },
    },
    useSortBy,
    usePagination
  );

  React.useEffect(() => {
    fetchData({
      offset: pageIndex,
      limit: pageSize,
      sort: sortBy.length ? sortBy[0].id : undefined,
      direction: sortBy.length && sortBy[0].desc ? "DESC" : "ASC",
    });
  }, [sortBy, fetchData, pageSize, pageIndex]);

  return (
    <Wrapper {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <Head {...column.getHeaderProps(column.getSortByToggleProps())}>
                <SortWrapper align="center" gap={4}>
                  {column.render("Header")}
                  {column.isSorted &&
                    (column.isSortedDesc ? <DescIcon /> : <AscIcon />)}
                </SortWrapper>
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
    </Wrapper>
  );
}

const DescIcon = styled(CollapsedIcon)`
  &:hover {
    fill: ${(props) => props.theme.text};
  }
`;

const AscIcon = styled(DescIcon)`
  transform: rotate(180deg);
`;

const Wrapper = styled.table`
  border-collapse: collapse;
  margin: 16px 0;
  width: 100%;
`;

const SortWrapper = styled(Flex)`
  height: 24px;
`;

const Cell = styled.td`
  padding: 8px 0;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  font-size: 14px;

  &:first-child {
    font-size: 15px;
    font-weight: 500;
  }

  &:last-child {
    text-align: right;
    vertical-align: bottom;
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
  color: ${(props) => props.theme.textSecondary};
  font-weight: 500;
  z-index: 1;
`;

export default observer(Table);
