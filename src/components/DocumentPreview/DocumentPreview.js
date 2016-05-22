import React from 'react';
import marked from 'marked';

import { Link } from 'react-router';

import PublishingInfo from 'components/PublishingInfo';

import styles from './DocumentPreview.scss';

class Document extends React.Component {
  static propTypes = {
    document: React.PropTypes.object.isRequired,
  }

  render() {
    return (
      <div className={ styles.container }>
        <PublishingInfo
          avatarUrl={ this.props.document.user.avatarUrl }
          name={ this.props.document.user.name }
          timestamp={ document.createdAt }
        />

        <Link
          to={ `/documents/${this.props.document.id}` }
          className={ styles.title }
        >
          <h2>{ this.props.document.title }</h2>
        </Link>

        <div dangerouslySetInnerHTML={{ __html: this.props.document.preview }} />

        <div>
          <Link
            to={ `/documents/${this.props.document.id}` }
            className={ styles.continueLink }
          >
            Continue reading...
          </Link>
        </div>
      </div>
    );
  }
};

export default Document;
