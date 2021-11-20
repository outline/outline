// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'oy-v... Remove this comment to see the full error message
import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import theme from "@shared/theme";

type Props = {
  children: React.ReactNode;
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
    font-family: ${theme.fontFamily};
    font-size: 16px;
    line-height: 1.5;
  }
`;
