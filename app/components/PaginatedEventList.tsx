import * as React from "react";
import styled from "styled-components";
import Document from "~/models/Document";
import Event from "~/models/Event";
import Revision from "~/models/Revision";
import PaginatedList from "~/components/PaginatedList";
import EventListItem from "./EventListItem";
import RevisionListItem from "./RevisionListItem";

type Item = Revision | Event<Document>;

type Props = {
  items: Item[];
  document: Document;
  fetch: (options: Record<string, any> | undefined) => Promise<Item[]>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: JSX.Element;
};

const PaginatedEventList = React.memo<Props>(function PaginatedEventList({
  empty,
  heading,
  items,
  fetch,
  options,
  document,
  ...rest
}: Props) {
  return (
    <StyledPaginatedList
      items={items}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      renderItem={(item: Item) =>
        item instanceof Revision ? (
          <RevisionListItem key={item.id} item={item} document={document} />
        ) : (
          <EventListItem key={item.id} item={item} document={document} />
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
