// @flow
import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useRegisterActions,
} from "kbar";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import env from "env";

export default function CommandBar() {
  const { t } = useTranslation();

  useRegisterActions([
    {
      id: "blog",
      name: "Blog",
      shortcut: ["b"],
      keywords: "writing words",
      perform: () => (window.location.pathname = "blog"),
    },
  ]);

  if (env.ENVIRONMENT !== "development") {
    return null;
  }

  return (
    <KBarPortal>
      <KBarPositioner>
        <Background>
          <SearchInput placeholder={t("Type a command or search…")} />
          <Results />
        </Background>
      </KBarPositioner>
    </KBarPortal>
  );
}

const SearchInput = styled(KBarSearch)`
  padding: 12px 16px;
  width: 100%;
  outline: none;
  border: none;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const Results = styled(KBarResults)`
  max-height: 400;
  overflow: auto;
`;

const Background = styled(KBarAnimator)`
  max-width: 500px;
  width: 100%;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${(props) => props.theme.menuShadow};
  z-index: ${(props) => props.theme.depths.commandBar};
`;
