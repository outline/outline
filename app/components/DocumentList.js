// @flow
import * as React from 'react';
import Document from 'models/Document';
import DocumentListItem from 'components/DocumentListItem';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

type Props = {
  documents: Document[],
  component: React.Element<any>,
  limit?: number,
};

export default function DocumentList({
  limit,
  documents,
  component,
  ...rest
}: Props) {
  const items = limit ? documents.splice(0, limit) : documents;
  const Component = component ? component : DocumentListItem;

  return (
    <ArrowKeyNavigation
      mode={ArrowKeyNavigation.mode.VERTICAL}
      defaultActiveChildIndex={0}
    >
      {items.map(document => (
        <Component key={document.id} document={document} {...rest} />
      ))}
    </ArrowKeyNavigation>
  );
}
