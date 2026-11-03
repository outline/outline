import type {
  SortingState,
  ColumnSort,
  Row as TRow,
  AccessorFn,
  CellContext,
} from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  functionalUpdate,
  createColumnHelper,
} from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { observer } from "mobx-react";
import { CollapsedIcon, SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { HEADER_HEIGHT as APP_HEADER_HEIGHT } from "@shared/constants";
import { s } from "@shared/styles";
import DelayedMount from "~/components/DelayedMount";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import type { ModelSelection } from "~/components/ModelSelection";
import {
  ModelSelectionProvider,
  useModelSelection,
} from "~/components/ModelSelectionContext";
import NudeButton from "~/components/NudeButton";
import PlaceholderText from "~/components/PlaceholderText";
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuTrigger,
} from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { SelectionCheckbox } from "~/components/SelectionCheckbox";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import usePersistedState from "~/hooks/usePersistedState";
import usePrevious from "~/hooks/usePrevious";
import { useStuckAttribute } from "~/hooks/useStuckAttribute";
import { preventDefault } from "~/utils/events";
import { transparentize } from "polished";

const HEADER_HEIGHT = 40;

/** Minimum width of a flexible column before the table scrolls horizontally. */
const DEFAULT_MIN_COLUMN_WIDTH = 100;

/** Space beside the scrolling area, so the selected row highlight is not clipped. */
const SCROLL_GUTTER = 8;

/** Whether the header can follow the horizontal scroll of the body in CSS. */
const supportsScrollTimeline =
  typeof CSS !== "undefined" &&
  CSS.supports("timeline-scope", "--table") &&
  CSS.supports("animation-timeline", "scroll()");

type DataColumn<TData> = {
  type: "data";
  header: string;
  accessor: AccessorFn<TData>;
  sortable?: boolean;
};

type ActionColumn = {
  type: "action";
  header?: string | (() => React.ReactNode);
};

export type Column<TData> = {
  id: string;
  component: (data: TData) => React.ReactNode;
  width: string;
  /**
   * The minimum width of the column in pixels. When the columns do not fit,
   * the table scrolls horizontally. Defaults to the pixel width of fixed
   * columns, or 100px for flexible columns.
   */
  minWidth?: number;
} & (DataColumn<TData> | ActionColumn);

/** The minimum shape of a row, rows are identified by the model identifier. */
export type RowData = {
  id: string;
};

export type Props<TData> = {
  /**
   * Unique identifier for this table. When provided the visibility of columns
   * can be toggled from a context menu on the header and is persisted locally.
   */
  id?: string;
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
  decorateRow?: (item: TData, rowElement: React.ReactNode) => React.ReactNode;
  /**
   * Enables multi-selection of rows, returns whether the given row may be
   * selected. Rows that cannot be selected are shown without a checkbox.
   */
  isRowSelectable?: (data: TData) => boolean;
  /** Toolbar of bulk actions, rendered while a selection is active. */
  selectionToolbar?: React.ReactNode;
};

/**
 * Wraps the table in a selection provider when multi-selection is enabled, so
 * that any table can offer bulk actions by supplying `isRowSelectable` and a
 * `selectionToolbar`.
 */
function Table<TData extends RowData>(props: Props<TData>) {
  const { data, isRowSelectable, selectionToolbar } = props;

  const selectableIds = React.useMemo(
    () =>
      isRowSelectable
        ? data.filter(isRowSelectable).map((item) => item.id)
        : [],
    [data, isRowSelectable]
  );

  if (!isRowSelectable) {
    return <TableView {...props} />;
  }

  return (
    <ModelSelectionProvider items={selectableIds} toolbar={selectionToolbar}>
      <TableView {...props} selectableCount={selectableIds.length} />
    </ModelSelectionProvider>
  );
}

