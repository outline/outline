// @flow
import React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import EmptySpace from './EmptySpace';
import { color } from '../../../shared/styles/constants';

export default () => {
  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD>
            <EmptySpace height={40} />
            <img
              src={`${process.env.URL}/email/header-logo.png`}
              height="55"
              width="32"
            />
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
