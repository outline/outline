import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useMenuState,
  MenuButton,
  MenuItem as BaseMenuItem,
} from "reakit/Menu";
import { Portal } from "reakit/Portal";
import styled, { useTheme } from "styled-components";
import Flex from "~/components/Flex";
import MenuIconWrapper from "~/components/MenuIconWrapper";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import useMobile from "~/hooks/useMobile";
import {
  Action,
  ActionContext,
  MenuSeparator,
  MenuHeading,
  MenuItem as TMenuItem,
} from "~/types";
import Header from "./Header";
import MenuItem, { MenuAnchor } from "./MenuItem";
import MouseSafeArea from "./MouseSafeArea";
import Separator from "./Separator";
import ContextMenu from ".";

type Props = Pick<ReturnType<typeof useMenuState>, "baseId"> & {
  actions?: (Action | MenuSeparator | MenuHeading)[];
  context?: Partial<ActionContext>;
  items?: TMenuItem[];
};

const Disclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  position: absolute;
  right: 8px;
`;

const Submenu = React.forwardRef(
  (
    {
      templateItems,
      title,
      parentMenuId,
      submenuOpen,
      onClose,
      ...rest
    }: {
      templateItems: TMenuItem[];
      title: React.ReactNode;
      parentMenuId: string;
      submenuOpen?: boolean;
      onClose?: () => void;
    },
    ref: React.LegacyRef<HTMLButtonElement>
  ) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const menu = useMenuState();

    return (
      <>
        {submenuOpen && (
          <MenuButton ref={ref} {...menu} {...rest}>
            {(props) => (
              <MenuAnchor disclosure {...props}>
                {title} <Disclosure color={theme.textTertiary} />
              </MenuAnchor>
            )}
          </MenuButton>
        )}
        <Portal>
          <ContextMenu {...menu} onClose={onClose} aria-label={t("Submenu")}>
            <MouseSafeArea parentRef={menu.unstable_popoverRef} />
            <Template {...menu} items={templateItems} />
          </ContextMenu>
        </Portal>
      </>
    );
  }
);

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

function Template({ items, actions, context, ...menu }: Props) {
  const ctx = useActionContext({
    isContextMenu: true,
  });

  const [submenuOpen, openSubmenu, closeSubmenu] = useBoolean();
  const isMobile = useMobile();
  const theme = useTheme();

  React.useEffect(() => {
    console.log(submenuOpen);
  }, [submenuOpen]);

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
          item.type !== "heading"
        ) {
          item.icon = item.icon || <MenuIconWrapper />;
        }

        if (item.type === "route") {
          return (
            <MenuItem
              as={Link}
              to={item.to}
              key={index}
              disabled={item.disabled}
              selected={item.selected}
              icon={item.icon}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );
        }

        if (item.type === "link") {
          return (
            <MenuItem
              href={item.href}
              key={index}
              disabled={item.disabled}
              selected={item.selected}
              level={item.level}
              target={item.href.startsWith("#") ? undefined : "_blank"}
              icon={item.icon}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );
        }

        if (item.type === "button") {
          return (
            <MenuItem
              as="button"
              onClick={item.onClick}
              disabled={item.disabled}
              selected={item.selected}
              dangerous={item.dangerous}
              key={index}
              icon={item.icon}
              {...menu}
            >
              {item.title}
            </MenuItem>
          );
        }

        if (item.type === "submenu") {
          if (isMobile) {
            return submenuOpen ? (
              <Submenu
                templateItems={item.items}
                title={<Title title={item.title} icon={item.icon} />}
                parentMenuId={menu.baseId}
                submenuOpen={submenuOpen}
                onClose={closeSubmenu}
                {...menu}
              />
            ) : (
              <MenuItem
                key={index}
                onClick={() => {
                  openSubmenu();
                  console.log(submenuOpen);
                }}
                {...menu}
              >
                <Title title={item.title} icon={item.icon} />
                <Disclosure color={theme.textTertiary} />
              </MenuItem>
            );
          }
          return (
            <BaseMenuItem
              key={index}
              as={Submenu}
              templateItems={item.items}
              title={<Title title={item.title} icon={item.icon} />}
              parentMenuId={menu.baseId}
              {...menu}
            />
          );
        }

        if (item.type === "separator") {
          return <Separator key={index} />;
        }

        if (item.type === "heading") {
          return <Header>{item.title}</Header>;
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
      {icon && <MenuIconWrapper>{icon}</MenuIconWrapper>}
      {title}
    </Flex>
  );
}

export default React.memo<Props>(Template);
