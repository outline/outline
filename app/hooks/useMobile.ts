import { base } from "@shared/theme";
import useMediaQuery from "~/hooks/useMediaQuery";

export default function useMobile(): boolean {
  return useMediaQuery(`(max-width: ${base.breakpoints.tablet - 1}px)`);
}
