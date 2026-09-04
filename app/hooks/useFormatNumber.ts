import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import { formatNumber } from "@shared/utils/language";
import useUserLocale from "./useUserLocale";

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
