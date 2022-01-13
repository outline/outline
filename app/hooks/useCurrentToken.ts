import invariant from "invariant";
import useStores from "./useStores";

export default function useCurrentToken() {
  const { auth } = useStores();
  invariant(auth.token, "token is required");
  return auth.token;
}
