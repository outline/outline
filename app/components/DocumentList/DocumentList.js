// @flow
import React from 'react';
import Document from 'models/Document';
import DocumentPreview from 'components/DocumentPreview';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

class DocumentList extends React.Component {
  props: {
    documents: Document[],
    showCollection?: boolean,
  };

  render() {
    const { documents, showCollection } = this.props;

    return (
      <ArrowKeyNavigation
        mode={ArrowKeyNavigation.mode.VERTICAL}
        defaultActiveChildIndex={0}
      >
        {documents &&
          documents.map(document => (
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
