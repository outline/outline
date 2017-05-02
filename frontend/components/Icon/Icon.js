// @flow
import React from 'react';
import classnames from 'classnames';
import styles from './Icon.scss';

type Props = {
  type: string,
  children: any,
  className: string,
  light: boolean,
};

export default function Icon({
  type,
  className,
  children,
  light,
  ...rest
}: Props) {
  const classes = classnames(className, styles.icon, {
    [styles.light]: light,
  });

  return (
    <span {...rest} className={classes}>
      {children}
    </span>
  );
}
