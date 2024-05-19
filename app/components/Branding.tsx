import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import env from "~/env";
import OutlineIcon from "./Icons/OutlineIcon";

type Props = {
  href?: string;
};

function Branding({ href = env.URL }: Props) {
  return (
    <Link href={href}>
      <OutlineIcon size={20} />
      &nbsp;{env.APP_NAME}
    </Link>
  );
}

const Link = styled.a`
  justify-content: center;
  padding-bottom: 16px;

  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border-top-right-radius: 2px;
  color: ${s("text")};
  display: flex;
  align-items: center;

  svg {
    fill: ${s("text")};
  }

  ${breakpoint("tablet")`
    z-index: ${depths.sidebar + 1};
    background: ${s("sidebarBackground")};
    position: fixed;
    bottom: 0;
    right: 0;
    padding: 16px;

    &:hover {
      background: ${s("sidebarControlHoverBackground")};
    }
  `};
`;

export default Branding;
