// @flow
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

const Container = styled(Flex)`
  position: relative;
  margin-top: ${props => (props.isShare ? '50px' : '0')};
`;

export default Container;
