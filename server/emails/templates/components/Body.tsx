import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import EmptySpace from "./EmptySpace";

const Body: React.FC = ({ children }) => (
  <Table width="100%">
    <TBody>
      <TR>
        <TD>
          <EmptySpace height={10} />
          {children}
          <EmptySpace height={40} />
        </TD>
      </TR>
    </TBody>
  </Table>
);

export default Body;
