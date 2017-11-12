// @flow
import React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';

export default () => {
  const style = {
    padding: '20px 0',
    borderTop: '1px solid #e8e8e8',
    color: '#9BA6B2',
    fontSize: '14px',
  };

  const linkStyle = {
    color: '#9BA6B2',
    textDecoration: 'none',
  };

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD width="75%" style={style}>
            <a href={process.env.URL} style={linkStyle}>
              Outline
            </a>
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
