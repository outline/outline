import { useRegisterActions } from "kbar";
import flattenDeep from "lodash/flattenDeep";
import { useLocation } from "react-router-dom";
import { actionToKBar } from "~/actions";
import { Action } from "~/types";
import useActionContext from "./useActionContext";

/**
 * Hook to add actions to the command bar while the hook is inside a mounted
 * component.
 *
 * @param actions actions to make available
 */
export default function useCommandBarActions(
  actions: Action[],
  additionalDeps: React.DependencyList = []
) {
  const location = useLocation();
  const context = useActionContext({
    isCommandBar: true,
  });

  const registerable = flattenDeep(
    actions.map((action) => actionToKBar(action, context))
  );

  useRegisterActions(registerable, [
    registerable.map((r) => r.id).join(""),
    location.pathname,
    ...additionalDeps,
  ]);
}
