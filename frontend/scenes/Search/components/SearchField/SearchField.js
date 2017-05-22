// @flow
import React, { Component } from 'react';
import styles from './SearchField.scss';

class SearchField extends Component {
  props: {
    onChange: Function,
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
