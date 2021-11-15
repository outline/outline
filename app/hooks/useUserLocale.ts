import useStores from "./useStores";

export default function useUserLocale() {
  const { auth } = useStores();

  if (!auth.user || !auth.user.language) {
    return undefined;
  }

  return auth.user.language;
}
