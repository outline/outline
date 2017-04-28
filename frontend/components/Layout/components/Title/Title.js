import React from 'react';
import _ from 'lodash';

import styles from './Title.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class Title extends React.Component {
  static propTypes = {
    children: React.PropTypes.string,
    truncate: React.PropTypes.number,
    placeholder: React.PropTypes.string,
  };

  render() {
    let title;
    if (this.props.truncate) {
      title = _.truncate(this.props.children, this.props.truncate);
    } else {
      title = this.props.children;
    }

    let usePlaceholder;
    if (this.props.children === null && this.props.placeholder) {
      title = this.props.placeholder;
      usePlaceholder = true;
    }

    return (
      <span>
        {title && <span>&nbsp;/&nbsp;</span>}
        <span
          title={this.props.children}
          className={cx(styles.title, { untitled: usePlaceholder })}
        >
          {title}
        </span>
      </span>
    );
  }
}

export default Title;
