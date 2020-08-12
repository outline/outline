// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import * as React from "react";
import Document from "models/Document";
import DocumentPreview from "components/DocumentPreview";

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
        <DocumentPreview key={document.id} document={document} {...rest} />
      ))}
    </ArrowKeyNavigation>
  );
}
