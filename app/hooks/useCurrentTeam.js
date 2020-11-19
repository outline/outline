// @flow
import invariant from "invariant";
import useStores from "./useStores";

export default function useCurrentTeam() {
  const { auth } = useStores();
  invariant(auth.team, "Expected to be authenticated");
  return auth.team;
}
