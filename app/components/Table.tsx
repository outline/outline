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
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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

const HEADER_HEIGHT = 40;

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
  width: string;
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
  stickyOffset?: number;
};

function Table<TData>({
  data,
  columns,
  sort,
  onChangeSort,
  loading,
  page,
  rowHeight,
  stickyOffset = 0,
}: Props<TData>) {
  const { t } = useTranslation();
  const virtualContainerRef = React.useRef<HTMLDivElement>(null);
  const [virtualContainerTop, setVirtualContainerTop] =
    React.useState<number>();

  const columnHelper = React.useMemo(() => createColumnHelper<TData>(), []);
  const observedColumns = React.useMemo(
    () =>
      columns.map((column) => {
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
      }),
    [columns, columnHelper]
  );

  const gridColumns = React.useMemo(
    () => columns.map((column) => column.width).join(" "),
    [columns]
  );

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

  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    scrollMargin: virtualContainerTop,
    overscan: 5,
  });

  React.useEffect(() => {
    if (!sortChanged || !virtualContainerTop) {
      return;
    }

    const scrollThreshold =
      virtualContainerTop - (stickyOffset + HEADER_HEIGHT);
    const reset = window.scrollY > scrollThreshold;

    if (reset) {
      rowVirtualizer.scrollToOffset(scrollThreshold, {
        behavior: "smooth",
      });
    }
  }, [rowVirtualizer, sortChanged, virtualContainerTop, stickyOffset]);

  React.useLayoutEffect(() => {
    if (virtualContainerRef.current) {
      // determine the scrollable virtual container offsetTop on mount
      setVirtualContainerTop(
        virtualContainerRef.current.getBoundingClientRect().top
      );
    }
  }, []);

  return (
    <>
      <InnerTable role="table">
        <THead role="rowgroup" $topPos={stickyOffset}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TR role="row" key={headerGroup.id} $columns={gridColumns}>
              {headerGroup.headers.map((header) => (
                <TH role="columnheader" key={header.id}>
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
                </TH>
              ))}
            </TR>
          ))}
        </THead>

        <TBody
          ref={virtualContainerRef}
          role="rowgroup"
          $height={rowVirtualizer.getTotalSize()}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index] as TRow<TData>;
            return (
              <TR
                role="row"
                key={row.id}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  transform: `translateY(${
                    virtualRow.start - rowVirtualizer.options.scrollMargin
                  }px)`,
                  height: `${virtualRow.size}px`,
                }}
                $columns={gridColumns}
              >
                {row.getAllCells().map((cell) => (
                  <TD role="cell" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TD>
                ))}
              </TR>
            );
          })}
        </TBody>
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
    </>
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
      <TBody $height={150}>
        {new Array(rows).fill(1).map((_r, row) => (
          <TR key={row} $columns={gridColumns}>
            {new Array(columns).fill(1).map((_c, col) => (
              <TD key={col}>
                <PlaceholderText minWidth={25} maxWidth={75} />
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
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

const InnerTable = styled.div`
  width: 100%;
`;

const THead = styled.div<{ $topPos: number }>`
  position: sticky;
  top: ${({ $topPos }) => `${$topPos}px`};
  height: ${HEADER_HEIGHT}px;
  z-index: 1;
  font-size: 14px;
  color: ${s("textSecondary")};
  font-weight: 500;

  border-bottom: 1px solid ${s("divider")};
  background: ${s("background")};
`;

const TBody = styled.div<{ $height: number }>`
  position: relative;
  height: ${({ $height }) => `${$height}px`};
`;

const TR = styled.div<{ $columns: string }>`
  width: 100%;
  display: grid;
  grid-template-columns: ${({ $columns }) => `${$columns}`};
  align-items: center;
  border-bottom: 1px solid ${s("divider")};

  &:last-child {
    border-bottom: 0;
  }
`;

const TH = styled.span`
  padding: 6px 6px 2px;

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }
`;

const TD = styled.span`
  padding: 10px 6px;
  font-size: 14px;
  text-wrap: wrap;
  word-break: break-word;

  &:first-child {
    font-size: 15px;
    font-weight: 500;
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
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

export default observer(Table);
