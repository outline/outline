// @flow
import React from 'react';

import styles from './HeaderAction.scss';

type Props = { onClick?: ?Function, children?: ?React.Element<any> };

const HeaderAction = (props: Props) => {
  return (
    <div onClick={props.onClick} className={styles.container}>
      {props.children}
    </div>
  );
};

export default HeaderAction;
