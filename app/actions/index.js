// @flow
import type { TFunction } from "i18next";
import * as React from "react";
import type { Action, MenuItem } from "types";

export function actionToMenuItem(
  action: Action,
  { t, event }: { t: TFunction, event?: Event }
): ?MenuItem {
  return {
    title: action.name({ t }),
    icon:
      action.icon && action.iconInContextMenu !== false
        ? React.cloneElement(action.icon, { color: "currentColor" })
        : undefined,
    onClick: action.perform ? () => action.perform({ t }) : undefined,
    items: action.children
      ? action.children
          .map((a) => actionToMenuItem(a, { t, event }))
          .filter((a) => !!a)
      : [],
    visible: action.visible ? action.visible({ event }) : true,
    // TODO
    // disabled
    // visible
    // selected
  };
}

export function actionToKBar(action: Action, { t }: { t: TFunction }) {
  //
}
