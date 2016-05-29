import React from 'react';
import moment from 'moment';
import marked from 'marked';

import { Link } from 'react-router';
import PublishingInfo from 'components/PublishingInfo';

import styles from './Document.scss';

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
          timestamp={ this.props.document.createdAt }
        />
        <div
          className={ styles.document }
          dangerouslySetInnerHTML={{ __html: this.props.document.html }}
        />
      </div>
    );
  }
};

export default Document;
