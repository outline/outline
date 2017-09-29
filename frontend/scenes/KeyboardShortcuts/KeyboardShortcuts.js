// @flow
import React from 'react';
import styled from 'styled-components';
import Key from 'components/Key';
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

        <Keys><Key>?</Key></Keys>
        <Label>Open this guide</Label>

        <Keys><Key>#</Key></Keys>
        <Label>Open markdown guide</Label>
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

export default KeyboardShortcuts;
