// @flow
import type { TFunction } from "i18next";
import * as React from "react";
import type { Action, MenuItem } from "types";

export function actionToMenuItem(
  action: Action,
  { t }: { t: TFunction }
): ?MenuItem {
  return {
    title: action.name({ t }),
    icon:
      action.icon && action.iconInContextMenu !== false
        ? React.cloneElement(action.icon, { color: "currentColor" })
        : undefined,
    onClick: () => action.perform({ t }),
    // TODO
    // disabled
    // visible
    // selected
  };
}

export function actionToKBar(action: Action, { t }: { t: TFunction }) {
  //
}
