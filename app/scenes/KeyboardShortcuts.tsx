import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { isMac } from "@shared/utils/browser";
import { metaDisplay, altDisplay } from "@shared/utils/keyboard";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import Key from "~/components/Key";

function KeyboardShortcuts() {
  const { t } = useTranslation();
  const categories = React.useMemo(
    () => [
      {
        title: t("Navigation"),
        items: [
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>k</Key>
              </>
            ),
            label: t("Open command menu"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key symbol>[</Key>
              </>
            ),
            label: t("Back"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key symbol>]</Key>
              </>
            ),
            label: t("Forward"),
          },
          {
            shortcut: <Key>n</Key>,
            label: t("New document"),
          },
          {
            shortcut: <Key>e</Key>,
            label: t("Edit current document"),
          },
          {
            shortcut: <Key>m</Key>,
            label: t("Move current document"),
          },
          {
            shortcut: <Key>h</Key>,
            label: t("Open document history"),
          },
          {
            shortcut: (
              <>
                <Key>/</Key> or <Key>t</Key>
              </>
            ),
            label: t("Jump to search"),
          },
          {
            shortcut: <Key>d</Key>,
            label: t("Jump to home"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>{altDisplay}</Key> + <Key>h</Key>
              </>
            ),
            label: t("Table of contents"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>.</Key>
              </>
            ),
            label: t("Toggle sidebar"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>f</Key>
              </>
            ),
            label: t("Focus search input"),
          },
          {
            shortcut: <Key>?</Key>,
            label: t("Open this guide"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>{t("Enter")}</Key>
              </>
            ),
            label: t("Go to link"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key symbol>⇧</Key> +{" "}
                <Key>p</Key>
              </>
            ),
            label: t("Publish document and exit"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>s</Key>
              </>
            ),
            label: t("Save document"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{isMac() ? metaDisplay : "⇧"}</Key> + <Key>Esc</Key>
              </>
            ),
            label: t("Cancel editing"),
          },
        ],
      },
      {
        title: t("Collaboration"),
        items: [
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>Alt</Key> + <Key>m</Key>
              </>
            ),
            label: t("Comment"),
          },
        ],
      },
      {
        title: t("Formatting"),
        items: [
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>0</Key>
              </>
            ),
            label: t("Paragraph"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>1</Key>
              </>
            ),
            label: t("Large header"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>2</Key>
              </>
            ),
            label: t("Medium header"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>3</Key>
              </>
            ),
            label: t("Small header"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>\</Key>
              </>
            ),
            label: t("Code block"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>b</Key>
              </>
            ),
            label: t("Bold"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key symbol>⇧</Key> +{" "}
                <Key>c</Key>
              </>
            ),
            label: t("Code"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>Ctrl</Key> + <Key>h</Key>
              </>
            ),
            label: t("Highlight"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>i</Key>
              </>
            ),
            label: t("Italic"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>k</Key>
              </>
            ),
            label: t("Link"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>d</Key>
              </>
            ),
            label: t("Strikethrough"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>u</Key>
              </>
            ),
            label: t("Underline"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>z</Key>
              </>
            ),
            label: t("Undo"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key symbol>⇧</Key> +{" "}
                <Key>z</Key>
              </>
            ),
            label: t("Redo"),
          },
        ],
      },
      {
        title: t("Lists"),
        items: [
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>7</Key>
              </>
            ),
            label: t("Todo list"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>8</Key>
              </>
            ),
            label: t("Bulleted list"),
          },
          {
            shortcut: (
              <>
                <Key>Ctrl</Key> + <Key symbol>⇧</Key> + <Key>9</Key>
              </>
            ),
            label: t("Ordered list"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>Enter</Key>
              </>
            ),
            label: t("Toggle task list item"),
          },
          {
            shortcut: <Key>{t("Tab")}</Key>,
            label: t("Indent list item"),
          },
          {
            shortcut: (
              <>
                <Key symbol>⇧</Key> + <Key>{t("Tab")}</Key>
              </>
            ),
            label: t("Outdent list item"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{altDisplay}</Key> + <Key symbol>↑</Key>
              </>
            ),
            label: t("Move list item up"),
          },
          {
            shortcut: (
              <>
                <Key symbol>{altDisplay}</Key> + <Key symbol>↓</Key>
              </>
            ),
            label: t("Move list item down"),
          },
        ],
      },
      {
        title: t("Tables"),
        items: [
          {
            shortcut: (
              <>
                <Key symbol>{metaDisplay}</Key> + <Key>{t("Enter")}</Key>
              </>
            ),
            label: t("Insert row"),
          },
          {
            shortcut: <Key>{t("Tab")}</Key>,
            label: t("Next cell"),
          },
          {
            shortcut: (
              <>
                <Key symbol>⇧</Key> + <Key>{t("Tab")}</Key>
              </>
            ),
            label: t("Previous cell"),
          },
        ],
      },
      {
        title: t("Markdown"),
        items: [
          {
            shortcut: (
              <>
                <Key>#</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Large header"),
          },
          {
            shortcut: (
              <>
                <Key>##</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Medium header"),
          },
          {
            shortcut: (
              <>
                <Key>###</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Small header"),
          },
          {
            shortcut: (
              <>
                <Key>1.</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Numbered list"),
          },
          {
            shortcut: (
              <>
                <Key>-</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Bulleted list"),
          },
          {
            shortcut: (
              <>
                <Key>[ ]</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Todo list"),
          },
          {
            shortcut: (
              <>
                <Key>&gt;</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("Blockquote"),
          },
          {
            shortcut: <Key>---</Key>,
            label: t("Horizontal divider"),
          },
          {
            shortcut: <Key>{"```"}</Key>,
            label: t("Code block"),
          },
          {
            shortcut: (
              <>
                <Key>$$$</Key> <Key>{t("Space")}</Key>
              </>
            ),
            label: t("LaTeX block"),
          },
          {
            shortcut: <Key>{":::"}</Key>,
            label: t("Info notice"),
          },
          {
            shortcut: "_italic_",
            label: t("Italic"),
          },
          {
            shortcut: "**bold**",
            label: t("Bold"),
          },
          {
            shortcut: "~~strikethrough~~",
            label: t("Strikethrough"),
          },
          {
            shortcut: "`code`",
            label: t("Inline code"),
          },
          {
            shortcut: "$$latex$$",
            label: t("Inline LaTeX"),
          },
          {
            shortcut: "==highlight==",
            label: t("Highlight"),
          },
        ],
      },
      {
        title: t("Triggers"),
        items: [
          {
            shortcut: "@",
            label: t("Mention users and more"),
          },
          {
            shortcut: ":",
            label: t("Emoji"),
          },
          {
            shortcut: "/",
            label: t("Insert block"),
          },
        ],
      },
    ],
    [t]
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const normalizedSearchTerm = searchTerm.toLocaleLowerCase();
  const handleChange = React.useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleKeyDown = React.useCallback((event) => {
    if (event.currentTarget.value && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setSearchTerm("");
    }
  }, []);

  return (
    <Flex column>
      <StickySearch>
        <InputSearch
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          value={searchTerm}
        />
      </StickySearch>
      {categories.map((category, x) => {
        const filtered = searchTerm
          ? category.items.filter((item) =>
              item.label.toLocaleLowerCase().includes(normalizedSearchTerm)
            )
          : category.items;

        if (!filtered.length) {
          return null;
        }

        return (
          <React.Fragment key={x}>
            <Header>{category.title}</Header>
            <List>
              {filtered.map((item) => (
                <React.Fragment key={item.label}>
                  <Keys>
                    <span>{item.shortcut}</span>
                  </Keys>
                  <Label>{item.label}</Label>
                </React.Fragment>
              ))}
            </List>
          </React.Fragment>
        );
      })}
    </Flex>
  );
}

const StickySearch = styled.div`
  position: sticky;
  top: -16px;
  z-index: 1;
  padding: 16px;
  margin: -16px;
  background: ${s("background")};
  border-radius: 8px;
`;

const Header = styled.h2`
  font-size: 15px;
  font-weight: 500;
  margin-top: 2em;
`;

const List = styled.dl`
  font-size: 14px;
  width: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
  user-select: none;
`;

const Keys = styled.dt`
  float: right;
  width: 45%;
  margin: 0 0 10px;
  clear: left;
  text-align: right;
  font-size: 12px;
  color: ${s("textSecondary")};
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const Label = styled.dd`
  float: left;
  width: 55%;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  color: ${s("textSecondary")};
`;

export default React.memo(KeyboardShortcuts);
