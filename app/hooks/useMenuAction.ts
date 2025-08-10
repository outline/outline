import isEqual from "lodash/isEqual";
import { useRef } from "react";
import { createRootMenuAction } from "~/actions";
import {
  ActionV2Group,
  ActionV2Separator,
  ActionV2Variant,
  ActionV2WithChildren,
} from "~/types";
import usePrevious from "./usePrevious";

type Actions = (ActionV2Variant | ActionV2Group | ActionV2Separator)[];

export function useMenuAction(actions: Actions) {
  const rootActionRef = useRef<ActionV2WithChildren>(
    createRootMenuAction(actions)
  );
  const prevActions = usePrevious(actions);

  if (!prevActions || isEqual(actions, prevActions)) {
    return rootActionRef.current;
  }

  rootActionRef.current = createRootMenuAction(actions);
  return rootActionRef.current;
}
