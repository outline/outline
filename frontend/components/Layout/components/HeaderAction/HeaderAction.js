import React from 'react';

import styles from './HeaderAction.scss';

const HeaderAction = props => {
  return (
    <div onClick={props.onClick} className={styles.container}>
      {props.children}
    </div>
  );
};

HeaderAction.propTypes = {
  onClick: React.PropTypes.func,
};

export default HeaderAction;
