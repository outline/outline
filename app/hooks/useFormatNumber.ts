import { formatNumber } from "~/utils/language";
import useUserLocale from "./useUserLocale";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";

/**
 * Hook that returns a function to format numbers based on the user's locale.
 *
 * @returns A function that formats numbers
 */
export function useFormatNumber() {
  const language = useUserLocale();
  return (input: number) =>
    language
      ? formatNumber(input, unicodeCLDRtoBCP47(language))
      : input.toString();
}
