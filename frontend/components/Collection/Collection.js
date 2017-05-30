// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

import styles from './Collection.scss';

@observer class Collection extends React.Component {
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
              return (
                <Link
                  key={document.id}
                  to={document.url}
                  className={styles.link}
                >
                  <h3 className={styles.title}>{document.title}</h3>
                  <span className={styles.timestamp}>
                    {moment(document.updatedAt).fromNow()}
                  </span>
                </Link>
              );
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

export default Collection;
