// @flow
import * as React from "react";
import Document from "models/Document";
import Event from "models/Event";
import PaginatedList from "components/PaginatedList";
import EventListItem from "./EventListItem";

type Props = {|
  events: Event[],
  document: Document,
  fetch: (options: ?Object) => Promise<void>,
  options?: Object,
  heading?: React.Node,
  empty?: React.Node,
|};

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
      renderItem={(item) => (
        <EventListItem
          key={item.id}
          event={item}
          document={document}
          {...rest}
        />
      )}
    />
  );
});

export default PaginatedEventList;
