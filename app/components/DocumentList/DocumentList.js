// @flow
import * as React from 'react';
import Document from 'models/Document';
import DocumentPreview from 'components/DocumentPreview';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

type Props = {
  documents: Document[],
  showCollection?: boolean,
  limit?: number,
};

class DocumentList extends React.Component<Props> {
  render() {
    const { limit, showCollection } = this.props;
    const documents = limit
      ? this.props.documents.splice(0, limit)
      : this.props.documents;

    return (
      <ArrowKeyNavigation
        mode={ArrowKeyNavigation.mode.VERTICAL}
        defaultActiveChildIndex={0}
      >
        {documents.map(document => (
          <DocumentPreview
            key={document.id}
            document={document}
            showCollection={showCollection}
          />
        ))}
      </ArrowKeyNavigation>
    );
  }
}

export default DocumentList;
