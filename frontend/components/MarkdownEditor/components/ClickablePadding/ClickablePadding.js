import React from 'react';

import styles from './ClickablePadding.scss';

const ClickablePadding = props => {
  return <div className={styles.container} onClick={props.onClick}>&nbsp;</div>;
};

ClickablePadding.propTypes = {
  onClick: React.PropTypes.func,
};

export default ClickablePadding;
