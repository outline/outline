import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import * as React from "react";
import styled, { css } from "styled-components";
import Document from "~/models/Document";
import DocumentCard from "~/components/DocumentCard";
import DocumentListItem from "~/components/DocumentListItem";

type Props = {
  documents: Document[];
  limit?: number;
  type?: "card" | "list";
  showCollection?: boolean;
  showPublished?: boolean;
  showPin?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
};

export default function DocumentList({
  limit,
  type,
  documents,
  ...rest
}: Props) {
  const items = limit ? documents.splice(0, limit) : documents;
  return (
    <List
      type={type}
      mode={ArrowKeyNavigation.mode.VERTICAL}
      defaultActiveChildIndex={0}
    >
      {items.map((document) =>
        type ? (
          <DocumentCard key={document.id} document={document} {...rest} />
        ) : (
          <DocumentListItem key={document.id} document={document} {...rest} />
        )
      )}
    </List>
  );
}

const List = styled(ArrowKeyNavigation)<{ type: "list" | "card" }>`
  ${(props) =>
    props.type === "card" &&
    css`
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      column-gap: 8px;
      row-gap: 8px;
    `}
`;
