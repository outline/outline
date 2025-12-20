import type { LocationDescriptor } from "history";
import { toast } from "sonner";
import type { Optional } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import type {
  ActionContext,
  Action,
  ActionGroup,
  ActionSeparator as TActionSeparator,
  ActionVariant,
  ActionWithChildren,
  ExternalLinkAction,
  InternalLinkAction,
  MenuItem,
} from "~/types";
import Analytics from "~/utils/Analytics";
import history from "~/utils/history";
import type { Action as KbarAction } from "kbar";

export function resolve<T>(value: any, context: ActionContext): T {
  return typeof value === "function" ? value(context) : value;
}

export const ActionSeparator: TActionSeparator = {
  type: "action_separator",
};

export function createAction(
  definition: Optional<Omit<Action, "type" | "variant">, "id">
): Action {
  return {
    ...definition,
    type: "action",
    variant: "action",
    perform: definition.perform
      ? (context) => {
          // We must use the specific analytics name here as the action name is
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
          return definition.perform(context);
        }
      : () => {},
    id: definition.id ?? uuidv4(),
  };
}

export function createInternalLinkAction(
  definition: Optional<Omit<InternalLinkAction, "type" | "variant">, "id">
): InternalLinkAction {
  return {
    ...definition,
    type: "action",
    variant: "internal_link",
    id: definition.id ?? uuidv4(),
  };
}

export function createExternalLinkAction(
  definition: Optional<Omit<ExternalLinkAction, "type" | "variant">, "id">
): ExternalLinkAction {
  return {
    ...definition,
    type: "action",
    variant: "external_link",
    id: definition.id ?? uuidv4(),
  };
}

export function createActionWithChildren(
  definition: Optional<Omit<ActionWithChildren, "type" | "variant">, "id">
): ActionWithChildren {
  return {
    ...definition,
    type: "action",
    variant: "action_with_children",
    id: definition.id ?? uuidv4(),
  };
}

export function createActionGroup(
  definition: Omit<ActionGroup, "type">
): ActionGroup {
  return {
    ...definition,
    type: "action_group",
  };
}

export function createRootMenuAction(
  actions: (ActionVariant | ActionGroup | TActionSeparator)[]
): ActionWithChildren {
  return {
    id: uuidv4(),
    type: "action",
    variant: "action_with_children",
    name: "root_action",
    section: "Root",
    children: actions,
  };
}

export function actionToMenuItem(
  action: ActionVariant | ActionGroup | TActionSeparator,
  context: ActionContext
): MenuItem {
  switch (action.type) {
    case "action": {
      const title = resolve<string>(action.name, context);
      const visible = resolve<boolean>(action.visible, context) ?? true;
      const disabled = resolve<boolean>(action.disabled, context);
      const icon =
        !!action.icon && action.iconInContextMenu !== false
          ? resolve<React.ReactNode>(action.icon, context)
          : undefined;

      switch (action.variant) {
        case "action":
          return {
            type: "button",
            title,
            icon,
            visible,
            disabled,
            tooltip: resolve<React.ReactChild>(action.tooltip, context),
            selected: resolve<boolean>(action.selected, context),
            dangerous: action.dangerous,
            onClick: () => performAction(action, context),
          };

        case "internal_link": {
          const to = resolve<LocationDescriptor>(action.to, context);
          return {
            type: "route",
            title,
            icon,
            visible,
            disabled,
            to,
          };
        }

        case "external_link":
          return {
            type: "link",
            title,
            icon,
            visible,
            disabled,
            href: action.target
              ? { url: action.url, target: action.target }
              : action.url,
          };

        case "action_with_children": {
          const children = resolve<
            (ActionVariant | ActionGroup | TActionSeparator)[]
          >(action.children, context);
          const subMenuItems = children.map((a) =>
            actionToMenuItem(a, context)
          );
          return {
            type: "submenu",
            title,
            icon,
            items: subMenuItems,
            disabled,
            visible: visible && hasVisibleItems(subMenuItems),
          };
        }

        default:
          throw Error("invalid action variant");
      }
    }

    case "action_group": {
      const groupItems = action.actions.map((a) =>
        actionToMenuItem(a, context)
      );
      return {
        type: "group",
        title: resolve<string>(action.name, context),
        visible: hasVisibleItems(groupItems),
        items: groupItems,
      };
    }

    case "action_separator":
      return { type: "separator" };
  }
}

export function actionToKBar(
  action: ActionVariant,
  context: ActionContext
): KbarAction[] {
  const visible = resolve<boolean>(action.visible, context);
  if (visible === false) {
    return [];
  }

  const name = resolve<string>(action.name, context);
  const icon = resolve<React.ReactElement>(action.icon, context);
  const section = resolve<string>(action.section, context);

  const sectionPriority =
    typeof action.section !== "string" && "priority" in action.section
      ? ((action.section.priority as number) ?? 0)
      : 0;

  const priority = (1 + (action.priority ?? 0)) * (1 + (sectionPriority ?? 0));

  switch (action.variant) {
    case "action":
    case "internal_link":
    case "external_link": {
      return [
        {
          id: action.id,
          name,
          section,
          keywords: action.keywords,
          shortcut: action.shortcut,
          icon,
          priority,
          perform: () => performAction(action, context),
        },
      ];
    }

    case "action_with_children": {
      const resolvedChildren = resolve<ActionVariant[]>(
        action.children,
        context
      );
      const children = resolvedChildren
        .map((a) => actionToKBar(a, context))
        .flat()
        .filter(Boolean);

      return [
        {
          id: action.id,
          name,
          section,
          keywords: action.keywords,
          shortcut: action.shortcut,
          icon,
          priority,
        },
        ...children.map((child) => ({
          ...child,
          parent: child.parent ?? action.id,
        })),
      ];
    }

    default:
      throw Error("invalid action variant");
  }
}

export async function performAction(
  action: Exclude<ActionVariant, ActionWithChildren>,
  context: ActionContext
) {
  const perform =
    action.variant === "action"
      ? () => action.perform(context)
      : action.variant === "internal_link"
        ? () => history.push(resolve<LocationDescriptor>(action.to, context))
        : () => window.open(action.url, action.target);

  const result = perform();

  if (result instanceof Promise) {
    return result.catch((err: Error) => {
      toast.error(err.message);
    });
  }

  return result;
}

function hasVisibleItems(items: MenuItem[]) {
  const applicableTypes = ["button", "link", "route", "group", "submenu"];
  return items.some(
    (item) => applicableTypes.includes(item.type) && item.visible
  );
}