function TableViewInner<TData extends RowData>({
  id,
  data,
  columns,
  sort,
  onChangeSort,
  loading,
  page,
  rowHeight,
  stickyOffset = 0,
  decorateRow,
  isRowSelectable,
  selectableCount = 0,
}: Props<TData> & { selectableCount?: number }) {
  const { t } = useTranslation();
  const selection = useModelSelection();
  const isMobile = useMobile();
  const virtualContainerRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<HTMLDivElement>(null);
  const headScrollRef = React.useRef<HTMLDivElement>(null);
  const bodyScrollRef = React.useRef<HTMLDivElement>(null);
  const [virtualContainerTop, setVirtualContainerTop] =
    React.useState<number>();

  useStuckAttribute(
    headRef,
    isMobile ? Math.min(stickyOffset, APP_HEADER_HEIGHT) : stickyOffset
  );

  const [hiddenColumns, setHiddenColumns] = usePersistedState<string[]>(
    `hiddenTableColumns-${id}`,
    []
  );

  const handleToggleColumn = React.useCallback(
    (columnId: string) => {
      setHiddenColumns((hidden) =>
        hidden.includes(columnId)
          ? hidden.filter((hiddenId) => hiddenId !== columnId)
          : [...hidden, columnId]
      );
    },
    [setHiddenColumns]
  );

  const visibleColumns = React.useMemo(
    () =>
      columns.filter(
        (column) =>
          !id || column.type !== "data" || !hiddenColumns.includes(column.id)
      ),
    [id, columns, hiddenColumns]
  );

  const allColumns = React.useMemo(() => {
    if (!selection || !isRowSelectable) {
      return visibleColumns;
    }

    const selectColumn: Column<TData> = {
      type: "action",
      id: "select",
      header: () => (
        <SelectAllCheckbox
          selection={selection}
          count={selectableCount}
          label={t("Select all")}
        />
      ),
      component: (item) =>
        isRowSelectable(item) ? (
          <RowSelectCheckbox
            selection={selection}
            id={item.id}
            label={t("Select")}
          />
        ) : null,
      width: "28px",
    };

    return [selectColumn, ...visibleColumns];
  }, [visibleColumns, selection, isRowSelectable, selectableCount, t]);

  const columnHelper = React.useMemo(() => createColumnHelper<TData>(), []);
  const observedColumns = React.useMemo(
    () =>
      allColumns.map((column) => {
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
    [allColumns, columnHelper]
  );

  const gridColumns = React.useMemo(
    () => allColumns.map(getColumnTrack).join(" "),
    [allColumns]
  );

  const minWidth = React.useMemo(
    () => allColumns.reduce((sum, column) => sum + getMinWidth(column), 0),
    [allColumns]
  );

  // Set on the DOM directly to avoid a re-render on scroll.
  const updateOverflow = React.useCallback(() => {
    const element = tableRef.current;
    const scroller = bodyScrollRef.current;
    if (!element || !scroller) {
      return;
    }

    const scrollLeft = Math.abs(scroller.scrollLeft);
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    element.toggleAttribute("data-overflow-start", scrollLeft > 0);
    element.toggleAttribute(
      "data-overflow-end",
      maxScrollLeft - scrollLeft > 1
    );
  }, []);

  const handleBodyScroll = React.useCallback(
    (ev: React.UIEvent<HTMLDivElement>) => {
      // A scroll event fires after the frame is painted, so syncing here lags.
      if (!supportsScrollTimeline && headScrollRef.current) {
        headScrollRef.current.scrollLeft = ev.currentTarget.scrollLeft;
      }
      updateOverflow();
    },
    [updateOverflow]
  );

  // Focus can scroll the header to an offscreen column, pass it to the body.
  const handleHeadScroll = React.useCallback(
    (ev: React.UIEvent<HTMLDivElement>) => {
      const head = ev.currentTarget;
      const body = bodyScrollRef.current;
      if (!body) {
        return;
      }

      if (supportsScrollTimeline) {
        if (head.scrollLeft !== 0) {
          body.scrollLeft += head.scrollLeft;
          head.scrollLeft = 0;
        }
      } else if (body.scrollLeft !== head.scrollLeft) {
        body.scrollLeft = head.scrollLeft;
      }
    },
    []
  );

  React.useLayoutEffect(() => {
    const scroller = bodyScrollRef.current;
    if (!scroller) {
      return;
    }

    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [updateOverflow, minWidth]);

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

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastRenderedIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;
  const { hasNext, fetchNext } = page;

  // Fetch the next page once the overscanned rows reach the end of the data.
  React.useEffect(() => {
    if (hasNext && lastRenderedIndex >= rows.length - 1) {
      fetchNext?.();
    }
  }, [hasNext, fetchNext, lastRenderedIndex, rows.length]);

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
      <InnerTable ref={tableRef} role="table" $minWidth={minWidth}>
        <THead ref={headRef} $topPos={stickyOffset}>
          <HeadScroller
            ref={headScrollRef}
            role="rowgroup"
            onScroll={handleHeadScroll}
          >
            <HeadContent>
              {table.getHeaderGroups().map((headerGroup) => {
                const headerRow = (
                  <TR role="row" $columns={gridColumns}>
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      const canSort = header.column.getCanSort();
                      const toggleSorting =
                        header.column.getToggleSortingHandler();
                      const handleSortKeyDown = (
                        ev: React.KeyboardEvent<HTMLDivElement>
                      ) => {
                        if (
                          !ev.repeat &&
                          (ev.key === "Enter" || ev.key === " ")
                        ) {
                          ev.preventDefault();
                          toggleSorting?.(ev);
                        }
                      };

                      return (
                        <TH
                          role="columnheader"
                          key={header.id}
                          aria-sort={
                            !canSort
                              ? undefined
                              : sorted === "asc"
                                ? "ascending"
                                : sorted === "desc"
                                  ? "descending"
                                  : "none"
                          }
                        >
                          <SortWrapper
                            align="center"
                            gap={4}
                            onClick={toggleSorting}
                            onKeyDown={canSort ? handleSortKeyDown : undefined}
                            role={canSort ? "button" : undefined}
                            tabIndex={canSort ? 0 : undefined}
                            $sortable={canSort}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {sorted === "asc" ? (
                              <AscSortIcon />
                            ) : sorted === "desc" ? (
                              <DescSortIcon />
                            ) : (
                              <div />
                            )}
                          </SortWrapper>
                        </TH>
                      );
                    })}
                  </TR>
                );

                return id && !isMobile ? (
                  <ColumnVisibilityMenu
                    key={headerGroup.id}
                    columns={columns}
                    hiddenColumns={hiddenColumns}
                    onToggleColumn={handleToggleColumn}
                  >
                    {headerRow}
                  </ColumnVisibilityMenu>
                ) : (
                  <React.Fragment key={headerGroup.id}>
                    {headerRow}
                  </React.Fragment>
                );
              })}
            </HeadContent>
          </HeadScroller>
          <Fade $side="start" />
          <Fade $side="end" />
          {id && !isMobile && (
            <ColumnVisibilityButton
              columns={columns}
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
            />
          )}
        </THead>

        <BodyFrame>
          <BodyScroller ref={bodyScrollRef} onScroll={handleBodyScroll}>
            <TBody
              ref={virtualContainerRef}
              role="rowgroup"
              $height={rowVirtualizer.getTotalSize()}
            >
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index] as TRow<TData>;
                const rowProps = {
                  role: "row",
                  "data-index": virtualRow.index,
                  style: {
                    position: "absolute" as const,
                    transform: `translateY(${
                      virtualRow.start - rowVirtualizer.options.scrollMargin
                    }px)`,
                    height: `${virtualRow.size}px`,
                  },
                  $columns: gridColumns,
                  children: row.getAllCells().map((cell) => (
                    <TD
                      role="cell"
                      key={cell.id}
                      className={
                        cell.column.id === "action"
                          ? "actions"
                          : cell.column.id === "select"
                            ? "select"
                            : ""
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TD>
                  )),
                };

                const baseRow = selection ? (
                  <SelectableRow
                    key={row.id}
                    selection={selection}
                    id={row.original.id}
                    {...rowProps}
                  />
                ) : (
                  <TR key={row.id} {...rowProps} />
                );

                return decorateRow ? (
                  <React.Fragment key={row.id}>
                    {decorateRow(row.original, baseRow)}
                  </React.Fragment>
                ) : (
                  baseRow
                );
              })}
            </TBody>
            {showPlaceholder && (
              <Placeholder
                columns={allColumns.length}
                gridColumns={gridColumns}
              />
            )}
          </BodyScroller>
          <Fade $side="start" />
          <Fade $side="end" />
        </BodyFrame>
      </InnerTable>
      {isEmpty && <NoResults>{t("No results")}</NoResults>}
    </>
  );
}

