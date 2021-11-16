import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Button from "components/Button";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { MenuItem } from "types";
import "types";

type Props = {
  headings: {
    title: string;
    level: number;
    id: string;
  }[];
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

  const items: MenuItem[] = React.useMemo(() => {
    const i = [
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
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ href: string; title: string; d... Remove this comment to see the full error message
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
