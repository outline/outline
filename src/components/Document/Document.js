import React from 'react';
import { observer } from 'mobx-react';
import moment from 'moment';

import { Link } from 'react-router';
import PublishingInfo from 'components/PublishingInfo';

import styles from './Document.scss';

const DocumentHtml = observer((props) => {
  return (
    <div
      className={ styles.document }
      dangerouslySetInnerHTML={{ __html: props.html }}
      { ...props }
    />
  );
});

@observer
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
        <DocumentHtml html={ this.props.document.html } />
      </div>
    );
  }
};

export default Document;
export {
  DocumentHtml
};
