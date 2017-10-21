// @flow
import React from 'react';
import Icon from './Icon';
import type { Props } from './Icon';

export default function GoToIcon(props: Props) {
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
          d="M14.080855,4.6060807 L8.08085497,18.6060807 C7.86329935,19.1137105 8.09845092,19.7015894 8.6060807,19.919145 C9.11371048,20.1367007 9.70158941,19.9015491 9.91914503,19.3939193 L15.919145,5.3939193 C16.1367007,4.88628952 15.9015491,4.29841059 15.3939193,4.08085497 C14.8862895,3.86329935 14.2984106,4.09845092 14.080855,4.6060807 Z"
          id="path-1"
        />
      </svg>
    </Icon>
  );
}
