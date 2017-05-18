// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';

import DocumentLink from './components/DocumentLink';

import styles from './AtlasPreview.scss';
// import classNames from 'classnames/bind';
// const cx = classNames.bind(styles);

@observer class AtlasPreview extends React.Component {
  static propTypes = {
    data: React.PropTypes.object.isRequired,
  };

  render() {
    const data = this.props.data;

    return (
      <div className={styles.container}>
        <h2>
          <Link to={data.url} className={styles.atlasLink}>{data.name}</Link>
        </h2>
        {data.recentDocuments.length > 0
          ? data.recentDocuments.map(document => {
              return <DocumentLink document={document} key={document.id} />;
            })
          : <div className={styles.description}>
              No documents. Why not
              {' '}
              <Link to={`${data.url}/new`}>create one</Link>
              ?
            </div>}
      </div>
    );
  }
}

export default AtlasPreview;
