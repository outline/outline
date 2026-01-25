import isEqual from "lodash/isEqual";
import { useRef } from "react";
import { createRootMenuAction } from "~/actions";
import type {
  ActionGroup,
  ActionSeparator,
  ActionVariant,
  ActionWithChildren,
} from "~/types";
import usePrevious from "./usePrevious";

type Actions = (ActionVariant | ActionGroup | ActionSeparator)[];

export function useMenuAction(actions: Actions) {
  const rootActionRef = useRef<ActionWithChildren>(
    createRootMenuAction(actions)
  );
  const prevActions = usePrevious(actions);

  if (!prevActions || isEqual(actions, prevActions)) {
    return rootActionRef.current;
  }

  rootActionRef.current = createRootMenuAction(actions);
  return rootActionRef.current;
}
