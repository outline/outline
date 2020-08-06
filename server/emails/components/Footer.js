// @flow
import * as React from "react";
import { Table, TBody, TR, TD } from "oy-vey";
import { twitterUrl } from "../../../shared/utils/routeHelpers";
import theme from "../../../shared/styles/theme";

type Props = {
  unsubscribeUrl?: string,
};

export default ({ unsubscribeUrl }: Props) => {
  const footerStyle = {
    padding: "20px 0",
    borderTop: `1px solid ${theme.smokeDark}`,
    color: theme.slate,
    fontSize: "14px",
  };

  const unsubStyle = {
    padding: "0",
    color: theme.slate,
    fontSize: "14px",
  };

  const linkStyle = {
    color: theme.slate,
    fontWeight: 500,
    textDecoration: "none",
    marginRight: "10px",
  };

  const externalLinkStyle = {
    color: theme.slate,
    textDecoration: "none",
    margin: "0 10px",
  };

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD style={footerStyle}>
            <a href={process.env.URL} style={linkStyle}>
              Outline
            </a>
            <a href={twitterUrl()} style={externalLinkStyle}>
              Twitter
            </a>
          </TD>
        </TR>
        {unsubscribeUrl && (
          <TR>
            <TD style={unsubStyle}>
              <a href={unsubscribeUrl} style={linkStyle}>
                Unsubscribe from these emails
              </a>
            </TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
};
