// @flow
import * as React from "react";
import { DropdownMenu } from "components/DropdownMenu";

type Props = {
  label: React.Node,
  path: Array<any>,
};

export default function BreadcrumbMenu({ label, path }: Props) {
  return (
    <DropdownMenu
      label={label}
      position="center"
      items={path.map((item) => ({
        key: item.id,
        title: item.title,
        to: item.url,
      }))}
    />
  );
}
