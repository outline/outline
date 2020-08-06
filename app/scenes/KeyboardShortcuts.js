// @flow
import * as React from "react";
import styled from "styled-components";
import Key from "components/Key";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import { meta } from "utils/keyboard";

function KeyboardShortcuts() {
  return (
    <Flex column>
      <HelpText>
        Outline is designed to be fast and easy to use. All of your usual
        keyboard shortcuts work here, and there’s Markdown too.
      </HelpText>

      <h2>Navigation</h2>
      <List>
        <Keys>
          <Key>n</Key>
        </Keys>
        <Label>New document in current collection</Label>

        <Keys>
          <Key>e</Key>
        </Keys>
        <Label>Edit current document</Label>

        <Keys>
          <Key>m</Key>
        </Keys>
        <Label>Move current document</Label>

        <Keys>
          <Key>/</Key> or <Key>t</Key>
        </Keys>
        <Label>Jump to search</Label>

        <Keys>
          <Key>d</Key>
        </Keys>
        <Label>Jump to dashboard</Label>

        <Keys>
          <Key>{meta}</Key> + <Key>Ctrl</Key> + <Key>h</Key>
        </Keys>
        <Label>Table of contents</Label>

        <Keys>
          <Key>?</Key>
        </Keys>
        <Label>Open this guide</Label>
      </List>

      <h2>Editor</h2>
      <List>
        <Keys>
          <Key>{meta}</Key> + <Key>Enter</Key>
        </Keys>
        <Label>Save and exit document edit mode</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Shift</Key> + <Key>p</Key>
        </Keys>
        <Label>Publish and exit document edit mode</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>s</Key>
        </Keys>
        <Label>Save document and continue editing</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Esc</Key>
        </Keys>
        <Label>Cancel editing</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>b</Key>
        </Keys>
        <Label>Bold</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>i</Key>
        </Keys>
        <Label>Italic</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>u</Key>
        </Keys>
        <Label>Underline</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>d</Key>
        </Keys>
        <Label>Strikethrough</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>k</Key>
        </Keys>
        <Label>Link</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>z</Key>
        </Keys>
        <Label>Undo</Label>
        <Keys>
          <Key>{meta}</Key> + <Key>Shift</Key> + <Key>z</Key>
        </Keys>
        <Label>Redo</Label>
      </List>

      <h2>Markdown</h2>
      <List>
        <Keys>
          <Key>#</Key> <Key>Space</Key>
        </Keys>
        <Label>Large header</Label>
        <Keys>
          <Key>##</Key> <Key>Space</Key>
        </Keys>
        <Label>Medium header</Label>
        <Keys>
          <Key>###</Key> <Key>Space</Key>
        </Keys>
        <Label>Small header</Label>

        <Keys>
          <Key>1.</Key> <Key>Space</Key>
        </Keys>
        <Label>Numbered list</Label>
        <Keys>
          <Key>-</Key> <Key>Space</Key>
        </Keys>
        <Label>Bulleted list</Label>
        <Keys>
          <Key>[ ]</Key> <Key>Space</Key>
        </Keys>
        <Label>Todo list</Label>
        <Keys>
          <Key>&gt;</Key> <Key>Space</Key>
        </Keys>
        <Label>Blockquote</Label>
        <Keys>
          <Key>---</Key>
        </Keys>
        <Label>Horizontal divider</Label>
        <Keys>
          <Key>{"```"}</Key>
        </Keys>
        <Label>Code block</Label>
        <Keys>
          <Key>{":::"}</Key>
        </Keys>
        <Label>Info notice</Label>

        <Keys>_italic_</Keys>
        <Label>Italic</Label>
        <Keys>**bold**</Keys>
        <Label>Bold</Label>
        <Keys>~~strikethrough~~</Keys>
        <Label>Strikethrough</Label>
        <Keys>{"`code`"}</Keys>
        <Label>Inline code</Label>
        <Keys>==highlight==</Keys>
        <Label>highlight</Label>
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
