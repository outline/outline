import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import PropertyValueLabel from "@shared/editor/components/PropertyValueLabel";
import type { Property, PropertyOption, PropertyValue } from "@shared/types";
import { PropertyType } from "@shared/types";
import { errToString } from "@shared/utils/error";
import {
  groupByProperty,
  groupOptionIdForValue,
} from "@shared/utils/properties";
import type Document from "~/models/Document";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  /** The documents to render as cards, in order. */
  rows: Document[];
  /** The properties to display on cards, in order. */
  properties: Property[];
  /** The groupable property whose options form the board columns. */
  groupByProperty: Property;
};

const EMPTY_COLUMN_ID = "__none__";

/**
 * Renders the documents of a database collection as a kanban board grouped
 * by a select or multiSelect property: each option is a column, plus a
 * "No value" column. Dragging a card between columns updates the document's
 * group property value.
 */
function DatabaseBoard({ rows, properties, groupByProperty: property }: Props) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const groups = groupByProperty(rows, property, (document) =>
    document.propertyValue(property.id)
  );

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) {
        return;
      }
      const document = rows.find((row) => row.id === active.id);
      if (!document) {
        return;
      }
      const optionId = over.id === EMPTY_COLUMN_ID ? null : String(over.id);
      let value: PropertyValue = optionId;
      if (property.type === PropertyType.MultiSelect) {
        // moving a card swaps only its group option — the first known option,
        // which determines the column — and keeps the other selected options
        const current = document.propertyValue(property.id);
        const others = (Array.isArray(current) ? current : []).filter(
          (item) =>
            item !== optionId &&
            item !== groupOptionIdForValue(property, current)
        );
        value = optionId === null ? null : [optionId, ...others];
      }
      try {
        await document.setProperty(property.id, value);
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [rows, property]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Columns>
        {groups.map((group) => (
          <BoardColumn
            key={group.option?.id ?? EMPTY_COLUMN_ID}
            option={group.option}
            documents={group.items}
            properties={properties}
            groupByProperty={property}
            emptyLabel={t("No value")}
          />
        ))}
      </Columns>
    </DndContext>
  );
}

const BoardColumn = observer(function BoardColumn_({
  option,
  documents,
  properties,
  groupByProperty: property,
  emptyLabel,
}: {
  option: PropertyOption | null;
  documents: Document[];
  properties: Property[];
  groupByProperty: Property;
  emptyLabel: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: option?.id ?? EMPTY_COLUMN_ID,
  });

  return (
    <Column ref={setNodeRef} $isOver={isOver}>
      <ColumnHeader>
        {option ? (
          <Chip $color={option.color}>{option.name}</Chip>
        ) : (
          <EmptyChip>{emptyLabel}</EmptyChip>
        )}
        <Count>{documents.length}</Count>
      </ColumnHeader>
      {documents.map((document) => (
        <BoardCard
          key={document.id}
          document={document}
          properties={properties}
          groupByProperty={property}
        />
      ))}
    </Column>
  );
});

const BoardCard = observer(function BoardCard_({
  document,
  properties,
  groupByProperty: property,
}: {
  document: Document;
  properties: Property[];
  groupByProperty: Property;
}) {
  const can = usePolicy(document);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: document.id,
      disabled: !can.update,
    });
  const cardProperties = properties.filter((item) => item.id !== property.id);

  return (
    <Card
      ref={setNodeRef}
      $isDragging={isDragging}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      {...listeners}
      {...attributes}
    >
      <CardTitle to={document.path}>{document.titleWithDefault}</CardTitle>
      {cardProperties.map((item) => {
        const value = document.propertyValue(item.id);
        if (value === undefined || value === null) {
          return null;
        }
        return (
          <CardValue key={item.id}>
            <PropertyValueLabel property={item} value={value} />
          </CardValue>
        );
      })}
    </Card>
  );
});

const Columns = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 12px;
`;

const Column = styled.div<{ $isOver: boolean }>`
  flex: 0 0 260px;
  min-height: 120px;
  background: ${(props) =>
    props.$isOver ? props.theme.listItemHoverBackground : "transparent"};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  padding: 8px;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`;

const Chip = styled.span<{ $color?: string }>`
  display: inline-block;
  background: ${(props) => props.$color ?? props.theme.backgroundSecondary};
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 13px;
  font-weight: 500;
`;

const EmptyChip = styled.span`
  color: ${s("textSecondary")};
  font-size: 13px;
  font-weight: 500;
`;

const Count = styled.span`
  color: ${s("textTertiary")};
  font-size: 13px;
`;

const Card = styled.div<{ $isDragging: boolean }>`
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  opacity: ${(props) => (props.$isDragging ? 0.6 : 1)};
  position: relative;
  z-index: ${(props) => (props.$isDragging ? 2 : "auto")};
`;

const CardTitle = styled(Link)`
  display: block;
  color: ${s("text")};
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;

  &:hover {
    text-decoration: underline;
  }
`;

const CardValue = styled.div`
  font-size: 13px;
  color: ${s("textSecondary")};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default observer(DatabaseBoard);
