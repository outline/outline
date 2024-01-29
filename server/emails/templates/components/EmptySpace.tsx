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
