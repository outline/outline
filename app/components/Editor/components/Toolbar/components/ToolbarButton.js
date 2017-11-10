// @flow
import styled from 'styled-components';

export default styled.button`
  display: inline-block;
  flex: 0;
  width: 24px;
  height: 24px;
  cursor: pointer;
  margin-left: 10px;
  border: none;
  background: none;
  transition: opacity 100ms ease-in-out;
  padding: 0;
  opacity: 0.7;

  &:first-child {
    margin-left: 0;
  }

  &:hover {
    opacity: 1;
  }

  ${({ active }) => active && 'opacity: 1;'};
`;
