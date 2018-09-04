// @flow
import * as React from 'react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

type Props = {
  added: number,
  removed: number,
  max: number,
  color?: string,
  width: number,
};

export default function DiffSummary({
  added,
  removed,
  max,
  color,
  width = 180,
}: Props) {
  const summary = [];
  if (added) summary.push(`+${added}`);
  if (removed) summary.push(`-${removed}`);

  return (
    <Flex align="center">
      <Diff>
        <Bar color={color} style={{ width: `${added / max * width}px` }} />
        <Bar color={color} style={{ width: `${removed / max * width}px` }} />
      </Diff>
      <Summary>{summary.join(', ')}</Summary>
    </Flex>
  );
}

const Summary = styled.div`
  display: inline-block;
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.5;
  flex-grow: 100;
`;

const Diff = styled(Flex)`
  height: 6px;
`;

const Bar = styled.div`
  display: inline-block;
  background: ${props => props.color || props.theme.text};
  height: 100%;
  opacity: 0.3;
  margin-right: 1px;
`;
