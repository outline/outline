import React from 'react';

import styles from './HistorySidebar.scss';

class HistorySidebar extends React.Component {
  render() {
    return (
      <div className={ styles.container }>
        <div className={ styles.header }>
          Revisions
        </div>
      </div>
    );
  }
};

export default HistorySidebar;
