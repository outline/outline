import invariant from "invariant";
import useStores from "./useStores";

export default function useCurrentTeam() {
  const { auth } = useStores();
  invariant(auth.team, "team required");
  return auth.team;
}
