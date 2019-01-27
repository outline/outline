// @flow
import * as React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import EmptySpace from './EmptySpace';

export default () => {
  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD>
            <EmptySpace height={40} />
            <img
              alt="Outline"
              src={`${process.env.URL}/email/header-logo.png`}
              height="48"
              width="48"
            />
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