// The observer wrapper does not preserve the generic signature of the table.
const TableView = observer(TableViewInner) as typeof TableViewInner;

type ColumnVisibilityProps<TData> = {
  columns: Column<TData>[];
  hiddenColumns: string[];
  onToggleColumn: (columnId: string) => void;
};

/**
 * Menu items that toggle the visibility of individual columns. Only columns
 * that display data can be hidden, and at least one must remain visible.
 */
function ColumnVisibilityItems<TData>({
  columns,
  hiddenColumns,
  onToggleColumn,
}: ColumnVisibilityProps<TData>) {
  const dataColumns = columns.filter(
    (column): column is Column<TData> & DataColumn<TData> =>
      column.type === "data"
  );
  const visibleCount = dataColumns.filter(
    (column) => !hiddenColumns.includes(column.id)
  ).length;

  return (
    <>
      {dataColumns.map((column) => {
        const visible = !hiddenColumns.includes(column.id);

        return (
          <MenuButton
            key={column.id}
            label={column.header}
            selected={visible}
            disabled={visible && visibleCount === 1}
            onSelect={preventDefault}
            onClick={() => onToggleColumn(column.id)}
          />
        );
      })}
    </>
  );
}

/** Column visibility options, opened by right-clicking the header row. */
function ColumnVisibilityMenu<TData>({
  children,
  ...rest
}: ColumnVisibilityProps<TData> & { children: React.ReactNode }) {
  const { t } = useTranslation();
  const label = t("Columns");

  return (
    <MenuProvider variant="context">
      <Menu>
        <MenuTrigger aria-label={label}>{children}</MenuTrigger>
        <MenuContent aria-label={label} onCloseAutoFocus={preventDefault}>
          <ColumnVisibilityItems {...rest} />
        </MenuContent>
      </Menu>
    </MenuProvider>
  );
}

