// @flow
import React from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import type { Document as DocumentType } from '../../../types';
import PublishingInfo from '../PublishingInfo';
import styles from './Document.scss';
import DocumentHtml from './components/DocumentHtml';

@observer class Document extends React.Component {
  props: {
    document: DocumentType,
  };

  render() {
    return (
      <div className={styles.container}>
        <PublishingInfo
          createdAt={this.props.document.createdAt}
          createdBy={this.props.document.createdBy}
          updatedAt={this.props.document.updatedAt}
          updatedBy={this.props.document.updatedBy}
          collaborators={toJS(this.props.document.collaborators)}
        />
        <DocumentHtml html={this.props.document.html} />
      </div>
    );
  }
}

export default Document;
