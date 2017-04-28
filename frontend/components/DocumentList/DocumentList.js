import React from 'react';

import DocumentPreview from 'components/DocumentPreview';
import Divider from 'components/Divider';

import styles from './DocumentList.scss';

class DocumentList extends React.Component {
  static propTypes = {
    documents: React.PropTypes.arrayOf(React.PropTypes.object),
  };

  render() {
    return (
      <div>
        {this.props.documents &&
          this.props.documents.map(document => {
            return (
              <div>
                <DocumentPreview document={document} />
                <Divider />
              </div>
            );
          })}
      </div>
    );
  }
}

export default DocumentList;
