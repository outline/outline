// @flow
import * as React from 'react';
import replace from 'string-replace-to-array';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

type Props = {
  highlight: ?string,
  text: string,
  caseSensitive?: boolean,
};

function Highlight({ highlight, caseSensitive, text, ...rest }: Props) {
  return (
    <span {...rest}>
      {highlight
        ? replace(
            text,
            new RegExp(
              (highlight || '').replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'),
              caseSensitive ? 'g' : 'gi'
            ),
            (tag, index) => <Mark key={index}>{tag}</Mark>
          )
        : text}
    </span>
  );
}

const Mark = styled.mark`
  background: ${color.yellow};
`;

export default Highlight;
