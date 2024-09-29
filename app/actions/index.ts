import flattenDeep from "lodash/flattenDeep";
import * as React from "react";
import { toast } from "sonner";
import { Optional } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import {
  Action,
  ActionContext,
  CommandBarAction,
  MenuItemButton,
  MenuItemWithChildren,
} from "~/types";
import Analytics from "~/utils/Analytics";

function resolve<T>(value: any, context: ActionContext): T {
  return typeof value === "function" ? value(context) : value;
}

export function createAction(definition: Optional<Action, "id">): Action {
  return {
    ...definition,
    perform: definition.perform
      ? (context) => {
          // We muse use the specific analytics name here as the action name is
          // translated and potentially contains user strings.
          if (definition.analyticsName) {
            Analytics.track("perform_action", definition.analyticsName, {
              context: context.isButton
                ? "button"
                : context.isCommandBar
                ? "commandbar"
                : "contextmenu",
            });
          }

          return definition.perform?.(context);
        }
      : undefined,
    id: definition.id ?? uuidv4(),
  };
}

export function actionToMenuItem(
  action: Action,
  context: ActionContext
): MenuItemButton | MenuItemWithChildren {
  const resolvedIcon = resolve<React.ReactElement<any>>(action.icon, context);
  const resolvedChildren = resolve<Action[]>(action.children, context);
  const visible = action.visible ? action.visible(context) : true;
  const title = resolve<string>(action.name, context);
  const icon =
    resolvedIcon && action.iconInContextMenu !== false
      ? resolvedIcon
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
    dangerous: action.dangerous,
    onClick: () => performAction(action, context),
    selected: action.selected?.(context),
  };
}

export function actionToKBar(
  action: Action,
  context: ActionContext
): CommandBarAction[] {
  if (typeof action.visible === "function" && !action.visible(context)) {
    return [];
  }

  const resolvedIcon = resolve<React.ReactElement>(action.icon, context);
  const resolvedChildren = resolve<Action[]>(action.children, context);
  const resolvedSection = resolve<string>(action.section, context);
  const resolvedName = resolve<string>(action.name, context);
  const resolvedPlaceholder = resolve<string>(action.placeholder, context);
  const children = resolvedChildren
    ? flattenDeep(resolvedChildren.map((a) => actionToKBar(a, context))).filter(
        (a) => !!a
      )
    : [];

  const sectionPriority =
    typeof action.section !== "string" && "priority" in action.section
      ? (action.section.priority as number) ?? 0
      : 0;

  return [
    {
      id: action.id,
      name: resolvedName,
      analyticsName: action.analyticsName,
      section: resolvedSection,
      placeholder: resolvedPlaceholder,
      keywords: action.keywords ?? "",
      shortcut: action.shortcut || [],
      icon: resolvedIcon,
      priority: (1 + (action.priority ?? 0)) * (1 + (sectionPriority ?? 0)),
      perform: action.perform
        ? () => performAction(action, context)
        : undefined,
    },
  ].concat(
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    children.map((child) => ({ ...child, parent: child.parent ?? action.id }))
  );
}

export async function performAction(action: Action, context: ActionContext) {
  const result = action.perform?.(context);

  if (result instanceof Promise) {
    return result.catch((err: Error) => {
      toast.error(err.message);
    });
  }

  return result;
}
