import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  flexRender,
  ColumnSort,
  functionalUpdate,
  Row as TRow,
  createColumnHelper,
  AccessorFn,
  CellContext,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import { s } from "@shared/styles";
import DelayedMount from "~/components/DelayedMount";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import PlaceholderText from "~/components/PlaceholderText";
import usePrevious from "~/hooks/usePrevious";

type DataColumn<TData> = {
  type: "data";
  header: string;
  accessor: AccessorFn<TData>;
  sortable?: boolean;
};

type ActionColumn = {
  type: "action";
  header?: string;
};

export type Column<TData> = {
  id: string;
  component: (data: TData) => React.ReactNode;
} & (DataColumn<TData> | ActionColumn);

export type Props<TData> = {
  data: TData[];
  columns: Column<TData>[];
  sort: ColumnSort;
  onChangeSort: (sort: ColumnSort) => void;
  loading: boolean;
  page: {
    hasNext: boolean;
    fetchNext?: () => void;
  };
  rowHeight: number;
  gridColumns: string;
};

function Table<TData>({
  data,
  columns,
  sort,
  onChangeSort,
  loading,
  page,
  rowHeight,
  gridColumns,
}: Props<TData>) {
  const { t } = useTranslation();
  const containerRef = React.useRef(null);

  const columnHelper = createColumnHelper<TData>();
  const observedColumns = columns.map((column) => {
    const cell = ({ row }: CellContext<TData, unknown>) => (
      <ObservedCell data={row.original} render={column.component} />
    );

    return column.type === "data"
      ? columnHelper.accessor(column.accessor, {
          id: column.id,
          header: column.header,
          enableSorting: column.sortable ?? true,
          cell,
        })
      : columnHelper.display({
          id: column.id,
          header: column.header ?? "",
          cell,
        });
  });

  const handleChangeSort = React.useCallback(
    (sortState: SortingState) => {
      const newState = functionalUpdate(sortState, [sort]);
      const newSort = newState[0];
      onChangeSort(newSort);
    },
    [sort, onChangeSort]
  );

  const prevSort = usePrevious(sort);
  const sortChanged = sort !== prevSort;

  const isEmpty = !loading && data.length === 0;
  const showPlaceholder = loading && data.length === 0;

  const table = useReactTable({
    data,
    columns: observedColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    state: {
      sorting: [sort],
    },
    onSortingChange: handleChangeSort,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => containerRef.current,
    overscan: 5,
  });

  React.useEffect(() => {
    rowVirtualizer.scrollToOffset?.(0, { behavior: "smooth" });
  }, [sortChanged, rowVirtualizer]);

  return (
    <Container ref={containerRef} $empty={isEmpty}>
      <InnerTable>
        <thead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <Row key={headerGroup.id} $columns={gridColumns}>
              {headerGroup.headers.map((header) => (
                <Head key={header.id}>
                  <SortWrapper
                    align="center"
                    gap={4}
                    onClick={header.column.getToggleSortingHandler()}
                    $sortable={header.column.getCanSort()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <AscSortIcon />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <DescSortIcon />
                    ) : (
                      <div />
                    )}
                  </SortWrapper>
                </Head>
              ))}
            </Row>
          ))}
        </thead>

        <tbody
          style={{
            position: "relative",
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index] as TRow<TData>;
            return (
              <Row
                key={row.id}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
                $columns={gridColumns}
              >
                {row.getAllCells().map((cell) => (
                  <Cell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Cell>
                ))}
              </Row>
            );
          })}
        </tbody>
        {showPlaceholder && (
          <Placeholder columns={columns.length} gridColumns={gridColumns} />
        )}
      </InnerTable>
      {page.hasNext && (
        <Waypoint
          key={data?.length}
          onEnter={page.fetchNext}
          bottomOffset={-rowHeight * 5}
        />
      )}
      {isEmpty && <Empty>{t("No results")}</Empty>}
    </Container>
  );
}

const ObservedCell = observer(function <TData>({
  data,
  render,
}: {
  data: TData;
  render: (data: TData) => React.ReactNode;
}) {
  return <>{render(data)}</>;
});

function Placeholder({
  columns,
  rows = 3,
  gridColumns,
}: {
  columns: number;
  rows?: number;
  gridColumns: string;
}) {
  return (
    <DelayedMount>
      <tbody>
        {new Array(rows).fill(1).map((_r, row) => (
          <Row key={row} $columns={gridColumns}>
            {new Array(columns).fill(1).map((_c, col) => (
              <Cell key={col}>
                <PlaceholderText minWidth={25} maxWidth={75} />
              </Cell>
            ))}
          </Row>
        ))}
      </tbody>
    </DelayedMount>
  );
}

const DescSortIcon = styled(CollapsedIcon)`
  margin-left: -2px;

  &:hover {
    fill: ${s("text")};
  }
`;

const AscSortIcon = styled(DescSortIcon)`
  transform: rotate(180deg);
`;

const Container = styled.div<{ $empty: boolean }>`
  overflow: auto;
  height: ${({ $empty }) => !$empty && "max(700px, 70vh)"};
  width: 100%;
  margin-top: 16px;
`;

const InnerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const SortWrapper = styled(Flex)<{ $sortable: boolean }>`
  display: inline-flex;
  height: 24px;
  user-select: none;
  border-radius: 4px;
  white-space: nowrap;
  margin: 0 -4px;
  padding: 0 4px;
  cursor: ${(props) => (props.$sortable ? `var(--pointer)` : "")};

  &:hover {
    background: ${(props) =>
      props.$sortable ? props.theme.backgroundSecondary : "none"};
  }
`;

const Cell = styled.td`
  padding: 10px 6px;
  font-size: 14px;
  text-wrap: wrap;
  word-break: break-word;

  &:first-child {
    font-size: 15px;
    font-weight: 500;
  }

  &.actions,
  &.right-aligned {
    text-align: right;
    vertical-align: bottom;
  }

  &.actions {
    background: ${s("background")};
    position: sticky;
    right: 0;
  }

  ${NudeButton} {
    &:hover,
    &[aria-expanded="true"] {
      background: ${s("sidebarControlHoverBackground")};
    }
  }
`;

const Row = styled.tr<{ $columns: string }>`
  width: 100%;
  display: grid;
  grid-template-columns: ${({ $columns }) => `${$columns}`};
  align-items: center;
  border-bottom: 1px solid ${s("divider")};

  ${Cell} {
    &:first-child {
      padding-left: 0;
    }
    &:last-child {
      padding-right: 0;
    }
  }
  &:last-child {
    border-bottom: 0;
  }
`;

const Head = styled.th`
  height: 100%;
  text-align: left;
  padding: 6px 6px 2px;
  border-bottom: 1px solid ${s("divider")};
  background: ${s("background")};
  font-size: 14px;
  color: ${s("textSecondary")};
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
