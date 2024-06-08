import invariant from "invariant";
import User from "~/models/User";
import useStores from "./useStores";

/**
 * Returns the current user, or undefined if there is no current user and `rejectOnEmpty` is set to
 * false.
 *
 * @param options.rejectOnEmpty - If true, throws an error if there is no current user. Defaults to true.
 */
function useCurrentUser(options: { rejectOnEmpty: false }): User | undefined;
function useCurrentUser(options?: { rejectOnEmpty: true }): User;
function useCurrentUser({
  rejectOnEmpty = true,
}: { rejectOnEmpty?: boolean } = {}) {
  const { auth } = useStores();
  if (rejectOnEmpty) {
    invariant(auth.user, "user required");
  }
  return auth.user || undefined;
}

export default useCurrentUser;
