// @flow
import * as React from "react";
import Notice from "components/Notice";

export default function AlertNotice({ children }: { children: React.Node }) {
  return (
    <Notice muted>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", top: "2px" }}
      >
        <path
          d="M15.6676 11.5372L10.0155 1.14735C9.10744 -0.381434 6.89378 -0.383465 5.98447 1.14735L0.332715 11.5372C-0.595598 13.0994 0.528309 15.0776 2.34778 15.0776H13.652C15.47 15.0776 16.5959 13.101 15.6676 11.5372ZM8 13.2026C7.48319 13.2026 7.0625 12.7819 7.0625 12.2651C7.0625 11.7483 7.48319 11.3276 8 11.3276C8.51681 11.3276 8.9375 11.7483 8.9375 12.2651C8.9375 12.7819 8.51681 13.2026 8 13.2026ZM8.9375 9.45257C8.9375 9.96938 8.51681 10.3901 8 10.3901C7.48319 10.3901 7.0625 9.96938 7.0625 9.45257V4.76507C7.0625 4.24826 7.48319 3.82757 8 3.82757C8.51681 3.82757 8.9375 4.24826 8.9375 4.76507V9.45257Z"
          fill="currentColor"
        />
      </svg>{" "}
      {children}
    </Notice>
  );
}
