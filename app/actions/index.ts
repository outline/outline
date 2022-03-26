import { flattenDeep } from "lodash";
import * as React from "react";
import { Optional } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import {
  Action,
  ActionContext,
  CommandBarAction,
  MenuItemButton,
  MenuItemWithChildren,
} from "~/types";

export function createAction(definition: Optional<Action, "id">): Action {
  return {
    ...definition,
    id: uuidv4(),
  };
}

export function actionToMenuItem(
  action: Action,
  context: ActionContext
): MenuItemButton | MenuItemWithChildren {
  function resolve<T>(value: any): T {
    if (typeof value === "function") {
      return value(context);
    }

    return value;
  }

  const resolvedIcon = resolve<React.ReactElement<any>>(action.icon);
  const resolvedChildren = resolve<Action[]>(action.children);
  const visible = action.visible ? action.visible(context) : true;
  const title = resolve<string>(action.name);
  const icon =
    resolvedIcon && action.iconInContextMenu !== false
      ? React.cloneElement(resolvedIcon, {
          color: "currentColor",
        })
      : undefined;

  if (resolvedChildren) {
    const items = resolvedChildren
      .map((a) => actionToMenuItem(a, context))
      .filter(Boolean)
      .filter((a) => a.visible);

    return {
      type: "submenu",
      title,
      icon,
      items,
      visible: visible && items.length > 0,
    };
  }

  return {
    type: "button",
    title,
    icon,
    visible,
    onClick: () => action.perform && action.perform(context),
    selected: action.selected ? action.selected(context) : undefined,
  };
}

export function actionToKBar(
  action: Action,
  context: ActionContext
): CommandBarAction[] {
  function resolve<T>(value: any): T {
    if (typeof value === "function") {
      return value(context);
    }

    return value;
  }

  if (typeof action.visible === "function" && !action.visible(context)) {
    return [];
  }

  const resolvedIcon = resolve<React.ReactElement<any>>(action.icon);
  const resolvedChildren = resolve<Action[]>(action.children);
  const resolvedSection = resolve<string>(action.section);
  const resolvedName = resolve<string>(action.name);
  const resolvedPlaceholder = resolve<string>(action.placeholder);
  const children = resolvedChildren
    ? flattenDeep(resolvedChildren.map((a) => actionToKBar(a, context))).filter(
        (a) => !!a
      )
    : [];

  return [
    {
      id: action.id,
      name: resolvedName,
      section: resolvedSection,
      placeholder: resolvedPlaceholder,
      keywords: action.keywords ?? "",
      shortcut: action.shortcut || [],
      icon: resolvedIcon,
      perform: action.perform ? () => action?.perform?.(context) : undefined,
    },
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
  ].concat(children.map((child) => ({ ...child, parent: action.id })));
}
