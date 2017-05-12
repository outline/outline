// @flow
import React, { PropTypes } from 'react';
import { Flex } from 'reflexbox';
import classNames from 'classnames/bind';
import styles from './Alert.scss';

const cx = classNames.bind(styles);

class Alert extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    danger: PropTypes.bool,
    warning: PropTypes.bool,
    success: PropTypes.bool,
  };

  render() {
    let alertType;
    if (this.props.danger) alertType = 'danger';
    if (this.props.warning) alertType = 'warning';
    if (this.props.success) alertType = 'success';
    if (!alertType) alertType = 'info'; // default

    return (
      <Flex
        align="center"
        justify="center"
        className={cx(styles.container, styles[alertType])}
      >
        {this.props.children}
      </Flex>
    );
  }
}

export default Alert;
