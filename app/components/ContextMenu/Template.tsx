import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useMenuState,
  MenuButton,
  MenuItem as BaseMenuItem,
  MenuStateReturn,
} from "reakit/Menu";
import styled, { useTheme } from "styled-components";
import MenuIconWrapper from "~/components/ContextMenu/MenuIconWrapper";
import Flex from "~/components/Flex";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import {
  Action,
  ActionContext,
  MenuSeparator,
  MenuHeading,
  MenuItem as TMenuItem,
} from "~/types";
import Tooltip from "../Tooltip";
import Header from "./Header";
import MenuItem, { MenuAnchor } from "./MenuItem";
import MouseSafeArea from "./MouseSafeArea";
import Separator from "./Separator";
import ContextMenu from ".";

type Props = Omit<MenuStateReturn, "items"> & {
  actions?: (Action | MenuSeparator | MenuHeading)[];
  context?: Partial<ActionContext>;
  items?: TMenuItem[];
  showIcons?: boolean;
};

const Disclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  position: absolute;
  right: 8px;
`;

type SubMenuProps = MenuStateReturn & {
  templateItems: TMenuItem[];
  parentMenuState: Omit<MenuStateReturn, "items">;
  title: React.ReactNode;
};

const SubMenu = React.forwardRef(function _Template(
  { templateItems, title, parentMenuState, ...rest }: SubMenuProps,
  ref: React.LegacyRef<HTMLButtonElement>
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const menu = useMenuState();

  return (
    <>
      <MenuButton ref={ref} {...menu} {...rest}>
        {(props) => (
          <MenuAnchor disclosure {...props}>
            {title} <Disclosure color={theme.textTertiary} />
          </MenuAnchor>
        )}
      </MenuButton>
      <ContextMenu
        {...menu}
        aria-label={t("Submenu")}
        onClick={parentMenuState.hide}
        parentMenuState={parentMenuState}
      >
        <MouseSafeArea parentRef={menu.unstable_popoverRef} />
        <Template {...menu} items={templateItems} />
      </ContextMenu>
    </>
  );
});

export function filterTemplateItems(items: TMenuItem[]): TMenuItem[] {
  return items
    .filter((item) => item.visible !== false)
    .reduce((acc, item) => {
      // trim separator if the previous item was a separator
      if (
        item.type === "separator" &&
        acc[acc.length - 1]?.type === "separator"
      ) {
        return acc;
      }
      return [...acc, item];
    }, [] as TMenuItem[])
    .filter((item, index, arr) => {
      if (
        item.type === "separator" &&
        (index === 0 || index === arr.length - 1)
      ) {
        return false;
      }
      return true;
    });
}

function Template({ items, actions, context, showIcons, ...menu }: Props) {
  const ctx = useActionContext({
    isContextMenu: true,
  });

  const templateItems = actions
    ? actions.map((item) =>
        item.type === "separator" || item.type === "heading"
          ? item
          : actionToMenuItem(item, ctx)
      )
    : items || [];

  const filteredTemplates = filterTemplateItems(templateItems);

  const iconIsPresentInAnyMenuItem = filteredTemplates.find(
    (item) =>
      item.type !== "separator" && item.type !== "heading" && !!item.icon
  );

  return (
    <>
      {filteredTemplates.map((item, index) => {
        if (
          iconIsPresentInAnyMenuItem &&
          item.type !== "separator" &&
          item.type !== "heading" &&
          showIcons !== false
        ) {
          item.icon = item.icon || <MenuIconWrapper aria-hidden />;
        }

        if (item.type === "route") {
          return (
            <MenuItem
              as={Link}
              id={`${item.title}-${index}`}
              to={item.to}
              key={index}
              disabled={item.disabled}
              selected={item.selected}
              icon={showIcons !== false ? item.icon : undefined}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );
        }

        if (item.type === "link") {
          return (
            <MenuItem
              id={`${item.title}-${index}`}
              href={item.href}
              key={index}
              disabled={item.disabled}
              selected={item.selected}
              level={item.level}
              target={item.href.startsWith("#") ? undefined : "_blank"}
              icon={showIcons !== false ? item.icon : undefined}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );
        }

        if (item.type === "button") {
          const menuItem = (
            <MenuItem
              as="button"
              id={`${item.title}-${index}`}
              onClick={item.onClick}
              disabled={item.disabled}
              selected={item.selected}
              dangerous={item.dangerous}
              key={index}
              icon={showIcons !== false ? item.icon : undefined}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );

          return item.tooltip ? (
            <Tooltip content={item.tooltip} placement={"bottom"}>
              <div>{menuItem}</div>
            </Tooltip>
          ) : (
            <>{menuItem}</>
          );
        }

        if (item.type === "submenu") {
          return (
            <BaseMenuItem
              key={index}
              as={SubMenu}
              id={`${item.title}-${index}`}
              templateItems={item.items}
              parentMenuState={menu}
              title={
                <Title
                  title={item.title}
                  icon={showIcons !== false ? item.icon : undefined}
                />
              }
              {...menu}
            />
          );
        }

        if (item.type === "separator") {
          return <Separator key={index} />;
        }

        if (item.type === "heading") {
          return <Header key={index}>{item.title}</Header>;
        }

        const _exhaustiveCheck: never = item;
        return _exhaustiveCheck;
      })}
    </>
  );
}

function Title({
  title,
  icon,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Flex align="center">
      {icon && <MenuIconWrapper aria-hidden>{icon}</MenuIconWrapper>}
      {title}
    </Flex>
  );
}

export default React.memo<Props>(Template);
