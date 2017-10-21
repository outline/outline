// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function HorizontalRuleIcon(props: Props) {
  return (
    <Icon {...props}>
      <svg
        fill="#000000"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5,11 L19,11 C19.5522847,11 20,11.4477153 20,12 C20,12.5522847 19.5522847,13 19,13 L5,13 C4.44771525,13 4,12.5522847 4,12 C4,11.4477153 4.44771525,11 5,11 L5,11 Z M7,6 L17,6 C17.5522847,6 18,6.44771525 18,7 L18,8 C18,8.55228475 17.5522847,9 17,9 L7,9 C6.44771525,9 6,8.55228475 6,8 L6,7 L6,7 C6,6.44771525 6.44771525,6 7,6 Z M7,15 L17,15 C17.5522847,15 18,15.4477153 18,16 L18,17 C18,17.5522847 17.5522847,18 17,18 L7,18 C6.44771525,18 6,17.5522847 6,17 L6,16 C6,15.4477153 6.44771525,15 7,15 Z"
          id="path-1"
        />
      </svg>
    </Icon>
  );
}