/** Column visibility options, opened by a button at the end of the header row. */
function ColumnVisibilityButton<TData>(props: ColumnVisibilityProps<TData>) {
  const { t } = useTranslation();
  const label = t("Columns");

  return (
    <MenuProvider variant="dropdown">
      <Menu>
        <Tooltip content={label} side="bottom">
          <MenuTrigger aria-label={label}>
            <ColumnOptions>
              <SettingsIcon size={18} />
            </ColumnOptions>
          </MenuTrigger>
        </Tooltip>
        <MenuContent
          align="end"
          aria-label={label}
          onCloseAutoFocus={preventDefault}
        >
          <ColumnVisibilityItems {...props} />
        </MenuContent>
      </Menu>
    </MenuProvider>
  );
}

const SelectableRow = observer(function SelectableRow_({
  selection,
  id,
  ...rest
}: {
  selection: ModelSelection;
  id: string;
} & React.ComponentProps<typeof TR>) {
  return <TR aria-selected={selection.isSelected(id)} {...rest} />;
});

const RowSelectCheckbox = observer(function RowSelectCheckbox_({
  selection,
  id,
  label,
}: {
  selection: ModelSelection;
  id: string;
  label: string;
}) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.shiftKey) {
      selection.selectRange(id);
    } else {
      selection.toggle(id);
    }
  };

  return (
    <SelectionCheckbox
      checked={selection.isSelected(id)}
      label={label}
      onClick={handleClick}
    />
  );
});

const SelectAllCheckbox = observer(function SelectAllCheckbox_({
  selection,
  count,
  label,
}: {
  selection: ModelSelection;
  count: number;
  label: string;
}) {
  const checked = count > 0 && selection.size === count;

  if (count === 0) {
    return null;
  }

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (selection.isActive) {
      selection.clear();
    } else {
      selection.selectAll();
    }
  };

  return (
    <SelectionCheckbox
      checked={checked}
      indeterminate={selection.isActive && !checked}
      label={label}
      onClick={handleClick}
    />
  );
});

const ObservedCell = observer(function <TData>({
  data,
  render,
}: {
  data: TData;
  render: (data: TData) => React.ReactNode;
}) {
  return <>{render(data)}</>;
});

/**
 * Returns the minimum width of a column in pixels.
 *
 * @param column the column.
 * @returns the minimum width.
 */
