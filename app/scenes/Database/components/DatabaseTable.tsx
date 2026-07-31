import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import type {
  DataView,
  DataViewSort,
  DataViewSummaries,
  Property,
  PropertyOption,
  SummaryAggregation,
} from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Document from "~/models/Document";
import PropertyValueEditor from "~/components/DocumentProperties/PropertyValueEditor";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import usePolicy from "~/hooks/usePolicy";
import DatabaseAddProperty from "./DatabaseAddProperty";
import DatabasePropertyMenu from "./DatabasePropertyMenu";
import DatabaseRowMenu from "./DatabaseRowMenu";
import DatabaseSummaryRow from "./DatabaseSummaryRow";
import RowTitleInput from "./RowTitleInput";

type Props = {
  /** The documents to render as rows, in order. */
  rows: Document[];
  /** The properties to render as columns, in order. */
  properties: Property[];
  /** The active sort, reflected in the column headers. */
  sort?: DataViewSort;
  /** Callback when a sort direction is chosen for a property; null clears. */
  onSetSort: (propertyId: string, direction: "asc" | "desc" | null) => void;
  /** Whether a filter is currently applied, to phrase the empty state. */
  hasFilter: boolean;
  /** Callback to create a new row; absent when the user cannot create rows. */
  onNewRow?: () => void;
  /** The id of a freshly created row whose title is being typed inline. */
  newRowId?: string;
  /** Callback when the inline title editing of a new row has finished. */
  onNewRowDone: () => void;
  /** All property names in the schema, to derive unique names when adding. */
  schemaNames: string[];
  /** Callback to append a property to the schema; absent when not allowed. */
  onAddProperty?: (property: Property) => Promise<void>;
  /** Callback merging updates into a property; absent when not allowed. */
  onUpdateProperty?: (propertyId: string, updates: Partial<Property>) => void;
  /** Callback hiding a property from the active view. */
  onHideProperty: (propertyId: string) => void;
  /** Callback removing a property from the schema. */
  onDeleteProperty: (propertyId: string) => void;
  /** Callback moving a column to the position of another; absent when not allowed. */
  onMoveProperty?: (propertyId: string, overPropertyId: string) => void;
  /** Callback moving a row to the position of another; absent when not allowed. */
  onMoveRow?: (documentId: string, overDocumentId: string) => void;
  /** Callback deleting a row; absent when the user may not delete rows. */
  onDeleteRow?: (document: Document) => void;
  /** The property-visibility toggle to render beside the add button. */
  propertiesToggle?: React.ReactNode;
  /** The active view, holding each column's chosen summary. */
  view?: DataView;
  /** The computed summary values, keyed by property id. */
  summaries?: DataViewSummaries;
  /** Whether the user may change which summaries are shown. */
  canEditSummaries: boolean;
  /** Callback when a column's summary is changed; null clears it. */
  onChangeSummary: (
    propertyId: string,
    summary: SummaryAggregation | null
  ) => void;
};

/**
 * Renders the documents of a database as a table: rows are documents, columns
 * are the properties from the database's data schema. Cells are editable in
 * place, clicking a column header opens the property's settings menu, a
 * trailing "+" adds new properties and a footer row adds new rows. Rows and
 * columns can be reordered by dragging their grips.
 */
