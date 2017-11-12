// @flow
import React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import { fonts } from '../../../shared/styles/constants';

type Props = {
  children: React$Element<*>,
};

export default (props: Props) => (
  <Table width="550" padding="40">
    <TBody>
      <TR>
        <TD align="left">{props.children}</TD>
      </TR>
    </TBody>
  </Table>
);

export const baseStyles = `
  #__bodyTable__ {
    font-family: ${fonts.regular};
    font-size: 16px;
    line-height: 1.5;
  }
`;
