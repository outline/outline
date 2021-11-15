import * as React from "react";

const style = {
  fontWeight: 500,
  fontSize: "18px",
};
type Props = {
  children: React.ReactNode;
};

export default ({ children }: Props) => (
  <p>
    <span style={style}>{children}</span>
  </p>
);
