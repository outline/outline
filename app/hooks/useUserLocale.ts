import useStores from "./useStores";

export default function useUserLocale(
  /** Whether to only return the language code */
  languageCode?: boolean
) {
  const { auth } = useStores();

  if (!auth.user?.language) {
    return undefined;
  }

  const { language } = auth.user;
  return languageCode ? language.split("_")[0] : language;
}
