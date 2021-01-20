// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import * as React from "react";
import Document from "models/Document";
import DocumentListItem from "components/DocumentListItem";

type Props = {
  documents: Document[],
  limit?: number,
};

export default function DocumentList({ limit, documents, ...rest }: Props) {
  const items = limit ? documents.splice(0, limit) : documents;

  return (
    <ArrowKeyNavigation
      mode={ArrowKeyNavigation.mode.VERTICAL}
      defaultActiveChildIndex={0}
    >
      {items.map((document) => (
        <DocumentListItem key={document.id} document={document} {...rest} />
      ))}
    </ArrowKeyNavigation>
  );
}
