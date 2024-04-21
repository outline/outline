import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import theme from "@shared/styles/theme";
import { UrlHelper } from "@shared/utils/UrlHelper";
import env from "@server/env";

type Props = {
  unsubscribeUrl?: string;
  children?: React.ReactNode;
};

export const Link = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const linkStyle = {
    color: theme.slate,
    fontWeight: 500,
    textDecoration: "none",
    marginRight: "10px",
  };

  return (
    <a href={href} style={linkStyle}>
      {children}
    </a>
  );
};

export default ({ unsubscribeUrl, children }: Props) => {
  const footerStyle = {
    padding: "20px 0",
    borderTop: `1px solid ${theme.smokeDark}`,
    color: theme.slate,
    fontSize: "14px",
  };
  const footerLinkStyle = {
    padding: "0",
    color: theme.slate,
    fontSize: "14px",
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
            <Link href={env.URL}>{env.APP_NAME}</Link>
            <a href={UrlHelper.twitter} style={externalLinkStyle}>
              Twitter
            </a>
          </TD>
        </TR>
        {unsubscribeUrl && (
          <TR>
            <TD style={footerLinkStyle}>
              <Link href={unsubscribeUrl}>Unsubscribe from these emails</Link>
            </TD>
          </TR>
        )}
        {children && (
          <TR>
            <TD style={footerLinkStyle}>{children}</TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
};
