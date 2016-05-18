import React from 'react';
import Link from 'react-router/lib/Link';

import styles from './AtlasPreview.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class AtlasPreview extends React.Component {
  static propTypes = {
    data: React.PropTypes.object.isRequired,
  }

  render() {
    const data = this.props.data;

    return (
      <div className={ styles.container }>
        <h2><Link to={ `/atlas/${data.id}` } className={ styles.atlasLink }>{ data.name }</Link></h2>
        <div>No documents. Why not <Link to={ `/atlas/${data.id}/new` }>create one</Link>?</div>
      </div>
    );
  }
};

export default AtlasPreview;