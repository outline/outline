import React from 'react';

import { DocumentHtml } from 'components/Document';

import styles from './Preview.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

const Preview = props => {
  return (
    <div className={cx(styles.container)}>
      <DocumentHtml html={props.html} />
    </div>
  );
};

Preview.propTypes = {
  html: React.PropTypes.string.isRequired,
};

export default Preview;
