// @flow
import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useMenuState,
  MenuButton,
  MenuItem as BaseMenuItem,
} from "reakit/Menu";
import styled from "styled-components";
import MenuItem, { MenuAnchor } from "./MenuItem";
import Separator from "./Separator";
import ContextMenu from ".";

type TMenuItem =
  | {|
      title: React.Node,
      to: string,
      visible?: boolean,
      selected?: boolean,
      disabled?: boolean,
    |}
  | {|
      title: React.Node,
      onClick: (event: SyntheticEvent<>) => void | Promise<void>,
      visible?: boolean,
      selected?: boolean,
      disabled?: boolean,
    |}
  | {|
      title: React.Node,
      href: string,
      visible?: boolean,
      selected?: boolean,
      disabled?: boolean,
    |}
  | {|
      title: React.Node,
      visible?: boolean,
      disabled?: boolean,
      style?: Object,
      hover?: boolean,
      items: TMenuItem[],
    |}
  | {|
      type: "separator",
      visible?: boolean,
    |}
  | {|
      type: "heading",
      visible?: boolean,
      title: React.Node,
    |};

type Props = {|
  items: TMenuItem[],
|};

const Disclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  justify-self: flex-end;
`;

const Submenu = React.forwardRef(({ templateItems, title, ...rest }, ref) => {
  const { t } = useTranslation();
  const menu = useMenuState({ modal: true });

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

function Template({ items, ...menu }: Props): React.Node {
  let filtered = items.filter((item) => item.visible !== false);

  // this block literally just trims unneccessary separators
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

  return filtered.map((item, index) => {
    if (item.to) {
      return (
        <MenuItem
          as={Link}
          to={item.to}
          key={index}
          disabled={item.disabled}
          selected={item.selected}
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
          target="_blank"
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
          templateItems={item.items}
          title={item.title}
          {...menu}
        />
      );
    }

    if (item.type === "separator") {
      return <Separator key={index} />;
    }

    return null;
  });
}

export default React.memo<Props>(Template);
