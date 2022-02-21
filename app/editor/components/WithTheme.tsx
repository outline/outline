import * as React from "react";
import { DefaultTheme, useTheme } from "styled-components";

type Props = {
  children: (theme: DefaultTheme) => React.ReactElement;
};

export default function WithTheme({ children }: Props) {
  const theme = useTheme();
  return children(theme);
}
