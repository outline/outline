// @flow
import React from 'react';
import classnames from 'classnames';
import styles from './ClickablePadding.scss';

type Props = {
  onClick: Function,
  grow?: boolean,
};

const ClickablePadding = (props: Props) => {
  return (
    <div
      className={classnames(styles.container, { [styles.grow]: props.grow })}
      onClick={props.onClick}
    />
  );
};

export default ClickablePadding;
