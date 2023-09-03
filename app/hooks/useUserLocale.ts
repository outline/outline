import useStores from "./useStores";

/**
 * Returns the user's locale, or undefined if the user is not logged in.
 *
 * @param languageCode Whether to only return the language code
 * @returns The user's locale, or undefined if the user is not logged in
 */
export default function useUserLocale(languageCode?: boolean) {
  const { auth } = useStores();

  if (!auth.user?.language) {
    return undefined;
  }

  const { language } = auth.user;
  return languageCode ? language.split("_")[0] : language;
}
