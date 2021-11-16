// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'oy-v... Remove this comment to see the full error message
import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";

const EmptySpace = ({ height }: { height?: number }) => {
  height = height || 16;
  const style = {
    lineHeight: `${height}px`,
    fontSize: "1px",
    msoLineHeightRule: "exactly",
  };
  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD
            width="100%"
            height={`${height}px`}
            style={style}
            dangerouslySetInnerHTML={{
              __html: "&nbsp;",
            }}
          />
        </TR>
      </TBody>
    </Table>
  );
};

export default EmptySpace;
