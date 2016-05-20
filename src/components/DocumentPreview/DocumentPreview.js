import React from 'react';
import moment from 'moment';
import Link from 'react-router/lib/Link';

import styles from './documentPreview.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class documentPreview extends React.Component {
  static propTypes = {
    document: React.PropTypes.object.isRequired,
  }

  render() {
    const document = this.props.document;

    return (
      <Link to={ `/documents/${document.id}` } className={ styles.documentPreview }>
        <h3>{ document.title }</h3>
        <span>{ moment(document.updatedAt).fromNow() }</span>
      </Link>
    );
  }
};

export default documentPreview;