function getMinWidth<TData>(column: Column<TData>): number {
  if (column.minWidth !== undefined) {
    return column.minWidth;
  }

  const match = /^(?:minmax\(\s*)?(\d+)px/.exec(column.width);
  return match ? Number(match[1]) : DEFAULT_MIN_COLUMN_WIDTH;
}

/**
 * Returns the grid track of a column, flexible columns are given a minimum
 * width so that every row has the same layout.
 *
 * @param column the column.
 * @returns the grid track.
 */
function getColumnTrack<TData>(column: Column<TData>): string {
  return /^[\d.]+fr$/.test(column.width)
    ? `minmax(${getMinWidth(column)}px, ${column.width})`
    : column.width;
}

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
        {Array.from({ length: rows }).map((_r, row) => (
          <TR key={row} $columns={gridColumns}>
            {Array.from({ length: columns }).map((_c, col) => (
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

const NoResults = styled(Empty)`
  display: block;
  margin-top: 8px;
`;

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

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.accent};
    outline-offset: 2px;
  }
`;

const ColumnOptions = styled(NudeButton)`
  position: absolute;
  top: ${(HEADER_HEIGHT - 24) / 2}px;
  right: 0;
  color: ${s("placeholder")};
  background: ${s("background")};

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    color: ${s("textSecondary")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

const InnerTable = styled.div<{ $minWidth: number }>`
  --table-min-width: ${({ $minWidth }) => `${$minWidth}px`};
  width: 100%;
  timeline-scope: --table-scroll;
`;

const Scroller = styled.div`
  margin: 0 -${SCROLL_GUTTER}px;
  padding: 0 ${SCROLL_GUTTER}px;
`;

const HeadScroller = styled(Scroller)`
  overflow: hidden;
  container-type: inline-size;
`;

const followScroll = keyframes`
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc((100cqw - 100%) * var(--scroll-direction)));
  }
`;

/** Moved with the body scroll on the compositor, so it does not lag. */
const HeadContent = styled.div`
  --scroll-direction: 1;
  min-width: var(--table-min-width);

  &:dir(rtl) {
    --scroll-direction: -1;
  }

  ${
    supportsScrollTimeline &&
    css`
      animation: ${followScroll} linear both;
      animation-timeline: --table-scroll;
    `
  }
`;

const BodyScroller = styled(Scroller)`
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: none;
  scroll-timeline: --table-scroll inline;
`;

const BodyFrame = styled.div`
  position: relative;
`;

/** Shown at an edge of the table while there are hidden columns past it. */
const Fade = styled.div<{ $side: "start" | "end" }>`
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-${({ $side }) => $side}: -${SCROLL_GUTTER}px;
  width: 24px;
  background: linear-gradient(
    to ${({ $side }) => ($side === "start" ? "right" : "left")},
    ${s("background")},
    transparent
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:dir(rtl) {
    transform: scaleX(-1);
  }

  ${InnerTable}[data-overflow-${({ $side }) => $side}] & {
    opacity: 1;
  }
`;

const THead = styled.div<{ $topPos: number }>`
  position: sticky;
  top: ${({ $topPos }) => `${$topPos}px`};
  height: ${HEADER_HEIGHT}px;
  z-index: 1;
  font-size: 14px;
  color: ${s("text")};
  font-weight: 500;

  border-bottom: 1px solid
    ${(props) => transparentize(0.3, props.theme.divider)};
  background: ${s("background")};

  ${breakpoint("mobile", "tablet")`
    top: ${({ $topPos }: { $topPos: number }) =>
      `${Math.min($topPos, APP_HEADER_HEIGHT)}px`};
  `};
`;

const TBody = styled.div<{ $height: number }>`
  position: relative;
  min-width: var(--table-min-width);
  height: ${({ $height }) => `${$height}px`};
`;

const TR = styled.div<{ $columns: string }>`
  width: 100%;
  min-width: var(--table-min-width);
  display: grid;
  grid-template-columns: ${({ $columns }) => `${$columns}`};
  align-items: center;
  border-bottom: 1px solid
    ${(props) => transparentize(0.3, props.theme.divider)};

  &:last-child {
    border-bottom: 0;
  }

  /* The header has its own border, avoid doubling the divider beneath it. */
  ${THead} & {
    border-bottom: 0;
  }

  &:hover ${NudeButton}[aria-haspopup="menu"] {
    opacity: 1;
  }

  /* Drawn behind the cells so the highlight can bleed past the table edges. */
  &[aria-selected="true"]::before {
    content: "";
    position: absolute;
    inset: 0 -8px;
    border-radius: 8px;
    background: ${(props) => transparentize(0.95, props.theme.accent)};
  }

  /* Adjacent selected rows join into a single rounded block. */
  [aria-selected="true"] + &[aria-selected="true"]::before {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  &[aria-selected="true"]:has(+ [aria-selected="true"])::before {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const TH = styled.span`
  position: relative;
  padding: 6px;

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }
`;

const TD = styled.span`
  /* Positioned so cells paint above the row's selected highlight. */
  position: relative;
  padding: 10px 6px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:first-child {
    padding-left: 0;
  }

  &:first-child:not(.select),
  .select + & {
    font-size: 15px;
    font-weight: 500;
  }

  &.select {
    overflow: visible;
  }

  &:last-child {
    padding-right: 0;
  }

  &.actions,
  &.right-aligned {
    text-align: right;
    vertical-align: bottom;
  }

  ${NudeButton}[aria-haspopup="menu"] {
    vertical-align: middle;
    opacity: 0;
    transition: opacity 100ms ease-in-out;

    &:hover,
    &[aria-expanded="true"] {
      background: ${s("sidebarControlHoverBackground")};
    }

    &:focus-visible,
    &[aria-expanded="true"] {
      opacity: 1;
    }
  }
`;

export default observer(Table);
