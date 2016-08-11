import React from 'react';
import _truncate from 'lodash/truncate';

import styles from './Title.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class Title extends React.Component {
  static propTypes = {
    children: React.PropTypes.string,
    truncate: React.PropTypes.number,
    placeholder: React.PropTypes.string,
  }

  render() {
    let title;
    if (this.props.truncate) {
      title = _truncate(this.props.children, this.props.truncate);
    } else {
      title = this.props.children;
    }

    let usePlaceholder;
    if (this.props.children === null && this.props.placeholder) {
      title = this.props.placeholder;
      usePlaceholder = true;
    }

    return(
      <span
        title={ this.props.children }
        className={ cx(styles.title, { untitled: usePlaceholder })}
      >
        { title || this.props.placeholder }
      </span>
    );

  }
};

export default Title;
