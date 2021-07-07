// @flow

import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Button from "components/Button";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";

type Props = {
  headings: { title: string, level: number, id: string }[],
};

function TableOfContentsMenu({ headings }: Props) {
  const menu = useMenuState({
    modal: true,
    unstable_preventOverflow: true,
    unstable_fixed: true,
    unstable_flip: true,
  });

  const { t } = useTranslation();

  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button
            {...props}
            icon={<TableOfContentsIcon />}
            iconColor="currentColor"
            borderOnHover
            neutral
          />
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label="Table of contents">
        <Template
          {...menu}
          items={headings.map((heading, index) => {
            return {
              id: heading.id,
              title: `${t(heading.title)}`,
              index,
              level: heading.level - minHeading,
            };
          })}
        />
      </ContextMenu>
    </>
  );
}

export default observer(TableOfContentsMenu);
