import { differenceInMinutes } from "date-fns";
import * as React from "react";
import styled from "styled-components";
import type Note from "~/models/Note";
import Event from "~/models/Event";
import Revision from "~/models/Revision";
import PaginatedList from "~/components/PaginatedList";
import EventListItem from "./EventListItem";
import RevisionListItem from "./RevisionListItem";
type Item = Revision | Event<Note>;
type Props = {
  items: Item[];
  note: Note;
  fetch: (options: Record<string, unknown> | undefined) => Promise<Item[]>;
  options?: Record<string, unknown>;
  heading?: React.ReactNode;
  empty?: JSX.Element;
};
const PaginatedEventList = React.memo<Props>(function PaginatedEventList({
  empty,
  heading,
  items,
  fetch,
  options,
  note,
  ...rest
}: Props) {
  const isDuplicate = React.useCallback((item: Item, previousItem: Item) => {
    if (item instanceof Event && previousItem instanceof Event) {
      return (
        Math.abs(
          differenceInMinutes(
            new Date(item.createdAt),
            new Date(previousItem.createdAt)
          )
        ) < 10 &&
        item.name === previousItem.name &&
        item.actorId === previousItem.actorId &&
        item.userId === previousItem.userId &&
        item.noteId === previousItem.noteId &&
        item.notebookId === previousItem.notebookId
      );
    }
    return false;
  }, []);
  return (
    <StyledPaginatedList
      items={items}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      isDuplicate={isDuplicate}
      renderItem={(item: Item) =>
        item instanceof Revision ? (
          <RevisionListItem key={item.id} item={item} note={note} />
        ) : (
          <EventListItem key={item.id} item={item} note={note} />
        )
      }
      renderHeading={(name) => <Heading>{name}</Heading>}
      {...rest}
    />
  );
});
const StyledPaginatedList = styled(PaginatedList)`
  padding: 0 12px;
`;
const Heading = styled("h3")`
  font-size: 15px;
  padding: 0 4px;
`;
export default PaginatedEventList;
