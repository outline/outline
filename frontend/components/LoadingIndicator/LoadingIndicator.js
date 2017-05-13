// @flow
import React from 'react';

import styles from './LoadingIndicator.scss';

const LoadingIndicator = () => {
  return (
    <div className={styles.loading}>
      <div className={styles.loader} />
    </div>
  );
};

export default LoadingIndicator;
