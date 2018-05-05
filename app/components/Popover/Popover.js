// @flow
import * as React from 'react';
import BoundlessPopover from 'boundless-popover';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }

  50% {
    opacity: 1;
  }
`;

const StyledPopover = styled(BoundlessPopover)`
  animation: ${fadeIn} 150ms ease-in-out;
  display: flex;
  flex-direction: column;

  line-height: 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;

  svg {
    height: 16px;
    width: 16px;
    position: absolute;

    polygon:first-child {
      fill: rgba(0, 0, 0, 0.075);
    }
    polygon {
      fill: #fff;
    }
  }
`;

const Dialog = styled.div`
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 8px 16px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  line-height: 1.5;
  padding: 16px;
  margin-top: 14px;
  min-width: 200px;
  min-height: 150px;
`;

export const Preset = BoundlessPopover.preset;

export default function Popover(props: Object) {
  return (
    <StyledPopover
      dialogComponent={Dialog}
      closeOnOutsideScroll
      closeOnOutsideFocus
      closeOnEscKey
      {...props}
    />
  );
}
