// @flow
import * as React from "react";
import type { Action, ActionContext, CommandBarAction } from "types";

export function actionToMenuItem(
  action: Action,
  context: ActionContext
): ?Object {
  function resolve<T>(value: any): T {
    if (typeof value === "function") {
      return value(context);
    }

    return value;
  }

  const resolvedIcon = resolve<React.Element<any>>(action.icon);
  const resolvedChildren = resolve<Action[]>(action.children);
  const resolvedName = resolve<string>(action.name);

  return {
    title: resolvedName,
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

  const resolvedIcon = resolve<React.Element<any>>(action.icon);
  const resolvedChildren = resolve<Action[]>(action.children);
  const resolvedSection = resolve<string>(action.section);
  const resolvedName = resolve<string>(action.name);

  const children = resolvedChildren
    ? resolvedChildren
        .map((a) => actionToKBar(a, context)[0])
        .filter((a) => !!a)
    : [];

  return [
    {
      id: action.id,
      name: resolvedName,
      section: resolvedSection,
      keywords: `${action.keywords || ""} ${children
        .map((c) => c.keywords)
        .join(" ")}`,
      shortcut: action.shortcut,
      icon: resolvedIcon
        ? React.cloneElement(resolvedIcon, { color: "currentColor" })
        : undefined,
      perform: action.perform
        ? () => action.perform && action.perform(context)
        : undefined,
      children: children.map((a) => a.id),
      // selected: action.selected ? action.selected(context) : undefined
    },
  ].concat(
    children.map((child) => ({
      ...child,
      parent: action.id,
    }))
  );
}
