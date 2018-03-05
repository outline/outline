// @flow
import React from 'react';

const style = {
  fontWeight: 500,
  fontSize: '18px',
};

type Props = {
  children: React$Element<*>,
};

export default ({ children }: Props) => (
  <p>
    <span style={style}>{children}</span>
  </p>
);
