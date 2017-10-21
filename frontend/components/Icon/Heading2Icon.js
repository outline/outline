// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function Heading2Icon(props: Props) {
  return (
    <Icon {...props}>
      <svg
        fill="#000000"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M14,13 L10,13 L10,16 C10,16.5522847 9.55228475,17 9,17 C8.44771525,17 8,16.5522847 8,16 L8,8 L8,8 C8,7.44771525 8.44771525,7 9,7 L9,7 L9,7 C9.55228475,7 10,7.44771525 10,8 L10,11 L14,11 L14,8 L14,8 C14,7.44771525 14.4477153,7 15,7 C15.5522847,7 16,7.44771525 16,8 L16,16 C16,16.5522847 15.5522847,17 15,17 C14.4477153,17 14,16.5522847 14,16 L14,13 Z" />
      </svg>
    </Icon>
  );
}