function DatabaseTable({
  rows,
  properties,
  sort,
  onSetSort,
  hasFilter,
  onNewRow,
  newRowId,
  onNewRowDone,
  schemaNames,
  onAddProperty,
  onUpdateProperty,
  onHideProperty,
  onDeleteProperty,
  onMoveProperty,
  onMoveRow,
  onDeleteRow,
  propertiesToggle,
  view,
  summaries,
  canEditSummaries,
  onChangeSummary,
}: Props) {
  const { t } = useTranslation();
  const hasControlsColumn =
    !!onAddProperty || !!propertiesToggle || !!onDeleteRow;
  const hasGripColumn = !!onMoveRow;
  const columnCount =
    properties.length +
    1 +
    (hasControlsColumn ? 1 : 0) +
    (hasGripColumn ? 1 : 0);

  const sensors = useSensors(
    // a small distance so a plain click still reaches the header menu
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onMoveProperty?.(String(active.id), String(over.id));
    }
  };

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onMoveRow?.(String(active.id), String(over.id));
    }
  };

  const header = (
    <tr>
      {hasGripColumn && <GripHeaderCell as="th" />}
      <HeaderCell as="th" $minWidth={220}>
        {t("Title")}
      </HeaderCell>
      {properties.map((property) => (
        <DatabaseTableHeader
          key={property.id}
          property={property}
          sort={sort}
          onSetSort={onSetSort}
          onUpdateProperty={onUpdateProperty}
          onHideProperty={onHideProperty}
          onDeleteProperty={onDeleteProperty}
          isSortable={!!onMoveProperty}
        />
      ))}
      {hasControlsColumn && (
        <ControlsCell as="th">
          <Flex align="center" gap={2}>
            {onAddProperty && (
              <DatabaseAddProperty
                existingNames={schemaNames}
                onAdd={onAddProperty}
              />
            )}
            {propertiesToggle}
          </Flex>
        </ControlsCell>
      )}
    </tr>
  );

  const body = (
    <tbody>
      {rows.map((document) => (
        <DatabaseTableRow
          key={document.id}
          document={document}
          properties={properties}
          isEditingTitle={document.id === newRowId}
          onTitleDone={onNewRowDone}
          hasControlsColumn={hasControlsColumn}
          isSortable={hasGripColumn}
          onDelete={onDeleteRow}
        />
      ))}
      {rows.length === 0 && !onNewRow && (
        <tr>
          <EmptyCell colSpan={columnCount}>
            {hasFilter
              ? t("No documents match the filter")
              : t("No documents yet")}
          </EmptyCell>
        </tr>
      )}
      {onNewRow && (
        <tr>
          <NewRowCell colSpan={columnCount}>
            <NewRowButton
              type="button"
              onClick={onNewRow}
              width="100%"
              height={32}
            >
              <PlusIcon size={18} />
              {t("New row")}
            </NewRowButton>
          </NewRowCell>
        </tr>
      )}
    </tbody>
  );

  return (
    <ScrollContainer>
      <Grid>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleColumnDragEnd}
        >
          <SortableContext
            items={properties.map((property) => property.id)}
            strategy={horizontalListSortingStrategy}
          >
            <thead>{header}</thead>
          </SortableContext>
        </DndContext>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleRowDragEnd}
        >
          <SortableContext
            items={rows.map((document) => document.id)}
            strategy={verticalListSortingStrategy}
          >
            {body}
          </SortableContext>
        </DndContext>
        <tfoot>
          <DatabaseSummaryRow
            properties={properties}
            view={view}
            summaries={summaries}
            canEdit={canEditSummaries}
            onChange={onChangeSummary}
            hasControlsColumn={hasControlsColumn}
            hasGripColumn={hasGripColumn}
          />
        </tfoot>
      </Grid>
    </ScrollContainer>
  );
}

/**
 * One column header: the property name, opening the property settings menu on
 * click, with a grip along the top edge to drag the column to a new position.
 */
