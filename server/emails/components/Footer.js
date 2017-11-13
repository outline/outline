// @flow
import React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import { color } from '../../../shared/styles/constants';

export default () => {
  const style = {
    padding: '20px 0',
    borderTop: `1px solid ${color.smokeDark}`,
    color: color.slate,
    fontSize: '14px',
  };

  const linkStyle = {
    color: color.slate,
    textDecoration: 'none',
  };

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD style={style}>
            <a href={process.env.URL} style={linkStyle}>
              Outline
            </a>
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
