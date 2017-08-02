// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function MoreIcon(props: Props) {
  return (
    <Icon {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <g fill-rule="evenodd" transform="translate(4 10)">
          <circle cx="2" cy="2" r="2" />
          <circle cx="14" cy="2" r="2" />
          <circle cx="8" cy="2" r="2" />
        </g>
      </svg>
    </Icon>
  );
}
