import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

import styles from './AtlasPreviewLoading.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import { randomInteger } from 'utils/random';

const randomValues = Array.from(
  new Array(5),
  () => `${randomInteger(85, 100)}%`
);

export default _props => {
  return (
    <ReactCSSTransitionGroup
      transitionName="fadeIn"
      transitionAppear
      transitionEnter
      transitionLeave
      transitionAppearTimeout={0}
      transitionEnterTimeout={0}
      transitionLeaveTimeout={0}
    >
      <div>
        <div className={cx(styles.container, styles.animated)}>
          <div
            className={cx(styles.mask, styles.header)}
            style={{ width: randomValues[0] }}
          />
          <div
            className={cx(styles.mask, styles.bodyText)}
            style={{ width: randomValues[1] }}
          />
          <div
            className={cx(styles.mask, styles.bodyText)}
            style={{ width: randomValues[2] }}
          />
          <div
            className={cx(styles.mask, styles.bodyText)}
            style={{ width: randomValues[3] }}
          />
        </div>
      </div>
    </ReactCSSTransitionGroup>
  );
};
