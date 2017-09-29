// @flow
import React from 'react';
import styled from 'styled-components';
import Key from 'components/Key';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';

function MarkdownShortcuts() {
  return (
    <Flex column>
      <HelpText>
        Know a little markdown syntax? You
        {"'"}
        re going to love all of the markdown
        shortcuts built right into the Atlas editor.
      </HelpText>
      <List>
        <Keys><Key>#</Key> <Key>Space</Key></Keys>
        <Label>Large header</Label>
        <Keys><Key>##</Key> <Key>Space</Key></Keys>
        <Label>Medium header</Label>
        <Keys><Key>###</Key> <Key>Space</Key></Keys>
        <Label>Small header</Label>

        <Keys><Key>1.</Key> <Key>Space</Key></Keys>
        <Label>Numbered list</Label>
        <Keys><Key>-</Key> <Key>Space</Key></Keys>
        <Label>Bulleted list</Label>
        <Keys><Key>[ ]</Key> <Key>Space</Key></Keys>
        <Label>Todo list</Label>
        <Keys><Key>&gt;</Key> <Key>Space</Key></Keys>
        <Label>Blockquote</Label>
        <Keys><Key>---</Key></Keys>
        <Label>Horizontal divider</Label>
        <Keys><Key>{'```'}</Key></Keys>
        <Label>Code block</Label>
        <Keys>_italic_</Keys>
        <Label>Italic</Label>
        <Keys>**bold**</Keys>
        <Label>Bold</Label>
        <Keys>~~strikethrough~~</Keys>
        <Label>Strikethrough</Label>
        <Keys>{'`code`'}</Keys>
        <Label>Inline code</Label>
      </List>
    </Flex>
  );
}

const List = styled.dl`
  width: 100%;
  overflow: hidden;
  padding: 0;
  margin: 0
`;

const Keys = styled.dt`
  float: left;
  width: 25%;
  padding: 0 0 4px;
  margin: 0
`;

const Label = styled.dd`
  float: left;
  width: 75%;
  padding: 0 0 4px;
  margin: 0
`;

export default MarkdownShortcuts;
