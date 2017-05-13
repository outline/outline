// @flow
import React, { PropTypes } from 'react';

import styles from './ApiKeyRow.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class ApiKeyRow extends React.Component {
  static propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    secret: PropTypes.string.isRequired,
    onDelete: PropTypes.func.isRequired,
  };

  state = {
    disabled: false,
  };

  onClick = () => {
    this.props.onDelete(this.props.id);
    this.setState({ disabled: true });
  };

  render() {
    const { name, secret } = this.props;

    const { disabled } = this.state;

    return (
      <tr>
        <td>{name}</td>
        <td><code>{secret}</code></td>
        <td>
          <span
            role="button"
            onClick={this.onClick}
            className={cx(styles.deleteAction, { disabled })}
          >
            Delete
          </span>
        </td>
      </tr>
    );
  }
}

export default ApiKeyRow;
