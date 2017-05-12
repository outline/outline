// @flow
import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';

import styles from './SearchField.scss';

@observer class SearchField extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
  };

  onChange = (event: SyntheticEvent) => {
    event.currentTarget.value && this.props.onChange(event.currentTarget.value);
  };

  render() {
    return (
      <div className={styles.container}>
        <input
          onChange={this.onChange}
          className={styles.field}
          placeholder="Search"
          autoFocus
        />
      </div>
    );
  }
}

export default SearchField;
