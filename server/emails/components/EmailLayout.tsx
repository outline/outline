import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import theme from "@shared/theme";

const EmailLayout: React.FC = ({ children }) => (
  <Table width="550" padding="40">
    <TBody>
      <TR>
        <TD align="left">{children}</TD>
      </TR>
    </TBody>
  </Table>
);

export default EmailLayout;

export const baseStyles = `
  #__bodyTable__ {
    font-family: ${theme.fontFamily};
    font-size: 16px;
    line-height: 1.5;
  }
`;
