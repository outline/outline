import { useTheme } from "styled-components";
import useMediaQuery from "hooks/useMediaQuery";

export default function useMobile(): boolean {
  const theme = useTheme();
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'breakpoints' does not exist on type 'Def... Remove this comment to see the full error message
  return useMediaQuery(`(max-width: ${theme.breakpoints.tablet}px)`);
}
