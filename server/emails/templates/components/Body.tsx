import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import theme from "@shared/styles/theme";
import EmptySpace from "./EmptySpace";

/** A notice to show at the top of the email body, such as a delay warning. */
export const BodyNoticeContext = React.createContext<string | undefined>(
  undefined
);

const noticeStyle = {
  color: theme.slate,
  fontSize: "14px",
};

const Body: React.FC<React.PropsWithChildren> = ({ children }) => {
  const notice = React.useContext(BodyNoticeContext);

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD>
            <EmptySpace height={10} />
            {notice ? <p style={noticeStyle}>{notice}</p> : null}
            {children}
            <EmptySpace height={40} />
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};

export default Body;
