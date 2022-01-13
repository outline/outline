import useMediaQuery from "~/hooks/useMediaQuery";
import { base } from "@shared/theme";

export default function useMobile(): boolean {
  return useMediaQuery(`(max-width: ${base.breakpoints.tablet - 1}px)`);
}
