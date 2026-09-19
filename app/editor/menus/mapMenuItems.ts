import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { closeHistory } from "@shared/editor/lib/closeHistory";
import type { CommandFactory } from "@shared/editor/lib/Extension";
import type { MenuItem } from "@shared/editor/types";
import type { MenuItem as TMenuItem } from "~/types";

const resolveChildren = (
  children: MenuItem[] | (() => MenuItem[]) | undefined
): MenuItem[] | undefined =>
  typeof children === "function" ? children() : children;

/**
 * Maps editor `MenuItem`s into the primitive `MenuItem`s consumed by
 * `toMenuItems`. Shared by the toolbar dropdown and the inline menu so menu
 * presentation stays consistent. Resolves nested children into submenus and
 * binds each leaf to its editor command (or `onClick`).
 *
 * @param items - the editor menu items to map.
 * @param commands - the editor command registry.
 * @param view - the editor view, used to checkpoint history around commands.
 * @param state - the editor state, used to resolve dynamic attrs and active state.
 * @returns the mapped primitive menu items.
 */
export function mapMenuItems(
  items: MenuItem[],
  commands: Record<string, CommandFactory>,
  view: EditorView,
  state: EditorState
): TMenuItem[] {
  const handleClick = (item: MenuItem) => () => {
    if (!item.name) {
      return;
    }
    if (commands[item.name]) {
      closeHistory(view);
      commands[item.name](
        typeof item.attrs === "function" ? item.attrs(state) : item.attrs
      );
      closeHistory(view);
    } else if (item.onClick) {
      item.onClick();
    }
  };

  return items.map((item) => {
    if (item.name === "separator") {
      return { type: "separator", visible: item.visible };
    }

    if ("content" in item) {
      return { type: "custom", visible: item.visible, content: item.content };
    }

    const resolvedChildren = resolveChildren(item.children);
    if (resolvedChildren) {
      const childWithPreventClose = resolvedChildren.find(
        (child) => "preventCloseCondition" in child
      );
      return {
        type: "submenu",
        title: item.label,
        icon: item.icon,
        visible: item.visible,
        preventCloseCondition: childWithPreventClose?.preventCloseCondition,
        items: mapMenuItems(resolvedChildren, commands, view, state),
      };
    }

    return {
      type: "button",
      title: item.label,
      icon: item.icon,
      dangerous: item.dangerous,
      visible: item.visible,
      selected: item.active !== undefined ? item.active(state) : undefined,
      onClick: handleClick(item),
    };
  });
}
