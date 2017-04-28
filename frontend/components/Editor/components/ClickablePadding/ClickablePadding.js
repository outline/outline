import React from 'react';
import classnames from 'classnames';
import styles from './ClickablePadding.scss';

const ClickablePadding = (props) => {
  return (
    <div
      className={ classnames(styles.container, {[styles.grow]: props.grow}) }
      onClick={ props.onClick }
    >&nbsp;</div>
  )
}

ClickablePadding.propTypes = {
  onClick: React.PropTypes.func,
  grow: React.PropTypes.bool
};

export default ClickablePadding;
