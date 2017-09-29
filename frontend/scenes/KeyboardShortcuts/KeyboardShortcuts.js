// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';
import Flex from 'components/Flex';
import HelpText from 'components/HelpText';

function KeyboardShortcuts() {
  return (
    <Flex column>
      <HelpText>
        Atlas is designed to be super fast and easy to use.
        All of your usual keyboard shortcuts work here.
      </HelpText>
      <List>
        <Keys><Key>Cmd</Key> + <Key>Enter</Key></Keys>
        <Label>Save and exit document edit mode</Label>

        <Keys><Key>Cmd</Key> + <Key>S</Key></Keys>
        <Label>Save document and continue editing</Label>

        <Keys><Key>Cmd</Key> + <Key>Esc</Key></Keys>
        <Label>Cancel editing</Label>

        <Keys><Key>e</Key></Keys>
        <Label>Edit current document</Label>

        <Keys><Key>m</Key></Keys>
        <Label>Move current document</Label>

        <Keys><Key>/</Key> or <Key>t</Key></Keys>
        <Label>Jump to search</Label>

        <Keys><Key>d</Key></Keys>
        <Label>Jump to dashboard</Label>

        <Keys><Key>d</Key></Keys>
        <Label>Jump to dashboard</Label>

        <Keys><Key>?</Key></Keys>
        <Label>Open this guide</Label>
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

const Key = styled.kbd`
  display: inline-block;
  padding: 4px 6px;
  font: 11px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  line-height: 10px;
  color: ${color.text};
  vertical-align: middle;
  background-color: ${color.smokeLight};
  border: solid 1px ${color.slateLight};
  border-bottom-color: ${color.slate};
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 ${color.slate};
`;

export default KeyboardShortcuts;
