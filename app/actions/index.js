// @flow
import type { TFunction } from "i18next";
import * as React from "react";
import type { Action } from "types";

export function actionToMenuItem(
  action: Action,
  context: { t: TFunction, event?: Event }
): ?Object {
  const { t } = context;

  function resolve<T>(value: any): T {
    if (typeof value === "function") {
      return value(context);
    }

    return value;
  }

  const resolvedIcon = resolve<React.Element<any>>(action.icon);
  const resolvedChildren = resolve<Action[]>(action.children);

  const item = {
    title: action.name({ t }),
    icon:
      resolvedIcon && action.iconInContextMenu !== false
        ? React.cloneElement(resolvedIcon, { color: "currentColor" })
        : undefined,
    onClick: action.perform
      ? () => action.perform && action.perform(context)
      : undefined,
    items: resolvedChildren
      ? resolvedChildren
          .map((a) => actionToMenuItem(a, context))
          .filter((a) => !!a)
      : undefined,
    visible: action.visible ? action.visible(context) : true,
    selected: action.selected ? action.selected(context) : undefined,
    // TODO
    // disabled
    // visible
    // selected
  };

  console.log(item);
  return item;
}

export function actionToKBar(action: Action, { t }: { t: TFunction }) {
  //
}
