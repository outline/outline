// @flow
import React from 'react';

export default (props: { href: string, children: React.Element<*> }) => {
  const style = {
    display: 'inline-block',
    padding: '10px 20px',
    color: '#FFFFFF',
    background: '#000000',
    borderRadius: '4px',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
  };

  return <a {...props} style={style} />;
};
