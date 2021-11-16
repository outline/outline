import * as React from "react";
import styled from "styled-components";
import Document from "models/Document";
import Event from "models/Event";
import PaginatedList from "components/PaginatedList";
import EventListItem from "./EventListItem";

type Props = {
  events: Event[];
  document: Document;
  fetch: (options: Record<string, any> | null | undefined) => Promise<void>;
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
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: Event[]; empty: ReactNode; heading:... Remove this comment to see the full error message
      items={events}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
      renderItem={(item, index) => (
        <EventListItem
          key={item.id}
          event={item}
          document={document}
          latest={index === 0}
          {...rest}
        />
      )}
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'name' implicitly has an 'any' type.
      renderHeading={(name) => <Heading>{name}</Heading>}
    />
  );
});
const Heading = styled("h3")`
  font-size: 14px;
  padding: 0 12px;
`;

export default PaginatedEventList;
