// @flow
import React from 'react';
import classnames from 'classnames';
import styles from './Icon.scss';

export type Props = {
  className?: string,
  light?: boolean,
};

type BaseProps = {
  children?: React$Element<any>,
};

export default function Icon({
  className,
  children,
  light,
  ...rest
}: Props & BaseProps) {
  const classes = classnames(className, styles.icon, {
    [styles.light]: light,
  });

  return (
    <span {...rest} className={classes}>
      {children}
    </span>
  );
}
