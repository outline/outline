// @flow
import invariant from "invariant";
import useStores from "./useStores";

export default function useCurrentUser() {
  const { auth } = useStores();
  invariant(auth.user, "Expected to be authenticated");
  return auth.user;
}
