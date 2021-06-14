// @flow
import { useTheme } from "styled-components";
import useMediaQuery from "hooks/useMediaQuery";

export default function useMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(`(max-width: ${theme.breakpoints.tablet}px)`);
}
