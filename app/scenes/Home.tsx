import { observer } from "mobx-react";
import { HomeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Route, Redirect } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";

function Home() {
  const { t } = useTranslation();

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
      <Heading>Welcome to Our Knowledge Base</Heading>

      <Documents>
        <Heading>Getting Started</Heading>
        <p>Essential information and quick links for new team members.</p>
        <ul>
          <li>Team Guidelines</li>
          <li>Onboarding Process</li>
          <li>Important Contacts</li>
        </ul>
      </Documents>

      <Documents>
        <Heading>Development Resources</Heading>
        <p>Key resources for our development team.</p>
        <ul>
          <li>API Documentation</li>
          <li>Code Style Guide</li>
          <li>Architecture Overview</li>
        </ul>
      </Documents>

      <Documents>
        <Heading>Project Management</Heading>
        <p>Tools and processes for project management.</p>
        <ul>
          <li>Sprint Planning</li>
          <li>Release Schedule</li>
          <li>Team Meetings</li>
        </ul>
      </Documents>

      <Documents>
        <Heading>Support & Help</Heading>
        <p>Get help when you need it.</p>
        <ul>
          <li>IT Support</li>
          <li>FAQs</li>
          <li>Contact Directory</li>
        </ul>
      </Documents>
    </Scene>
  );
}

export default observer(Home);
