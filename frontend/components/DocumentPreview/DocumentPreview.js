import React from 'react';
import { toJS } from 'mobx';
import { Link } from 'react-router';

import styles from './DocumentPreview.scss';

import PublishingInfo from 'components/PublishingInfo';

class Document extends React.Component {
  static propTypes = {
    document: React.PropTypes.object.isRequired,
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

        <Link to={this.props.document.url} className={styles.title}>
          <h2>{this.props.document.title}</h2>
        </Link>

        <div
          dangerouslySetInnerHTML={{ __html: this.props.document.preview }}
        />

        <div>
          <Link to={this.props.document.url} className={styles.continueLink}>
            Continue reading...
          </Link>
        </div>
      </div>
    );
  }
}

export default Document;
