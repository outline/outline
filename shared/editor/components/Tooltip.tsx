import * as React from "react";

type Props = {
  tooltip: string;
  children: React.ReactNode;
};

export default function Tooltip({ tooltip, children }: Props) {
  return <span title={tooltip}>{children}</span>;
}
