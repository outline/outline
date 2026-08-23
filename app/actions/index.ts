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
import type { ActionImpl, Action as KbarAction } from "kbar";

/** A command bar action, with the additional properties that Outline renders. */
export type CommandBarAction = KbarAction & {
  badge?: React.ReactNode;
};

/** A registered command bar action, as handed back by the command bar. */
export type CommandBarActionImpl = ActionImpl & {
  badge?: React.ReactNode;
};

export function resolve<T>(value: unknown, context: ActionContext): T {
  return (
    typeof value === "function"
      ? (value as (context: ActionContext) => T)(context)
      : value
  ) as T;
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

/**
 * Determines whether any of the given actions are visible in the context,
 * without resolving the remainder of the menu items.
 *
 * @param actions - the actions to check.
 * @param context - the context to resolve visibility against.
 * @returns true if at least one action is visible.
 */
export function hasVisibleActions(
  actions: (ActionVariant | ActionGroup | TActionSeparator)[],
  context: ActionContext
): boolean {
  return actions.some((action) => {
    switch (action.type) {
      case "action": {
        if (resolve<boolean>(action.visible, context) === false) {
          return false;
        }
        if (action.variant === "action_with_children") {
          const children = resolve<
            (ActionVariant | ActionGroup | TActionSeparator)[]
          >(action.children, context);
          return hasVisibleActions(children, context);
        }
        return true;
      }

      case "action_group":
        return hasVisibleActions(action.actions, context);

      case "action_separator":
        return false;
    }
  });
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
      const shortcut = resolve<string[] | undefined>(action.shortcut, context);
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
            shortcut,
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
            shortcut,
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
            shortcut,
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
): CommandBarAction[] {
  const visible = resolve<boolean>(action.visible, context);
  if (visible === false) {
    return [];
  }

  const name = resolve<string>(action.name, context);
  const shortcut = resolve<string[] | undefined>(action.shortcut, context);
  const icon = resolve<React.ReactElement>(action.icon, context);
  const badge = resolve<React.ReactNode>(action.badge, context);
  const section = resolve<string>(action.section, context);
  const subtitle = resolve<string>(action.description, context);

  // Sections are passed to the command bar as objects so that their declared
  // priority orders the sections themselves – given a bare string it would
  // instead order them by the match score of whichever result happens to come
  // first, which lets a section with an exact keyword match jump to the top.
  // The command bar falls back to that same match score when the priority is
  // falsy, so the offset keeps an undeclared priority of zero out of the way
  // while preserving the relative order of the declared values.
  const sectionWithPriority = {
    name: section,
    priority:
      sectionPriorityOffset +
      (typeof action.section !== "string" && "priority" in action.section
        ? ((action.section.priority as number) ?? 0)
        : 0),
  };

  const priority = 1 + (action.priority ?? 0);

  switch (action.variant) {
    case "action":
    case "internal_link":
    case "external_link": {
      return [
        {
          id: action.id,
          name,
          section: sectionWithPriority,
          keywords: action.keywords,
          shortcut,
          subtitle,
          icon,
          badge,
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
          section: sectionWithPriority,
          keywords: action.keywords,
          shortcut,
          icon,
          badge,
          subtitle,
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

/**
 * Added to every section priority handed to the command bar, so that a section
 * which declares no priority is still ordered by its priority rather than by
 * match score. Must be larger than the largest declared priority in magnitude.
 */
const sectionPriorityOffset = 10;

function hasVisibleItems(items: MenuItem[]) {
  const applicableTypes = ["button", "link", "route", "group", "submenu"];
  return items.some(
    (item) => applicableTypes.includes(item.type) && item.visible
  );
}
