import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Action } from "~/components/Actions";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import Scene from "~/components/Scene";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import DocumentScene from "~/scenes/Document"; // Renamed the import
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";

// Home document ID
const HOME_DOCUMENT_ID = "homepage-DaekFaFBVL";

function Home() {
  const { ui } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const [spendPostLoginPath] = usePostLoginPath();
  const can = usePolicy(team);

  const postLoginPath = spendPostLoginPath();
  if (postLoginPath) {
    return <Redirect to={postLoginPath} />;
  }

  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
      left={
        <InputSearchPage source="dashboard" label={t("Search documents")} />
      }
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>
      <DocumentContainer>
        <DocumentScene documentId={HOME_DOCUMENT_ID} readOnly />
      </DocumentContainer>
    </Scene>
  );
}

const DocumentContainer = styled.div`
  position: relative;
  background: ${s("background")};
  height: 100%;
`;

export default observer(Home);