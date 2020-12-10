// @flow
import * as React from "react";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";

type Props = {
  label: React.Node,
  path: Array<any>,
};

export default function BreadcrumbMenu({ label, path }: Props) {
  return (
    <DropdownMenu label={label} position="center">
      <DropdownMenuItems
        items={path.map((item) => ({
          title: item.title,
          to: item.url,
        }))}
      />
    </DropdownMenu>
  );
}
