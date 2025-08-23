import * as React from "react";

export default function JiraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      height="1em"
      width="1em"
      {...props}
    >
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.407 23h11.173a5.215 5.215 0 0 0 5.215-5.214v-6.273H11.571zm0 0H0a5.215 5.215 0 0 0 5.215 5.214h2.129v2.057a5.218 5.218 0 0 0 5.215 5.214h11.173a5.215 5.215 0 0 0 5.215-5.214v-6.273H11.571z" />
    </svg>
  );
}
