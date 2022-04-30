import * as React from "react";
import styled from "styled-components";
import Document from "~/models/Document";
import Event from "~/models/Event";
import PaginatedList from "~/components/PaginatedList";
import EventListItem from "./EventListItem";

type Props = {
  events: Event[];
  document: Document;
  fetch: (options: Record<string, any> | undefined) => Promise<Event[]>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
};
const PaginatedEventList = React.memo<Props>(function PaginatedEventList({
  empty,
  heading,
  events,
  fetch,
  options,
  document,
  ...rest
}: Props) {
  return (
    <PaginatedList
      items={events}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      renderItem={(item: Event, index, compositeProps) => {
        return (
          <EventListItem
            key={item.id}
            event={item}
            document={document}
            latest={index === 0}
            {...compositeProps}
          />
        );
      }}
      renderHeading={(name) => <Heading>{name}</Heading>}
      {...rest}
    />
  );
});

const Heading = styled("h3")`
  font-size: 14px;
  padding: 0 12px;
`;

export default PaginatedEventList;
