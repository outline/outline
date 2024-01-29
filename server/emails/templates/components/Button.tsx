import * as React from "react";

type Props = {
  href: string;
};

const style: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 20px",
  color: "#FFFFFF",
  background: "#000000",
  borderRadius: "4px",
  fontWeight: 500,
  textDecoration: "none",
  cursor: "pointer",
};

const Button: React.FC<Props> = (props) => (
  <a {...props} style={style}>
    {props.children}
  </a>
);

export default Button;
