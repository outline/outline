// @flow
import * as React from "react";
import theme from "../../../shared/styles/theme";

type Props = {|
  children: React.Node,
  href?: string,
|};

export default ({ children, ...rest }: Props) => {
  const style = {
    borderRadius: "4px",
    background: theme.secondaryBackground,
    padding: ".5em 1em",
    color: theme.text,
    display: "block",
    textDecoration: "none",
  };

  return (
    <a width="100%" style={style} {...rest}>
      {children}
    </a>
  );
};
