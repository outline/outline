import ArrowKeyNavigation from "boundless-arrow-key-navigation";
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
  const items = limit ? documents.splice(0, limit) : documents;
  return (
    <List mode={ArrowKeyNavigation.mode.VERTICAL} defaultActiveChildIndex={0}>
      {items.map((document) => (
        <DocumentCard key={document.id} document={document} {...rest} />
      ))}
    </List>
  );
}

const List = styled(ArrowKeyNavigation)`
  display: grid;
  column-gap: 8px;
  row-gap: 8px;
  margin: 16px 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  ${breakpoint("desktop")`
    grid-template-columns: repeat(4, minmax(0, 1fr));
  `};
`;
