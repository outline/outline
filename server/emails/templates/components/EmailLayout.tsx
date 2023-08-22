import { Table, TBody, TR, TD } from "oy-vey";
import * as React from "react";
import theme from "@shared/styles/theme";

const EmailLayout: React.FC<{
  bgcolor?: string;
  previewText: string;
  goToAction?: { url: string; name: string };
}> = ({ previewText, bgcolor = "#FFFFFF", goToAction, children }) => {
  let markup;
  if (goToAction) {
    markup = JSON.stringify({
      "@context": "http://schema.org",
      "@type": "EmailMessage",
      potentialAction: {
        "@type": "ViewAction",
        url: goToAction.url,
        name: goToAction.name,
      },
    });
  }
  return (
    <>
      {markup ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      ) : null}
      <Table
        bgcolor={bgcolor}
        id="__bodyTable__"
        width="100%"
        style={{
          WebkitFontSmoothing: "antialiased",
          width: "100% !important",
          background: `${bgcolor}`,
          WebkitTextSizeAdjust: "none",
          margin: 0,
          padding: 0,
          minWidth: "100%",
        }}
      >
        <TR>
          <TD align="center">
            <span
              style={{
                display: "none !important",
                color: `${bgcolor}`,
                margin: 0,
                padding: 0,
                fontSize: "1px",
                lineHeight: "1px",
              }}
            >
              {previewText}
            </span>
            <Table width="550">
              <TBody>
                <TR>
                  <TD align="left">{children}</TD>
                </TR>
              </TBody>
            </Table>
          </TD>
        </TR>
      </Table>
    </>
  );
};

export default EmailLayout;

export const baseStyles = `
  #__bodyTable__ {
    font-family: ${theme.fontFamily};
    font-size: 16px;
    line-height: 1.5;
  }
`;
