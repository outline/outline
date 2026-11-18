import { useRegisterActions } from "kbar";
import { flattenDeep } from "es-toolkit/compat";
import { actionToKBar } from "~/actions";
import type { ActionVariant } from "~/types";
import useActionContext from "./useActionContext";
import { useLocationSelector } from "./useLocationSelector";
import useWebMCPActions from "./useWebMCPActions";

/**
 * Hook to add actions to the command bar while the hook is inside a mounted
 * component. The same actions are also exposed as WebMCP tools in supported
 * browsers.
 *
 * @param actions actions to make available
 */
export default function useCommandBarActions(
  actions: ActionVariant[],
  additionalDeps: React.DependencyList = []
) {
  const pathname = useLocationSelector((location) => location.pathname);
  const context = useActionContext({
    isCommandBar: true,
  });

  useWebMCPActions(actions, additionalDeps);

  const registerable = flattenDeep(
    actions.map((action) => actionToKBar(action, context))
  );

  useRegisterActions(registerable, [
    registerable.map((r) => r.id).join(""),
    pathname,
    ...additionalDeps,
  ]);
}
