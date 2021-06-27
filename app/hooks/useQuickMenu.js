// @flow
import useStores from "./useStores";

export default function useQuickMenu() {
  const { quickMenu } = useStores();
  return quickMenu;
}
