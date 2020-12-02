// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Key from "components/Key";
import { meta } from "utils/keyboard";

function KeyboardShortcuts() {
  const { t } = useTranslation();

  return (
    <Flex column>
      <HelpText>
        {t(
          "Outline is designed to be fast and easy to use. All of your usual keyboard shortcuts work here, and there’s Markdown too."
        )}
      </HelpText>

      <h2>{t("Navigation")}</h2>
      <List>
        <Keys>
          <Key>n</Key>
        </Keys>
        <Label>{t("New document in current collection")}</Label>
        <Keys>
          <Key>e</Key>
        </Keys>
        <Label>{t("Edit current document")}</Label>
        <Keys>
          <Key>m</Key>
        </Keys>
        <Label>{t("Move current document")}</Label>
        <Keys>
          <Key>/</Key> or <Key>t</Key>
        </Keys>
        <Label>{t("Jump to search")}</Label>
        <Keys>
          <Key>d</Key>
        </Keys>
        <Label>{t("Jump to dashboard")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Ctrl</Key> + <Key>h</Key>
        </Keys>
        <Label>{t("Table of contents")}</Label>
        <Keys>
          <Key>?</Key>
        </Keys>
        <Label>{t("Open this guide")}</Label>
      </List>

      <h2>{t("Editor")}</h2>
      <List>
        <Keys>
          <Key>{meta}</Key> + <Key>Enter</Key>
        </Keys>
        <Label>{t("Save and exit document edit mode")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Shift</Key> + <Key>p</Key>
        </Keys>
        <Label>{t("Publish and exit document edit mode")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>s</Key>
        </Keys>
        <Label>{t("Save document and continue editing")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Esc</Key>
        </Keys>
        <Label>{t("Cancel editing")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>b</Key>
        </Keys>
        <Label>{t("Bold")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>i</Key>
        </Keys>
        <Label>{t("Italic")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>u</Key>
        </Keys>
        <Label>{t("Underline")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>d</Key>
        </Keys>
        <Label>{t("Strikethrough")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>k</Key>
        </Keys>
        <Label>{t("Link")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>z</Key>
        </Keys>
        <Label>{t("Undo")}</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Shift</Key> + <Key>z</Key>
        </Keys>
        <Label>{t("Redo")}</Label>
      </List>

      <h2>{t("Markdown")}</h2>
      <List>
        <Keys>
          <Key>#</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Large header")}</Label>
        <Keys>
          <Key>##</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Medium header")}</Label>
        <Keys>
          <Key>###</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Small header")}</Label>

        <Keys>
          <Key>1.</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Numbered list")}</Label>
        <Keys>
          <Key>-</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Bulleted list")}</Label>
        <Keys>
          <Key>[ ]</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Todo list")}</Label>
        <Keys>
          <Key>&gt;</Key> <Key>Space</Key>
        </Keys>
        <Label>{t("Blockquote")}</Label>
        <Keys>
          <Key>---</Key>
        </Keys>
        <Label>{t("Horizontal divider")}</Label>
        <Keys>
          <Key>{"```"}</Key>
        </Keys>
        <Label>{t("Code block")}</Label>
        <Keys>
          <Key>{":::"}</Key>
        </Keys>
        <Label>{t("Info notice")}</Label>

        <Keys>_italic_</Keys>
        <Label>{t("Italic")}</Label>
        <Keys>**bold**</Keys>
        <Label>{t("Bold")}</Label>
        <Keys>~~strikethrough~~</Keys>
        <Label>{t("Strikethrough")}</Label>
        <Keys>{"`code`"}</Keys>
        <Label>{t("Inline code")}</Label>
        <Keys>==highlight==</Keys>
        <Label>{t("Highlight")}</Label>
      </List>
    </Flex>
  );
}

const List = styled.dl`
  width: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0;
`;

const Keys = styled.dt`
  float: left;
  width: 25%;
  height: 30px;
  margin: 0;
`;

const Label = styled.dd`
  float: left;
  width: 75%;
  height: 30px;
  margin: 0;
  display: flex;
  align-items: center;
`;

export default KeyboardShortcuts;
