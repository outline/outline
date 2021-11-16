import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import {
  useMenuState,
  MenuButton,
  MenuItem as BaseMenuItem,
} from "reakit/Menu";
import styled from "styled-components";
import { $Shape } from "utility-types";
import Flex from "components/Flex";
import MenuIconWrapper from "components/MenuIconWrapper";
import {
  MenuItem as TMenuItem,
  Action,
  ActionContext,
  MenuSeparator,
  MenuHeading,
} from "../../types";
import Header from "./Header";
import MenuItem, { MenuAnchor } from "./MenuItem";
import Separator from "./Separator";
import ContextMenu from ".";
import { actionToMenuItem } from "actions";
import useStores from "hooks/useStores";

type Props =
  | {
      actions: (Action | MenuSeparator | MenuHeading)[];
    }
  | {
      items: TMenuItem[];
      context?: $Shape<ActionContext>;
    };

const Disclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  position: absolute;
  right: 8px;
`;

// @ts-expect-error ts-migrate(2339) FIXME: Property 'templateItems' does not exist on type '{... Remove this comment to see the full error message
const Submenu = React.forwardRef(({ templateItems, title, ...rest }, ref) => {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  return (
    <>
      <MenuButton ref={ref} {...menu} {...rest}>
        {(props) => (
          <MenuAnchor {...props}>
            {title} <Disclosure color="currentColor" />
          </MenuAnchor>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Submenu")}>
        <Template {...menu} items={templateItems} />
      </ContextMenu>
    </>
  );
});

export function filterTemplateItems(items: TMenuItem[]): TMenuItem[] {
  let filtered = items.filter((item) => item.visible !== false);
  // this block literally just trims unnecessary separators
  filtered = filtered.reduce((acc, item, index) => {
    // trim separators from start / end
    if (item.type === "separator" && index === 0) return acc;
    if (item.type === "separator" && index === filtered.length - 1) return acc;
    // trim double separators looking ahead / behind
    const prev = filtered[index - 1];
    if (prev && prev.type === "separator" && item.type === "separator")
      return acc;
    // otherwise, continue
    return [...acc, item];
  }, []);
  return filtered;
}

function Template({ items, actions, context, ...menu }: Props) {
  const { t } = useTranslation();
  const location = useLocation();
  const stores = useStores();
  const { ui } = stores;
  const ctx = {
    t,
    isCommandBar: false,
    isContextMenu: true,
    activeCollectionId: ui.activeCollectionId,
    activeDocumentId: ui.activeDocumentId,
    location,
    stores,
    ...context,
  };
  const filteredTemplates = filterTemplateItems(
    actions
      ? actions.map((action) =>
          action.type ? action : actionToMenuItem(action, ctx)
        )
      : items
  );
  const iconIsPresentInAnyMenuItem = filteredTemplates.find(
    (item) => !item.type && !!item.icon
  );

  return filteredTemplates.map((item, index) => {
    if (iconIsPresentInAnyMenuItem && !item.type) {
      item.icon = item.icon || <MenuIconWrapper />;
    }

    if (item.to) {
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

    if (item.href) {
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

    if (item.onClick) {
      return (
        <MenuItem
          as="button"
          onClick={item.onClick}
          disabled={item.disabled}
          selected={item.selected}
          key={index}
          icon={item.icon}
          {...menu}
        >
          {item.title}
        </MenuItem>
      );
    }

    if (item.items) {
      return (
        <BaseMenuItem
          key={index}
          as={Submenu}
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          templateItems={item.items}
          title={<Title title={item.title} icon={item.icon} />}
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

    console.warn("Unrecognized menu item", item);
    return <></>;
  });
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

// @ts-expect-error ts-migrate(2345) FIXME: Argument of type '({ items, actions, context, ...m... Remove this comment to see the full error message
export default React.memo<Props>(Template);
