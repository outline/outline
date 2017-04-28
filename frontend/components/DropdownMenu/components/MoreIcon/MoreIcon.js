import React from 'react';

import styles from './MoreIcon.scss';

const MoreIcon = props => {
  return <img src={require('./assets/more.svg')} className={styles.icon} />;
};

export default MoreIcon;
