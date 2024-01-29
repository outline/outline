import useCurrentUser from "./useCurrentUser";

/**
 * Returns the user's locale, or undefined if the user is not logged in.
 *
 * @param languageCode Whether to only return the language code
 * @returns The user's locale, or undefined if the user is not logged in
 */
export default function useUserLocale(languageCode?: boolean) {
  const user = useCurrentUser({ rejectOnEmpty: false });

  if (!user?.language) {
    return undefined;
  }

  const { language } = user;
  return languageCode ? language.split("_")[0] : language;
}
