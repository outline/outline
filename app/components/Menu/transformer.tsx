import { CheckmarkIcon } from "outline-icons";
import {
  DropdownMenuButton,
  DropdownMenuExternalLink,
  DropdownMenuGroup,
  DropdownMenuInternalLink,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownSubMenu,
  DropdownSubMenuContent,
  DropdownSubMenuTrigger,
} from "~/components/primitives/DropdownMenu";
import {
  MenuButton,
  MenuIconWrapper,
  MenuInternalLink,
  MenuExternalLink,
  MenuLabel,
  MenuSeparator,
  MenuDisclosure,
  SelectedIconWrapper,
} from "~/components/primitives/components/Menu";
import { MenuItem } from "~/types";

export function toDropdownMenuItems(items: MenuItem[]) {
  const filteredItems = filterMenuItems(items);

  if (!filteredItems.length) {
    return null;
  }

  const showIcon = filteredItems.find(
    (item) =>
      item.type !== "separator" &&
      item.type !== "heading" &&
      item.type !== "group" &&
      !!item.icon
  );

  return filteredItems.map((item, index) => {
    const icon = showIcon ? (
      <MenuIconWrapper aria-hidden>
        {"icon" in item ? item.icon : null}
      </MenuIconWrapper>
    ) : undefined;

    switch (item.type) {
      case "button":
        return (
          <DropdownMenuButton
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
          <DropdownMenuInternalLink
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={icon}
            disabled={item.disabled}
            to={item.to}
          />
        );

      case "link":
        return (
          <DropdownMenuExternalLink
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
        const submenuItems = toDropdownMenuItems(item.items);

        if (!submenuItems?.length) {
          return null;
        }

        return (
          <DropdownSubMenu key={`${item.type}-${item.title}-${index}`}>
            <DropdownSubMenuTrigger
              label={item.title as string}
              icon={icon}
              disabled={item.disabled}
            />
            <DropdownSubMenuContent>{submenuItems}</DropdownSubMenuContent>
          </DropdownSubMenu>
        );
      }

      case "group": {
        const groupItems = toDropdownMenuItems(item.items);

        if (!groupItems?.length) {
          return null;
        }

        return (
          <DropdownMenuGroup
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            items={groupItems}
          />
        );
      }

      case "separator":
        return <DropdownMenuSeparator key={`${item.type}-${index}`} />;

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
      !!item.icon
  );

  return filteredItems.map((item, index) => {
    const icon = showIcon ? (
      <MenuIconWrapper aria-hidden>
        {"icon" in item ? item.icon : null}
      </MenuIconWrapper>
    ) : undefined;

    switch (item.type) {
      case "button":
        return (
          <MenuButton
            key={`${item.type}-${item.title}-${index}`}
            disabled={item.disabled}
            $dangerous={item.dangerous}
            onClick={(e) => {
              closeMenu();
              item.onClick(e);
            }}
          >
            {icon}
            <MenuLabel>{item.title}</MenuLabel>
            {item.selected !== undefined && (
              <SelectedIconWrapper aria-hidden>
                {item.selected ? <CheckmarkIcon /> : null}
              </SelectedIconWrapper>
            )}
          </MenuButton>
        );

      case "route":
        return (
          <MenuInternalLink
            key={`${item.type}-${item.title}-${index}`}
            to={item.to}
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <MenuLabel>{item.title}</MenuLabel>
          </MenuInternalLink>
        );

      case "link":
        return (
          <MenuExternalLink
            key={`${item.type}-${item.title}-${index}`}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
            disabled={item.disabled}
            onClick={closeMenu}
          >
            {icon}
            <MenuLabel>{item.title}</MenuLabel>
          </MenuExternalLink>
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
          <MenuButton
            key={`${item.type}-${item.title}-${index}`}
            disabled={item.disabled}
            onClick={() => {
              openSubmenu(item.title as string);
            }}
          >
            {icon}
            <MenuLabel>{item.title}</MenuLabel>
            <MenuDisclosure />
          </MenuButton>
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
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            {groupItems}
          </div>
        );
      }

      case "separator":
        return <MenuSeparator key={`${item.type}-${index}`} />;

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
