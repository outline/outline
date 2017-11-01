// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function KeyboardIcon(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6,6 L19,6 C20.1045695,6 21,6.8954305 21,8 L21,16 C21,17.1045695 20.1045695,18 19,18 L6,18 C4.8954305,18 4,17.1045695 4,16 L4,8 L4,8 C4,6.8954305 4.8954305,6 6,6 L6,6 Z M6,14 L6,16 L19,16 L19,14 L6,14 Z M16,8 L16,10 L19,10 L19,8 L16,8 Z M6,8 L6,10 L9,10 L9,8 L6,8 Z M13,8 L13,10 L15,10 L15,8 L13,8 Z M10,8 L10,10 L12,10 L12,8 L10,8 Z M7,11 L7,13 L9,13 L9,11 L7,11 Z M10,11 L10,13 L12,13 L12,11 L10,11 Z M13,11 L13,13 L15,13 L15,11 L13,11 Z M16,11 L16,13 L18,13 L18,11 L16,11 Z" />
    </Icon>
  );
}
