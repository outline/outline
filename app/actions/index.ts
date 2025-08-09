import { LocationDescriptor } from "history";
import { toast } from "sonner";
import { Optional } from "utility-types";
import { v4 as uuidv4 } from "uuid";
import {
  ActionContext,
  ActionV2,
  ActionV2Group,
  ActionV2Separator as TActionV2Separator,
  ActionV2Variant,
  ActionV2WithChildren,
  ExternalLinkActionV2,
  InternalLinkActionV2,
  MenuItem,
} from "~/types";
import Analytics from "~/utils/Analytics";
import history from "~/utils/history";
import { Action as KbarAction } from "kbar";

export function resolve<T>(value: any, context: ActionContext): T {
  return typeof value === "function" ? value(context) : value;
}

/** Actions V2 */

export const ActionV2Separator: TActionV2Separator = {
  type: "action_separator",
};

export function createActionV2(
  definition: Optional<Omit<ActionV2, "type" | "variant">, "id">
): ActionV2 {
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

export function createInternalLinkActionV2(
  definition: Optional<Omit<InternalLinkActionV2, "type" | "variant">, "id">
): InternalLinkActionV2 {
  return {
    ...definition,
    type: "action",
    variant: "internal_link",
    id: definition.id ?? uuidv4(),
  };
}

export function createExternalLinkActionV2(
  definition: Optional<Omit<ExternalLinkActionV2, "type" | "variant">, "id">
): ExternalLinkActionV2 {
  return {
    ...definition,
    type: "action",
    variant: "external_link",
    id: definition.id ?? uuidv4(),
  };
}

export function createActionV2WithChildren(
  definition: Optional<Omit<ActionV2WithChildren, "type" | "variant">, "id">
): ActionV2WithChildren {
  return {
    ...definition,
    type: "action",
    variant: "action_with_children",
    id: definition.id ?? uuidv4(),
  };
}

export function createActionV2Group(
  definition: Omit<ActionV2Group, "type">
): ActionV2Group {
  return {
    ...definition,
    type: "action_group",
  };
}

export function createRootMenuAction(
  actions: (ActionV2Variant | ActionV2Group | TActionV2Separator)[]
): ActionV2WithChildren {
  return {
    id: uuidv4(),
    type: "action",
    variant: "action_with_children",
    name: "root_action",
    section: "Root",
    children: actions,
  };
}

export function actionV2ToMenuItem(
  action: ActionV2Variant | ActionV2Group | TActionV2Separator,
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
            onClick: () => performActionV2(action, context),
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
            (ActionV2Variant | ActionV2Group | TActionV2Separator)[]
          >(action.children, context);
          const subMenuItems = children.map((a) =>
            actionV2ToMenuItem(a, context)
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
        actionV2ToMenuItem(a, context)
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

export function actionV2ToKBar(
  action: ActionV2Variant,
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
          perform: () => performActionV2(action, context),
        },
      ];
    }

    case "action_with_children": {
      const resolvedChildren = resolve<ActionV2Variant[]>(
        action.children,
        context
      );
      const children = resolvedChildren
        .map((a) => actionV2ToKBar(a, context))
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

export async function performActionV2(
  action: Exclude<ActionV2Variant, ActionV2WithChildren>,
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
