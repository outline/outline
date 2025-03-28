import { breakpoints } from "@shared/styles";
import useMediaQuery from "~/hooks/useMediaQuery";

/**
 * Hook to detect if the current viewport is mobile-sized.
 *
 * @returns boolean indicating whether the current viewport is mobile-sized
 */
export default function useMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.tablet - 1}px)`);
}
