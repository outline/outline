// @flow
import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Flex from "components/Flex";
import DropdownMenu from "./DropdownMenu";
import DropdownMenuItem from "./DropdownMenuItem";

type MenuItem =
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
      items: MenuItem[],
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
  items: MenuItem[],
|};

const Disclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
`;

export default function DropdownMenuItems({ items }: Props): React.Node {
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
        <DropdownMenuItem
          as={Link}
          to={item.to}
          key={index}
          disabled={item.disabled}
          selected={item.selected}
        >
          {item.title}
        </DropdownMenuItem>
      );
    }

    if (item.href) {
      return (
        <DropdownMenuItem
          href={item.href}
          key={index}
          disabled={item.disabled}
          selected={item.selected}
          target="_blank"
        >
          {item.title}
        </DropdownMenuItem>
      );
    }

    if (item.onClick) {
      return (
        <DropdownMenuItem
          onClick={item.onClick}
          disabled={item.disabled}
          selected={item.selected}
          key={index}
        >
          {item.title}
        </DropdownMenuItem>
      );
    }

    if (item.items) {
      return (
        <DropdownMenu
          style={item.style}
          label={
            <DropdownMenuItem disabled={item.disabled}>
              <Flex justify="space-between" align="center" auto>
                {item.title}
                <Disclosure color="currentColor" />
              </Flex>
            </DropdownMenuItem>
          }
          hover={item.hover}
          key={index}
        >
          <DropdownMenuItems items={item.items} />
        </DropdownMenu>
      );
    }

    if (item.type === "separator") {
      return <hr key={index} />;
    }

    return null;
  });
}
