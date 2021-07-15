// @flow
import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Button from "components/Button";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import { type MenuItem } from "types";

type Props = {|
  headings: { title: string, level: number, id: string }[],
|};

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

  const items: MenuItem[] = React.useMemo(() => {
    let i = [
      {
        type: "heading",
        visible: true,
        title: t("Contents"),
      },
      ...headings.map((heading) => ({
        href: `#${heading.id}`,
        title: t(heading.title),
        level: heading.level - minHeading,
      })),
    ];

    if (i.length === 1) {
      i.push({
        href: "#",
        title: t("Headings you add to the document will appear here"),
        disabled: true,
      });
    }

    return i;
  }, [t, headings, minHeading]);

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
      <ContextMenu {...menu} aria-label={t("Table of contents")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

export default observer(TableOfContentsMenu);
