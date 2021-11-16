import styled from "styled-components";

const Heading = styled.h1`
  display: flex;
  align-items: center;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'centered' does not exist on type 'Themed... Remove this comment to see the full error message
  ${(props) => (props.centered ? "text-align: center;" : "")}

  svg {
    margin-top: 4px;
    margin-left: -6px;
    margin-right: 2px;
    align-self: flex-start;
    flex-shrink: 0;
  }
`;

export default Heading;