function DatabaseTableHeader({
  property,
  sort,
  onSetSort,
  onUpdateProperty,
  onHideProperty,
  onDeleteProperty,
  isSortable,
}: {
  property: Property;
  sort?: DataViewSort;
  onSetSort: (propertyId: string, direction: "asc" | "desc" | null) => void;
  onUpdateProperty?: (propertyId: string, updates: Partial<Property>) => void;
  onHideProperty: (propertyId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  isSortable: boolean;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    index,
    activeIndex,
    overIndex,
  } = useSortable({ id: property.id, disabled: !isSortable });

  // columns do not slide out of the way while dragging — the insertion point
  // is shown as a line on the edge of the column being dropped onto instead
  const isDropTarget = activeIndex !== -1 && overIndex === index && !isDragging;
  const dropSide = isDropTarget
    ? activeIndex > index
      ? "left"
      : "right"
    : undefined;

  const headerContent = (
    <>
      {property.name}
      {sort?.propertyId === property.id
        ? sort.direction === "asc"
          ? " ↑"
          : " ↓"
        : ""}
    </>
  );

  return (
    <HeaderCell
      as="th"
      ref={setNodeRef}
      $flush={!!onUpdateProperty}
      $dragging={isDragging}
      $dropSide={dropSide}
    >
      {isSortable && (
        <ColumnGrip
          {...attributes}
          {...listeners}
          aria-label={t("Reorder column")}
          onClick={(ev: React.MouseEvent) => ev.stopPropagation()}
        />
      )}
      {onUpdateProperty ? (
        <DatabasePropertyMenu
          property={property}
          sort={sort}
          onRename={(name) => onUpdateProperty(property.id, { name })}
          onSetSort={(direction) => onSetSort(property.id, direction)}
          onHide={() => onHideProperty(property.id)}
          onChangeOptions={(options: PropertyOption[]) =>
            onUpdateProperty(property.id, { options })
          }
          onDelete={() => onDeleteProperty(property.id)}
        >
          {headerContent}
        </DatabasePropertyMenu>
      ) : (
        headerContent
      )}
    </HeaderCell>
  );
}

const DatabaseTableRow = observer(function DatabaseTableRow_({
  document,
  properties,
  isEditingTitle,
  onTitleDone,
  hasControlsColumn,
  isSortable,
  onDelete,
}: {
  document: Document;
  properties: Property[];
  isEditingTitle: boolean;
  onTitleDone: () => void;
  hasControlsColumn: boolean;
  isSortable: boolean;
  onDelete?: (document: Document) => void;
}) {
  const { t } = useTranslation();
  const can = usePolicy(document);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id, disabled: !isSortable });

  const handleChange = async (
    propertyId: string,
    value: Parameters<Document["setProperty"]>[1]
  ) => {
    try {
      await document.setProperty(propertyId, value);
    } catch (error) {
      toast.error(errToString(error));
    }
  };

  // the grip is the row's only focusable handle, so it doubles as the row
  // selection that Delete acts on. Keydown is taken on the row rather than the
  // grip so it cannot shadow the drag sensor's own key handling, and the
  // target is checked so Delete stays harmless while a cell is being edited.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Delete" && event.key !== "Backspace") {
      return;
    }
    if (!onDelete || !can.delete || isDragging) {
      return;
    }
    if (!(event.target as HTMLElement).hasAttribute("data-row-grip")) {
      return;
    }
    event.preventDefault();
    onDelete(document);
  };

  return (
    <Row
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      $dragging={isDragging}
      onKeyDown={handleKeyDown}
    >
      {isSortable && (
        <GripCell>
          <RowGrip
            {...attributes}
            {...listeners}
            data-row-grip=""
            aria-label={t("Reorder row")}
          />
        </GripCell>
      )}
      <TitleCell>
        {isEditingTitle ? (
          <TitleInputPadding>
            <RowTitleInput document={document} onDone={onTitleDone} />
          </TitleInputPadding>
        ) : (
          <TitleLink to={document.path}>{document.titleWithDefault}</TitleLink>
        )}
      </TitleCell>
      {properties.map((property) => (
        <Cell key={property.id}>
          <PropertyValueEditor
            property={property}
            value={document.propertyValue(property.id)}
            onChange={(value) => handleChange(property.id, value)}
            readOnly={!can.update}
          />
        </Cell>
      ))}
      {hasControlsColumn && (
        <RowControlsCell>
          {onDelete && (
            <DatabaseRowMenu document={document} onDelete={onDelete} />
          )}
        </RowControlsCell>
      )}
    </Row>
  );
});

