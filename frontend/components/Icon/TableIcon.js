// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function TableIcon(props: Props) {
  return (
    <Icon {...props}>
      <path
        d="M6,5 L18,5 C19.1045695,5 20,5.8954305 20,7 L20,17 C20,18.1045695 19.1045695,19 18,19 L6,19 C4.8954305,19 4,18.1045695 4,17 L4,7 C4,5.8954305 4.8954305,5 6,5 Z M6,7 L6,9 L11,9 L11,7 L6,7 Z M13,7 L13,9 L18,9 L18,7 L13,7 Z M6,11 L6,13 L11,13 L11,11 L6,11 Z M13,11 L13,13 L18,13 L18,11 L13,11 Z M6,15 L6,17 L11,17 L11,15 L6,15 Z M13,15 L13,17 L18,17 L18,15 L13,15 Z"
        id="path-1"
      />
    </Icon>
  );
}
