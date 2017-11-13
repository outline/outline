// @flow
import React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';

import EmptySpace from './EmptySpace';

type Props = {
  children: React$Element<*>,
};

export default ({ children }: Props) => {
  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD>
            <EmptySpace height={40} />
            {children}
            <EmptySpace height={40} />
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