const ScrollContainer = styled.div`
  overflow-x: auto;
  border-top: 1px solid ${s("divider")};
`;

const Grid = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;
`;

const HeaderCell = styled.th<{
  $minWidth?: number;
  $flush?: boolean;
  $dragging?: boolean;
  $dropSide?: "left" | "right";
}>`
  position: relative;
  text-align: left;
  font-weight: 500;
  color: ${s("textSecondary")};
  padding: ${(props) => (props.$flush ? 0 : "8px 10px")};
  border-bottom: 1px solid ${s("divider")};
  white-space: nowrap;
  min-width: ${(props) => props.$minWidth ?? 140}px;
  user-select: none;
  opacity: ${(props) => (props.$dragging ? 0.5 : 1)};

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }

  ${(props) =>
    props.$dropSide &&
    `
    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      ${props.$dropSide}: -1px;
      width: 2px;
      background: ${props.theme.accent};
      pointer-events: none;
      z-index: 1;
    }
  `}
`;

const ControlsCell = styled.th`
  border-bottom: 1px solid ${s("divider")};
  padding: 4px 6px;
  width: 60px;
  min-width: 60px;
  vertical-align: middle;
`;

const GripHeaderCell = styled.th`
  border-bottom: 1px solid ${s("divider")};
  width: 20px;
  min-width: 20px;
  padding: 0;
`;

const Row = styled.tr<{ $dragging?: boolean }>`
  background: ${(props) =>
    props.$dragging ? props.theme.backgroundSecondary : "transparent"};
  position: ${(props) => (props.$dragging ? "relative" : "static")};
  z-index: ${(props) => (props.$dragging ? 1 : "auto")};

  &:not(:last-child) td {
    border-bottom: 1px solid ${s("divider")};
  }
`;

const Cell = styled.td`
  padding: 2px 4px;
  vertical-align: middle;

  &:not(:last-child) {
    border-right: 1px solid ${s("divider")};
  }
`;

const GripCell = styled.td`
  padding: 0;
  width: 20px;
  min-width: 20px;
  vertical-align: middle;
`;

/** The trailing cell of a body row, holding that row's overflow menu. */
const RowControlsCell = styled.td`
  padding: 2px 6px;
  width: 60px;
  min-width: 60px;
  vertical-align: middle;

  /* the menu is chrome rather than data, so it stays out of the way until the
     row is pointed at or the menu itself has focus */
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  ${Row}:hover &,
  &:focus-within {
    opacity: 1;
  }
`;

/** The shared look of a drag grip: a rounded bar that appears on hover. */
const grip = css`
  border: 0;
  padding: 0;
  border-radius: 3px;
  background: ${s("divider")};
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &:hover,
  &:focus-visible {
    background: ${s("text")};
    opacity: 1;
  }
`;

const RowGrip = styled.button.attrs({ type: "button" })`
  ${grip}
  display: block;
  width: 4px;
  height: 16px;
  margin: 0 auto;

  ${Row}:hover & {
    opacity: 1;
  }
`;

const ColumnGrip = styled.button.attrs({ type: "button" })`
  ${grip}
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 4px;
  z-index: 2;

  ${HeaderCell}:hover & {
    opacity: 1;
  }
`;

const TitleCell = styled(Cell)`
  padding: 0;
`;

const TitleInputPadding = styled.div`
  padding: 6px;
`;

const TitleLink = styled(Link)`
  display: block;
  color: ${s("text")};
  font-weight: 500;
  padding: 8px 10px;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyCell = styled.td`
  padding: 24px;
  text-align: center;
  color: ${s("textSecondary")};
`;

const NewRowCell = styled.td`
  padding: 2px 4px;
`;

const NewRowButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${s("textSecondary")};
  font-size: 14px;
  padding: 0 6px;
  justify-content: flex-start;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

export default observer(DatabaseTable);
