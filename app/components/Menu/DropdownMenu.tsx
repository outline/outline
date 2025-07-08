import * as React from "react";
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuButton,
  DropdownMenuInternalLink,
  DropdownMenuExternalLink,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "~/components/primitives/DropdownMenu";
import MenuIconWrapper from "~/components/primitives/components/Menu";
import { actionV2ToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import {
  ActionV2Group,
  ActionV2Separator,
  ActionV2Variants,
  MenuItem,
} from "~/types";

type Props = {
  actions: (ActionV2Variants | ActionV2Group | ActionV2Separator)[];
  children: React.ReactNode;
  ariaLabel?: string;
  align?: "start" | "end";
};

export function DropdownMenu({
  actions,
  children,
  ariaLabel,
  align = "start",
}: Props) {
  const context = useActionContext({
    isContextMenu: true,
  });
  const menuItems = actions.map((action) =>
    actionV2ToMenuItem(action, context)
  );

  const content = transformMenuItems(menuItems);

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger aria-label={ariaLabel}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} aria-label={ariaLabel}>
        {content}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}

function transformMenuItems(items: MenuItem[]) {
  const filteredItems = filterMenuItems(items);

  const showIcon = filteredItems.find(
    (item) =>
      item.type !== "separator" &&
      item.type !== "heading" &&
      item.type !== "group" &&
      !!item.icon
  );

  return filteredItems.map((item, index) => {
    switch (item.type) {
      case "button":
        return (
          <DropdownMenuButton
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={
              <MenuIconWrapper aria-hidden>
                {showIcon ? item.icon : null}
              </MenuIconWrapper>
            }
            disabled={item.disabled}
            dangerous={item.dangerous}
            onClick={item.onClick}
          />
        );

      case "route":
        return (
          <DropdownMenuInternalLink
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={
              <MenuIconWrapper aria-hidden>
                {showIcon ? item.icon : null}
              </MenuIconWrapper>
            }
            disabled={item.disabled}
            to={item.to}
          />
        );

      case "link":
        return (
          <DropdownMenuExternalLink
            key={`${item.type}-${item.title}-${index}`}
            label={item.title as string}
            icon={
              <MenuIconWrapper aria-hidden>
                {showIcon ? item.icon : null}
              </MenuIconWrapper>
            }
            disabled={item.disabled}
            href={typeof item.href === "string" ? item.href : item.href.url}
            target={
              typeof item.href === "string" ? undefined : item.href.target
            }
          />
        );

      case "group": {
        const groupItems = transformMenuItems(item.items);
        return (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            {groupItems}
          </DropdownMenuGroup>
        );
      }

      case "separator":
        return <DropdownMenuSeparator />;

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
