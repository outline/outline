// @flow
import React from 'react';

import { DocumentHtml } from 'components/Document';

import styles from './Preview.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

type Props = {
  html: ?string,
};

const Preview = (props: Props) => {
  return (
    <div className={cx(styles.container)}>
      <DocumentHtml html={props.html} />
    </div>
  );
};

export default Preview;
