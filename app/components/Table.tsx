import { isEqual } from "lodash";
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTable, useSortBy, usePagination } from "react-table";
import styled from "styled-components";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import PlaceholderText from "~/components/PlaceholderText";

export type Props = {
  data: any[];
  offset?: number;
  isLoading: boolean;
  empty?: React.ReactNode;
  currentPage?: number;
  page: number;
  pageSize?: number;
  totalPages?: number;
  defaultSort?: string;
  topRef?: React.Ref<any>;
  onChangePage: (index: number) => void;
  onChangeSort: (
    sort: string | null | undefined,
    direction: "ASC" | "DESC"
  ) => void;
  columns: any;
  defaultSortDirection: "ASC" | "DESC";
};

function Table({
  data,
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'canNextPage' does not exist on type 'Tab... Remove this comment to see the full error message
    canNextPage,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'nextPage' does not exist on type 'TableI... Remove this comment to see the full error message
    nextPage,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'canPreviousPage' does not exist on type ... Remove this comment to see the full error message
    canPreviousPage,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'previousPage' does not exist on type 'Ta... Remove this comment to see the full error message
    previousPage,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'pageIndex' does not exist on type 'Table... Remove this comment to see the full error message
    state: { pageIndex, sortBy },
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
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ sortBy: { id: string; desc: boolean; }[]; ... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'sortBy' does not exist on type 'TableSta... Remove this comment to see the full error message
        if (!isEqual(newState.sortBy, prevState.sortBy)) {
          return { ...newState, pageIndex: 0 };
        }

        return newState;
      },
    },
    useSortBy,
    usePagination
  );
  const prevSortBy = React.useRef(sortBy);

  React.useEffect(() => {
    if (!isEqual(sortBy, prevSortBy.current)) {
      prevSortBy.current = sortBy;
      onChangePage(0);
      onChangeSort(
        sortBy.length ? sortBy[0].id : undefined,
        !sortBy.length ? defaultSortDirection : sortBy[0].desc ? "DESC" : "ASC"
      );
    }
  }, [defaultSortDirection, onChangePage, onChangeSort, sortBy]);

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
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'getSortByToggleProps' does not exist on ... Remove this comment to see the full error message
                <Head {...column.getHeaderProps(column.getSortByToggleProps())}>
                  <SortWrapper align="center" gap={4}>
                    {column.render("Header")}
                    {
                      // @ts-expect-error known issue: https://github.com/tannerlinsley/react-table/issues/2970
                      column.isSorted &&
                        // @ts-expect-error ts-migrate(2339) FIXME: Property 'isSortedDesc' does not exist on type 'He... Remove this comment to see the full error message
                        (column.isSortedDesc ? (
                          <DescSortIcon />
                        ) : (
                          <AscSortIcon />
                        ))
                    }
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
                        // @ts-expect-error ts-migrate(2339) FIXME: Property 'className' does not exist on type 'Colum... Remove this comment to see the full error message
                        className: cell.column.className,
                      },
                    ])}
                  >
                    {cell.render("Cell")}
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
  columns: number;
  rows?: number;
}) => {
  return (
    <tbody>
      {new Array(rows).fill(1).map((_, row) => (
        <Row key={row}>
          {new Array(columns).fill(1).map((_, col) => (
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
  padding: 6px;
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

const Row = styled.tr`
  ${Cell} {
    &:first-child {
      padding-left: 0;
    }
    &:last-child {
      padding-right: 0;
    }
  }
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
  padding: 6px;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  font-size: 14px;
  color: ${(props) => props.theme.textSecondary};
  font-weight: 500;
  z-index: 1;

  :first-child {
    padding-left: 0;
  }

  :last-child {
    padding-right: 0;
  }
`;

export default observer(Table);
