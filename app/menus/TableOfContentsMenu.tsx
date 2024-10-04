import { observer } from "mobx-react";
import { TableOfContentsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { useDocumentContext } from "~/components/DocumentContext";
import { MenuItem } from "~/types";

function TableOfContentsMenu() {
  const { headings } = useDocumentContext();
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

  // @ts-expect-error check
  const items: MenuItem[] = React.useMemo(() => {
    const i = [
      {
        type: "heading",
        visible: true,
        title: t("Contents"),
      },
      ...headings.map((heading) => ({
        type: "link",
        href: `#${heading.id}`,
        title: t(heading.title),
        level: heading.level - minHeading,
      })),
    ];

    if (i.length === 1) {
      i.push({
        type: "link",
        href: "#",
        title: t("Headings you add to the document will appear here"),
        // @ts-expect-error check
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
