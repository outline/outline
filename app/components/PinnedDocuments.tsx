import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { keyBy } from "lodash";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "~/models/Document";
import DocumentCard from "~/components/DocumentCard";

type Props = {
  documents: Document[];
  limit?: number;
  canUpdate?: boolean;
  showCollectionIcon?: boolean;
};

export default function PinnedDocuments({ limit, documents, ...rest }: Props) {
  const items = React.useMemo(
    () => keyBy(limit ? documents.splice(0, limit) : documents, "id"),
    [limit, documents]
  );
  const [order, setOrder] = React.useState(Object.keys(items));

  React.useEffect(() => {
    setOrder(Object.keys(items));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  if (!order.length) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToParentElement]}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <List>
          <AnimatePresence initial={false}>
            {order.map((documentId) => {
              const document = items[documentId];
              return document ? (
                <DocumentCard key={documentId} document={document} {...rest} />
              ) : null;
            })}
          </AnimatePresence>
        </List>
      </SortableContext>
    </DndContext>
  );
}

const List = styled.div`
  display: grid;
  column-gap: 8px;
  row-gap: 8px;
  margin: 16px 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 0;
  list-style: none;

  ${breakpoint("desktop")`
    grid-template-columns: repeat(4, minmax(0, 1fr));
  `};
`;
