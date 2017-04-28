import React, { PropTypes } from 'react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';

import PublishingInfo from 'components/PublishingInfo';
import DocumentHtml from './components/DocumentHtml';

import styles from './Document.scss';

@observer class Document extends React.Component {
  static propTypes = {
    document: PropTypes.object.isRequired,
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
