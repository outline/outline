import React from 'react';

import styles from './AtlasPreviewLoading.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import { randomInteger } from 'utils/random';

export default (props) => {
  return (
    <div className={ cx(styles.container, styles.animated) }>
      <div className={ cx(styles.mask, styles.header) } style={{ width: `${randomInteger(65,80)}%` }}>&nbsp;</div>
      <div className={ cx(styles.mask, styles.bodyText) } style={{ width: `${randomInteger(85,100)}%` }}>&nbsp;</div>
      <div className={ cx(styles.mask, styles.bodyText) } style={{ width: `${randomInteger(85,100)}%` }}>&nbsp;</div>
      <div className={ cx(styles.mask, styles.bodyText) } style={{ width: `${randomInteger(85,100)}%` }}>&nbsp;</div>
    </div>
  );
};