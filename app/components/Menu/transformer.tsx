import { CheckmarkIcon } from "outline-icons";
import {
  MenuButton,
  MenuInternalLink,
  MenuExternalLink,
  MenuSeparator,
  SubMenu,
  SubMenuTrigger,
  SubMenuContent,
  MenuGroup,
} from "~/components/primitives/Menu";
import * as Components from "~/components/primitives/components/Menu";
import type { MenuItem } from "~/types";
import { MouseSafeArea } from "~/components/MouseSafeArea";
import { createRef } from "react";

/**
 * Converts menu items to menu elements.
 *
 * @param items the menu items to convert.
 * @param query an optional filter query, only matching items are returned.
 * @returns the menu elements, or null if there are none.
 */
export function toMenuItems(items: MenuItem[], query?: string) {
  const filteredItems = filterMenuItems(items);
  const parentRef = createRef<HTMLDivElement>();
  const normalizedQuery = query?.toLocaleLowerCase();

  // Keys use the index before the query is applied, so that the focused item
  // keeps its element while the query changes.
  const entries = filteredItems
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) => !normalizedQuery || matchesQuery(item, normalizedQuery)
    );

  if (!entries.length) {
    return null;
  }

  const showIcon = filteredItems.find(
    (item) =>
      item.type !== "separator" &&
      item.type !== "heading" &&
      item.type !== "group" &&
      item.type !== "custom" &&
      !!item.icon
  );

  return entries.map(({ item, index }) => {
    const icon = showIcon ? (
      <Components.MenuIconWrapper aria-hidden>
        {"icon" in item ? item.icon : null}
      </Components.MenuIconWrapper>
    ) : undefined;

    // Children are filtered too, unless the parent title itself matches.
    const childQuery =
      normalizedQuery && !titleMatches(item, normalizedQuery)
        ? normalizedQuery
        : undefined;

    switch (item.type) {
      case "button":
        return (
          <MenuButton
            key={`${item.type}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            tooltip={item.tooltip}
            selected={item.selected}
            dangerous={item.dangerous}
            shortcut={item.shortcut}
            badge={item.badge}
            onClick={item.onClick}
          />
        );

      case "route":
        return (
          <MenuInternalLink
            key={`${item.type}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            shortcut={item.shortcut}
            badge={item.badge}
            to={item.to}
          />
        );

      case "link":
        return (
          <MenuExternalLink
            key={`${item.type}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            shortcut={item.shortcut}
            badge={item.badge}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
          />
        );

      case "submenu": {
        const submenuItems = toMenuItems(item.items, childQuery);

        if (!submenuItems?.length) {
          return null;
        }

        const preventCloseHandler = (ev: Event) => {
          if (item.preventCloseCondition && item.preventCloseCondition()) {
            ev.preventDefault();
          }
        };

        return (
          <SubMenu key={`${item.type}-${index}`}>
            <SubMenuTrigger
              label={item.title as string}
              icon={icon}
              disabled={item.disabled}
            />
            <SubMenuContent
              ref={parentRef}
              onFocusOutside={preventCloseHandler}
            >
              <MouseSafeArea parentRef={parentRef} />
              {submenuItems}
            </SubMenuContent>
          </SubMenu>
        );
      }

      case "group": {
        const groupItems = toMenuItems(item.items, childQuery);

        if (!groupItems?.length) {
          return null;
        }

        return (
          <MenuGroup
            key={`${item.type}-${index}`}
            label={item.title as string}
            items={groupItems}
          />
        );
      }

      case "separator":
        return <MenuSeparator key={`${item.type}-${index}`} />;

      case "custom":
        return <div key={`${item.type}-${index}`}>{item.content}</div>;

      default:
        return null;
    }
  });
}

export function toMobileMenuItems(
  items: MenuItem[],
  closeMenu: () => void,
  openSubmenu: (submenuName: string) => void
) {
  const filteredItems = filterMenuItems(items);

  if (!filteredItems.length) {
    return null;
  }

  const showIcon = filteredItems.find(
    (item) =>
      item.type !== "separator" &&
      item.type !== "heading" &&
      item.type !== "group" &&
      item.type !== "custom" &&
      !!item.icon
  );

  return filteredItems.map((item, index) => {
    const icon = showIcon ? (
      <Components.MenuIconWrapper aria-hidden>
        {"icon" in item ? item.icon : null}
      </Components.MenuIconWrapper>
    ) : undefined;

    switch (item.type) {
      case "button":
        return (
          <Components.MenuButton
            key={`${item.type}-${index}`}
            disabled={item.disabled}
            $dangerous={item.dangerous}
            onClick={(e) => {
              closeMenu();
              item.onClick(e);
            }}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
            {item.badge && (
              <Components.MenuBadge>{item.badge}</Components.MenuBadge>
            )}
            {item.selected !== undefined && (
              <Components.SelectedIconWrapper aria-hidden>
                {item.selected ? <CheckmarkIcon size={18} /> : null}
              </Components.SelectedIconWrapper>
            )}
          </Components.MenuButton>
        );

      case "route":
        return (
          <Components.MenuInternalLink
            key={`${item.type}-${index}`}
            to={item.to}
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
            {item.badge && (
              <Components.MenuBadge>{item.badge}</Components.MenuBadge>
            )}
          </Components.MenuInternalLink>
        );

      case "link":
        return (
          <Components.MenuExternalLink
            key={`${item.type}-${index}`}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
            {item.badge && (
              <Components.MenuBadge>{item.badge}</Components.MenuBadge>
            )}
          </Components.MenuExternalLink>
        );

      case "submenu": {
        const submenuItems = toMobileMenuItems(
          item.items,
          closeMenu,
          openSubmenu
        );

        if (!submenuItems?.length) {
          return null;
        }

        return (
          <Components.MenuButton
            key={`${item.type}-${index}`}
            disabled={item.disabled}
            onClick={() => {
              openSubmenu(item.title as string);
            }}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
            <Components.MenuDisclosure />
          </Components.MenuButton>
        );
      }

      case "group": {
        const groupItems = toMobileMenuItems(
          item.items,
          closeMenu,
          openSubmenu
        );

        if (!groupItems?.length) {
          return null;
        }

        return (
          <div key={`${item.type}-${index}`}>
            <Components.MenuHeader>{item.title}</Components.MenuHeader>
            {groupItems}
          </div>
        );
      }

      case "separator":
        return <Components.MenuSeparator key={`${item.type}-${index}`} />;

      case "custom":
        return <div key={`${item.type}-${index}`}>{item.content}</div>;

      default:
        return null;
    }
  });
}

function titleMatches(item: MenuItem, query: string): boolean {
  return (
    "title" in item &&
    typeof item.title === "string" &&
    item.title.toLocaleLowerCase().includes(query)
  );
}

function matchesQuery(item: MenuItem, query: string): boolean {
  if (item.visible === false) {
    return false;
  }

  switch (item.type) {
    case "button":
    case "route":
    case "link":
      return titleMatches(item, query);
    case "submenu":
    case "group":
      return (
        titleMatches(item, query) ||
        item.items.some((child) => matchesQuery(child, query))
      );
    default:
      return false;
  }
}

function filterMenuItems(items: MenuItem[]): MenuItem[] {
  return items
    .filter((item) => item.visible !== false)
    .reduce((acc, item) => {
      // trim separator when the previous item is also a separator.
      if (
        item.type === "separator" &&
        acc[acc.length - 1]?.type === "separator"
      ) {
        return acc;
      }
      return [...acc, item];
    }, [] as MenuItem[])
    .filter((item, index, arr) => {
      // trim when first or last item is a separator.
      if (
        item.type === "separator" &&
        (index === 0 || index === arr.length - 1)
      ) {
        return false;
      }
      return true;
    });
}
