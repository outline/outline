// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function BoldIcon(props: Props) {
  return (
    <Icon {...props}>
      <svg
        fill="#000000"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M18,15 C18,17.209139 16.209139,19 14,19 L8,19 C7.44771525,19 7,18.5522847 7,18 L7,6 C7,5.44771525 7.44771525,5 8,5 L13,5 C15.209139,5 17,6.790861 17,9 C17,9.9796381 16.6478342,10.8770235 16.0631951,11.5724638 C17.2238614,12.2726251 18,13.5456741 18,15 Z M9,17 L14,17 C15.1045695,17 16,16.1045695 16,15 C16,13.8954305 15.1045695,13 14,13 L9,13 L9,17 Z M9,11 L13,11 C14.1045695,11 15,10.1045695 15,9 C15,7.8954305 14.1045695,7 13,7 L9,7 L9,11 Z" />
      </svg>
    </Icon>
  );
}
