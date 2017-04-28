import React from 'react';

export default ({ style = {}, className }) => {
  return (
    <span className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={style.width || 208}
        height={style.height || 128}
        viewBox="0 0 208 128"
        color={style.color}
      >
        <rect
          width="198"
          height="118"
          x="5"
          y="5"
          ry="10"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          fillOpacity="0"
        />
        <path
          d="M30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zM155 98l-30-33h20v-35h20v35h20z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
};
