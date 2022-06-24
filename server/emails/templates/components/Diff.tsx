import * as React from "react";
import theme from "@shared/styles/theme";

type Props = {
  children: React.ReactNode;
  href?: string;
};

export default ({ children, ...rest }: Props) => {
  const style = {
    borderRadius: "4px",
    background: theme.secondaryBackground,
    padding: ".5em 1em",
    color: theme.text,
    display: "block",
    textDecoration: "none",
    width: "100%",
  };

  return (
    <a style={style} className="content-diff" {...rest}>
      {children}
    </a>
  );
};
