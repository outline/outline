import React from 'react';

import styles from './MoreIcon.scss';

const MoreIcon = () => {
  return (
    <img
      alt="More"
      src={require('./assets/more.svg')}
      className={styles.icon}
    />
  );
};

export default MoreIcon;
