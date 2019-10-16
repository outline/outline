// @flow
import * as React from 'react';

type Props = {
  size?: number,
  fill?: string,
  className?: string,
};

function AzureAdLogo({ size = 34, fill = '#FFF', className }: Props) {
  return (
    <svg
      fill={fill}
      width={size}
      height={size}
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  );
}

export default AzureAdLogo;
