// @flow
import * as React from "react";

type Props = { href: string, children: React.Node };

export default (props: Props) => {
  const style = {
    display: "inline-block",
    padding: "10px 20px",
    color: "#FFFFFF",
    background: "#000000",
    borderRadius: "4px",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  };

  return (
    <a {...props} style={style}>
      {props.children}
    </a>
  );
};
