// @flow
import * as React from "react";
import styled from "styled-components";
import OutlineLogo from "shared/components/OutlineLogo";

const Link = styled.a`
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 500;
  text-decoration: none;
  color: inherit;
`;

export default function LogoMark() {
  return (
    <Link href="/">
      <OutlineLogo /> outline
    </Link>
  );
}
