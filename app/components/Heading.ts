import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { IconTitleWrapper } from "@shared/components/Icon";

const Heading = styled.h1<{ as?: string; centered?: boolean }>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (props.as ? "" : "margin-top: 16px; font-weight: 600;")}
  ${(props) => (props.centered ? "text-align: center;" : "")}

  /* On mobile the title icon sits above the title, so leave room for it. */
  ${breakpoint("mobile", "tablet")`
    &:has(> ${IconTitleWrapper}) {
      margin-top: 60px;
    }
  `};

  ${breakpoint("tablet")`
    ${(props: { as?: string }) => (props.as ? "" : "margin-top: 6vh;")}
  `};
`;

export default Heading;
