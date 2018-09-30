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
  const hasChanges = !!summary.length;

  return (
    <Flex align="center">
      {hasChanges && (
        <Diff>
          <Bar color={color} style={{ width: `${added / max * width}px` }} />
          <Bar color={color} style={{ width: `${removed / max * width}px` }} />
        </Diff>
      )}
      <Summary>{hasChanges ? summary.join(', ') : 'No changes'}</Summary>
    </Flex>
  );
}

const Summary = styled.div`
  display: inline-block;
  font-size: 10px;
  opacity: 0.5;
  flex-grow: 100;
  text-transform: uppercase;
`;

const Diff = styled(Flex)`
  height: 6px;
  margin-right: 2px;
`;

const Bar = styled.div`
  display: inline-block;
  background: ${props => props.color || props.theme.text};
  height: 100%;
  opacity: 0.3;
  margin-right: 1px;
`;
