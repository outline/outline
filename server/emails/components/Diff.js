// @flow
import * as React from "react";
import theme from "../../../shared/styles/theme";

type Props = {|
  children: React.Node,
|};

export default (props: Props) => {
  const style = {
    borderRadius: "4px",
    background: theme.secondaryBackground,
    padding: ".5em 1em",
  };

  return <div width="100%" style={style} {...props} />;
};
