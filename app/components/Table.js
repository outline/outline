// @flow
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTable, useSortBy, usePagination } from "react-table";
import styled from "styled-components";
import Button from "components/Button";
import Empty from "components/Empty";
import Flex from "components/Flex";
import PlaceholderText from "components/PlaceholderText";

export type Props = {|
  data: any[],
  offset?: number,
  isLoading: boolean,
  empty?: React.Node,
  currentPage?: number,
  page: number,
  pageSize?: number,
  totalPages?: number,
  defaultSort?: string,
  topRef?: React.Ref<any>,
  onChangePage: (index: number) => void,
  onChangeSort: (sort: ?string, direction: "ASC" | "DESC") => void,
  columns: any,
  defaultSortDirection: "ASC" | "DESC",
|};

function Table({
  data,
  offset,
  isLoading,
  totalPages,
  empty,
  columns,
  page,
  pageSize = 50,
  defaultSort = "name",
  topRef,
  onChangeSort,
  onChangePage,
  defaultSortDirection,
}: Props) {
  const { t } = useTranslation();
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    canNextPage,
    nextPage,
    canPreviousPage,
    previousPage,
    state: { pageIndex },
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      manualSortBy: true,
      autoResetSortBy: false,
      autoResetPage: false,
      pageCount: totalPages,
      initialState: {
        sortBy: [
          {
            id: defaultSort,
            desc: defaultSortDirection === "DESC" ? true : false,
          },
        ],
        pageSize,
        pageIndex: page,
      },
      stateReducer: (newState, action, prevState) => {
        if (prevState.sortBy !== newState.sortBy) {
          onChangePage(0);
          onChangeSort(
            newState.sortBy.length ? newState.sortBy[0].id : undefined,
            !newState.sortBy.length
              ? defaultSortDirection
              : newState.sortBy[0].desc
              ? "DESC"
              : "ASC"
          );
          return { ...newState, pageIndex: 0 };
        }
      },
    },
    useSortBy,
    usePagination
  );

  const handleNextPage = () => {
    nextPage();
    onChangePage(pageIndex + 1);
  };

  const handlePreviousPage = () => {
    previousPage();
    onChangePage(pageIndex - 1);
  };

  const isEmpty = !isLoading && data.length === 0;
  const showPlaceholder = isLoading && data.length === 0;

  return (
    <>
      <Anchor ref={topRef} />
      <InnerTable {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <Head {...column.getHeaderProps(column.getSortByToggleProps())}>
                  <SortWrapper align="center" gap={4}>
                    {column.render("Header")}
                    {column.isSorted &&
                      (column.isSortedDesc ? (
                        <DescSortIcon />
                      ) : (
                        <AscSortIcon />
                      ))}
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
                  <Cell
                    {...cell.getCellProps([
                      {
                        className: cell.column.className,
                      },
                    ])}
                  >
                    <CellWrapper>{cell.render("Cell")}</CellWrapper>
                  </Cell>
                ))}
              </Row>
            );
          })}
        </tbody>
        {showPlaceholder && <Placeholder columns={columns.length} />}
      </InnerTable>
      {isEmpty ? (
        empty || <Empty>{t("No results")}</Empty>
      ) : (
        <Pagination
          justify={canPreviousPage ? "space-between" : "flex-end"}
          gap={8}
        >
          {/* Note: the page > 0 check shouldn't be needed here but is */}
          {canPreviousPage && page > 0 && (
            <Button onClick={handlePreviousPage} neutral>
              {t("Previous page")}
            </Button>
          )}
          {canNextPage && (
            <Button onClick={handleNextPage} neutral>
              {t("Next page")}
            </Button>
          )}
        </Pagination>
      )}
    </>
  );
}

export const Placeholder = ({
  columns,
  rows = 3,
}: {
  columns: number,
  rows?: number,
}) => {
  return (
    <tbody>
      {new Array(rows).fill().map((_, row) => (
        <Row key={row}>
          {new Array(columns).fill().map((_, col) => (
            <Cell key={col}>
              <PlaceholderText minWidth={25} maxWidth={75} />
            </Cell>
          ))}
        </Row>
      ))}
    </tbody>
  );
};

const Anchor = styled.div`
  top: -32px;
  position: relative;
`;

const Pagination = styled(Flex)`
  margin: 0 0 32px;
`;

const DescSortIcon = styled(CollapsedIcon)`
  &:hover {
    fill: ${(props) => props.theme.text};
  }
`;

const AscSortIcon = styled(DescSortIcon)`
  transform: rotate(180deg);
`;

const InnerTable = styled.table`
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

  &.actions,
  &.right-aligned {
    text-align: right;
    vertical-align: bottom;
  }
`;

const CellWrapper = styled(Flex)`
  margin: 4px;
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
