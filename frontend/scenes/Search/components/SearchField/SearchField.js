// @flow
import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';

import styles from './SearchField.scss';

@observer class SearchField extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
  };

  handleChange = (event: SyntheticEvent) => {
    event.currentTarget.value && this.props.onChange(event.currentTarget.value);
  };

  render() {
    return (
      <div className={styles.container}>
        <input
          {...this.props}
          onChange={this.handleChange}
          className={styles.field}
          placeholder="Search"
          autoFocus
        />
      </div>
    );
  }
}

export default SearchField;
