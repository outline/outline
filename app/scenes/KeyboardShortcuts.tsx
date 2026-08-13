import { useMemo, useState, useCallback, memo, Fragment } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { isMac } from "@shared/utils/browser";
import Flex from "~/components/Flex";
import InputSearch from "~/components/InputSearch";
import { KeyboardShortcut } from "~/components/KeyboardShortcut";

type Props = {
  /** Initial search query to filter shortcuts */
  defaultQuery?: string;
};

function KeyboardShortcuts({ defaultQuery = "" }: Props) {
  const { t } = useTranslation();
  const categories = useMemo(
    () => [
      {
        title: t("Navigation"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["meta", "k"]} />,
            label: t("Open command menu"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["meta", { display: "[", symbol: true }]}
              />
            ),
            label: t("Back"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["meta", { display: "]", symbol: true }]}
              />
            ),
            label: t("Forward"),
          },
          {
            shortcut: <KeyboardShortcut keys={["n"]} />,
            label: t("New document"),
          },
          {
            shortcut: <KeyboardShortcut keys={["e"]} />,
            label: t("Edit current document"),
          },
          {
            shortcut: <KeyboardShortcut keys={["m"]} />,
            label: t("Move current document"),
          },
          {
            shortcut: <KeyboardShortcut keys={["h"]} />,
            label: t("Open document history"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={["/", "t"]} combination="alternative" />
            ),
            label: t("Jump to search"),
          },
          {
            shortcut: <KeyboardShortcut keys={["d"]} />,
            label: t("Jump to home"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "alt", "h"]} />,
            label: t("Table of contents"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "."]} />,
            label: t("Toggle sidebar"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "l"]} />,
            label: t("Toggle theme"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "g"]} />,
            label: t("Toggle statistics"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "f"]} />,
            label: t("Focus search input"),
          },
          {
            shortcut: <KeyboardShortcut keys={["?"]} />,
            label: t("Open this guide"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "enter"]} />,
            label: t("Go to link"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "alt", "p"]} />,
            label: t("Present document"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "p"]} />,
            label: t("Publish document and exit"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={[isMac ? "meta" : "shift", "esc"]} />
            ),
            label: t("Cancel editing"),
          },
        ],
      },
      {
        title: t("Collaboration"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["meta", "alt", "m"]} />,
            label: t("Comment"),
          },
        ],
      },
      {
        title: t("Formatting"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "0"]} />,
            label: t("Paragraph"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "1"]} />,
            label: t("Large header"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "2"]} />,
            label: t("Medium header"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "3"]} />,
            label: t("Small header"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "\\"]} />,
            label: t("Code block"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "b"]} />,
            label: t("Bold"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "c"]} />,
            label: t("Code"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "h"]} />,
            label: t("Highlight"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "i"]} />,
            label: t("Italic"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "k"]} />,
            label: t("Link"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "d"]} />,
            label: t("Strikethrough"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "u"]} />,
            label: t("Underline"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "z"]} />,
            label: t("Undo"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "shift", "z"]} />,
            label: t("Redo"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "alt", "up"]} />,
            label: t("Move block up"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "alt", "down"]} />,
            label: t("Move block down"),
          },
        ],
      },
      {
        title: t("Lists"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "7"]} />,
            label: t("Todo list"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "8"]} />,
            label: t("Bulleted list"),
          },
          {
            shortcut: <KeyboardShortcut keys={["ctrl", "shift", "9"]} />,
            label: t("Ordered list"),
          },
          {
            shortcut: <KeyboardShortcut keys={["meta", "enter"]} />,
            label: t("Toggle task list item"),
          },
          {
            shortcut: <KeyboardShortcut keys={["tab"]} />,
            label: t("Indent list item"),
          },
          {
            shortcut: <KeyboardShortcut keys={["shift", "tab"]} />,
            label: t("Outdent list item"),
          },
          {
            shortcut: <KeyboardShortcut keys={["alt", "up"]} />,
            label: t("Move list item up"),
          },
          {
            shortcut: <KeyboardShortcut keys={["alt", "down"]} />,
            label: t("Move list item down"),
          },
        ],
      },
      {
        title: t("Toggle blocks"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["meta", "enter"]} />,
            label: t("Open / close"),
          },
          {
            shortcut: <KeyboardShortcut keys={["tab"]} />,
            label: t("Indent item"),
          },
          {
            shortcut: <KeyboardShortcut keys={["shift", "tab"]} />,
            label: t("Outdent item"),
          },
        ],
      },
      {
        title: t("Tables"),
        items: [
          {
            shortcut: <KeyboardShortcut keys={["meta", "enter"]} />,
            label: t("Insert row"),
          },
          {
            shortcut: <KeyboardShortcut keys={["tab"]} />,
            label: t("Next cell"),
          },
          {
            shortcut: <KeyboardShortcut keys={["shift", "tab"]} />,
            label: t("Previous cell"),
          },
        ],
      },
      {
        title: t("Markdown"),
        items: [
          {
            shortcut: (
              <KeyboardShortcut keys={["#", "space"]} combination="sequence" />
            ),
            label: t("Large header"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={["##", "space"]} combination="sequence" />
            ),
            label: t("Medium header"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["###", "space"]}
                combination="sequence"
              />
            ),
            label: t("Small header"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={["1.", "space"]} combination="sequence" />
            ),
            label: t("Numbered list"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={["-", "space"]} combination="sequence" />
            ),
            label: t("Bulleted list"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["[ ]", "space"]}
                combination="sequence"
              />
            ),
            label: t("Todo list"),
          },
          {
            shortcut: (
              <KeyboardShortcut keys={[">", "space"]} combination="sequence" />
            ),
            label: t("Blockquote"),
          },
          {
            shortcut: <KeyboardShortcut keys={["---"]} />,
            label: t("Horizontal divider"),
          },
          {
            shortcut: <KeyboardShortcut keys={["|--"]} />,
            label: t("Table"),
          },
          {
            shortcut: <KeyboardShortcut keys={["```"]} />,
            label: t("Code block"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["$$$", "space"]}
                combination="sequence"
              />
            ),
            label: t("LaTeX block"),
          },
          {
            shortcut: (
              <KeyboardShortcut
                keys={["+++", "space"]}
                combination="sequence"
              />
            ),
            label: t("Toggle block"),
          },
          {
            shortcut: <KeyboardShortcut keys={[":::"]} />,
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
  const [searchTerm, setSearchTerm] = useState(defaultQuery);
  const normalizedSearchTerm = searchTerm.toLocaleLowerCase();
  const handleChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event) => {
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
          round
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          value={searchTerm}
        />
      </StickySearch>
      {categories.map((category, x) => {
        const titleMatches = category.title
          .toLocaleLowerCase()
          .includes(normalizedSearchTerm);
        const filtered = searchTerm
          ? titleMatches
            ? category.items
            : category.items.filter((item) =>
                item.label.toLocaleLowerCase().includes(normalizedSearchTerm)
              )
          : category.items;

        if (!filtered.length) {
          return null;
        }

        return (
          <Fragment key={x}>
            <Header>{category.title}</Header>
            <List>
              {filtered.map((item) => (
                <Fragment key={item.label}>
                  <Keys>
                    <span>{item.shortcut}</span>
                  </Keys>
                  <Label>{item.label}</Label>
                </Fragment>
              ))}
            </List>
          </Fragment>
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
  float: inline-end;
  width: 45%;
  margin: 0 0 10px;
  clear: inline-start;
  text-align: end;
  font-size: 12px;
  color: ${s("textSecondary")};
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const Label = styled.dd`
  float: inline-start;
  width: 55%;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  color: ${s("textSecondary")};
`;

export default memo(KeyboardShortcuts);
