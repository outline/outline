// @flow
import React from 'react';
import Document from 'models/Document';
import DocumentPreview from 'components/DocumentPreview';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

class DocumentList extends React.Component {
  props: {
    documents: Array<Document>,
  };

  render() {
    return (
      <ArrowKeyNavigation
        mode={ArrowKeyNavigation.mode.VERTICAL}
        defaultActiveChildIndex={0}
      >
        {this.props.documents &&
          this.props.documents.map(document => (
            <DocumentPreview key={document.id} document={document} />
          ))}
      </ArrowKeyNavigation>
    );
  }
}

export default DocumentList;
