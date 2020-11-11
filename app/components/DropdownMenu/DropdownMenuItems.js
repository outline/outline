// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import DropdownMenuItem from "./DropdownMenuItem";

type MenuItem =
  | {|
      title: React.Node,
      to: string,
      visible?: boolean,
      disabled?: boolean,
    |}
  | {|
      title: React.Node,
      onClick: (event: SyntheticEvent<>) => void | Promise<void>,
      visible?: boolean,
      disabled?: boolean,
    |}
  | {|
      title: React.Node,
      href: string,
      visible?: boolean,
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

export default function DropdownMenuItems({ items }: Props): React.Node {
  let filtered = items.filter((item) => item.visible !== false);

  // this block literally just trims unneccessary separators
  filtered = filtered.reduce((acc, item, index) => {
    // trim separators from start / end
    if (item.type === "separator" && index === 0) return acc;
    if (item.type === "separator" && index === filtered.length - 1) return acc;

    // trim double separators looking ahead / behind
    const prev = filtered[index - 1];
    if (prev && prev.separator && item.type === "separator") return acc;

    const next = filtered[index + 1];
    if (next && next.separator && item.type === "separator") return acc;

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
          key={index}
        >
          {item.title}
        </DropdownMenuItem>
      );
    }

    if (item.type === "separator") {
      return <hr key={index} />;
    }

    return null;
  });
}
