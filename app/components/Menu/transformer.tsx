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

export function toMenuItems(items: MenuItem[]) {
  const filteredItems = filterMenuItems(items);
  const parentRef = createRef<HTMLDivElement>();

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
          <MenuButton
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            tooltip={item.tooltip}
            selected={item.selected}
            dangerous={item.dangerous}
            onClick={item.onClick}
          />
        );

      case "route":
        return (
          <MenuInternalLink
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            to={item.to}
          />
        );

      case "link":
        return (
          <MenuExternalLink
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
          />
        );

      case "submenu": {
        const submenuItems = toMenuItems(item.items);

        if (!submenuItems?.length) {
          return null;
        }

        const preventCloseHandler = (ev: Event) => {
          if (item.preventCloseCondition && item.preventCloseCondition()) {
            ev.preventDefault();
          }
        };

        return (
          <SubMenu key={`${item.type}-${item.title}-${index}`}>
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
        const groupItems = toMenuItems(item.items);

        if (!groupItems?.length) {
          return null;
        }

        return (
          <MenuGroup
            key={`${item.type}-${item.title}-${index}`}
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
            key={`${item.type}-${item.title}-${index}`}
            disabled={item.disabled}
            $dangerous={item.dangerous}
            onClick={(e) => {
              closeMenu();
              item.onClick(e);
            }}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
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
            key={`${item.type}-${item.title}-${index}`}
            to={item.to}
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
          </Components.MenuInternalLink>
        );

      case "link":
        return (
          <Components.MenuExternalLink
            key={`${item.type}-${item.title}-${index}`}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <Components.MenuLabel>{item.title}</Components.MenuLabel>
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
            key={`${item.type}-${item.title}-${index}`}
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
          <div key={`${item.type}-${item.title}-${index}`}>
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
