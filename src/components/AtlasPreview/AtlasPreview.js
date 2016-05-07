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
    return (
      <div className={ styles.container }>
        <h2><Link to={ `/atlas/${this.props.data.id}` } className={ styles.atlasLink }>{ this.props.data.name }</Link></h2>
        <div>No documents. Why not <Link to='/new-document'>create one</Link>?</div>
      </div>
    );
  }
};

export default AtlasPreview;