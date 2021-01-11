// @flow
import useStores from "./useStores";

export default function useUserLocale() {
  const { auth } = useStores();

  if (!auth.user) {
    return undefined;
  }

  return auth.user.language.split("_")[0];
}
