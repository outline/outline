import { breakpoints } from "@shared/styles";
import useMediaQuery from "~/hooks/useMediaQuery";

export default function useMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.tablet - 1}px)`);
}
