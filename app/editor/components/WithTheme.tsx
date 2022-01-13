import * as React from "react";
import { DefaultTheme, useTheme } from "styled-components";
import { light } from "@shared/theme";
import useMediaQuery from "~/hooks/useMediaQuery";

type Props = {
  children: (theme: DefaultTheme) => React.ReactElement;
};

export default function WithTheme({ children }: Props) {
  const theme = useTheme();
  const isPrinting = useMediaQuery("print");

  return children(isPrinting ? light : theme);
}
