import * as React from "react";
import type { DefaultTheme } from "styled-components";
import { useTheme } from "styled-components";

type Props = {
  children: (theme: DefaultTheme) => React.ReactElement;
};

export default function WithTheme({ children }: Props) {
  const theme = useTheme();
  return children(theme);
}
