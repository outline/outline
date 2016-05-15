import React from 'react';
import _truncate from 'lodash/truncate';

import styles from './Title.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

const Title = (props) => {
  let title;
  if (props.truncate) {
    title = _truncate(props.children, props.truncate);
  } else {
    title = props.children;
  }

  let usePlaceholder;
  if (props.children === null && props.placeholder) {
    title = props.placeholder;
    usePlaceholder = true;
  }

  return(
    <span
      title={ props.children }
      className={ cx(styles.title, { untitled: usePlaceholder })}
    >
      { title }
    </span>
  );
};

Title.propTypes = {
  children: React.PropTypes.string,
  truncate: React.PropTypes.number,
  placeholder: React.PropTypes.string,
}

export default Title;