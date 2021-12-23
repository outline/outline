import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { Reorder } from "framer-motion";
import { keyBy } from "lodash";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "~/models/Document";
import DocumentCard from "~/components/DocumentCard";

type Props = {
  documents: Document[];
  limit?: number;
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

  console.log({ order });

  return (
    <List values={order} onReorder={setOrder}>
      {order.map((documentId) => (
        <DocumentCard key={documentId} document={items[documentId]} {...rest} />
      ))}
    </List>
  );
}

const List = styled(Reorder.Group)`
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
