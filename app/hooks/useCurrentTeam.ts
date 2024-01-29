import invariant from "invariant";
import Team from "~/models/Team";
import useStores from "./useStores";

/**
 * Returns the current team, or undefined if there is no current team and `rejectOnEmpty` is set to
 * false.
 *
 * @param options.rejectOnEmpty - If true, throws an error if there is no current team. Defaults to true.
 */
function useCurrentTeam(options: { rejectOnEmpty: false }): Team | undefined;
function useCurrentTeam(options?: { rejectOnEmpty: true }): Team;
function useCurrentTeam({
  rejectOnEmpty = true,
}: { rejectOnEmpty?: boolean } = {}) {
  const { auth } = useStores();
  if (rejectOnEmpty) {
    invariant(auth.team, "team required");
  }
  return auth.team || undefined;
}

export default useCurrentTeam;
