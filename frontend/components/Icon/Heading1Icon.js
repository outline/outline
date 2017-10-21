// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function Heading1Icon(props: Props) {
  return (
    <Icon {...props}>
      <svg
        fill="#000000"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M7,4 L7,4 C7.55228475,4 8,4.44771525 8,5 L8,19 C8,19.5522847 7.55228475,20 7,20 C6.44771525,20 6,19.5522847 6,19 L6,5 L6,5 C6,4.44771525 6.44771525,4 7,4 L7,4 Z M8,11 L16,11 L16,13 L8,13 L8,11 Z M17,4 C17.5522847,4 18,4.44771525 18,5 L18,19 C18,19.5522847 17.5522847,20 17,20 C16.4477153,20 16,19.5522847 16,19 L16,5 L16,5 C16,4.44771525 16.4477153,4 17,4 Z" />
        {' '}
      </svg>
    </Icon>
  );
}
