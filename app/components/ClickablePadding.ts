import styled from "styled-components";

const ClickablePadding = styled.div`
  min-height: 10em;
  cursor: ${({ onClick }) => (onClick ? "text" : "default")};
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'grow' does not exist on type 'Pick<Detai... Remove this comment to see the full error message
  ${({ grow }) => grow && `flex-grow: 100;`};
`;

export default ClickablePadding;
