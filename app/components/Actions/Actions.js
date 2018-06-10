// @flow
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import Flex from 'shared/components/Flex';

export const Action = styled(Flex)`
  justify-content: center;
  align-items: center;
  padding: 0 0 0 12px;

  a {
    color: ${props => props.theme.text};
    height: 24px;
  }
`;

export const Separator = styled.div`
  margin-left: 12px;
  width: 1px;
  height: 20px;
  background: ${props => props.theme.slateLight};
`;

const Actions = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.9);
  padding: 16px;
  -webkit-backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint('tablet')`
    left: auto;
    padding: ${props => props.theme.vpadding} ${props =>
    props.theme.hpadding} 8px 8px;
  `};
`;

export default Actions;
