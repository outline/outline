// @flow
import styled from 'styled-components';
import Button from './Button';
import { color } from 'styles/constants';
import { darken } from 'polished';

const NudeButton = styled(Button)`
  background: none;
  color: ${color.primary};

  &:hover {
    background: none;
    color: ${darken(0.05, color.primary)};
  }
`;

export default NudeButton;
