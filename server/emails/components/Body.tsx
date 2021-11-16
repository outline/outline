// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'oy-v... Remove this comment to see the full error message
import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import EmptySpace from "./EmptySpace";

type Props = {
  children: React.ReactNode;
};

export default ({ children }: Props) => {
  return (
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
};
